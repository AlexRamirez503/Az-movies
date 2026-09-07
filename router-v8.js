import app from './worker.js';

const DEFAULT_BRIDGE = 'https://novaps-bridge.novaroku.workers.dev';
const CACHE_TTL = 60_000;
const cache = new Map();

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'playback') return playback(url, env);
    if (action === 'nsr-debug') return debug(url, env);

    return app.fetch(request, env, ctx);
  }
};

async function playback(url, env) {
  const id = String(url.searchParams.get('id') || '').trim();
  const type = url.searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const season = String(url.searchParams.get('season') || '1');
  const episode = String(url.searchParams.get('episode') || '1');
  const selected = String(url.searchParams.get('server') || '').trim();

  if (!id) return json({ error: "Falta el parámetro 'id'" }, 400);

  // IMPORTANTE: el bridge original NO usa action=playback.
  // Su contrato es /?id=TMDB&type=movie|tv&server=...
  const baseResponse = await getBridgeResponse({ id, type, season, episode }, env);

  if (!baseResponse.ok) {
    return json({
      success: false,
      error: baseResponse.message || `El bridge respondió HTTP ${baseResponse.status}.`,
      bridge_status: baseResponse.status,
      servers: [],
      available_servers: [],
      servidores_disponibles: [],
      streams: []
    }, baseResponse.status || 502);
  }

  const rawServers = extractServers(baseResponse.data);
  const publicServers = normalizeServers(rawServers);

  if (!publicServers.length) {
    return json({
      success: false,
      error: 'El bridge no devolvió servidores para este contenido.',
      bridge_status: baseResponse.status,
      response_keys: objectKeys(baseResponse.data),
      servers: [],
      available_servers: [],
      servidores_disponibles: [],
      streams: []
    }, 404);
  }

  let target = publicServers[0];
  if (selected) {
    target = publicServers.find(s => s.id === selected)
      || publicServers.find(s => s.name.toLowerCase() === selected.toLowerCase())
      || target;
  }

  let chosenData = baseResponse.data;

  // Si el usuario eligió otro servidor, pedirle AL BRIDGE que lo resuelva.
  // Esto conserva el flujo de tu código original: sources -> server -> resolve -> streams.
  if (selected && target.index !== 0) {
    const selectedResponse = await getBridgeResponse({
      id, type, season, episode, server: target.name
    }, env, false);

    if (selectedResponse.ok) {
      chosenData = selectedResponse.data;
    } else {
      return json({
        success: true,
        exito: true,
        server: target.id,
        server_name: target.name,
        servidor: target.name,
        servers: publicServers,
        available_servers: publicServers,
        servidores_disponibles: publicServers,
        streams: [],
        stream_url: '',
        format: '',
        formato: '',
        warning: selectedResponse.message || `No se pudo resolver ${target.label}.`
      });
    }
  }

  const streams = normalizeStreams(chosenData);
  const primary = streams[0] || {};

  return json({
    success: true,
    exito: true,
    title: chosenData?.title ?? chosenData?.titulo ?? '',
    titulo: chosenData?.titulo ?? chosenData?.title ?? '',
    overview: chosenData?.overview ?? '',
    poster: chosenData?.poster ?? '',
    backdrop: chosenData?.backdrop ?? chosenData?.fondo ?? '',
    fondo: chosenData?.fondo ?? chosenData?.backdrop ?? '',
    server: target.id,
    server_name: target.name,
    servidor: target.name,
    servers: publicServers,
    available_servers: publicServers,
    servidores_disponibles: publicServers,
    stream_url: primary.url || String(chosenData?.stream_url || ''),
    format: primary.format || String(chosenData?.format ?? chosenData?.formato ?? ''),
    formato: primary.formato || String(chosenData?.formato ?? chosenData?.format ?? ''),
    streams,
    warning: streams.length ? '' : 'Ese servidor no devolvió formatos reproducibles.'
  });
}

async function getBridgeResponse(args, env, useCache = true) {
  const bridge = getBridge(env);
  const key = `${args.type}:${args.id}:${args.season}:${args.episode}:${args.server || ''}`;

  if (useCache) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.time < CACHE_TTL) return hit.value;
  }

  const endpoint = new URL('/', bridge);
  endpoint.searchParams.set('id', args.id);
  endpoint.searchParams.set('type', args.type);
  if (args.type === 'tv') {
    endpoint.searchParams.set('season', args.season || '1');
    endpoint.searchParams.set('episode', args.episode || '1');
  }
  if (args.server) endpoint.searchParams.set('server', args.server);

  let res;
  try {
    res = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36'
      },
      redirect: 'follow'
    });
  } catch (e) {
    return { ok: false, status: 502, data: {}, message: e?.message || String(e) };
  }

  const text = await res.text();
  const data = safeJson(text);
  const message = readMessage(data) || (!res.ok ? text.slice(0, 300) : '');
  const value = { ok: res.ok, status: res.status, data, message };

  if (useCache && res.ok) cache.set(key, { time: Date.now(), value });
  return value;
}

function extractServers(data) {
  if (!data || typeof data !== 'object') return [];
  const candidates = [
    data.servers,
    data.available_servers,
    data.servidores_disponibles,
    data?.data?.servers,
    data?.data?.available_servers,
    data?.data?.servidores_disponibles
  ];
  for (const list of candidates) if (Array.isArray(list)) return list;
  return [];
}

function normalizeServers(list) {
  const rows = [];
  const totals = Object.create(null);

  for (let i = 0; i < (Array.isArray(list) ? list.length : 0); i++) {
    const item = list[i] || {};
    const name = String(item.name ?? item.nombre ?? item.server ?? item.servidor ?? '').trim();
    if (!name) continue;
    const k = name.toLowerCase();
    totals[k] = (totals[k] || 0) + 1;
    rows.push({ index: i, name, token: String(item.token ?? '').trim() });
  }

  const seen = Object.create(null);
  return rows.map(row => {
    const k = row.name.toLowerCase();
    seen[k] = (seen[k] || 0) + 1;
    const label = totals[k] > 1 ? `${row.name} ${seen[k]}` : row.name;
    return {
      id: `srv_${row.index}`,
      index: row.index,
      name: row.name,
      nombre: row.name,
      label,
      etiqueta: label
    };
  });
}

function normalizeStreams(data) {
  const source = Array.isArray(data?.streams) ? data.streams : [];
  const out = [];
  const seen = new Set();

  function add(item) {
    if (!item || typeof item !== 'object') return;
    const url = String(item.url ?? item.stream_url ?? item.raw_url ?? '').trim();
    if (!url || seen.has(url)) return;
    seen.add(url);

    let format = String(item.format ?? item.formato ?? '').trim().toLowerCase();
    if (!format) format = url.toLowerCase().includes('.m3u8') ? 'hls' : 'mp4';
    const label = String(item.label ?? item.etiqueta ?? (format === 'hls' ? 'HLS / M3U8' : 'MP4')).trim();

    out.push({
      format,
      formato: format,
      url,
      raw_url: String(item.raw_url ?? url),
      label,
      etiqueta: label
    });
  }

  for (const item of source) add(item);

  // Compatibilidad con respuestas que solo traen stream_url + format/formato.
  if (!out.length && data?.stream_url) {
    add({
      url: data.stream_url,
      raw_url: data.raw_url ?? data.stream_url,
      format: data.format ?? data.formato,
      label: data.label ?? data.etiqueta
    });
  }

  return out;
}

async function debug(url, env) {
  const id = String(url.searchParams.get('id') || '').trim();
  const type = url.searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const season = String(url.searchParams.get('season') || '1');
  const episode = String(url.searchParams.get('episode') || '1');

  if (!id) return json({ error: 'Falta id.' }, 400);

  const r = await getBridgeResponse({ id, type, season, episode }, env, false);
  const servers = normalizeServers(extractServers(r.data));
  const streams = normalizeStreams(r.data);

  return json({
    ok: r.ok && servers.length > 0,
    bridge: getBridge(env),
    bridge_status: r.status,
    upstream_message: r.message || null,
    response_keys: objectKeys(r.data),
    server_count: servers.length,
    stream_count: streams.length,
    servers: servers.map(({ id, name, label }) => ({ id, name, label })),
    formats: streams.map(s => ({ format: s.format, label: s.label }))
  });
}

function getBridge(env) {
  const raw = String(env.NSR_BRIDGE_URL || DEFAULT_BRIDGE).trim();
  try {
    const u = new URL(raw);
    return (u.protocol === 'https:' || u.protocol === 'http:') ? u.origin : DEFAULT_BRIDGE;
  } catch (_) {
    return DEFAULT_BRIDGE;
  }
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

function objectKeys(v) {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? Object.keys(v).slice(0, 30)
    : [];
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
