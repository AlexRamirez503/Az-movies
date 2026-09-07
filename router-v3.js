import app from './worker.js';

const DEFAULT_BRIDGE = 'https://novaps-bridge.novaroku.workers.dev';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'playback') return handlePlayback(url, env);
    if (action === 'nsr-debug') return handleDebug(url, env);

    return app.fetch(request, env, ctx);
  }
};

async function handlePlayback(url, env) {
  const type = url.searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const id = intInRange(url.searchParams.get('id'), 1, 999999999, 0);
  const season = intInRange(url.searchParams.get('season'), 1, 999, 1);
  const episode = intInRange(url.searchParams.get('episode'), 1, 9999, 1);
  const selectedKey = String(url.searchParams.get('server') || '').trim();
  if (!id) return json({ error: 'Falta un id válido.' }, 400);

  try {
    // Primera consulta: trae metadatos, servidores y stream predeterminado.
    const first = await callBridge({ type, id, season, episode }, env);
    if (!first.ok) {
      return json({ error: first.error || 'No se pudo consultar el bridge de NSR.', upstream_status: first.status }, first.status || 502);
    }

    const servers = normalizeServers(first.data);
    if (!servers.length) {
      return json({ error: 'El bridge respondió, pero no devolvió servidores.', upstream_status: first.status, response_keys: objectKeys(first.data) }, 404);
    }

    let chosen = null;
    if (selectedKey) chosen = servers.find(s => s.id === selectedKey) || null;
    if (!chosen) chosen = servers[0];

    let payload = first.data;
    // Si el usuario eligió un servidor distinto al predeterminado, vuelve a consultar
    // el bridge usando el nombre de ese servidor, igual que tu código original.
    if (selectedKey && chosen) {
      const selected = await callBridge({ type, id, season, episode, server: chosen.name }, env);
      if (selected.ok) payload = selected.data;
    }

    const streams = normalizeStreams(payload);

    return json({
      success: true,
      title: payload.title || payload.titulo || '',
      overview: payload.overview || '',
      poster: payload.poster || '',
      backdrop: payload.backdrop || payload.fondo || '',
      server: chosen ? chosen.id : '',
      server_name: chosen ? chosen.name : '',
      servers,
      streams,
      stream_url: streams[0]?.url || payload.stream_url || '',
      format: streams[0]?.format || payload.format || payload.formato || ''
    });
  } catch (err) {
    return json({ error: err?.message || 'Error consultando el bridge NSR.' }, 500);
  }
}

async function handleDebug(url, env) {
  const type = url.searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const id = intInRange(url.searchParams.get('id'), 1, 999999999, 0);
  const season = intInRange(url.searchParams.get('season'), 1, 999, 1);
  const episode = intInRange(url.searchParams.get('episode'), 1, 9999, 1);
  if (!id) return json({ error: 'Falta id.' }, 400);

  const result = await callBridge({ type, id, season, episode }, env);
  const servers = result.ok ? normalizeServers(result.data) : [];
  const streams = result.ok ? normalizeStreams(result.data) : [];

  return json({
    ok: result.ok && servers.length > 0,
    bridge: getBridgeBase(env),
    upstream_status: result.status,
    response_keys: result.ok ? objectKeys(result.data) : [],
    server_count: servers.length,
    stream_count: streams.length,
    servers: servers.map(s => ({ id: s.id, name: s.name, label: s.label }))
  });
}

async function callBridge(params, env) {
  const endpoint = new URL(getBridgeBase(env));
  endpoint.searchParams.set('id', String(params.id));
  endpoint.searchParams.set('type', params.type);
  endpoint.searchParams.set('season', String(params.season));
  endpoint.searchParams.set('episode', String(params.episode));
  if (params.server) endpoint.searchParams.set('server', params.server);

  let res;
  try {
    res = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36'
      },
      redirect: 'follow'
    });
  } catch (err) {
    return { ok: false, status: 502, error: 'No se pudo conectar con el bridge.', details: err.message };
  }

  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch (_) {
    return { ok: false, status: res.status || 502, error: 'El bridge no devolvió JSON válido.' };
  }

  return { ok: res.ok, status: res.status, data, error: data.error || '' };
}

function normalizeServers(data) {
  const list = firstArray([
    data?.servers,
    data?.available_servers,
    data?.servidores_disponibles,
    data?.data?.servers,
    data?.data?.available_servers,
    data?.data?.servidores_disponibles
  ]);

  const counts = Object.create(null);
  for (const item of list) {
    const name = String(item?.name ?? item?.nombre ?? item?.server ?? item?.servidor ?? '').trim();
    if (!name) continue;
    const k = name.toLowerCase();
    counts[k] = (counts[k] || 0) + 1;
  }

  const seen = Object.create(null);
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i] || {};
    const name = String(item.name ?? item.nombre ?? item.server ?? item.servidor ?? '').trim();
    if (!name) continue;
    const k = name.toLowerCase();
    seen[k] = (seen[k] || 0) + 1;
    const label = counts[k] > 1 ? `${name} ${seen[k]}` : name;
    out.push({ id: `srv_${i}`, name, label });
  }
  return out;
}

function normalizeStreams(data) {
  const list = firstArray([
    data?.streams,
    data?.data?.streams
  ]);

  const out = [];
  const seen = new Set();

  for (const item of list) {
    const url = String(item?.url ?? item?.stream_url ?? '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const format = String(item?.format ?? item?.formato ?? inferFormat(url)).toLowerCase();
    const label = String(item?.label ?? item?.etiqueta ?? (format === 'hls' ? 'HLS / M3U8' : 'MP4'));
    out.push({ format, url, label });
  }

  const topUrl = String(data?.stream_url || '').trim();
  if (topUrl && !seen.has(topUrl)) {
    const format = String(data?.format ?? data?.formato ?? inferFormat(topUrl)).toLowerCase();
    out.unshift({ format, url: topUrl, label: format === 'hls' ? 'HLS / M3U8' : 'MP4 (Proxy)' });
  }

  return out;
}

function firstArray(values) {
  for (const value of values) if (Array.isArray(value)) return value;
  return [];
}

function getBridgeBase(env) {
  const raw = String(env.NSR_BRIDGE_URL || DEFAULT_BRIDGE).trim();
  try {
    const u = new URL(raw);
    if (u.protocol === 'https:' || u.protocol === 'http:') return u.toString();
  } catch (_) {}
  return DEFAULT_BRIDGE;
}

function inferFormat(value) {
  return String(value || '').toLowerCase().includes('.m3u8') ? 'hls' : 'mp4';
}

function intInRange(value, min, max, fallback) {
  const n = parseInt(value || '', 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

function objectKeys(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).slice(0, 20) : [];
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Cache-Control': 'no-store'
    }
  });
}
