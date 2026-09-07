import app from './worker.js';

const DEFAULT_NSR_BASE = 'https://nsrplay.space';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'playback') return handlePlayback(url, env);
    if (action === 'stream') return proxyStream(request, url, env);
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
    const serverResult = await getServers(type, id, season, episode, env);
    const servers = serverResult.servers;
    if (!servers.length) {
      return json({
        error: 'NSR Play no devolvió servidores para este contenido.',
        nsr_status: serverResult.status,
        response_keys: serverResult.keys
      }, 404);
    }

    let target = selectedKey ? servers.find(s => s.key === selectedKey) : null;

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
        warning: 'Se encontraron servidores, pero ninguno resolvió automáticamente. Selecciona uno.'
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

function publicServers(servers) {
  return servers.map(s => ({ id: s.key, name: s.name, label: s.label }));
}

async function getServers(type, id, season, episode, env) {
  const base = getNsrBase(env);
  let path = `/api/v1/embed/sources/movie/${encodeURIComponent(String(id))}?fast=true`;
  if (type === 'tv') {
    path = `/api/v1/embed/sources/tv/${encodeURIComponent(String(id))}/${encodeURIComponent(String(season))}/${encodeURIComponent(String(episode))}?fast=true`;
  }

  const attempts = requestHeaderVariants(env);
  let lastStatus = 0;
  let lastKeys = [];

  for (const headers of attempts) {
    let res;
    try {
      res = await fetch(base + path, { headers, redirect: 'follow' });
    } catch (_) {
      continue;
    }
    lastStatus = res.status;
    const data = await safeJson(res);
    lastKeys = objectKeys(data);
    const list = extractServerArray(data);
    if (list.length) return { servers: normalizeServers(list), status: res.status, keys: lastKeys };
  }

  return { servers: [], status: lastStatus, keys: lastKeys };
}

function extractServerArray(data) {
  if (Array.isArray(data)) return data;
  const candidates = [
    data?.servers,
    data?.data?.servers,
    data?.result?.servers,
    data?.results?.servers,
    data?.servidores,
    data?.servidores_disponibles,
    data?.available_servers,
    data?.data?.available_servers,
    data?.sources,
    data?.data?.sources
  ];
  for (const value of candidates) if (Array.isArray(value)) return value;
  return [];
}

function normalizeServers(list) {
  const valid = [];
  const totals = Object.create(null);
  for (let i = 0; i < list.length; i++) {
    const item = list[i] || {};
    const name = String(item.name ?? item.nombre ?? item.server ?? item.servidor ?? '').trim();
    const token = String(item.token ?? item.key ?? item.server_token ?? '').trim();
    if (!name || !token) continue;
    valid.push({ sourceIndex: i, name, token });
    const k = name.toLowerCase();
    totals[k] = (totals[k] || 0) + 1;
  }

  const seen = Object.create(null);
  return valid.map(item => {
    const k = item.name.toLowerCase();
    seen[k] = (seen[k] || 0) + 1;
    return {
      key: `srv_${item.sourceIndex}`,
      name: item.name,
      label: totals[k] > 1 ? `${item.name} ${seen[k]}` : item.name,
      token: item.token
    };
  });
}

async function resolveServer(server, env, origin) {
  const base = getNsrBase(env);
  const endpoint = new URL('/api/v1/embed/resolve', base);
  endpoint.searchParams.set('server', server.name);
  endpoint.searchParams.set('token', server.token);

  let lastStatus = 0;
  for (const headers of requestHeaderVariants(env)) {
    let res;
    try {
      res = await fetch(endpoint.toString(), { headers, redirect: 'follow' });
    } catch (_) {
      continue;
    }
    lastStatus = res.status;
    const data = await safeJson(res);
    const info = extractStreamInfo(data);
    const candidates = streamCandidates(info);
    if (!candidates.length) continue;

    const streams = [];
    const seen = new Set();
    for (const c of candidates) {
      if (!isSafeUrl(c.raw) || seen.has(c.raw)) continue;
      seen.add(c.raw);
      streams.push({ format: c.format, label: c.label, url: await makeProxyUrl(c.raw, origin, env) });
    }
    if (streams.length) return streams;
  }

  const err = new Error(`No se pudo resolver el servidor ${server.label || server.name}.`);
  err.status = lastStatus === 404 ? 404 : 502;
  throw err;
}

function extractStreamInfo(data) {
  for (const value of [data?.data, data?.result, data?.stream, data]) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  }
  return {};
}

function streamCandidates(info) {
  const out = [];
  const add = (raw, label) => {
    if (typeof raw !== 'string' || !raw.trim()) return;
    const value = raw.trim();
    out.push({ raw: value, label, format: inferFormat(value) });
  };
  add(info.playUrl, 'MP4 / Video');
  add(info.play_url, 'MP4 / Video');
  add(info.directUrl, 'HLS / M3U8');
  add(info.direct_url, 'HLS / M3U8');
  add(info.url, 'Video');
  add(info.stream_url, 'Video');
  return out;
}

function requestHeaderVariants(env) {
  const base = getNsrBase(env);
  const common = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36',
    'Referer': base + '/',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8'
  };
  const variants = [common];
  const token = String(env.NSR_API_TOKEN || '').trim();
  if (token) {
    variants.push({ ...common, 'Authorization': `Bearer ${token}` });
    variants.push({ ...common, 'X-API-Key': token });
    variants.push({ ...common, 'X-API-Token': token });
  }
  return variants;
}

async function handleDebug(url, env) {
  const type = url.searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const id = intInRange(url.searchParams.get('id'), 1, 999999999, 0);
  const season = intInRange(url.searchParams.get('season'), 1, 999, 1);
  const episode = intInRange(url.searchParams.get('episode'), 1, 9999, 1);
  if (!id) return json({ error: 'Falta id.' }, 400);
  const result = await getServers(type, id, season, episode, env);
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

async function proxyStream(request, url, env) {
  const target = url.searchParams.get('stream_url') || '';
  const exp = Number(url.searchParams.get('exp') || 0);
  const sig = url.searchParams.get('sig') || '';
  if (!target || !exp || !sig) return json({ error: 'Faltan parámetros del stream.' }, 400);
  if (!isSafeUrl(target)) return json({ error: 'URL de stream no válida.' }, 400);

  const now = Math.floor(Date.now() / 1000);
  if (exp < now || exp > now + 3600) return json({ error: 'El enlace del stream expiró.' }, 403);
  const secret = String(env.STREAM_PROXY_SECRET || env.TMDB_API_KEY || '');
  if (!secret) return json({ error: 'Proxy de stream no configurado.' }, 500);
  if (!(await verifySignature(`${exp}\n${target}`, sig, secret))) return json({ error: 'Firma de stream inválida.' }, 403);

  const headers = new Headers();
  headers.set('User-Agent', 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36');
  headers.set('Referer', getNsrBase(env) + '/');
  headers.set('Accept', request.headers.get('Accept') || '*/*');
  if (request.headers.has('Range')) headers.set('Range', request.headers.get('Range'));

  let upstream;
  try {
    upstream = await fetch(target, { method: request.method === 'HEAD' ? 'HEAD' : 'GET', headers, redirect: 'follow' });
  } catch (err) {
    return json({ error: 'No se pudo conectar con el servidor de video.', details: err.message }, 502);
  }

  const finalUrl = upstream.url || target;
  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const isHls = /mpegurl/i.test(contentType) || /\.m3u8(?:$|\?)/i.test(finalUrl);
  if (request.method !== 'HEAD' && isHls && upstream.ok) {
    const text = await upstream.text();
    const rewritten = await rewriteM3U8(text, finalUrl, url.origin, env);
    return new Response(rewritten, { status: upstream.status, headers: { 'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } });
  }

  const out = new Headers();
  out.set('Access-Control-Allow-Origin', '*');
  for (const h of ['content-type','content-length','content-range','accept-ranges','cache-control','etag','last-modified']) {
    const value = upstream.headers.get(h);
    if (value) out.set(h, value);
  }
  return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers: out });
}

async function rewriteM3U8(text, baseUrl, origin, env) {
  const lines = String(text || '').split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    if (!line) { out.push(line); continue; }
    if (line.startsWith('#')) { out.push(await rewriteTagUris(line, baseUrl, origin, env)); continue; }
    try { out.push(await makeProxyUrl(new URL(line.trim(), baseUrl).toString(), origin, env)); }
    catch (_) { out.push(line); }
  }
  return out.join('\n');
}

async function rewriteTagUris(line, baseUrl, origin, env) {
  const re = /URI="([^"]+)"/g;
  let result = '', last = 0, match;
  while ((match = re.exec(line))) {
    result += line.slice(last, match.index);
    let replacement = match[0];
    try { replacement = `URI="${await makeProxyUrl(new URL(match[1], baseUrl).toString(), origin, env)}"`; }
    catch (_) {}
    result += replacement;
    last = re.lastIndex;
  }
  return result + line.slice(last);
}

async function makeProxyUrl(target, origin, env) {
  if (!isSafeUrl(target)) throw new Error('URL de stream no válida.');
  const secret = String(env.STREAM_PROXY_SECRET || env.TMDB_API_KEY || '');
  if (!secret) throw new Error('Falta secreto para el proxy de stream.');
  const exp = Math.floor(Date.now() / 1000) + 1200;
  const sig = await signMessage(`${exp}\n${target}`, secret);
  const q = new URLSearchParams({ action: 'stream', stream_url: target, exp: String(exp), sig });
  return `${origin}/?${q.toString()}`;
}

function getNsrBase(env) {
  const raw = String(env.NSR_BASE_URL || DEFAULT_NSR_BASE).trim();
  try {
    const u = new URL(raw);
    return (u.protocol === 'https:' || u.protocol === 'http:') ? u.origin : DEFAULT_NSR_BASE;
  } catch (_) { return DEFAULT_NSR_BASE; }
}

function intInRange(value, min, max, fallback) {
  const n = parseInt(value || '', 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

function objectKeys(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).slice(0, 20) : [];
}

function inferFormat(url) {
  return String(url || '').toLowerCase().includes('.m3u8') ? 'hls' : 'mp4';
}

function isSafeUrl(raw) {
  let u;
  try { u = new URL(raw); } catch (_) { return false; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.local')) return false;
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    if (a === 10 || a === 127 || a === 0 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
  }
  return true;
}

async function signMessage(message, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifySignature(message, hex, secret) {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return false;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(message));
}

async function safeJson(res) {
  try { return await res.json(); } catch (_) { return {}; }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Allow-Headers': '*', 'Cache-Control': 'no-store' } });
}
