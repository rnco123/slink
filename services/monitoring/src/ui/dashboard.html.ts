/**
 * Self-contained admin Monitoring dashboard. No external assets (CSP-safe): all
 * CSS + JS inline. It polls the /monitoring/* facade on this same origin. In dev
 * the API is open on loopback; in staging/prod it is reached through the admin
 * subdomain behind auth, and the panel injects the shared token server-side.
 *
 * Exported as a string so `tsc` bundles it into dist with no asset-copy step.
 */
export const DASHBOARD_HTML = /* html */ `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Saludlink — Monitoring</title>
<style>
  :root {
    --bg:#0d1117; --panel:#161b22; --border:#30363d; --text:#e6edf3;
    --muted:#8b949e; --ok:#2ea043; --warn:#d29922; --down:#f85149; --accent:#2f81f7;
  }
  :root[data-theme="light"] {
    --bg:#f6f8fa; --panel:#fff; --border:#d0d7de; --text:#1f2328;
    --muted:#636c76; --ok:#1a7f37; --warn:#9a6700; --down:#cf222e; --accent:#0969da;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text);
    font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  header { display:flex; align-items:center; gap:12px; padding:16px 24px;
    border-bottom:1px solid var(--border); position:sticky; top:0; background:var(--bg); z-index:5; }
  header h1 { font-size:16px; margin:0; font-weight:600; }
  .pill { font-size:12px; padding:2px 10px; border-radius:999px; border:1px solid var(--border); }
  .pill.ok { color:var(--ok); border-color:var(--ok); }
  .pill.degraded { color:var(--warn); border-color:var(--warn); }
  .pill.down { color:var(--down); border-color:var(--down); }
  header .spacer { flex:1; }
  header button { background:var(--panel); color:var(--text); border:1px solid var(--border);
    border-radius:6px; padding:5px 10px; cursor:pointer; font-size:13px; }
  main { padding:24px; display:grid; gap:16px; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); }
  .card { background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:16px; }
  .card h2 { font-size:13px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted);
    margin:0 0 12px; font-weight:600; }
  .kpi { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border); }
  .kpi:last-child { border-bottom:0; }
  .kpi .v { font-variant-numeric:tabular-nums; font-weight:600; }
  .dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:6px; vertical-align:middle; }
  .dot.up { background:var(--ok); } .dot.down { background:var(--down); } .dot.unknown { background:var(--muted); }
  .muted { color:var(--muted); }
  .full { grid-column:1/-1; }
  pre { margin:0; max-height:340px; overflow:auto; background:var(--bg); border:1px solid var(--border);
    border-radius:8px; padding:10px; font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; white-space:pre-wrap; word-break:break-word; }
  .row { display:flex; gap:8px; align-items:center; margin-bottom:10px; flex-wrap:wrap; }
  select, input { background:var(--bg); color:var(--text); border:1px solid var(--border);
    border-radius:6px; padding:5px 8px; font-size:13px; }
  .updated { font-size:12px; color:var(--muted); }
  .err { color:var(--down); font-size:12px; }
</style>
</head>
<body>
<header>
  <h1>Saludlink Monitoring</h1>
  <span id="overall" class="pill">…</span>
  <span class="spacer"></span>
  <span id="updated" class="updated"></span>
  <button id="theme">◐ Theme</button>
  <button id="refresh">↻ Refresh</button>
</header>
<main id="main">
  <div class="card"><h2>Platform health</h2><div id="health">Loading…</div></div>
  <div class="card"><h2>Uptime probes</h2><div id="uptime">Loading…</div></div>
  <div class="card"><h2>Host</h2><div id="host">Loading…</div></div>
  <div class="card"><h2>Database</h2><div id="db">Loading…</div></div>
  <div class="card"><h2>Redis</h2><div id="redis">Loading…</div></div>
  <div class="card"><h2>Containers</h2><div id="containers">Loading…</div></div>
  <div class="card"><h2>Active alerts</h2><div id="alerts">Loading…</div></div>
  <div class="card"><h2>Queues (BullMQ)</h2><div id="queues">Loading…</div></div>
  <div class="card full">
    <h2>Logs</h2>
    <div class="row">
      <select id="logService"><option value="">all services</option></select>
      <input id="logQuery" placeholder='filter e.g. "error"' />
      <select id="logSince">
        <option value="15">15m</option><option value="60" selected>1h</option>
        <option value="360">6h</option><option value="1440">24h</option>
      </select>
      <button id="logGo">Query</button>
    </div>
    <pre id="logs">—</pre>
  </div>
</main>
<script>
const API = ""; // same origin
const $ = (id) => document.getElementById(id);
const fmtPct = (v) => v==null ? "—" : v.toFixed(1)+"%";
const fmtBytes = (v) => { if(v==null) return "—"; const u=["B","KB","MB","GB","TB"]; let i=0,n=v; while(n>=1024&&i<u.length-1){n/=1024;i++;} return n.toFixed(1)+" "+u[i]; };
const fmtNum = (v) => v==null ? "—" : (Math.abs(v)>=100?v.toFixed(0):v.toFixed(2));

async function get(path){
  const r = await fetch(API+"/monitoring"+path, {headers:{Accept:"application/json"}});
  if(!r.ok) throw new Error(path+" → "+r.status);
  return r.json();
}
function kpi(label, valueHtml){ return '<div class="kpi"><span>'+label+'</span><span class="v">'+valueHtml+'</span></div>'; }
function dot(up){ return '<span class="dot '+(up===true?'up':up===false?'down':'unknown')+'"></span>'; }
function err(el, e){ $(el).innerHTML = '<span class="err">'+e.message+'</span>'; }

function renderMetric(elId, samples, fmt){
  const el = $(elId); let html = "";
  for(const s of samples){
    if(s.series){
      html += '<div class="kpi"><span>'+s.label+'</span><span class="v muted">'+s.series.length+' series</span></div>';
      for(const ser of s.series.slice(0,6)){
        const name = ser.labels.name||ser.labels.datname||ser.labels.instance||Object.values(ser.labels)[0]||"?";
        html += '<div class="kpi"><span class="muted">&nbsp;&nbsp;'+name+'</span><span class="v">'+fmt(ser.value, s.unit)+'</span></div>';
      }
    } else {
      html += kpi(s.label, fmt(s.value, s.unit));
    }
  }
  el.innerHTML = html || '<span class="muted">no data</span>';
}
function metricFmt(v, unit){
  if(unit==="%") return fmtPct(v);
  if(unit==="bytes") return fmtBytes(v);
  if(unit==="bool") return v===1?dot(true)+"up":dot(false)+"down";
  return fmtNum(v)+(unit&&unit!=="cores"?"":unit?" "+unit:"");
}

async function loadHealth(){
  try{
    const h = await get("/health");
    const p = $("overall"); p.textContent = h.status.toUpperCase(); p.className = "pill "+h.status;
    let html = kpi("Targets up", h.targets.up+" / "+h.targets.total);
    for(const [name,c] of Object.entries(h.components)) html += kpi(name, dot(c.up)+(c.up?"up":"down")+(c.detail?' <span class="muted">'+c.detail+'</span>':''));
    $("health").innerHTML = html;
  }catch(e){ err("health",e); }
}
async function loadUptime(){
  try{
    const u = await get("/uptime"); let html="";
    if(u.probes.length===0 && u.monitors.length===0) html='<span class="muted">no probes/monitors</span>';
    for(const pr of u.probes) html += kpi(dot(pr.up)+shortUrl(pr.instance), pr.latencyMs!=null?pr.latencyMs+" ms":"—");
    for(const m of u.monitors) html += kpi(dot(m.up)+m.name, m.uptime24h!=null?(m.uptime24h*100).toFixed(2)+"%":"—");
    $("uptime").innerHTML = html;
  }catch(e){ err("uptime",e); }
}
function shortUrl(u){ return (u||"").replace(/^https?:\\/\\//,"").replace("host.docker.internal","host"); }
async function loadMetrics(){
  try{ renderMetric("host", await get("/metrics/host"), metricFmt); }catch(e){ err("host",e); }
  try{ renderMetric("db", await get("/metrics/db"), metricFmt); }catch(e){ err("db",e); }
  try{ renderMetric("redis", await get("/metrics/redis"), metricFmt); }catch(e){ err("redis",e); }
  try{ renderMetric("containers", await get("/metrics/containers"), metricFmt); }catch(e){ err("containers",e); }
}
async function loadAlerts(){
  try{
    const a = await get("/alerts");
    if(a.count===0){ $("alerts").innerHTML = '<span class="muted">'+dot(true)+'no active alerts</span>'; return; }
    let html = kpi("Firing", '<span style="color:var(--down)">'+a.count+'</span>');
    for(const al of a.alerts.slice(0,8)) html += kpi(al.name+' <span class="muted">'+al.severity+'</span>', al.state);
    $("alerts").innerHTML = html;
  }catch(e){ err("alerts",e); }
}
async function loadQueues(){
  try{
    const q = await get("/queues");
    if(q.count===0){ $("queues").innerHTML = '<span class="muted">no queues discovered</span>'; return; }
    let html = kpi("Total failed", q.totalFailed>0?'<span style="color:var(--down)">'+q.totalFailed+'</span>':'0');
    for(const qq of q.queues) html += kpi(qq.name, qq.active+" active · "+qq.waiting+" wait · "+qq.failed+" fail");
    $("queues").innerHTML = html;
  }catch(e){ err("queues",e); }
}
async function loadServices(){
  try{
    const h = await get("/health");
    const sel = $("logService");
    // seed service dropdown from health target jobs as a hint (best-effort)
    void h;
  }catch(e){ /* non-fatal */ }
}
async function loadLogs(){
  const svc = $("logService").value, q = $("logQuery").value, since = $("logSince").value;
  const params = new URLSearchParams({ limit:"150", sinceMinutes:since });
  if(svc) params.set("service", svc);
  if(q) params.set("q", q);
  try{
    const r = await fetch(API+"/monitoring/logs?"+params.toString());
    if(!r.ok) throw new Error("logs → "+r.status);
    const d = await r.json();
    $("logs").textContent = d.entries.length ? d.entries.map(e => "["+(e.labels.compose_service||"?")+"] "+e.line).join("\\n") : "no matching log lines";
  }catch(e){ $("logs").textContent = e.message; }
}
async function refresh(){
  await Promise.all([loadHealth(), loadUptime(), loadMetrics(), loadAlerts(), loadQueues()]);
  $("updated").textContent = "updated "+new Date().toLocaleTimeString();
}
$("refresh").onclick = refresh;
$("logGo").onclick = loadLogs;
$("theme").onclick = () => { const r=document.documentElement; r.dataset.theme = r.dataset.theme==="dark"?"light":"dark"; };
// seed service dropdown from a known set (compose_service label values)
["storefront","medusa","postgres","redis","grafana","prometheus","loki","alertmanager","promtail","cadvisor","node-exporter","bull-board","uptime-kuma"].forEach(s=>{
  const o=document.createElement("option"); o.value=s; o.textContent=s; $("logService").appendChild(o);
});
refresh();
setInterval(refresh, 15000);
</script>
</body>
</html>`
