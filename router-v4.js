import app from './worker.js';

const DEFAULT_NSR_BASE = 'https://nsrplay.space';
const cache = new Map();
const CACHE_TTL_MS = 60_000;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    if (action === 'playback') return playback(url, env);
    if (action === 'nsr-debug') return debug(url, env);
    return app.fetch(request, env, ctx);
  }
};

async function playback(url, env) {
  const type = url.searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const id = toInt(url.searchParams.get('id'), 0);
  const season = toInt(url.searchParams.get('season'), 1);
  const episode = toInt(url.searchParams.get('episode'), 1);
  const selected = String(url.searchParams.get('server') || '').trim();
  if (!id) return json({ error: 'Falta un id válido.' }, 400);

  const found = await discover(type, id, season, episode, env);
  if (!found.servers.length) {
    return json({
      error: found.status === 429
        ? 'NSR Play limitó temporalmente las solicitudes.'
        : (found.status === 401 || found.status === 403)
          ? 'NSR Play rechazó la autenticación de la API.'
          : 'NSR Play no devolvió servidores para este contenido.',
      nsr_status: found.status,
      retry_after: found.retryAfter || null,
      auth_mode: found.authMode || null,
      api_token_configured: Boolean(env.NSR_API_TOKEN)
    }, found.status || 404);
  }

  let target = found.servers[0];
  if (selected) {
    target = found.servers.find(s => s.id === selected) ||
             found.servers.find(s => s.name.toLowerCase() === selected.toLowerCase()) ||
             target;
  }

  const resolved = await resolve(target, env, url.origin);
  return json({
    success: true,
    server: target.id,
    server_name: target.name,
    servers: found.servers.map(({ id, name, label }) => ({ id, name, label })),
    streams: resolved.streams,
    warning: resolved.warning || '',
    auth_mode: resolved.authMode || found.authMode || null
  });
}

async function discover(type, id, season, episode, env) {
  const key = `${type}:${id}:${season}:${episode}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < CACHE_TTL_MS) return { ...hit.value, cached: true };

  const base = getBase(env);
  const endpoint = new URL(
    type === 'tv'
      ? `/api/v1/embed/sources/tv/${id}/${season}/${episode}`
      : `/api/v1/embed/sources/movie/${id}`,
    base
  );
  endpoint.searchParams.set('fast', 'true');

  const result = await fetchWithAuth(endpoint.toString(), env);
  const data = parseJson(result.text);
  const servers = normalizeServers(findServers(data));
  const out = {
    servers,
    status: result.status,
    retryAfter: result.retryAfter,
    authMode: result.authMode,
    keys: objectKeys(data)
  };
  if (result.status >= 200 && result.status < 300 && servers.length) {
    cache.set(key, { time: Date.now(), value: out });
  }
  return out;
}

async function resolve(server, env, origin) {
  const endpoint = new URL('/api/v1/embed/resolve', getBase(env));
  endpoint.searchParams.set('server', server.name);
  endpoint.searchParams.set('token', server.token);

  const result = await fetchWithAuth(endpoint.toString(), env);
  if (result.status === 429) return { streams: [], warning: 'Ese servidor está limitado temporalmente.', authMode: result.authMode };
  if (result.status < 200 || result.status >= 300) {
    return { streams: [], warning: `No se pudo resolver ${server.label} (HTTP ${result.status}).`, authMode: result.authMode };
  }

  const data = parseJson(result.text);
  const raw = extractStreams(data);
  const streams = [];
  const seen = new Set();
  for (const s of raw) {
    if (!s.url || seen.has(s.url)) continue;
    seen.add(s.url);
    if (s.format === 'hls') {
      streams.push({ format: 'hls', label: 'HLS / M3U8', url: s.url });
    } else {
      streams.push({
        format: 'mp4',
        label: 'MP4 (Proxy)',
        url: `${origin}/?action=stream&stream_url=${encodeURIComponent(s.url)}`
      });
    }
  }
  return {
    streams,
    warning: streams.length ? '' : `El servidor ${server.label} no devolvió un formato reproducible.`,
    authMode: result.authMode
  };
}

async function fetchWithAuth(url, env) {
  const token = String(env.NSR_API_TOKEN || '').trim();
  const common = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36',
    'Referer': getBase(env) + '/',
    'Origin': getBase(env),
    'Accept': 'application/json',
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8'
  };

  const attempts = token
    ? [
        { mode: 'bearer', headers: { ...common, Authorization: `Bearer ${token}` } },
        { mode: 'x-api-key', headers: { ...common, 'X-API-Key': token } }
      ]
    : [{ mode: 'none', headers: common }];

  let last = { status: 0, text: '', retryAfter: null, authMode: attempts[0].mode };
  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i];
    let res;
    try {
      res = await fetch(url, { method: 'GET', headers: a.headers, redirect: 'follow' });
    } catch (e) {
      return { status: 502, text: JSON.stringify({ error: e.message }), retryAfter: null, authMode: a.mode };
    }

    const text = await res.text();
    last = { status: res.status, text, retryAfter: res.headers.get('Retry-After'), authMode: a.mode };

    // Si fue exitoso, no hacemos más llamadas.
    if (res.ok) return last;
    // Si el servidor nos limita, no hacemos un segundo intento.
    if (res.status === 429) return last;
    // Solo probamos X-API-Key cuando Bearer fue rechazado.
    if (!(res.status === 401 || res.status === 403)) return last;
  }
  return last;
}

function findServers(data) {
  if (!data || typeof data !== 'object') return [];
  const preferred = [data.servers, data.available_servers, data.servidores_disponibles, data?.data?.servers, data?.data?.available_servers];
  for (const v of preferred) if (Array.isArray(v)) return v;

  const seen = new Set();
  function walk(v, depth) {
    if (depth > 5 || v == null) return null;
    if (Array.isArray(v)) {
      if (v.some(x => x && typeof x === 'object' && (x.name || x.nombre) && (x.token || x.key || x.id))) return v;
      for (const x of v) { const r = walk(x, depth + 1); if (r) return r; }
      return null;
    }
    if (typeof v !== 'object' || seen.has(v)) return null;
    seen.add(v);
    for (const k of Object.keys(v)) { const r = walk(v[k], depth + 1); if (r) return r; }
    return null;
  }
  return walk(data, 0) || [];
}

function normalizeServers(list) {
  const rows = [];
  const totals = Object.create(null);
  for (let i = 0; i < (Array.isArray(list) ? list.length : 0); i++) {
    const x = list[i] || {};
    const name = String(x.name ?? x.nombre ?? x.server ?? x.servidor ?? '').trim();
    const token = String(x.token ?? x.key ?? x.server_token ?? x.embed_token ?? x.id ?? '').trim();
    if (!name || !token) continue;
    const k = name.toLowerCase();
    totals[k] = (totals[k] || 0) + 1;
    rows.push({ index: i, name, token });
  }
  const seen = Object.create(null);
  return rows.map(r => {
    const k = r.name.toLowerCase();
    seen[k] = (seen[k] || 0) + 1;
    return {
      id: `srv_${r.index}`,
      name: r.name,
      label: totals[k] > 1 ? `${r.name} ${seen[k]}` : r.name,
      token: r.token
    };
  });
}

function extractStreams(data) {
  const out = [];
  const seen = new Set();
  function add(url, format) {
    if (typeof url !== 'string' || !url.trim()) return;
    const u = url.trim();
    if (seen.has(u)) return;
    seen.add(u);
    out.push({ url: u, format: format || (u.toLowerCase().includes('.m3u8') ? 'hls' : 'mp4') });
  }
  function walk(v, depth) {
    if (depth > 5 || v == null) return;
    if (Array.isArray(v)) { for (const x of v) walk(x, depth + 1); return; }
    if (typeof v !== 'object') return;
    add(v.playUrl ?? v.play_url, 'mp4');
    add(v.directUrl ?? v.direct_url, 'hls');
    add(v.stream_url ?? v.streamUrl);
    add(v.url);
    add(v.file);
    add(v.src);
    for (const k of Object.keys(v)) walk(v[k], depth + 1);
  }
  walk(data, 0);
  return out;
}

async function debug(url, env) {
  const type = url.searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const id = toInt(url.searchParams.get('id'), 0);
  const season = toInt(url.searchParams.get('season'), 1);
  const episode = toInt(url.searchParams.get('episode'), 1);
  if (!id) return json({ error: 'Falta id.' }, 400);

  const r = await discover(type, id, season, episode, env);
  return json({
    ok: r.servers.length > 0,
    nsr_base: getBase(env),
    api_token_configured: Boolean(env.NSR_API_TOKEN),
    upstream_status: r.status,
    auth_mode: r.authMode || null,
    retry_after: r.retryAfter || null,
    response_keys: r.keys,
    server_count: r.servers.length,
    servers: r.servers.map(({ id, name, label }) => ({ id, name, label }))
  });
}

function parseJson(text) {
  try { return JSON.parse(String(text || '').trim() || '{}'); } catch (_) { return {}; }
}
function objectKeys(v) { return v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).slice(0, 20) : []; }
function toInt(v, fallback) { const n = parseInt(v || '', 10); return Number.isFinite(n) && n > 0 ? n : fallback; }
function getBase(env) {
  const raw = String(env.NSR_BASE_URL || DEFAULT_NSR_BASE).trim();
  try { const u = new URL(raw); return (u.protocol === 'https:' || u.protocol === 'http:') ? u.origin : DEFAULT_NSR_BASE; }
  catch (_) { return DEFAULT_NSR_BASE; }
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
