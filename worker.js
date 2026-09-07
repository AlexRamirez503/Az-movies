const APP_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#08090d">
<title>AZ Movies</title>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1"></script>
<style>
:root{--bg:#08090d;--panel:#131720;--panel2:#1a1f2a;--text:#fff;--muted:#a4aab5;--accent:#e50914;--border:rgba(255,255,255,.08)}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:#08090d;color:#fff;min-height:100vh}button,input,select{font:inherit}button{cursor:pointer}.top{position:sticky;top:0;z-index:20;height:76px;padding:0 22px;display:flex;align-items:center;justify-content:space-between;background:rgba(8,9,13,.94);backdrop-filter:blur(14px);border-bottom:1px solid var(--border)}.brand{font-size:22px;font-weight:900}.brand span{color:var(--accent)}.search{width:min(44vw,330px);display:flex;align-items:center;gap:8px;background:#151922;border:1px solid var(--border);border-radius:999px;padding:10px 14px}.search input{width:100%;background:transparent;border:0;outline:0;color:#fff}.hero{min-height:500px;position:relative;display:flex;align-items:flex-end;padding:55px 34px;overflow:hidden}.hero-bg{position:absolute;inset:0;background-size:cover;background-position:center}.hero-bg:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,9,13,.98),rgba(8,9,13,.64) 42%,rgba(8,9,13,.12)),linear-gradient(0deg,#08090d 0%,transparent 48%)}.hero-content{position:relative;z-index:1;max-width:680px}.tag{font-size:12px;font-weight:900;letter-spacing:1.7px;color:#ff646d;margin-bottom:10px}h1{font-size:clamp(38px,7vw,72px);line-height:1;font-weight:950;margin-bottom:14px}.meta{display:flex;gap:14px;flex-wrap:wrap;color:#ddd;margin-bottom:15px;font-weight:700}.rating{color:#ffd54a}.desc{color:#c6cad2;line-height:1.55;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.actions{display:flex;gap:10px;margin-top:24px;flex-wrap:wrap}.btn{border:0;border-radius:10px;padding:12px 18px;font-weight:850}.btn.primary{background:var(--accent);color:#fff}.btn.secondary{background:rgba(255,255,255,.14);color:#fff}.section{padding:20px 24px 60px}.section-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px}.section-title{font-size:24px;font-weight:900}.tabs{display:flex;gap:8px}.tab{border:0;border-radius:9px;background:#171b24;color:#b8bec7;padding:10px 14px;font-weight:800}.tab.active{background:var(--accent);color:#fff}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:22px 14px}.card{outline:0;cursor:pointer}.poster{aspect-ratio:2/3;border-radius:14px;overflow:hidden;background:#151922;position:relative;box-shadow:0 10px 30px rgba(0,0,0,.25)}.poster img{width:100%;height:100%;object-fit:cover;transition:.25s}.card:hover img,.card:focus img{transform:scale(1.05)}.card:focus .poster{outline:4px solid #fff;outline-offset:4px}.score{position:absolute;right:8px;top:8px;background:rgba(0,0,0,.75);padding:5px 7px;border-radius:7px;color:#ffd54a;font-size:12px;font-weight:900}.title{margin-top:10px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.year{font-size:13px;color:var(--muted);margin-top:4px}.more-wrap{display:flex;justify-content:center;margin-top:34px}.more{border:1px solid var(--border);background:#171b24;color:#fff;border-radius:10px;padding:12px 20px;font-weight:800}.modal{display:none;position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.82);backdrop-filter:blur(7px);padding:20px;align-items:center;justify-content:center}.modal.show{display:flex}.modal-box{width:min(900px,96vw);max-height:90vh;overflow:auto;background:#11151d;border-radius:18px;border:1px solid var(--border);position:relative}.modal-hero{height:330px;background-size:cover;background-position:center;position:relative}.modal-hero:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,#11151d,rgba(17,21,29,.15))}.close{position:absolute;z-index:4;right:14px;top:14px;width:42px;height:42px;border:0;border-radius:50%;background:rgba(0,0,0,.72);color:#fff;font-size:20px}.modal-content{position:relative;z-index:2;margin-top:-80px;padding:0 28px 30px}.modal-content h2{font-size:36px;margin-bottom:12px}.modal-content p{color:#c5cad3;line-height:1.6}.status{grid-column:1/-1;color:#aeb4bf;padding:40px 0;text-align:center}.player-modal{display:none;position:fixed;inset:0;z-index:100;background:#000;align-items:center;justify-content:center}.player-modal.show{display:flex}.player-shell{width:100%;height:100%;display:flex;flex-direction:column;background:#000}.player-top{min-height:62px;display:flex;align-items:center;gap:12px;padding:10px 14px;background:#0b0c0f}.player-title{font-weight:850;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.player-close{border:0;background:#20242d;color:#fff;border-radius:9px;padding:10px 14px;font-weight:850}.player-stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;background:#000}.player-stage video{width:100%;height:100%;max-height:calc(100vh - 140px);background:#000}.player-tools{padding:10px 14px;background:#0b0c0f;display:flex;gap:10px;align-items:center;flex-wrap:wrap}.player-tools select,.player-tools input{background:#181c24;border:1px solid var(--border);color:#fff;border-radius:9px;padding:10px 12px}.player-tools input{flex:1;min-width:230px}.player-status{color:#b8bec7;font-size:13px;flex-basis:100%}.hidden{display:none!important}@media(max-width:700px){.top{padding:0 14px}.brand{font-size:18px}.search{width:55vw}.hero{min-height:470px;padding:40px 20px}.section{padding:16px 16px 50px}.section-head{align-items:flex-start;flex-direction:column}.grid{grid-template-columns:repeat(2,1fr)}.modal-content{padding:0 20px 24px}.modal-content h2{font-size:30px}.player-tools input{min-width:100%;width:100%}}
</style>
</head>
<body>
<header class="top"><div class="brand">AZ <span>MOVIES</span></div><div class="search"><span>⌕</span><input id="search" placeholder="Buscar..."></div></header>
<section class="hero"><div class="hero-bg" id="heroBg"></div><div class="hero-content"><div class="tag">● DESTACADO</div><h1 id="heroTitle">Cargando...</h1><div class="meta"><span id="heroYear">—</span><span class="rating" id="heroRating">★ —</span><span>HD</span></div><p class="desc" id="heroDesc"></p><div class="actions"><button class="btn primary" id="heroPlay">▶ Reproducir</button><button class="btn secondary" id="heroInfo">ⓘ Más información</button></div></div></section>
<section class="section"><div class="section-head"><div class="section-title" id="sectionTitle">Películas populares</div><div class="tabs"><button class="tab active" id="movieTab">Películas</button><button class="tab" id="tvTab">Series</button></div></div><div class="grid" id="grid"><div class="status">Cargando catálogo...</div></div><div class="more-wrap"><button class="more" id="more">Cargar más</button></div></section>
<div class="modal" id="modal"><div class="modal-box"><button class="close" id="close">✕</button><div class="modal-hero" id="modalHero"></div><div class="modal-content"><h2 id="modalTitle"></h2><div class="meta"><span id="modalYear"></span><span class="rating" id="modalRating"></span><span id="modalType"></span></div><p id="modalDesc"></p><div class="actions"><button class="btn primary" id="modalPlay">▶ Reproducir</button><button class="btn secondary" id="modalBack">Regresar</button></div></div></div></div>
<div class="player-modal" id="playerModal"><div class="player-shell"><div class="player-top"><div class="player-title" id="playerTitle">Reproductor</div><button class="player-close" id="playerClose">Cerrar</button></div><div class="player-stage"><video id="video" controls playsinline preload="metadata"></video></div><div class="player-tools"><select id="serverSelect" class="hidden"></select><input id="manualUrl" class="hidden" type="url" placeholder="URL MP4/M3U8 autorizada"><button class="btn primary hidden" id="manualPlay">Reproducir URL</button><div class="player-status" id="playerStatus"></div></div></div></div>
<script>
const P500="https://image.tmdb.org/t/p/w500";const PORIG="https://image.tmdb.org/t/p/original";let type="movie",page=1,items=[],hero=null,selected=null,busy=false,currentItem=null,hls=null;const $=id=>document.getElementById(id);const grid=$("grid");
async function load(reset){if(busy)return;busy=true;$("more").disabled=true;$("more").textContent="Cargando...";try{if(reset){page=1;items=[];grid.innerHTML='<div class="status">Cargando catálogo...</div>'}const r=await fetch('/?action=catalog&type='+encodeURIComponent(type)+'&page='+page);const data=await r.json();if(!r.ok)throw new Error(data.error||'No se pudo cargar');const results=Array.isArray(data.results)?data.results:[];items.push.apply(items,results);render(items);if(reset&&results.length){hero=results.find(x=>x.backdrop_path)||results[0];setHero(hero)}$("more").style.display=page>=(data.total_pages||1)?'none':'block'}catch(e){grid.innerHTML='<div class="status">'+esc(e.message)+'</div>'}finally{busy=false;$("more").disabled=false;$("more").textContent='Cargar más'}}
function render(list){grid.innerHTML='';if(!list.length){grid.innerHTML='<div class="status">No encontramos resultados.</div>';return}for(const x of list){const card=document.createElement('article');card.className='card';card.tabIndex=0;const t=x.title||x.name||'Sin título';const d=x.release_date||x.first_air_date||'';const y=d?d.slice(0,4):'—';const poster=x.poster_path?P500+x.poster_path:'';card.innerHTML='<div class="poster">'+(poster?'<img loading="lazy" src="'+poster+'" alt="'+esc(t)+'">':'')+'<div class="score">★ '+Number(x.vote_average||0).toFixed(1)+'</div></div><div class="title">'+esc(t)+'</div><div class="year">'+y+'</div>';card.onclick=()=>openDetails(x);card.onkeydown=e=>{if(e.key==='Enter')openDetails(x)};grid.appendChild(card)}}
function setHero(x){$("heroTitle").textContent=x.title||x.name||'Sin título';const d=x.release_date||x.first_air_date||'';$("heroYear").textContent=d?d.slice(0,4):'—';$("heroRating").textContent='★ '+Number(x.vote_average||0).toFixed(1);$("heroDesc").textContent=x.overview||'Sin descripción disponible.';$("heroBg").style.backgroundImage=x.backdrop_path?'url("'+PORIG+x.backdrop_path+'")':'none'}
function openDetails(x){selected=x;$("modalTitle").textContent=x.title||x.name||'Sin título';const d=x.release_date||x.first_air_date||'';$("modalYear").textContent=d?d.slice(0,4):'';$("modalRating").textContent='★ '+Number(x.vote_average||0).toFixed(1);$("modalType").textContent=type==='movie'?'Película':'Serie';$("modalDesc").textContent=x.overview||'Sin descripción disponible.';$("modalHero").style.backgroundImage=x.backdrop_path?'url("'+PORIG+x.backdrop_path+'")':'none';$("modal").classList.add('show')}
function closeModal(){$("modal").classList.remove('show')}
function destroyVideo(){const v=$("video");try{v.pause()}catch(e){}if(hls){hls.destroy();hls=null}v.removeAttribute('src');v.load()}
function setPlayerStatus(msg){$("playerStatus").textContent=msg||''}
function playUrl(url,format){destroyVideo();const v=$("video");const isHls=format==='hls'||/\.m3u8(?:$|\?)/i.test(url);setPlayerStatus('Cargando video...');if(isHls&&window.Hls&&Hls.isSupported()){hls=new Hls({enableWorker:true,lowLatencyMode:false});hls.loadSource(url);hls.attachMedia(v);hls.on(Hls.Events.MANIFEST_PARSED,()=>{setPlayerStatus('');v.play().catch(()=>{})});hls.on(Hls.Events.ERROR,(evt,data)=>{if(data&&data.fatal)setPlayerStatus('No se pudo reproducir este HLS.')})}else{v.src=url;v.addEventListener('loadedmetadata',()=>{setPlayerStatus('');v.play().catch(()=>{})},{once:true});v.addEventListener('error',()=>setPlayerStatus('No se pudo reproducir esta fuente.'),{once:true})}}
async function fetchPlayback(item,server){const q=new URLSearchParams({action:'playback',type:type,id:String(item.id)});if(server)q.set('server',server);const r=await fetch('/?'+q.toString());const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'No hay fuente disponible');return data}
function showManual(){$("manualUrl").classList.remove('hidden');$("manualPlay").classList.remove('hidden');$("serverSelect").classList.add('hidden');setPlayerStatus('No hay una fuente configurada para este título. Puedes probar una URL MP4/M3U8 que tengas autorización para usar.')}
async function openPlayer(item){currentItem=item;closeModal();$("playerTitle").textContent=item.title||item.name||'Reproductor';$("playerModal").classList.add('show');$("manualUrl").classList.add('hidden');$("manualPlay").classList.add('hidden');$("serverSelect").classList.add('hidden');setPlayerStatus('Buscando fuente...');destroyVideo();try{const data=await fetchPlayback(item);const servers=Array.isArray(data.available_servers)?data.available_servers:[];if(servers.length>1){const s=$("serverSelect");s.innerHTML='';servers.forEach(name=>{const o=document.createElement('option');o.value=name;o.textContent=name;s.appendChild(o)});s.value=data.server||servers[0];s.classList.remove('hidden');s.onchange=async()=>{setPlayerStatus('Cambiando servidor...');try{const d=await fetchPlayback(item,s.value);playUrl(d.stream_url,d.format)}catch(e){setPlayerStatus(e.message)}}}playUrl(data.stream_url,data.format)}catch(e){showManual()}}
function closePlayer(){$("playerModal").classList.remove('show');destroyVideo();setPlayerStatus('')}
function setType(t){type=t;$("movieTab").classList.toggle('active',t==='movie');$("tvTab").classList.toggle('active',t==='tv');$("sectionTitle").textContent=t==='movie'?'Películas populares':'Series populares';$("search").value='';load(true)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#039;'}[c]))}
$("movieTab").onclick=()=>setType('movie');$("tvTab").onclick=()=>setType('tv');$("more").onclick=()=>{page++;load(false)};$("search").oninput=e=>{const q=e.target.value.trim().toLowerCase();render(q?items.filter(x=>((x.title||x.name||'')+' '+(x.overview||'')).toLowerCase().includes(q)):items)};$("heroInfo").onclick=()=>hero&&openDetails(hero);$("heroPlay").onclick=()=>hero&&openPlayer(hero);$("modalPlay").onclick=()=>selected&&openPlayer(selected);$("close").onclick=closeModal;$("modalBack").onclick=closeModal;$("modal").onclick=e=>{if(e.target.id==='modal')closeModal()};$("playerClose").onclick=closePlayer;$("manualPlay").onclick=()=>{const u=$("manualUrl").value.trim();if(!/^https?:\/\//i.test(u)){setPlayerStatus('Escribe una URL http/https válida.');return}playUrl(u,/\.m3u8(?:$|\?)/i.test(u)?'hls':'mp4')};document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($("playerModal").classList.contains('show'))closePlayer();else closeModal()}});load(true);
</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });
    const action = url.searchParams.get("action");
    if (!action) return new Response(APP_HTML, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });

    if (action === "health") {
      let entries = 0;
      try { entries = Object.keys(parsePlaybackMap(env.PLAYBACK_MAP_JSON)).length; } catch (_) {}
      return json({ ok: true, tmdb_configured: Boolean(env.TMDB_API_KEY), playback_entries: entries });
    }

    if (action === "catalog") {
      if (!env.TMDB_API_KEY) return json({ error: "Falta configurar TMDB_API_KEY en las variables del Worker." }, 500);
      const type = normalizeType(url.searchParams.get("type"));
      const page = clampInt(url.searchParams.get("page"), 1, 500, 1);
      try {
        const endpoint = "https://api.themoviedb.org/3/" + type + "/popular?api_key=" + encodeURIComponent(env.TMDB_API_KEY) + "&language=es-MX&page=" + page;
        const tmdbRes = await fetch(endpoint, { headers: { "Accept": "application/json" } });
        const data = await tmdbRes.json();
        if (!tmdbRes.ok) return json({ error: "TMDB respondió con un error.", details: data }, tmdbRes.status);
        return json(data);
      } catch (err) {
        return json({ error: "No se pudo conectar con TMDB.", details: err.message }, 500);
      }
    }

    if (action === "playback") {
      const type = normalizeType(url.searchParams.get("type"));
      const id = clampInt(url.searchParams.get("id"), 1, 999999999, 0);
      const season = clampInt(url.searchParams.get("season"), 1, 999, 1);
      const episode = clampInt(url.searchParams.get("episode"), 1, 9999, 1);
      const selectedServer = (url.searchParams.get("server") || "").trim();
      if (!id) return json({ error: "Falta un id válido." }, 400);

      let map;
      try { map = parsePlaybackMap(env.PLAYBACK_MAP_JSON); }
      catch (err) { return json({ error: "PLAYBACK_MAP_JSON no es JSON válido." }, 500); }

      const key = type === "tv" ? "tv:" + id + ":" + season + ":" + episode : "movie:" + id;
      const sources = normalizeSources(map[key]);
      if (!sources.length) return json({ error: "No hay una fuente configurada para este título." }, 404);

      let source = sources[0];
      if (selectedServer) {
        const found = sources.find(s => s.name.toLowerCase() === selectedServer.toLowerCase());
        if (found) source = found;
      }

      let streamUrl = source.url;
      if (source.proxy) {
        if (!isAllowedStreamUrl(source.url, env.ALLOWED_STREAM_HOSTS)) return json({ error: "El host de esta fuente no está autorizado para proxy." }, 403);
        streamUrl = url.origin + "/?action=stream&stream_url=" + encodeURIComponent(source.url);
      }

      return json({ success: true, server: source.name, available_servers: sources.map(s => s.name), stream_url: streamUrl, format: source.format || inferFormat(source.url) });
    }

    if (action === "stream") {
      const raw = url.searchParams.get("stream_url");
      if (!raw) return json({ error: "Falta stream_url." }, 400);
      let target;
      try { target = new URL(raw); } catch (_) { return json({ error: "stream_url inválida." }, 400); }
      if (!isAllowedStreamUrl(target.toString(), env.ALLOWED_STREAM_HOSTS)) return json({ error: "Host no autorizado para proxy." }, 403);

      const headers = new Headers();
      headers.set("Accept", request.headers.get("Accept") || "*/*");
      if (request.headers.has("Range")) headers.set("Range", request.headers.get("Range"));
      const upstream = await fetch(target.toString(), { method: "GET", headers, redirect: "follow" });
      const contentType = upstream.headers.get("content-type") || "application/octet-stream";
      const isHls = /mpegurl/i.test(contentType) || /\.m3u8(?:$|\?)/i.test(target.toString());
      if (isHls && upstream.ok) {
        const text = await upstream.text();
        const rewritten = rewriteM3U8(text, target, url.origin);
        return new Response(rewritten, { status: upstream.status, headers: { "Content-Type": "application/vnd.apple.mpegurl", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } });
      }
      const out = new Headers();out.set("Access-Control-Allow-Origin", "*");["content-type","content-length","content-range","accept-ranges","cache-control","etag","last-modified"].forEach(h => { const v = upstream.headers.get(h); if (v) out.set(h, v); });
      return new Response(upstream.body, { status: upstream.status, headers: out });
    }

    return json({ error: "Acción no reconocida." }, 404);
  }
};

function normalizeType(value) { return value === "tv" ? "tv" : "movie"; }
function clampInt(value, min, max, fallback) { const n = parseInt(value || "", 10); return Number.isFinite(n) && n >= min && n <= max ? n : fallback; }
function parsePlaybackMap(raw) { if (!raw) return {}; const data = JSON.parse(raw); return data && typeof data === "object" && !Array.isArray(data) ? data : {}; }
function normalizeSources(entry) { const arr = Array.isArray(entry) ? entry : (entry ? [entry] : []); return arr.map((v, i) => { if (typeof v === "string") return { name: "Servidor " + (i + 1), url: v, format: inferFormat(v), proxy: false }; if (!v || typeof v !== "object" || typeof v.url !== "string") return null; return { name: String(v.name || ("Servidor " + (i + 1))), url: v.url, format: v.format || inferFormat(v.url), proxy: Boolean(v.proxy) }; }).filter(Boolean).filter(s => /^https?:\/\//i.test(s.url)); }
function inferFormat(value) { return /\.m3u8(?:$|\?)/i.test(value || "") ? "hls" : "mp4"; }
function allowedHosts(raw) { return String(raw || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean); }
function isAllowedStreamUrl(rawUrl, rawHosts) { const hosts = allowedHosts(rawHosts); if (!hosts.length) return false; let u; try { u = new URL(rawUrl); } catch (_) { return false; } if (!/^https?:$/.test(u.protocol)) return false; const host = u.hostname.toLowerCase(); return hosts.some(h => host === h || host.endsWith("." + h)); }
function proxyUrl(rawUrl, origin) { return origin + "/?action=stream&stream_url=" + encodeURIComponent(rawUrl); }
function rewriteM3U8(text, baseUrl, origin) { return text.split(/\r?\n/).map(line => { if (!line) return line; if (line.startsWith("#")) { return line.replace(/URI="([^"]+)"/g, (_, uri) => { let abs; try { abs = new URL(uri, baseUrl).toString(); } catch (_) { return _; } return "URI=\"" + proxyUrl(abs, origin) + "\""; }); } let abs; try { abs = new URL(line.trim(), baseUrl).toString(); } catch (_) { return line; } return proxyUrl(abs, origin); }).join("\n"); }
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: corsHeaders() }); }
function corsHeaders() { return { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS", "Access-Control-Allow-Headers": "*" }; }
