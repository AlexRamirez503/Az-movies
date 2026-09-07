import app from './worker.js';

const DEFAULT_NSR_BASE = 'https://nsrplay.space';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'playback') return handlePlayback(url, env);
    if (action === 'nsr-debug') return handleDebug(url, env);

    // El catálogo, la interfaz y el proxy de video siguen usando worker.js.
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
    const result = await discoverServers(type, id, season, episode, env);
    const servers = result.servers;

    if (!servers.length) {
      let message = 'NSR Play no devolvió servidores para este contenido.';
      if (!env.NSR_API_TOKEN && (result.status === 401 || result.status === 403)) {
        message = 'NSR Play requiere autenticación. Configura NSR_API_TOKEN como secreto en Cloudflare.';
      }
      return json({
        error: message,
        nsr_status: result.status,
        response_keys: result.keys,
        api_token_configured: Boolean(env.NSR_API_TOKEN)
      }, 404);
    }

    let target = null;
    if (selectedKey) {
      target = servers.find(s => s.key === selectedKey) ||
               servers.find(s => s.name.toLowerCase() === selectedKey.toLowerCase()) || null;
    }

    // Sin selección explícita: intenta el primer servidor que realmente resuelva,
    // pero SIEMPRE devuelve la lista completa para llenar el selector.
    if (!target) {
      for (const candidate of servers) {
        try {
          const streams = await resolveServer(candidate, env, url.origin);
          if (streams.length) {
            return json({
              success: true,
              server: candidate.key,
              server_name: candidate.name,
              servers: publicServers(servers),
              streams
            });
          }
        } catch (_) {}
      }

      return json({
        success: true,
        server: servers[0].key,
        server_name: servers[0].name,
        servers: publicServers(servers),
        streams: [],
        warning: 'Se encontraron servidores, pero el primero no pudo resolverse. Selecciona otro servidor.'
      });
    }

    const streams = await resolveServer(target, env, url.origin);
    return json({
      success: true,
      server: target.key,
      server_name: target.name,
      servers: publicServers(servers),
      streams
    });
  } catch (err) {
    return json({ error: err?.message || 'Error consultando NSR Play.' }, err?.status || 500);
  }
}

async function discoverServers(type, id, season, episode, env) {
  const base = getNsrBase(env);
  const paths = buildSourcePaths(type, id, season, episode);
  const auth = buildAuthAttempts(env);

  let lastStatus = 0;
  let lastKeys = [];

  for (const path of paths) {
    for (const attempt of auth) {
      const endpoint = new URL(path, base);
      for (const [k, v] of Object.entries(attempt.query)) endpoint.searchParams.set(k, v);

      let res;
      try {
        res = await fetch(endpoint.toString(), {
          method: 'GET',
          headers: attempt.headers,
          redirect: 'follow'
        });
      } catch (_) {
        continue;
      }

      lastStatus = res.status;
      const rawText = await res.text();
      const data = parseJsonDeep(rawText);
      lastKeys = topKeys(data);
      const list = findServerArray(data);
      const normalized = normalizeServers(list);
      if (normalized.length) {
        return { servers: normalized, status: res.status, keys: lastKeys };
      }
    }
  }

  return { servers: [], status: lastStatus, keys: lastKeys };
}

function buildSourcePaths(type, id, season, episode) {
  const basePath = type === 'tv'
    ? `/api/v1/embed/sources/tv/${encodeURIComponent(String(id))}/${encodeURIComponent(String(season))}/${encodeURIComponent(String(episode))}`
    : `/api/v1/embed/sources/movie/${encodeURIComponent(String(id))}`;

  // Primero exactamente como el código original, luego dos fallbacks.
  return [
    `${basePath}?fast=true`,
    basePath,
    `${basePath}?fast=false`
  ];
}

function buildAuthAttempts(env) {
  const base = getNsrBase(env);
  const common = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36',
    'Referer': base + '/',
    'Accept': 'application/json',
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8'
  };

  const attempts = [{ headers: common, query: {} }];
  const token = String(env.NSR_API_TOKEN || '').trim();
  if (!token) return attempts;

  attempts.push({ headers: { ...common, Authorization: `Bearer ${token}` }, query: {} });
  attempts.push({ headers: { ...common, Authorization: token }, query: {} });
  attempts.push({ headers: { ...common, 'X-API-Key': token }, query: {} });
  attempts.push({ headers: { ...common, 'X-API-Token': token }, query: {} });
  attempts.push({ headers: common, query: { api_key: token } });
  attempts.push({ headers: common, query: { apikey: token } });
  attempts.push({ headers: common, query: { key: token } });

  return attempts;
}

function findServerArray(data) {
  const seen = new Set();

  function walk(value, depth) {
    if (depth > 6 || value == null) return null;

    if (typeof value === 'string') {
      const parsed = parseJsonDeep(value);
      if (parsed !== value) return walk(parsed, depth + 1);
      return null;
    }

    if (Array.isArray(value)) {
      if (looksLikeServerArray(value)) return value;
      for (const item of value) {
        const found = walk(item, depth + 1);
        if (found) return found;
      }
      return null;
    }

    if (typeof value !== 'object') return null;
    if (seen.has(value)) return null;
    seen.add(value);

    const preferred = [
      'servers','servidores','servidores_disponibles','available_servers',
      'sources','providers','embeds','data','result','results','payload'
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
  let matches = 0;
  for (const item of list.slice(0, 10)) {
    if (!item || typeof item !== 'object') continue;
    const name = item.name ?? item.nombre ?? item.server ?? item.servidor ?? item.provider ?? item.host;
    const token = item.token ?? item.key ?? item.server_token ?? item.embed_token ?? item.id;
    if (name != null && token != null) matches++;
  }
  return matches > 0;
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
    const k = name.toLowerCase();
    totals[k] = (totals[k] || 0) + 1;
  }

  const counts = Object.create(null);
  return rows.map(row => {
    const k = row.name.toLowerCase();
    counts[k] = (counts[k] || 0) + 1;
    return {
      key: `srv_${row.sourceIndex}`,
      name: row.name,
      label: totals[k] > 1 ? `${row.name} ${counts[k]}` : row.name,
      token: row.token
    };
  });
}

async function resolveServer(server, env, origin) {
  const base = getNsrBase(env);
  const authAttempts = buildAuthAttempts(env);
  let lastStatus = 0;

  for (const attempt of authAttempts) {
    const endpoint = new URL('/api/v1/embed/resolve', base);
    endpoint.searchParams.set('server', server.name);
    endpoint.searchParams.set('token', server.token);
    for (const [k, v] of Object.entries(attempt.query)) {
      // No sobrescribir el token del servidor.
      if (k !== 'token') endpoint.searchParams.set(k, v);
    }

    let res;
    try {
      res = await fetch(endpoint.toString(), {
        method: 'GET',
        headers: attempt.headers,
        redirect: 'follow'
      });
    } catch (_) {
      continue;
    }

    lastStatus = res.status;
    const rawText = await res.text();
    const data = parseJsonDeep(rawText);
    const streams = extractStreams(data);
    if (streams.length) {
      const output = [];
      const seen = new Set();
      for (const stream of streams) {
        if (!isPublicHttpUrl(stream.url) || seen.has(stream.url)) continue;
        seen.add(stream.url);
        output.push({
          format: stream.format,
          label: stream.format === 'hls' ? 'HLS / M3U8' : 'MP4 (Proxy)',
          url: await signedProxyUrl(stream.url, origin, env)
        });
      }
      if (output.length) return output;
    }
  }

  const err = new Error(`No se pudo resolver el servidor ${server.label || server.name}.`);
  err.status = lastStatus === 404 ? 404 : 502;
  throw err;
}

function extractStreams(data) {
  const found = [];
  const seenObjects = new Set();

  function add(raw, explicitFormat) {
    if (typeof raw !== 'string' || !raw.trim()) return;
    const url = raw.trim();
    const lower = url.toLowerCase();
    const format = explicitFormat || (lower.includes('.m3u8') ? 'hls' : 'mp4');
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
    if (seenObjects.has(value)) return;
    seenObjects.add(value);

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
    response_keys: result.keys,
    server_count: result.servers.length,
    servers: publicServers(result.servers)
  });
}

function publicServers(servers) {
  return servers.map(s => ({ id: s.key, name: s.name, label: s.label }));
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
    try { value = JSON.parse(s); }
    catch (_) { break; }
  }
  return value;
}

function topKeys(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).slice(0, 30) : [];
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

function intInRange(value, min, max, fallback) {
  const n = parseInt(value || '', 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

function isPublicHttpUrl(raw) {
  let u;
  try { u = new URL(raw); } catch (_) { return false; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (u.username || u.password) return false;
  const h = u.hostname.toLowerCase();
  if (!h || h === 'localhost' || h.endsWith('.local')) return false;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
  }
  return true;
}

async function signedProxyUrl(target, origin, env) {
  const secret = String(env.STREAM_PROXY_SECRET || env.TMDB_API_KEY || '');
  if (!secret) throw new Error('Falta secreto para el proxy de stream.');
  const exp = Math.floor(Date.now() / 1000) + 1200;
  const message = `${exp}\n${target}`;
  const sig = await signMessage(message, secret);
  const q = new URLSearchParams();
  q.set('action', 'stream');
  q.set('stream_url', target);
  q.set('exp', String(exp));
  q.set('sig', sig);
  return `${origin}/?${q.toString()}`;
}

async function signMessage(message, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return bytesToHex(new Uint8Array(signature));
}

function bytesToHex(bytes) {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    }
  });
}
