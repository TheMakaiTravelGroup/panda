/* ═══ Panda · kerne v1 — core/core.v1.js ══════════════════════════════
   Den fælles kerne for Pandas NYE sider (først finance.html, R834).
   Wendie 15.10.2026 (R845): index.html bruger IKKE denne fil. index.html er
   stadig den komplette, kørende Panda og røres ikke af kernen.
     A · KOPI       tegn for tegn fra index.html. Ret aldrig kun her.
     B · TILPASSET  samme regler som index.html, skrevet til de nye sider.
     C · KUN HER    sidens start (Panda.start), skal, fejlkort, besked.
   dev/core-check.js sammenligner A og B med index.html — kør det før hver udgivelse.
   Indlæses efter lib/supabase-js-2.117.3.min.js. menu.v1.js og core.v1.js
   bruger hinanden, men først når siden starter — rækkefølgen er ligegyldig.
   Bygget fra index.html v1.75 (commit a924e52) 15.10.2026. Kun én chat må ændre core/ (R835). */
const CORE_VERSION = 'core v1';

/* ══ A · KOPI fra index.html v1.75 ══════════════════════════════════════ */
const SB_URL = 'https://kottwokudnxdobittera.supabase.co';
const SB_KEY = 'sb_publishable_MOojN3I5klYYmhgWq2NWGw_ZHV78zGO';
const db = supabase.createClient(SB_URL, SB_KEY);
const $ = s => document.querySelector(s);
let session = null;
const fmtD = s => s ? new Date(s).toLocaleDateString('da-DK',{day:'numeric',month:'short'}) : '—';
const fmtDY = s => s ? new Date(s).toLocaleDateString('da-DK',{day:'numeric',month:'short',year:'2-digit'}) : '—';
const today = () => new Date().toISOString().slice(0,10);
const plusDays = n => new Date(Date.now()+n*86400000).toISOString().slice(0,10);
const kr = n => Math.round((n||0)/1000).toLocaleString('da-DK') + ' t.kr.';
const pct = (a,b) => b ? (100*a/b).toFixed(1).replace('.',',') + ' %' : '—';
const MDR = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
const fmtFX = (n,cur)=> (n<0?'-':'') + Math.abs(n).toLocaleString('da-DK',{maximumFractionDigits:0}) + (cur?' '+cur:'');
const fmtDkkR = n => (n<0?'-':'') + Math.abs(Math.round(n)).toLocaleString('da-DK') + ' kr';
function hasPerm(p){ return !!(window.PERMS && window.PERMS[p]); }
async function fetchTrips(){
  /* v0.9.3: paginering — Supabase returnerer max 1000 rækker pr. kald, og efter
     Dolphin-importen af historiske rejser er der langt flere. */
  /* lead_id SKAL vaere med: dashboardets dubletfilter sammenligner
     mellemlandingernes lead_id med bookingernes. Manglede den, var vaerdien
     undefined paa hver eneste rejse, saettet blev tomt, og filteret kunne
     aldrig fjerne noget. Derfor stod Holt to gange under Solgt — baade som
     mellemlanding og som den booking, den var blevet til. (Wendie 01.09.2026) */
  const COLS='id, ref_no, branch, status, stadie, lead_id, customer_id, departure_date, return_date, pax_count, customer_currency, package_sell_total, package_sell_dkk, buy_dkk, comm_dkk, booking_date, owner, balance_due, deposit_amount, cancelled_at, cancel_reason, retained_dkk, loss_dkk, refund_dkk, accepted_price, accepted_currency, created_at, terms_version, customers(first_name,last_name), trip_destinations(destination)';
  let all=[], from=0;
  while(true){
    const { data } = await db.from('trips').select(COLS).not('status','in','("voided")').order('departure_date').range(from, from+999);
    all = all.concat(data||[]);
    if(!data || data.length<1000) break;
    from += 1000;
  }
  return all;
}
const active = t => !['canx','voided','tabt'].includes(t.status);
function colObj(a){return {key:a[0],label:a[1],type:a[2]};}
function kName(t){return t.customers?(t.customers.last_name+', '+t.customers.first_name):'—';}
const fmtKr = n => (Math.round((+n||0)*100)/100).toLocaleString('da-DK',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtPct = n => (Math.round((+n||0)*10)/10).toLocaleString('da-DK',{minimumFractionDigits:1,maximumFractionDigits:1})+' %';
const fmtNum = n => (+n||0).toLocaleString('da-DK');
function fmtCell(v,type){ if(v==null||v==='')return ''; if(type==='kr')return fmtKr(v); if(type==='kr0')return fmtNum(Math.round(v)); if(type==='pct')return fmtPct(v); if(type==='num')return fmtNum(v); if(type==='date')return fmtDY(v); return String(v);}
const rightAligned = type => type==='kr'||type==='kr0'||type==='pct'||type==='num';
const activeRep = t => !['canx','voided','tabt'].includes(t.status);
const inRange = (d,f,t) => d && d>=f && d<=t;
function downloadBlob(blob,name){ const u=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),1500); }
const escH = s => (s==null?'':String(s)).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ══ B · TILPASSET ═══════════════════════════════════════════════════════
   Samme regler som index.html, skrevet til de nye sider. Teksterne er på
   engelsk (R692). Originalerne ligger i core/kopier.v1.json, og
   dev/core-check.js melder, hvis index.html ændrer dem. */

let app = null;   // <main id="app">. index.html: const app = $('#app') — her tegnes skallen først.

/* Effektive rettigheder = standard ⊕ rollens permissions ⊕ brugerens permission_overrides.
   Samme regel som showApp() i index.html og public.my_permissions() i databasen. */
const PANDA_PERM_DEFAULT = {economy:false,finance:false,reports:true,leads:true,manage_users:false};

async function pandaLoadMe(){
  const email = session.user.email;
  window.MYEMAIL = email;
  const [tmr, rr] = await Promise.all([
    db.from('team_members').select('email, name, initials, role, permission_overrides, active').eq('email', email).maybeSingle(),
    db.from('roles').select('role_key, label, description, permissions, sort_order').order('sort_order')
  ]);
  const tm = tmr.data;
  window.ROLES = rr.data || [];
  if(!tm || tm.active===false){ window.ME=null; window.PERMS={}; window.MYROLE=''; window.MYFULLNAME=email; return null; }
  window.ME = tm.initials; window.MYNAME = tm.name.split(' ')[0]; window.MYFULLNAME = tm.name;
  const roleDef = window.ROLES.find(r=>r.role_key===tm.role);
  window.MYROLE = roleDef ? roleDef.label : '';
  window.PERMS = Object.assign({}, PANDA_PERM_DEFAULT, (roleDef&&roleDef.permissions)||{}, tm.permission_overrides||{});
  return tm;
}

function pandaShowLogin(){
  document.body.classList.add('p-ude');
  app.innerHTML = `<div class="p-card p-login" id="login">
    <div class="p-login-logo"><b>MALDIVIA</b><small>Travel Design · Panda</small></div>
    <form id="loginform">
      <label for="em">E-mail</label><input id="em" name="email" type="email" autocomplete="username" required>
      <label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" required minlength="6">
      <div class="p-row"><button class="p-btn" type="submit">Log in</button>
        <button type="button" id="forgotbtn" class="p-link">Forgot password?</button></div>
    </form>
    <div class="p-msg" id="autherr" role="status"></div>
    <p class="p-mut">Only the team's e-mail addresses have access.</p></div>`;
  const msg=(t,ok)=>{const e=document.getElementById('autherr');e.className=ok?'p-msg ok':'p-msg err';e.textContent=t;};
  const creds=()=>{const fd=new FormData(document.getElementById('loginform'));return{email:String(fd.get('email')||'').trim().toLowerCase(),password:String(fd.get('password')||'')};};
  document.getElementById('loginform').addEventListener('submit', async ev=>{
    ev.preventDefault(); const c=creds();
    if(!c.email||!c.password) return msg('Fill in both e-mail and password.');
    msg('Logging in…',true);
    const {error}=await db.auth.signInWithPassword(c);
    if(error) msg(/invalid/i.test(error.message)?'Wrong e-mail or password.':/confirm/i.test(error.message)?'E-mail not confirmed — tell Claude.':error.message);
  });
  document.getElementById('forgotbtn').addEventListener('click', async ()=>{
    const c=creds();
    if(!c.email) return msg('Write your e-mail above, then press «Forgot password?».');
    msg('Sending link…',true);
    const {error}=await db.auth.resetPasswordForEmail(c.email, {redirectTo: location.origin+location.pathname});
    msg(error?error.message:'We have sent a link to '+c.email+'. Open the mail and choose a new password (check spam too).',!error);
  });
}

function pandaChangePassword(){
  if(document.getElementById('cpoverlay')) return;
  const ov=document.createElement('div');
  ov.id='cpoverlay'; ov.className='p-overlay';
  ov.innerHTML=`<div class="p-card p-dialog" role="dialog" aria-modal="true" aria-labelledby="cph">
    <h2 id="cph">Change password</h2>
    <label for="cpw1">New password</label><input id="cpw1" type="password" autocomplete="new-password" minlength="6">
    <label for="cpw2">Repeat new password</label><input id="cpw2" type="password" autocomplete="new-password" minlength="6">
    <div class="p-msg" id="cperr" role="status"></div>
    <div class="p-row"><button class="p-btn" id="cpsave" type="button">Save</button>
      <button class="p-btn ghost" id="cpcancel" type="button">Cancel</button></div>
    <p class="p-mut">At least 6 characters.</p></div>`;
  document.body.appendChild(ov);
  const err=(t,ok)=>{const e=ov.querySelector('#cperr');e.className=ok?'p-msg ok':'p-msg err';e.textContent=t;};
  const close=()=>ov.remove();
  ov.addEventListener('click', e=>{ if(e.target===ov) close(); });
  ov.addEventListener('keydown', e=>{ if(e.key==='Escape') close(); });
  ov.querySelector('#cpcancel').onclick=close;
  ov.querySelector('#cpw1').focus();
  ov.querySelector('#cpsave').onclick=async()=>{
    const p1=ov.querySelector('#cpw1').value, p2=ov.querySelector('#cpw2').value;
    if(p1.length<6) return err('The password must be at least 6 characters.');
    if(p1!==p2) return err('The two passwords are not the same.');
    err('Saving…',true);
    const {error}=await db.auth.updateUser({password:p1});
    if(error) return err(error.message);
    err('Password changed ✓ — use it next time you log in.',true);
    setTimeout(close,1600);
  };
}

function pandaNoAccess(){
  app.innerHTML = '<div class="p-card"><h2>No access</h2><p class="p-mut">You do not have access to this page. Ask Wendie or Rasmus.</p></div>';
}

/* ══ C · KUN I KERNEN ════════════════════════════════════════════════════
   Sådan starter en ny side (fx finance.html):
     Panda.start({ key:'finance', perm:'finance', version:'finance 1', render: async (app) => { … } });
   key     = menupunktet, der skal stå markeret (se PANDA_MENU i menu.v1.js)
   perm    = rettigheden, siden kræver (hasPerm). Udelades = alle aktive brugere.
   version = sidens eget versionsnummer — vises i menuens fod sammen med kernens.
   render  = tegner siden i <main id="app">, når brugeren er logget ind og har adgang. */

const Panda = { opts: null, start: pandaStart, toast: pandaToast };

function pandaShell(){
  if(document.getElementById('app')) { app = document.getElementById('app'); return; }
  const wrap = document.createElement('div');
  wrap.className = 'p-app';
  wrap.innerHTML = '<aside id="sidebar" class="p-menu" aria-label="Panda"></aside><main id="app" class="p-main"></main>';
  document.body.prepend(wrap);
  const t = document.createElement('div'); t.id = 'p-toast'; t.setAttribute('role','status'); t.hidden = true;
  document.body.appendChild(t);
  app = document.getElementById('app');
  /* Branding (projektinstruksen): fanen hedder Panda, ikonet er bladet. */
  document.title = 'Panda';
  if(!document.querySelector('link[rel="icon"]')){
    const l = document.createElement('link'); l.rel = 'icon'; l.type = 'image/png'; l.href = 'img/panda-favicon.png';
    document.head.appendChild(l);
  }
}

async function pandaStart(opts){
  Panda.opts = opts || {};
  pandaShell();
  const { data } = await db.auth.getSession();
  session = data.session;
  db.auth.onAuthStateChange((e,s)=>{ if(e==='PASSWORD_RECOVERY') window.__recovery=true; const had=!!session; session=s; if(had!==!!s || e==='PASSWORD_RECOVERY') pandaRender(); });
  pandaRender();
}

function pandaRender(){ session ? pandaShowApp() : (pandaMenuDraw(null), pandaShowLogin()); }

async function pandaShowApp(){
  document.body.classList.remove('p-ude');
  const o = Panda.opts;
  app.innerHTML = '<div class="p-card p-mut">Loading…</div>';
  const tm = await pandaLoadMe();
  pandaMenuDraw(o.key, !tm);
  if(!tm){
    app.innerHTML = '<div class="p-card"><h2>No access</h2><p class="p-mut">Your user ('+escH(window.MYEMAIL)+') is not active in the system. Contact Wendie or Rasmus.</p></div>';
    return;
  }
  if(o.perm && !hasPerm(o.perm)) return pandaNoAccess();
  try { await o.render(app); }
  catch(e){ pandaFejl(e && e.message || String(e)); console.error(e); }
  if(window.__recovery){ window.__recovery=false; setTimeout(pandaChangePassword, 500); }
}

/* Som index.html's window.onerror: en fejl vises som et rødt kort øverst — aldrig en tom side. */
function pandaFejl(m){
  if(!app) return;
  const c = document.createElement('div'); c.className = 'p-card p-fejl'; c.textContent = 'Technical error: ' + m;
  app.prepend(c);
}
window.addEventListener('error', e => pandaFejl(e.message));
window.addEventListener('unhandledrejection', e => pandaFejl((e.reason && e.reason.message) || String(e.reason)));

function pandaToast(txt, ms){
  const t = document.getElementById('p-toast'); if(!t) return;
  t.textContent = txt; t.hidden = false;
  clearTimeout(pandaToast._t); pandaToast._t = setTimeout(()=>{ t.hidden = true; }, ms || 2600);
}
