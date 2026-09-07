import app from './worker.js';

const NSR_DEFAULT = 'https://nsrplay.space';
const cache = new Map();
const TTL = 60_000;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (action === 'playback') return playback(url, env);
    if (action === 'nsr-debug') return debug(url, env);

    return app.fetch(request, env, ctx);
  }
};

async function playback(url, env) {
  const type = url.searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const id = posInt(url.searchParams.get('id'), 0);
  const season = posInt(url.searchParams.get('season'), 1);
  const episode = posInt(url.searchParams.get('episode'), 1);
  const selected = String(url.searchParams.get('server') || '').trim();

  if (!id) return json({ error: 'Falta un id válido.' }, 400);

  const found = await discover(type, id, season, episode, env, url.origin);

  if (!found.servers.length) {
    const msg = found.status === 429
      ? 'NSR Play limitó temporalmente las solicitudes.'
      : (found.message || ((found.status === 401 || found.status === 403)
          ? 'NSR Play rechazó la petición. Revisa autenticación y dominios permitidos.'
          : 'NSR Play no devolvió servidores para este contenido.'));

    return json({
      success: false,
      error: msg,
      nsr_status: found.status,
      auth_mode: found.authMode || null,
      retry_after: found.retryAfter || null,
      response_keys: found.keys || [],
      servers: [],
      available_servers: [],
      streams: [],
      stream_url: '',
      format: ''
    }, found.status || 404);
  }

  const servers = found.servers;
  let target = servers[0];

  if (selected) {
    target = servers.find(s => s.id === selected)
      || servers.find(s => s.name.toLowerCase() === selected.toLowerCase())
      || target;
  }

  const resolved = await resolveServer(target, env, url.origin);
  const streams = resolved.streams;
  const primary = streams[0] || {};

  const publicList = servers.map(({ id, name, label }) => ({ id, name, label }));

  // Payload compatible con el código original y con el reproductor actual.
  return json({
    success: true,
    server: target.id,
    server_name: target.name,
    servidor: target.name,
    servers: publicList,
    available_servers: publicList,
    servidores_disponibles: publicList,
    stream_url: primary.url || '',
    format: primary.format || '',
    streams,
    warning: resolved.warning || '',
    auth_mode: resolved.authMode || found.authMode || null
  });
}

async function discover(type, id, season, episode, env, clientOrigin) {
  const key = `${clientOrigin}|${type}:${id}:${season}:${episode}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < TTL) return { ...hit.value, cached: true };

  const base = getBase(env);
  const endpoint = new URL(
    type === 'tv'
      ? `/api/v1/embed/sources/tv/${id}/${season}/${episode}`
      : `/api/v1/embed/sources/movie/${id}`,
    base
  );
  endpoint.searchParams.set('fast', 'true');

  const result = await fetchWithAuth(endpoint.toString(), env, clientOrigin);
  const data = parseJson(result.text);
  const servers = normalizeServers(findServers(data));

  const out = {
    servers,
    status: result.status,
    authMode: result.authMode,
    retryAfter: result.retryAfter,
    keys: objectKeys(data),
    message: safeMessage(data)
  };

  if (result.status >= 200 && result.status < 300 && servers.length) {
    cache.set(key, { time: Date.now(), value: out });
  }

  return out;
}

async function resolveServer(server, env, clientOrigin) {
  const endpoint = new URL('/api/v1/embed/resolve', getBase(env));
  endpoint.searchParams.set('server', server.name);
  endpoint.searchParams.set('token', server.token);

  const result = await fetchWithAuth(endpoint.toString(), env, clientOrigin);
  const data = parseJson(result.text);

  if (result.status === 429) {
    return {
      streams: [],
      warning: 'Ese servidor está limitado temporalmente. Prueba otro.',
      authMode: result.authMode
    };
  }

  if (result.status < 200 || result.status >= 300) {
    return {
      streams: [],
      warning: safeMessage(data) || `No se pudo resolver ${server.label} (HTTP ${result.status}).`,
      authMode: result.authMode
    };
  }

  const raw = extractStreams(data);
  const streams = [];
  const seen = new Set();

  for (const s of raw) {
    if (!isHttp(s.url) || seen.has(s.url)) continue;
    seen.add(s.url);

    if (s.format === 'hls') {
      streams.push({
        format: 'hls',
        formato: 'hls',
        label: 'HLS / M3U8 (Direct Stream)',
        etiqueta: 'HLS / M3U8 (Direct Stream)',
        url: s.url,
        raw_url: s.url
      });
    } else {
      const proxied = `${clientOrigin}/?action=stream&stream_url=${encodeURIComponent(s.url)}`;
      streams.push({
        format: 'mp4',
        formato: 'mp4',
        label: 'MP4 (Worker Proxy)',
        etiqueta: 'MP4 (Worker Proxy)',
        url: proxied,
        raw_url: s.url
      });
    }
  }

  return {
    streams,
    warning: streams.length ? '' : `El servidor ${server.label} no devolvió un formato reproducible.`,
    authMode: result.authMode
  };
}

async function fetchWithAuth(targetUrl, env, clientOrigin) {
  const token = String(env.NSR_API_TOKEN || '').trim();
  const origin = normalizeOrigin(clientOrigin);
  const common = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
    'Origin': origin,
    'Referer': origin + '/'
  };

  // Mantener pocos intentos para no provocar 429.
  const attempts = token ? [
    { mode: 'bearer', headers: { ...common, Authorization: `Bearer ${token}` } },
    { mode: 'x-api-key', headers: { ...common, 'X-API-Key': token } }
  ] : [
    { mode: 'none', headers: common }
  ];

  let last = { status: 0, text: '', retryAfter: null, authMode: attempts[0].mode };

  for (const attempt of attempts) {
    let res;
    try {
      res = await fetch(targetUrl, {
        method: 'GET',
        headers: attempt.headers,
        redirect: 'follow'
      });
    } catch (e) {
      return {
        status: 502,
        text: JSON.stringify({ message: e.message }),
        retryAfter: null,
        authMode: attempt.mode
      };
    }

    const text = await res.text();
    last = {
      status: res.status,
      text,
      retryAfter: res.headers.get('Retry-After'),
      authMode: attempt.mode
    };

    if (res.ok || res.status === 429) return last;
    if (!(res.status === 401 || res.status === 403)) return last;
  }

  return last;
}

function findServers(data) {
  if (!data || typeof data !== 'object') return [];

  const direct = [
    data.servers,
    data.available_servers,
    data.servidores_disponibles,
    data?.data?.servers,
    data?.data?.available_servers,
    data?.data?.servidores_disponibles
  ];

  for (const x of direct) {
    if (Array.isArray(x)) return x;
  }

  const seen = new Set();
  function walk(v, depth) {
    if (depth > 6 || v == null) return null;

    if (Array.isArray(v)) {
      if (v.some(x => x && typeof x === 'object' && (x.name || x.nombre) && (x.token || x.key || x.id))) return v;
      for (const x of v) {
        const r = walk(x, depth + 1);
        if (r) return r;
      }
      return null;
    }

    if (typeof v !== 'object' || seen.has(v)) return null;
    seen.add(v);

    for (const k of Object.keys(v)) {
      const r = walk(v[k], depth + 1);
      if (r) return r;
    }
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

  const counts = Object.create(null);
  return rows.map(r => {
    const k = r.name.toLowerCase();
    counts[k] = (counts[k] || 0) + 1;
    return {
      id: `srv_${r.index}`,
      name: r.name,
      label: totals[k] > 1 ? `${r.name} ${counts[k]}` : r.name,
      token: r.token
    };
  });
}

function extractStreams(data) {
  const out = [];
  const seen = new Set();

  function add(raw, explicitFormat) {
    if (typeof raw !== 'string' || !raw.trim()) return;
    const u = raw.trim();
    if (seen.has(u)) return;
    seen.add(u);
    out.push({
      url: u,
      format: explicitFormat || (u.toLowerCase().includes('.m3u8') ? 'hls' : 'mp4')
    });
  }

  function walk(v, depth) {
    if (depth > 6 || v == null) return;
    if (Array.isArray(v)) {
      for (const x of v) walk(x, depth + 1);
      return;
    }
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
  const id = posInt(url.searchParams.get('id'), 0);
  const season = posInt(url.searchParams.get('season'), 1);
  const episode = posInt(url.searchParams.get('episode'), 1);

  if (!id) return json({ error: 'Falta id.' }, 400);

  const r = await discover(type, id, season, episode, env, url.origin);

  return json({
    ok: r.servers.length > 0,
    nsr_base: getBase(env),
    request_origin: url.origin,
    api_token_configured: Boolean(env.NSR_API_TOKEN),
    upstream_status: r.status,
    auth_mode: r.authMode || null,
    retry_after: r.retryAfter || null,
    upstream_message: r.message || null,
    response_keys: r.keys || [],
    server_count: r.servers.length,
    servers: r.servers.map(({ id, name, label }) => ({ id, name, label }))
  });
}

function safeMessage(data) {
  if (!data || typeof data !== 'object') return '';
  const raw = data.message ?? data.error ?? data.detail ?? data.details ?? '';
  return typeof raw === 'string' ? raw.slice(0, 300) : '';
}

function parseJson(text) {
  try {
    return JSON.parse(String(text || '').trim() || '{}');
  } catch (_) {
    return {};
  }
}

function objectKeys(v) {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? Object.keys(v).slice(0, 20)
    : [];
}

function posInt(v, fallback) {
  const n = parseInt(v || '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function getBase(env) {
  const raw = String(env.NSR_BASE_URL || NSR_DEFAULT).trim();
  try {
    const u = new URL(raw);
    return (u.protocol === 'https:' || u.protocol === 'http:') ? u.origin : NSR_DEFAULT;
  } catch (_) {
    return NSR_DEFAULT;
  }
}

function normalizeOrigin(raw) {
  try {
    const u = new URL(raw);
    return u.origin;
  } catch (_) {
    return 'https://az-movies.aztvpremium.workers.dev';
  }
}

function isHttp(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (_) {
    return false;
  }
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
