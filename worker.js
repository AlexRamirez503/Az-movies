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
var type='movie',page=1,items=[],hero=null,selected=null,busy=false,playback=null;
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
function destroyVideo(){var v=el('video');try{v.pause()}catch(e){}v.removeAttribute('src');v.load()}
function closeModal(id){el(id).classList.remove('show');if(id==='playerModal')destroyVideo()}
function note(msg,error){var n=el('playerNote');n.textContent=msg||'';n.className='player-note'+(error?' error':'')}
async function openPlayer(item){
  if(!item)return;selected=item;el('detailModal').classList.remove('show');el('playerModal').classList.add('show');el('playerTitle').textContent=item.title||item.name||'Reproductor';destroyVideo();note('Buscando fuente…',false);el('serverSelect').disabled=true;el('formatSelect').disabled=true;
  try{
    var q='?action=playback&type='+encodeURIComponent(type)+'&id='+encodeURIComponent(String(item.id));
    if(type==='tv')q+='&season=1&episode=1';
    var r=await fetch('/'+q,{cache:'no-store'});var data=await r.json();if(!r.ok)throw new Error(data.error||'No hay fuente disponible');playback=data;fillServers();
  }catch(e){note(e&&e.message?e.message:'No hay fuente disponible',true)}
}
function fillServers(){
  var servers=(playback&&Array.isArray(playback.servers))?playback.servers:[];var s=el('serverSelect');s.innerHTML='';if(!servers.length){note('No hay servidores disponibles para este contenido.',true);return}
  for(var i=0;i<servers.length;i++){var o=document.createElement('option');o.value=String(i);o.textContent=servers[i].name||('Servidor '+(i+1));s.appendChild(o)}s.disabled=false;s.onchange=fillFormats;fillFormats();
}
function fillFormats(){
  var si=Number(el('serverSelect').value||0);var streams=(playback&&playback.servers&&playback.servers[si]&&Array.isArray(playback.servers[si].streams))?playback.servers[si].streams:[];var f=el('formatSelect');f.innerHTML='';if(!streams.length){f.disabled=true;note('Ese servidor no tiene formatos disponibles.',true);return}
  for(var i=0;i<streams.length;i++){var o=document.createElement('option');o.value=String(i);o.textContent=streams[i].label||String(streams[i].format||'Video').toUpperCase();f.appendChild(o)}f.disabled=false;f.onchange=playSelected;playSelected();
}
function playSelected(){
  var si=Number(el('serverSelect').value||0),fi=Number(el('formatSelect').value||0);var st=playback&&playback.servers&&playback.servers[si]&&playback.servers[si].streams?playback.servers[si].streams[fi]:null;if(!st||!st.url){note('La fuente seleccionada no es válida.',true);return}
  destroyVideo();var v=el('video');note('Cargando video…',false);v.src=st.url;v.addEventListener('loadedmetadata',function(){note('',false);v.play().catch(function(){})},{once:true});v.addEventListener('error',function(){note('No se pudo reproducir esta fuente. Prueba otro servidor o formato.',true)},{once:true});v.load();
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
      let entries = 0;
      try { entries = Object.keys(parsePlaybackMap(env.PLAYBACK_MAP_JSON)).length; } catch (e) {}
      return json({ ok: true, tmdb_configured: Boolean(env.TMDB_API_KEY), playback_entries: entries });
    }
    if (action === 'catalog') {
      if (!env.TMDB_API_KEY) return json({ error: 'Falta configurar TMDB_API_KEY en las variables del Worker.' }, 500);
      const type = url.searchParams.get('type') === 'tv' ? 'tv' : 'movie';
      const page = clampInt(url.searchParams.get('page'), 1, 500, 1);
      try {
        const endpoint = 'https://api.themoviedb.org/3/' + type + '/popular?api_key=' + encodeURIComponent(env.TMDB_API_KEY) + '&language=es-MX&page=' + page;
        const tmdbRes = await fetch(endpoint, { headers: { Accept: 'application/json' } });
        const data = await tmdbRes.json();
        if (!tmdbRes.ok) return json({ error: 'TMDB respondió con un error.', details: data }, tmdbRes.status);
        return json(data, 200);
      } catch (err) {
        return json({ error: 'No se pudo conectar con TMDB.', details: err.message }, 500);
      }
    }
    if (action === 'playback') {
      const type = url.searchParams.get('type') === 'tv' ? 'tv' : 'movie';
      const id = clampInt(url.searchParams.get('id'), 1, 999999999, 0);
      const season = clampInt(url.searchParams.get('season'), 1, 999, 1);
      const episode = clampInt(url.searchParams.get('episode'), 1, 9999, 1);
      if (!id) return json({ error: 'Falta un id válido.' }, 400);
      let map;
      try { map = parsePlaybackMap(env.PLAYBACK_MAP_JSON); } catch (e) { return json({ error: 'PLAYBACK_MAP_JSON no es JSON válido.' }, 500); }
      const key = type === 'tv' ? 'tv:' + id + ':' + season + ':' + episode : 'movie:' + id;
      const servers = normalizeServers(map[key]);
      if (!servers.length) return json({ error: 'No hay una fuente configurada para este título.' }, 404);
      return json({ success: true, servers: servers }, 200);
    }
    return json({ error: 'Acción no reconocida.' }, 404);
  }
};

function clampInt(value, min, max, fallback) {
  const n = parseInt(value || '', 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}
function parsePlaybackMap(raw) {
  if (!raw) return {};
  const data = JSON.parse(raw);
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
}
function normalizeServers(entry) {
  const input = Array.isArray(entry) ? entry : (entry ? [entry] : []);
  const out = [];
  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    if (typeof item === 'string') {
      out.push({ name: 'Servidor ' + (i + 1), streams: [{ url: item, format: inferFormat(item), label: inferFormat(item).toUpperCase() }] });
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    if (Array.isArray(item.streams)) {
      const streams = normalizeStreams(item.streams);
      if (streams.length) out.push({ name: String(item.name || ('Servidor ' + (i + 1))), streams: streams });
      continue;
    }
    if (typeof item.url === 'string') {
      const st = normalizeStream(item);
      if (st) out.push({ name: String(item.name || ('Servidor ' + (i + 1))), streams: [st] });
    }
  }
  return out;
}
function normalizeStreams(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const st = normalizeStream(arr[i]);
    if (st) out.push(st);
  }
  return out;
}
function normalizeStream(v) {
  if (typeof v === 'string') return /^https?:\/\//i.test(v) ? { url: v, format: inferFormat(v), label: inferFormat(v).toUpperCase() } : null;
  if (!v || typeof v !== 'object' || typeof v.url !== 'string' || !/^https?:\/\//i.test(v.url)) return null;
  return { url: v.url, format: v.format || inferFormat(v.url), label: v.label || String(v.format || inferFormat(v.url)).toUpperCase() };
}
function inferFormat(value) { return /\.m3u8(?:$|\?)/i.test(value || '') ? 'hls' : 'mp4'; }
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: corsHeaders() }); }
function corsHeaders() { return { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Allow-Headers': '*' }; }
