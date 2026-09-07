const DEFAULT_NSR_BASE = 'https://nsrplay.space';

const APP_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#08090d">
<title>AZ Movies</title>
<style>
:root{--bg:#08090d;--panel:#171a22;--muted:#aeb4bf;--accent:#e50914;--blue:#55a8ff;--border:rgba(255,255,255,.09)}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:var(--bg);color:#fff;min-height:100vh}button,input,select{font:inherit}button{cursor:pointer}
.top{position:sticky;top:0;z-index:20;height:72px;padding:0 18px;display:flex;align-items:center;justify-content:space-between;background:rgba(8,9,13,.95);border-bottom:1px solid var(--border)}.brand{font-size:21px;font-weight:900}.brand span{color:var(--accent)}.search{width:min(48vw,330px);display:flex;align-items:center;gap:8px;background:#151922;border:1px solid var(--border);border-radius:999px;padding:10px 14px}.search input{width:100%;background:transparent;border:0;outline:0;color:#fff}
.hero{min-height:470px;position:relative;display:flex;align-items:flex-end;padding:48px 28px;overflow:hidden}.hero-bg{position:absolute;inset:0;background-size:cover;background-position:center}.hero-bg:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,9,13,.98),rgba(8,9,13,.58) 44%,rgba(8,9,13,.15)),linear-gradient(0deg,#08090d 0%,transparent 50%)}.hero-content{position:relative;z-index:1;max-width:680px}.tag{font-size:12px;font-weight:900;letter-spacing:1.5px;color:#ff646d;margin-bottom:10px}h1{font-size:clamp(38px,7vw,70px);line-height:1;font-weight:950;margin-bottom:14px}.meta{display:flex;gap:14px;flex-wrap:wrap;color:#ddd;margin-bottom:15px;font-weight:700}.rating{color:#ffd54a}.desc{color:#c6cad2;line-height:1.55;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.actions{display:flex;gap:10px;margin-top:22px;flex-wrap:wrap}.btn{border:0;border-radius:10px;padding:12px 18px;font-weight:850}.btn.primary{background:var(--accent);color:#fff}.btn.secondary{background:rgba(255,255,255,.14);color:#fff}
.section{padding:18px 20px 56px}.section-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px}.section-title{font-size:24px;font-weight:900}.tabs{display:flex;gap:8px}.tab{border:0;border-radius:9px;background:#171b24;color:#b8bec7;padding:10px 14px;font-weight:800}.tab.active{background:var(--accent);color:#fff}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:22px 14px}.card{outline:0;cursor:pointer}.poster{aspect-ratio:2/3;border-radius:13px;overflow:hidden;background:#151922;position:relative;box-shadow:0 10px 30px rgba(0,0,0,.25)}.poster img{width:100%;height:100%;object-fit:cover}.card:focus .poster{outline:4px solid #fff;outline-offset:4px}.score{position:absolute;right:8px;top:8px;background:rgba(0,0,0,.75);padding:5px 7px;border-radius:7px;color:#ffd54a;font-size:12px;font-weight:900}.title{margin-top:9px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.year{font-size:13px;color:var(--muted);margin-top:4px}.more-wrap{display:flex;justify-content:center;margin-top:30px}.more{border:1px solid var(--border);background:#171b24;color:#fff;border-radius:10px;padding:12px 20px;font-weight:800}.status{grid-column:1/-1;color:#aeb4bf;padding:40px 0;text-align:center}
.modal{display:none;position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.84);padding:18px;align-items:center;justify-content:center}.modal.show{display:flex}.detail-box{width:min(900px,96vw);max-height:92vh;overflow:auto;background:#11151d;border-radius:18px;border:1px solid var(--border);position:relative}.modal-hero{height:330px;background-size:cover;background-position:center;position:relative}.modal-hero:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,#11151d,rgba(17,21,29,.15))}.close{position:absolute;z-index:4;right:14px;top:14px;width:42px;height:42px;border:0;border-radius:50%;background:rgba(0,0,0,.72);color:#fff;font-size:20px}.modal-content{position:relative;z-index:2;margin-top:-80px;padding:0 28px 30px}.modal-content h2{font-size:36px;margin-bottom:12px}.modal-content p{color:#c5cad3;line-height:1.6}
.player-box{width:min(560px,96vw);background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:22px;position:relative}.player-title{font-size:27px;font-weight:800;color:var(--blue);padding-right:44px;margin-bottom:18px}.player-selects{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}.player-selects select{width:100%;background:#20242d;color:#fff;border:1px solid #373c48;border-radius:8px;padding:12px 14px}.video-wrap{background:#000;border-radius:10px;overflow:hidden;min-height:220px;display:flex;align-items:center;justify-content:center}.video-wrap video{width:100%;background:#000;display:block;max-height:58vh}.player-note{padding:14px 6px 0;color:#bfc5ce;font-size:14px;line-height:1.45;text-align:center}.player-note.error{color:#ff9aa0}
@media(max-width:700px){.top{padding:0 12px}.brand{font-size:18px}.search{width:56vw}.hero{min-height:440px;padding:38px 18px}.section{padding:14px 14px 48px}.section-head{align-items:flex-start;flex-direction:column}.grid{grid-template-columns:repeat(2,1fr)}.modal-content{padding:0 20px 24px}.modal-content h2{font-size:30px}.player-selects{grid-template-columns:1fr}.player-box{padding:18px}.player-title{font-size:24px}}
</style>
</head>
<body>
<header class="top"><div class="brand">AZ <span>MOVIES</span></div><div class="search"><span>⌕</span><input id="search" placeholder="Buscar..."></div></header>
<section class="hero"><div class="hero-bg" id="heroBg"></div><div class="hero-content"><div class="tag">● DESTACADO</div><h1 id="heroTitle">Cargando...</h1><div class="meta"><span id="heroYear">—</span><span class="rating" id="heroRating">★ —</span><span>HD</span></div><p class="desc" id="heroDesc"></p><div class="actions"><button class="btn primary" id="heroPlay">▶ Reproducir</button><button class="btn secondary" id="heroInfo">ⓘ Más información</button></div></div></section>
<section class="section"><div class="section-head"><div class="section-title" id="sectionTitle">Películas populares</div><div class="tabs"><button class="tab active" id="movieTab">Películas</button><button class="tab" id="tvTab">Series</button></div></div><div class="grid" id="grid"><div class="status">Cargando catálogo...</div></div><div class="more-wrap"><button class="more" id="more">Cargar más</button></div></section>
<div class="modal" id="detailModal"><div class="detail-box"><button class="close" data-close="detailModal">✕</button><div class="modal-hero" id="modalHero"></div><div class="modal-content"><h2 id="modalTitle"></h2><div class="meta"><span id="modalYear"></span><span class="rating" id="modalRating"></span><span id="modalType"></span></div><p id="modalDesc"></p><div class="actions"><button class="btn primary" id="modalPlay">▶ Reproducir</button><button class="btn secondary" data-close="detailModal">Regresar</button></div></div></div></div>
<div class="modal" id="playerModal"><div class="player-box"><button class="close" data-close="playerModal">✕</button><div class="player-title" id="playerTitle">Reproductor</div><div class="player-selects"><select id="serverSelect" disabled><option>Servidor</option></select><select id="formatSelect" disabled><option>Formato</option></select></div><div class="video-wrap"><video id="video" controls playsinline preload="metadata"></video></div><div class="player-note" id="playerNote">Buscando fuente…</div></div></div>
<script>
(function(){
var P500='https://image.tmdb.org/t/p/w500';
var PORIG='https://image.tmdb.org/t/p/original';
var type='movie',page=1,items=[],hero=null,selected=null,busy=false,playback=null,hlsInstance=null,hlsLoader=null;
function el(id){return document.getElementById(id)}
var grid=el('grid');
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]})}
function setStatus(msg){grid.innerHTML='<div class="status">'+esc(msg)+'</div>'}
async function load(reset){
  if(busy)return;
  busy=true;el('more').disabled=true;el('more').textContent='Cargando...';
  if(reset){page=1;items=[];setStatus('Cargando catálogo...')}
  try{
    var r=await fetch('/?action=catalog&type='+encodeURIComponent(type)+'&page='+page,{cache:'no-store'});
    var data=await r.json();
    if(!r.ok)throw new Error(data.error||'No se pudo cargar el catálogo');
    var results=Array.isArray(data.results)?data.results:[];
    for(var i=0;i<results.length;i++)items.push(results[i]);
    render(items);
    if(reset&&results.length){hero=results[0];for(var j=0;j<results.length;j++){if(results[j].backdrop_path){hero=results[j];break}}setHero(hero)}
    el('more').style.display=page>=(data.total_pages||1)?'none':'block';
  }catch(e){setStatus(e&&e.message?e.message:'Error cargando el catálogo')}
  busy=false;el('more').disabled=false;el('more').textContent='Cargar más';
}
function render(list){
  grid.innerHTML='';
  if(!list.length){setStatus('No encontramos resultados.');return}
  for(var i=0;i<list.length;i++)(function(x){
    var card=document.createElement('article');card.className='card';card.tabIndex=0;
    var t=x.title||x.name||'Sin título';var d=x.release_date||x.first_air_date||'';var y=d?d.slice(0,4):'—';var poster=x.poster_path?P500+x.poster_path:'';
    card.innerHTML='<div class="poster">'+(poster?'<img loading="lazy" src="'+poster+'" alt="'+esc(t)+'">':'')+'<div class="score">★ '+Number(x.vote_average||0).toFixed(1)+'</div></div><div class="title">'+esc(t)+'</div><div class="year">'+y+'</div>';
    card.onclick=function(){openDetails(x)};card.onkeydown=function(e){if(e.key==='Enter')openDetails(x)};grid.appendChild(card);
  })(list[i]);
}
function setHero(x){
  el('heroTitle').textContent=x.title||x.name||'Sin título';var d=x.release_date||x.first_air_date||'';el('heroYear').textContent=d?d.slice(0,4):'—';el('heroRating').textContent='★ '+Number(x.vote_average||0).toFixed(1);el('heroDesc').textContent=x.overview||'Sin descripción disponible.';el('heroBg').style.backgroundImage=x.backdrop_path?'url("'+PORIG+x.backdrop_path+'")':'none';
}
function openDetails(x){
  selected=x;el('modalTitle').textContent=x.title||x.name||'Sin título';var d=x.release_date||x.first_air_date||'';el('modalYear').textContent=d?d.slice(0,4):'';el('modalRating').textContent='★ '+Number(x.vote_average||0).toFixed(1);el('modalType').textContent=type==='movie'?'Película':'Serie';el('modalDesc').textContent=x.overview||'Sin descripción disponible.';el('modalHero').style.backgroundImage=x.backdrop_path?'url("'+PORIG+x.backdrop_path+'")':'none';el('detailModal').classList.add('show');
}
function destroyVideo(){var v=el('video');try{v.pause()}catch(e){}if(hlsInstance){try{hlsInstance.destroy()}catch(e){}hlsInstance=null}v.removeAttribute('src');v.load()}
function closeModal(id){el(id).classList.remove('show');if(id==='playerModal')destroyVideo()}
function note(msg,error){var n=el('playerNote');n.textContent=msg||'';n.className='player-note'+(error?' error':'')}
async function requestPlayback(item,server){
  var q='?action=playback&type='+encodeURIComponent(type)+'&id='+encodeURIComponent(String(item.id));
  if(type==='tv')q+='&season=1&episode=1';
  if(server)q+='&server='+encodeURIComponent(server);
  var r=await fetch('/'+q,{cache:'no-store'});var data=await r.json();if(!r.ok)throw new Error(data.error||'No hay fuente disponible');return data;
}
async function openPlayer(item){
  if(!item)return;selected=item;el('detailModal').classList.remove('show');el('playerModal').classList.add('show');el('playerTitle').textContent=item.title||item.name||'Reproductor';destroyVideo();note('Buscando servidores…',false);el('serverSelect').disabled=true;el('formatSelect').disabled=true;
  try{playback=await requestPlayback(item,'');fillServers(playback);fillFormats(playback.streams||[])}catch(e){note(e&&e.message?e.message:'No hay fuente disponible',true)}
}
function fillServers(data){
  var list=(data&&Array.isArray(data.servers))?data.servers:[];var s=el('serverSelect');s.innerHTML='';if(!list.length){s.disabled=true;note('No hay servidores disponibles para este contenido.',true);return}
  for(var i=0;i<list.length;i++){var o=document.createElement('option');o.value=list[i].name||'';o.textContent=list[i].name||('Servidor '+(i+1));s.appendChild(o)}
  if(data.server)s.value=data.server;s.disabled=false;s.onchange=changeServer;
}
async function changeServer(){
  var name=el('serverSelect').value;if(!selected||!name)return;el('formatSelect').disabled=true;note('Cambiando servidor…',false);destroyVideo();
  try{playback=await requestPlayback(selected,name);fillFormats(playback.streams||[])}catch(e){fillFormats([]);note(e&&e.message?e.message:'Ese servidor no está disponible',true)}
}
function fillFormats(streams){
  var f=el('formatSelect');f.innerHTML='';if(!Array.isArray(streams)||!streams.length){f.disabled=true;note('Ese servidor no tiene formatos disponibles.',true);return}
  for(var i=0;i<streams.length;i++){var o=document.createElement('option');o.value=String(i);o.textContent=streams[i].label||String(streams[i].format||'Video').toUpperCase();f.appendChild(o)}f.disabled=false;f.onchange=playSelected;playSelected();
}
function loadHlsJs(){
  if(window.Hls)return Promise.resolve(window.Hls);if(hlsLoader)return hlsLoader;
  hlsLoader=new Promise(function(resolve,reject){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js';s.async=true;s.onload=function(){window.Hls?resolve(window.Hls):reject(new Error('HLS no disponible'))};s.onerror=function(){reject(new Error('No se pudo cargar soporte HLS'))};document.head.appendChild(s)});return hlsLoader;
}
async function playSelected(){
  var fi=Number(el('formatSelect').value||0);var st=playback&&Array.isArray(playback.streams)?playback.streams[fi]:null;if(!st||!st.url){note('La fuente seleccionada no es válida.',true);return}
  destroyVideo();var v=el('video');var isHls=st.format==='hls'||/\.m3u8(?:$|\?)/i.test(st.url);note('Cargando video…',false);
  if(isHls&&v.canPlayType('application/vnd.apple.mpegurl')){v.src=st.url;v.addEventListener('loadedmetadata',function(){note('',false);v.play().catch(function(){})},{once:true});v.addEventListener('error',function(){note('No se pudo reproducir este HLS.',true)},{once:true});v.load();return}
  if(isHls){try{var Hls=await loadHlsJs();if(Hls.isSupported()){hlsInstance=new Hls({enableWorker:true});hlsInstance.loadSource(st.url);hlsInstance.attachMedia(v);hlsInstance.on(Hls.Events.MANIFEST_PARSED,function(){note('',false);v.play().catch(function(){})});hlsInstance.on(Hls.Events.ERROR,function(e,d){if(d&&d.fatal)note('No se pudo reproducir este HLS.',true)});return}}catch(e){note(e.message||'No se pudo cargar HLS',true);return}}
  v.src=st.url;v.addEventListener('loadedmetadata',function(){note('',false);v.play().catch(function(){})},{once:true});v.addEventListener('error',function(){note('No se pudo reproducir esta fuente. Prueba otro servidor o formato.',true)},{once:true});v.load();
}
function setType(t){type=t;el('movieTab').classList.toggle('active',t==='movie');el('tvTab').classList.toggle('active',t==='tv');el('sectionTitle').textContent=t==='movie'?'Películas populares':'Series populares';el('search').value='';load(true)}
el('movieTab').onclick=function(){setType('movie')};el('tvTab').onclick=function(){setType('tv')};el('more').onclick=function(){page++;load(false)};el('search').oninput=function(e){var q=e.target.value.trim().toLowerCase();if(!q){render(items);return}var filtered=[];for(var i=0;i<items.length;i++){var text=((items[i].title||items[i].name||'')+' '+(items[i].overview||'')).toLowerCase();if(text.indexOf(q)!==-1)filtered.push(items[i])}render(filtered)};el('heroInfo').onclick=function(){if(hero)openDetails(hero)};el('heroPlay').onclick=function(){if(hero)openPlayer(hero)};el('modalPlay').onclick=function(){if(selected)openPlayer(selected)};
var closers=document.querySelectorAll('[data-close]');for(var c=0;c<closers.length;c++)closers[c].onclick=function(){closeModal(this.getAttribute('data-close'))};
var modals=document.querySelectorAll('.modal');for(var m=0;m<modals.length;m++)modals[m].addEventListener('click',function(e){if(e.target===this)closeModal(this.id)});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeModal('detailModal');closeModal('playerModal')}});
load(true);
})();
</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() });
    const action = url.searchParams.get('action');

    if (!action) {
      return new Response(APP_HTML, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    if (action === 'health') {
      return json({
        ok: true,
        tmdb_configured: Boolean(env.TMDB_API_KEY),
        nsr_base: getNsrBase(env),
        stream_proxy_ready: Boolean(env.STREAM_PROXY_SECRET || env.TMDB_API_KEY)
      });
    }

    if (action === 'catalog') {
      if (!env.TMDB_API_KEY) return json({ error: 'Falta configurar TMDB_API_KEY en las variables del Worker.' }, 500);
      const type = normalizeType(url.searchParams.get('type'));
      const page = clampInt(url.searchParams.get('page'), 1, 500, 1);
      try {
        const endpoint = 'https://api.themoviedb.org/3/' + type + '/popular?api_key=' + encodeURIComponent(env.TMDB_API_KEY) + '&language=es-MX&page=' + page;
        const tmdbRes = await fetch(endpoint, { headers: { Accept: 'application/json' } });
        const data = await safeJson(tmdbRes);
        if (!tmdbRes.ok) return json({ error: 'TMDB respondió con un error.', details: data }, tmdbRes.status);
        return json(data, 200);
      } catch (err) {
        return json({ error: 'No se pudo conectar con TMDB.', details: err.message }, 500);
      }
    }

    if (action === 'playback') {
      const type = normalizeType(url.searchParams.get('type'));
      const id = clampInt(url.searchParams.get('id'), 1, 999999999, 0);
      const season = clampInt(url.searchParams.get('season'), 1, 999, 1);
      const episode = clampInt(url.searchParams.get('episode'), 1, 9999, 1);
      const selectedServer = (url.searchParams.get('server') || '').trim();
      if (!id) return json({ error: 'Falta un id válido.' }, 400);
      if (!(env.STREAM_PROXY_SECRET || env.TMDB_API_KEY)) return json({ error: 'Falta configurar STREAM_PROXY_SECRET o TMDB_API_KEY.' }, 500);

      try {
        const rawServers = await getNsrServers(type, id, season, episode, env);
        if (!rawServers.length) return json({ error: 'Sin servidores disponibles en NSR Play.' }, 404);

        let target = rawServers[0];
        if (selectedServer) {
          const found = rawServers.find(function(s) { return s.name.toLowerCase() === selectedServer.toLowerCase(); });
          if (found) target = found;
        }

        const streams = await resolveNsrServer(target, env, url.origin);
        if (!streams.length) return json({ error: 'El servidor seleccionado no devolvió una fuente reproducible.' }, 404);

        return json({
          success: true,
          server: target.name,
          servers: rawServers.map(function(s) { return { name: s.name }; }),
          streams: streams
        }, 200);
      } catch (err) {
        const status = err && err.status ? err.status : 500;
        return json({ error: err && err.message ? err.message : 'Error consultando NSR Play.' }, status);
      }
    }

    if (action === 'stream') {
      return proxyStream(request, url, env);
    }

    return json({ error: 'Acción no reconocida.' }, 404);
  }
};

function normalizeType(value) {
  return value === 'tv' ? 'tv' : 'movie';
}

function clampInt(value, min, max, fallback) {
  const n = parseInt(value || '', 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

function getNsrBase(env) {
  const raw = (env.NSR_BASE_URL || DEFAULT_NSR_BASE).trim();
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return DEFAULT_NSR_BASE;
    return u.origin;
  } catch (_) {
    return DEFAULT_NSR_BASE;
  }
}

function nsrHeaders(env) {
  const base = getNsrBase(env);
  return {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
    'Referer': base + '/',
    'Origin': base,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8'
  };
}

async function getNsrServers(type, id, season, episode, env) {
  const base = getNsrBase(env);
  let path = '/api/v1/embed/sources/movie/' + encodeURIComponent(String(id)) + '?fast=true';
  if (type === 'tv') {
    path = '/api/v1/embed/sources/tv/' + encodeURIComponent(String(id)) + '/' + encodeURIComponent(String(season)) + '/' + encodeURIComponent(String(episode)) + '?fast=true';
  }

  const res = await fetch(base + path, { method: 'GET', headers: nsrHeaders(env), redirect: 'follow' });
  const data = await safeJson(res);
  if (!res.ok) throw httpError('NSR Play no devolvió servidores para este contenido.', res.status === 404 ? 404 : 502);

  const list = Array.isArray(data && data.servers) ? data.servers : [];
  const out = [];
  const seen = new Set();
  for (let i = 0; i < list.length; i++) {
    const item = list[i] || {};
    const name = String(item.name || '').trim();
    const token = String(item.token || '').trim();
    if (!name || !token) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: name, token: token });
  }
  return out;
}

async function resolveNsrServer(server, env, origin) {
  const base = getNsrBase(env);
  const endpoint = new URL('/api/v1/embed/resolve', base);
  endpoint.searchParams.set('server', server.name);
  endpoint.searchParams.set('token', server.token);

  const res = await fetch(endpoint.toString(), { method: 'GET', headers: nsrHeaders(env), redirect: 'follow' });
  const data = await safeJson(res);
  if (!res.ok) throw httpError('No se pudo resolver el servidor ' + server.name + '.', 502);

  const info = data && data.data && typeof data.data === 'object' ? data.data : {};
  const candidates = [];
  if (typeof info.playUrl === 'string' && info.playUrl) candidates.push({ raw: info.playUrl, label: 'MP4 / Video', format: inferFormat(info.playUrl) });
  if (typeof info.directUrl === 'string' && info.directUrl) candidates.push({ raw: info.directUrl, label: 'HLS / M3U8', format: inferFormat(info.directUrl) });
  if (typeof info.url === 'string' && info.url) candidates.push({ raw: info.url, label: 'Video', format: inferFormat(info.url) });

  const streams = [];
  const seen = new Set();
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (!isSafeStreamUrl(c.raw) || seen.has(c.raw)) continue;
    seen.add(c.raw);
    streams.push({
      format: c.format,
      label: c.label,
      url: await makeProxyUrl(c.raw, origin, env)
    });
  }
  return streams;
}

async function proxyStream(request, url, env) {
  const target = url.searchParams.get('stream_url') || '';
  const exp = parseInt(url.searchParams.get('exp') || '0', 10);
  const sig = url.searchParams.get('sig') || '';
  if (!target || !exp || !sig) return json({ error: 'Faltan parámetros del stream.' }, 400);
  if (!isSafeStreamUrl(target)) return json({ error: 'URL de stream no válida.' }, 400);

  const now = Math.floor(Date.now() / 1000);
  if (exp < now || exp > now + 3600) return json({ error: 'El enlace del stream expiró.' }, 403);
  const secret = String(env.STREAM_PROXY_SECRET || env.TMDB_API_KEY || '');
  if (!secret) return json({ error: 'Proxy de stream no configurado.' }, 500);
  const valid = await verifySignature(exp + '\n' + target, sig, secret);
  if (!valid) return json({ error: 'Firma de stream inválida.' }, 403);

  const headers = new Headers();
  const base = getNsrBase(env);
  headers.set('User-Agent', 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36');
  headers.set('Referer', base + '/');
  headers.set('Origin', base);
  headers.set('Accept', request.headers.get('Accept') || '*/*');
  if (request.headers.has('Range')) headers.set('Range', request.headers.get('Range'));
  if (request.headers.has('If-None-Match')) headers.set('If-None-Match', request.headers.get('If-None-Match'));
  if (request.headers.has('If-Modified-Since')) headers.set('If-Modified-Since', request.headers.get('If-Modified-Since'));

  let upstream;
  try {
    upstream = await fetch(target, { method: request.method === 'HEAD' ? 'HEAD' : 'GET', headers: headers, redirect: 'follow' });
  } catch (err) {
    return json({ error: 'No se pudo conectar con el servidor de video.', details: err.message }, 502);
  }

  const finalUrl = upstream.url || target;
  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const isHls = /mpegurl/i.test(contentType) || /\.m3u8(?:$|\?)/i.test(finalUrl);

  if (request.method !== 'HEAD' && isHls && upstream.ok) {
    const text = await upstream.text();
    const rewritten = await rewriteM3U8(text, finalUrl, url.origin, env);
    return new Response(rewritten, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'no-store'
      }
    });
  }

  const out = new Headers();
  out.set('Access-Control-Allow-Origin', '*');
  out.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  out.set('Access-Control-Allow-Headers', '*');
  const copy = ['content-type','content-length','content-range','accept-ranges','cache-control','etag','last-modified'];
  for (let i = 0; i < copy.length; i++) {
    const value = upstream.headers.get(copy[i]);
    if (value) out.set(copy[i], value);
  }
  return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers: out });
}

async function rewriteM3U8(text, baseUrl, origin, env) {
  const lines = String(text || '').split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) { out.push(line); continue; }
    if (line.charAt(0) === '#') {
      out.push(await rewriteTagUris(line, baseUrl, origin, env));
      continue;
    }
    try {
      const abs = new URL(line.trim(), baseUrl).toString();
      out.push(await makeProxyUrl(abs, origin, env));
    } catch (_) {
      out.push(line);
    }
  }
  return out.join('\n');
}

async function rewriteTagUris(line, baseUrl, origin, env) {
  const re = /URI="([^"]+)"/g;
  let result = '';
  let last = 0;
  let match;
  while ((match = re.exec(line))) {
    result += line.slice(last, match.index);
    let replacement = match[0];
    try {
      const abs = new URL(match[1], baseUrl).toString();
      replacement = 'URI="' + await makeProxyUrl(abs, origin, env) + '"';
    } catch (_) {}
    result += replacement;
    last = re.lastIndex;
  }
  return result + line.slice(last);
}

async function makeProxyUrl(target, origin, env) {
  if (!isSafeStreamUrl(target)) throw new Error('URL de stream no válida.');
  const secret = String(env.STREAM_PROXY_SECRET || env.TMDB_API_KEY || '');
  if (!secret) throw new Error('Falta secreto para el proxy de stream.');
  const exp = Math.floor(Date.now() / 1000) + 1200;
  const sig = await signMessage(exp + '\n' + target, secret);
  const q = new URLSearchParams();
  q.set('action', 'stream');
  q.set('stream_url', target);
  q.set('exp', String(exp));
  q.set('sig', sig);
  return origin + '/?' + q.toString();
}

function isSafeStreamUrl(raw) {
  let u;
  try { u = new URL(raw); } catch (_) { return false; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.local')) return false;
  if (host === '::1' || host === '[::1]' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) return false;
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
  return bytesToHex(new Uint8Array(sig));
}

async function verifySignature(message, signatureHex, secret) {
  if (!/^[0-9a-fA-F]{64}$/.test(signatureHex)) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', key, hexToBytes(signatureHex), new TextEncoder().encode(message));
}

function bytesToHex(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function inferFormat(value) {
  return /\.m3u8(?:$|\?)/i.test(value || '') ? 'hls' : 'mp4';
}

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function safeJson(response) {
  try { return await response.json(); } catch (_) { return {}; }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status: status, headers: corsHeaders() });
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*'
  };
}
