import app from './worker.js';

const DEFAULT_NSR_BASE = 'https://nsrplay.space';
const serverCache = new Map();
const CACHE_TTL_MS = 60_000;

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
    const discovered = await discoverServers(type, id, season, episode, env);

    if (!discovered.servers.length) {
      if (discovered.status === 429) {
        return json({
          error: 'NSR Play limitó temporalmente las solicitudes. Espera un momento y vuelve a intentar.',
          nsr_status: 429,
          retry_after: discovered.retryAfter || null,
          api_token_configured: Boolean(env.NSR_API_TOKEN)
        }, 429);
      }

      return json({
        error: discovered.status === 401 || discovered.status === 403
          ? 'NSR Play rechazó la autenticación de la API.'
          : 'NSR Play no devolvió servidores para este contenido.',
        nsr_status: discovered.status,
        response_keys: discovered.keys,
        api_token_configured: Boolean(env.NSR_API_TOKEN)
      }, discovered.status === 401 || discovered.status === 403 ? discovered.status : 404);
    }

    const servers = discovered.servers;
    let target = selectedKey
      ? servers.find(s => s.key === selectedKey) || servers.find(s => s.name.toLowerCase() === selectedKey.toLowerCase())
      : servers[0];

    if (!target) target = servers[0];

    // Importante: resolver SOLO un servidor por solicitud.
    // El código anterior intentaba muchos servidores y muchas formas de autenticación,
    // lo que provocaba respuestas 429 por demasiadas peticiones.
    const resolved = await resolveServer(target, env, url.origin);

    return json({
      success: true,
      server: target.key,
      server_name: target.name,
      servers: publicServers(servers),
      streams: resolved.streams,
      warning: resolved.warning || ''
    });
  } catch (err) {
    return json({ error: err?.message || 'Error consultando NSR Play.' }, err?.status || 500);
  }
}

async function discoverServers(type, id, season, episode, env) {
  const cacheKey = `${type}:${id}:${season}:${episode}`;
  const cached = serverCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return { ...cached.value, cached: true };
  }

  const base = getNsrBase(env);
  const endpoint = new URL(
    type === 'tv'
      ? `/api/v1/embed/sources/tv/${id}/${season}/${episode}`
      : `/api/v1/embed/sources/movie/${id}`,
    base
  );
  endpoint.searchParams.set('fast', 'true');

  let res;
  try {
    res = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: nsrHeaders(env),
      redirect: 'follow'
    });
  } catch (err) {
    return { servers: [], status: 502, keys: [], retryAfter: null, error: err.message };
  }

  const retryAfter = res.headers.get('Retry-After');
  const text = await res.text();
  const data = parseJsonDeep(text);
  const list = findServerArray(data);
  const servers = normalizeServers(list);

  const result = {
    servers,
    status: res.status,
    keys: topKeys(data),
    retryAfter
  };

  if (res.ok && servers.length) {
    serverCache.set(cacheKey, { time: Date.now(), value: result });
  }

  return result;
}

async function resolveServer(server, env, origin) {
  const base = getNsrBase(env);
  const endpoint = new URL('/api/v1/embed/resolve', base);
  endpoint.searchParams.set('server', server.name);
  endpoint.searchParams.set('token', server.token);

  let res;
  try {
    res = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: nsrHeaders(env),
      redirect: 'follow'
    });
  } catch (err) {
    return { streams: [], warning: 'No se pudo conectar con ese servidor.' };
  }

  if (res.status === 429) {
    return { streams: [], warning: 'Ese servidor está limitado temporalmente. Prueba otro o espera un momento.' };
  }

  const text = await res.text();
  const data = parseJsonDeep(text);
  if (!res.ok) {
    return { streams: [], warning: `No se pudo resolver ${server.label || server.name} (HTTP ${res.status}).` };
  }

  const rawStreams = extractStreams(data);
  const output = [];
  const seen = new Set();

  for (const stream of rawStreams) {
    if (!isPublicHttpUrl(stream.url) || seen.has(stream.url)) continue;
    seen.add(stream.url);

    // Mantener HLS directo. MP4/playUrl pasa por el proxy existente del Worker.
    if (stream.format === 'hls') {
      output.push({ format: 'hls', label: 'HLS / M3U8', url: stream.url });
    } else {
      output.push({
        format: 'mp4',
        label: 'MP4 (Proxy)',
        url: `${origin}/?action=stream&stream_url=${encodeURIComponent(stream.url)}`
      });
    }
  }

  return {
    streams: output,
    warning: output.length ? '' : `El servidor ${server.label || server.name} no devolvió un formato reproducible.`
  };
}

function nsrHeaders(env) {
  const base = getNsrBase(env);
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36',
    'Referer': base + '/',
    'Origin': base,
    'Accept': 'application/json',
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8'
  };

  const token = String(env.NSR_API_TOKEN || '').trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function findServerArray(data) {
  const seen = new Set();

  function walk(value, depth) {
    if (depth > 6 || value == null) return null;

    if (typeof value === 'string') {
      const parsed = parseJsonDeep(value);
      return parsed !== value ? walk(parsed, depth + 1) : null;
    }

    if (Array.isArray(value)) {
      if (looksLikeServerArray(value)) return value;
      for (const item of value) {
        const found = walk(item, depth + 1);
        if (found) return found;
      }
      return null;
    }

    if (typeof value !== 'object' || seen.has(value)) return null;
    seen.add(value);

    const preferred = [
      'servers', 'servidores', 'servidores_disponibles', 'available_servers',
      'sources', 'providers', 'embeds', 'data', 'result', 'results', 'payload'
    ];

    for (const key of preferred) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const found = walk(value[key], depth + 1);
        if (found) return found;
      }
    }

    for (const key of Object.keys(value)) {
      const found = walk(value[key], depth + 1);
      if (found) return found;
    }

    return null;
  }

  return walk(data, 0) || [];
}

function looksLikeServerArray(list) {
  if (!Array.isArray(list) || !list.length) return false;
  return list.slice(0, 10).some(item => {
    if (!item || typeof item !== 'object') return false;
    const name = item.name ?? item.nombre ?? item.server ?? item.servidor ?? item.provider ?? item.host;
    const token = item.token ?? item.key ?? item.server_token ?? item.embed_token ?? item.id;
    return name != null && token != null;
  });
}

function normalizeServers(list) {
  if (!Array.isArray(list)) return [];

  const rows = [];
  const totals = Object.create(null);

  for (let i = 0; i < list.length; i++) {
    const item = list[i] || {};
    const name = String(item.name ?? item.nombre ?? item.server ?? item.servidor ?? item.provider ?? item.host ?? '').trim();
    const token = String(item.token ?? item.key ?? item.server_token ?? item.embed_token ?? item.id ?? '').trim();
    if (!name || !token) continue;

    rows.push({ sourceIndex: i, name, token });
    const key = name.toLowerCase();
    totals[key] = (totals[key] || 0) + 1;
  }

  const counts = Object.create(null);
  return rows.map(row => {
    const key = row.name.toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
    return {
      key: `srv_${row.sourceIndex}`,
      name: row.name,
      label: totals[key] > 1 ? `${row.name} ${counts[key]}` : row.name,
      token: row.token
    };
  });
}

function extractStreams(data) {
  const found = [];
  const seen = new Set();

  function add(raw, explicitFormat) {
    if (typeof raw !== 'string' || !raw.trim()) return;
    const url = raw.trim();
    if (seen.has(url)) return;
    seen.add(url);
    const format = explicitFormat || inferFormat(url);
    found.push({ url, format });
  }

  function walk(value, depth) {
    if (depth > 6 || value == null) return;

    if (typeof value === 'string') {
      const parsed = parseJsonDeep(value);
      if (parsed !== value) walk(parsed, depth + 1);
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1);
      return;
    }

    if (typeof value !== 'object') return;

    add(value.playUrl ?? value.play_url, 'mp4');
    add(value.directUrl ?? value.direct_url, 'hls');
    add(value.stream_url ?? value.streamUrl);
    add(value.url);
    add(value.file);
    add(value.src);

    for (const key of Object.keys(value)) walk(value[key], depth + 1);
  }

  walk(data, 0);
  return found;
}

async function handleDebug(url, env) {
  const type = url.searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const id = intInRange(url.searchParams.get('id'), 1, 999999999, 0);
  const season = intInRange(url.searchParams.get('season'), 1, 999, 1);
  const episode = intInRange(url.searchParams.get('episode'), 1, 9999, 1);

  if (!id) return json({ error: 'Falta id.' }, 400);

  const result = await discoverServers(type, id, season, episode, env);
  return json({
    ok: result.servers.length > 0,
    nsr_base: getNsrBase(env),
    api_token_configured: Boolean(env.NSR_API_TOKEN),
    upstream_status: result.status,
    retry_after: result.retryAfter || null,
    response_keys: result.keys,
    server_count: result.servers.length,
    servers: publicServers(result.servers)
  });
}

function publicServers(servers) {
  return servers.map(s => ({ id: s.key, name: s.name, label: s.label }));
}

function getNsrBase(env) {
  const raw = String(env.NSR_BASE_URL || DEFAULT_NSR_BASE).trim();
  try {
    const u = new URL(raw);
    return (u.protocol === 'https:' || u.protocol === 'http:') ? u.origin : DEFAULT_NSR_BASE;
  } catch (_) {
    return DEFAULT_NSR_BASE;
  }
}

function parseJsonDeep(text) {
  if (typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (!trimmed) return {};

  let value = trimmed;
  for (let i = 0; i < 4; i++) {
    if (typeof value !== 'string') break;
    const s = value.trim();
    if (!(s.startsWith('{') || s.startsWith('[') || (s.startsWith('"') && s.endsWith('"')))) break;
    try { value = JSON.parse(s); } catch (_) { break; }
  }
  return value;
}

function topKeys(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value).slice(0, 30)
    : [];
}

function inferFormat(value) {
  const v = String(value || '').toLowerCase();
  return v.includes('.m3u8') ? 'hls' : 'mp4';
}

function intInRange(value, min, max, fallback) {
  const n = parseInt(value || '', 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

function isPublicHttpUrl(raw) {
  let u;
  try { u = new URL(raw); } catch (_) { return false; }
  return u.protocol === 'http:' || u.protocol === 'https:';
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
