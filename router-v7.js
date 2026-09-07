import app from './worker.js';

const NSR_BASE = 'https://nsrplay.space';

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'playback') return handlePlayback(request, url, env);
    if (action === 'nsr-debug') return handleDebug(url);

    return app.fetch(request, env, ctx);
  }
};

async function handlePlayback(request, url, env) {
  const tmdbId = url.searchParams.get('id');
  const type = url.searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const season = url.searchParams.get('season') || '1';
  const episode = url.searchParams.get('episode') || '1';
  const selectedServer = String(url.searchParams.get('server') || '').trim();

  if (!tmdbId) {
    return json({ error: "Falta el parámetro 'id'" }, 400);
  }

  try {
    // 1) MISMA RUTA DE SOURCES DEL CÓDIGO ORIGINAL
    const sourcesEndpoint = type === 'tv'
      ? `${NSR_BASE}/api/v1/embed/sources/tv/${encodeURIComponent(tmdbId)}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}?fast=true`
      : `${NSR_BASE}/api/v1/embed/sources/movie/${encodeURIComponent(tmdbId)}?fast=true`;

    const commonHeaders = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36',
      'Referer': `${NSR_BASE}/`,
      'Accept': 'application/json'
    };

    const sourcesRes = await fetch(sourcesEndpoint, {
      method: 'GET',
      headers: commonHeaders,
      redirect: 'follow'
    });

    const sourcesText = await sourcesRes.text();
    const sourcesData = safeJson(sourcesText);

    if (!sourcesRes.ok) {
      return json({
        error: 'No disponible en NSR Play',
        nsr_status: sourcesRes.status,
        upstream_message: readMessage(sourcesData)
      }, sourcesRes.status);
    }

    const rawServers = Array.isArray(sourcesData?.servers)
      ? sourcesData.servers
      : Array.isArray(sourcesData?.servidores_disponibles)
        ? sourcesData.servidores_disponibles
        : [];

    if (!rawServers.length) {
      return json({ error: 'Sin servidores disponibles', nsr_status: sourcesRes.status }, 404);
    }

    // 2) CONSERVAR TODOS LOS SERVIDORES, AUNQUE SE REPITA EL NOMBRE
    const counts = Object.create(null);
    const totals = Object.create(null);
    rawServers.forEach(s => {
      const n = String(s?.name ?? s?.nombre ?? '').trim().toLowerCase();
      if (n) totals[n] = (totals[n] || 0) + 1;
    });

    const availableServers = rawServers.map((s, index) => {
      const name = String(s?.name ?? s?.nombre ?? `Servidor ${index + 1}`).trim();
      const key = name.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
      return {
        id: `srv_${index}`,
        name,
        nombre: name,
        label: totals[key] > 1 ? `${name} ${counts[key]}` : name
      };
    });

    let targetIndex = 0;
    if (selectedServer) {
      const byId = /^srv_(\d+)$/.exec(selectedServer);
      if (byId) {
        const idx = Number(byId[1]);
        if (Number.isInteger(idx) && idx >= 0 && idx < rawServers.length) targetIndex = idx;
      } else {
        const idx = rawServers.findIndex(s => String(s?.name ?? s?.nombre ?? '').toLowerCase() === selectedServer.toLowerCase());
        if (idx >= 0) targetIndex = idx;
      }
    }

    const targetServer = rawServers[targetIndex];
    const targetName = String(targetServer?.name ?? targetServer?.nombre ?? '').trim();
    const targetToken = String(targetServer?.token ?? '').trim();

    if (!targetName || !targetToken) {
      return json({ error: 'El servidor seleccionado no tiene token válido.' }, 502);
    }

    // 3) MISMA RUTA RESOLVE DEL CÓDIGO ORIGINAL
    const resolveEndpoint = `${NSR_BASE}/api/v1/embed/resolve?server=${encodeURIComponent(targetName)}&token=${encodeURIComponent(targetToken)}`;
    const resolveRes = await fetch(resolveEndpoint, {
      method: 'GET',
      headers: commonHeaders,
      redirect: 'follow'
    });

    const resolveText = await resolveRes.text();
    const resolveData = safeJson(resolveText);

    if (!resolveRes.ok) {
      return json({
        success: true,
        server: `srv_${targetIndex}`,
        server_name: targetName,
        servidor: targetName,
        servers: availableServers,
        available_servers: availableServers,
        servidores_disponibles: availableServers,
        streams: [],
        stream_url: '',
        format: '',
        formato: '',
        warning: readMessage(resolveData) || `No se pudo resolver ${targetName} (HTTP ${resolveRes.status}).`
      }, 200);
    }

    const streamInfo = resolveData?.data || resolveData || {};
    const baseUrl = `${url.protocol}//${url.host}`;
    const streams = [];

    if (streamInfo.playUrl) {
      streams.push({
        format: 'mp4',
        formato: 'mp4',
        url: `${baseUrl}/?action=stream&stream_url=${encodeURIComponent(streamInfo.playUrl)}`,
        raw_url: streamInfo.playUrl,
        label: 'MP4 (Worker Proxy)',
        etiqueta: 'MP4 (Worker Proxy)'
      });
    }

    if (streamInfo.directUrl) {
      streams.push({
        format: 'hls',
        formato: 'hls',
        url: streamInfo.directUrl,
        raw_url: streamInfo.directUrl,
        label: 'HLS / M3U8 (Direct Stream)',
        etiqueta: 'HLS / M3U8 (Direct Stream)'
      });
    }

    const primary = streams[0] || {};

    return json({
      success: true,
      exito: true,
      server: `srv_${targetIndex}`,
      server_name: targetName,
      servidor: targetName,
      servers: availableServers,
      available_servers: availableServers,
      servidores_disponibles: availableServers,
      stream_url: primary.url || '',
      format: primary.format || '',
      formato: primary.formato || '',
      streams,
      warning: streams.length ? '' : 'Ese servidor no devolvió MP4 ni HLS.'
    });
  } catch (err) {
    return json({ error: 'Error interno', details: err?.message || String(err) }, 500);
  }
}

async function handleDebug(url) {
  const id = url.searchParams.get('id');
  const type = url.searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const season = url.searchParams.get('season') || '1';
  const episode = url.searchParams.get('episode') || '1';

  if (!id) return json({ error: 'Falta id.' }, 400);

  const endpoint = type === 'tv'
    ? `${NSR_BASE}/api/v1/embed/sources/tv/${encodeURIComponent(id)}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}?fast=true`
    : `${NSR_BASE}/api/v1/embed/sources/movie/${encodeURIComponent(id)}?fast=true`;

  const res = await fetch(endpoint, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36',
      'Referer': `${NSR_BASE}/`,
      'Accept': 'application/json'
    },
    redirect: 'follow'
  });

  const text = await res.text();
  const data = safeJson(text);
  const servers = Array.isArray(data?.servers) ? data.servers : [];

  return json({
    ok: res.ok && servers.length > 0,
    nsr_base: NSR_BASE,
    upstream_status: res.status,
    upstream_message: readMessage(data) || null,
    response_keys: data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : [],
    server_count: servers.length,
    servers: servers.map((s, i) => ({ id: `srv_${i}`, name: String(s?.name ?? s?.nombre ?? '') }))
  });
}

function safeJson(text) {
  try { return JSON.parse(String(text || '').trim() || '{}'); }
  catch (_) { return {}; }
}

function readMessage(data) {
  if (!data || typeof data !== 'object') return '';
  const msg = data.message ?? data.error ?? data.details ?? data.detail ?? '';
  return typeof msg === 'string' ? msg.slice(0, 500) : '';
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*'
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(),
      'Cache-Control': 'no-store'
    }
  });
}
