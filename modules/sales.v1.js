/* ═══ Panda · modul: Sales — modules/sales.v1.js ═══
   R868 (Wendie 20.10.2026): «Lad os starte med at lave selve oversigtssiden, hvor vi kan slå alle rejser op …
   Der skal selvfølgelig være et filter, hvor vi kan filtrere efter, hvilke perioder …». Designet blev godkendt
   20.10.2026 efter skitsen «Panda — Sales (viola)» (v5, gradering A: blå → bordeaux).

   EGEN FIL (Wendie 19.10.2026: de forskellige filer). index.html har tre korte kroge:
     · viewSales()   → PandaSales.vent() straks, PandaSales.aabn({trips, t0}) når rejserne er hentet
     · viewTrip(id)  → PandaSales.husk(id)   («Recent» — de sidste 10 rejser man har været inde på)
   Mangler filen, eller går noget galt, står den klassiske Sales-side under — præcis som før.

   Alt fra den klassiske side er med (R587): + New trip, nøgletal, Upcoming/All/Completed/Cancelled,
   søgning på navn og ref.nr. på tværs af alle år, klik åbner rejsen, og R856 (tilbage til samme filter og sted).
   Nyt: periode efter afrejse/hjemrejse/bestilling, søjler pr. måned, branch (HQ tæller under MD, NO under MN —
   Wendie 20.10.2026), agent, gemte filtre og «Recent» pr. bruger (tabellen user_prefs), foldbare månedskort. */
window.PandaSales = (function(){
'use strict';
const VERSION = 'sales v1';

let VAERT = null, ROD = null, OBS = null, LAESER = false;
let TRIPS = [], T0 = '', TEAM = [];
const S = { st: 'upcoming', by: 'dep', preset: 'all', from: '', to: '', br: 'all', ag: 'all', q: '', group: true,
  sort: 'date', dir: 1, mlimit: 6, barYear: 0, open: '', fold: {}, ovOpen: true, chartOpen: true, newName: '', scroll: 0 };
const P = { recent: [], saved: [], hentet: false };     /* personlige: user_prefs (sales.recent / sales.saved) */

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf = n => Math.round(Number(n) || 0).toLocaleString('da-DK');
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const fd = s => s ? (+s.slice(8, 10)) + ' ' + MON[+s.slice(5, 7) - 1] + ' ' + s.slice(0, 4) : '';
const fds = s => s ? (+s.slice(8, 10)) + ' ' + MON[+s.slice(5, 7) - 1] : '';
const pad = n => String(n).padStart(2, '0');
const sidste = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const plus = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const nights = t => (t.departure_date && t.return_date) ? Math.round((new Date(t.return_date) - new Date(t.departure_date)) / 864e5) : '';
const navn = t => { const c = t.customers || {}; return ((c.last_name || '') + (c.first_name ? ', ' + c.first_name : '')).replace(/^, /, '') || 'No name'; };
const dEn = x => (window.MLNY && typeof MLNY.destEn === 'function') ? MLNY.destEn(x) : x;
const dest = t => ((t.trip_destinations || []).map(d => dEn(d.destination)).filter(Boolean).join(' + ')) || '—';
const aktiv = t => !['canx', 'voided', 'tabt'].includes(t.status);
const bookDato = t => t.booking_date || (t.created_at || '').slice(0, 10) || t.departure_date;
const felt = t => S.by === 'ret' ? (t.return_date || t.departure_date) : S.by === 'bk' ? bookDato(t) : t.departure_date;
/* Wendie 20.10.2026: HQ (Dolphin) tæller med under MD, NO (Dolphin) under MN */
const GRP = { MN: ['MN', 'NO'], MD: ['MD', 'HQ'] };
const $ = id => ROD && ROD.getElementById(id);

/* ═══ UDSEENDE — dashboardets røde tråd (kort, toning, lysende statusmærker), uden billede ═══ */
const STIL_DOK = 'body.s8-paa{overflow:hidden!important}body.s8-paa #app,body.s8-paa #sidebar{visibility:hidden!important}#s8-vaert{position:fixed;inset:0;z-index:60}';
const MONO = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap';
const STIL = `
.app::before{display:none!important}
.m8html,.m8body{background:radial-gradient(1000px 520px at 92% -12%,rgba(124,92,240,.45),rgba(124,92,240,0) 65%),radial-gradient(900px 620px at -8% 38%,rgba(196,87,127,.16),rgba(196,87,127,0) 60%),radial-gradient(900px 520px at 62% 112%,rgba(79,127,224,.20),rgba(79,127,224,0) 60%),linear-gradient(180deg,#2b2163 0%,#241b54 42%,#1f1749 100%)!important;background-attachment:fixed!important}
.s8{max-width:1240px;margin:0 auto;display:flex;flex-direction:column;gap:14px;color:#fff;font:400 13.5px/1.45 "Inter",system-ui,sans-serif;font-variant-numeric:tabular-nums}
.s8 button{font:inherit;cursor:pointer}
.s8 button:focus-visible,.s8 input:focus-visible{outline:2px solid #c9b6ff;outline-offset:2px}
.s8hd{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding-bottom:6px}
.s8eb{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#e6e0fb}
.s8hd h1{margin:3px 0 0;font:500 28px/1.15 "Lora",Georgia,serif;color:#fff}
.s8hr{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.s8sog{display:flex;align-items:center;gap:9px;height:34px;box-sizing:border-box;width:290px;max-width:100%;border-radius:10px;padding:0 12px;background:linear-gradient(152deg,rgba(255,255,255,.10),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
.s8sog input{flex:1;min-width:0;border:0!important;outline:none;background:none!important;color:#fff;font:inherit;font-size:13px;padding:0!important;box-shadow:none!important;height:auto!important}
.s8sog input::placeholder{color:#b6aadd}
.s8ny{border:0;border-radius:10px;height:34px;padding:0 16px;color:#fff;font-size:13px;font-weight:500;background:linear-gradient(135deg,#8b6cf0,#6c5ce7);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 10px 24px -10px rgba(108,92,231,.95)}
.s8bar{position:relative;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.s8grp{display:flex;flex-wrap:wrap;gap:6px}
.s8sep{width:1px;height:20px;background:rgba(255,255,255,.16);margin:0 6px}
.s8ctl{display:flex;align-items:center;gap:8px;height:32px;box-sizing:border-box;padding:0 12px;border-radius:9px;font-size:12.5px;letter-spacing:.02em;border:0;color:#fff;background:linear-gradient(152deg,rgba(255,255,255,.10),rgba(255,255,255,.045));box-shadow:inset 0 1px 0 rgba(255,255,255,.12),inset 0 0 0 1px rgba(255,255,255,.08)}
.s8ctl:hover{filter:brightness(1.18)}
.s8ctl.on{background:linear-gradient(120deg,rgba(164,92,240,.32),rgba(79,127,224,.18));box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 0 18px -6px rgba(170,140,255,.75)}
.s8ctl .lb{color:#b6aadd}
.s8dot{width:6px;height:6px;border-radius:50%;flex:none}
.s8chev{display:inline-block;width:14px;text-align:center;font-size:16px;line-height:1;color:#a89cd8;transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.s8chev.aab{transform:rotate(90deg);color:#e3d8ff}
.s8rel{position:relative}
.s8rel.aab{z-index:6}
.s8pop{position:absolute;top:40px;left:0;z-index:5;min-width:260px;box-sizing:border-box;background:linear-gradient(160deg,#3a2f7a,#2d2463);border:1px solid rgba(201,182,255,.32);border-radius:12px;box-shadow:0 28px 56px -22px rgba(0,0,0,.95),inset 0 1px 0 rgba(255,255,255,.12);padding:8px}
.s8pop.hoejre{left:auto;right:0}
.s8pop .ov{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#a89cd8;padding:6px 10px}
.s8opt{width:100%;display:flex;justify-content:space-between;gap:12px;align-items:center;height:32px;padding:0 10px;border:0;border-radius:8px;font-size:13px;text-align:left;white-space:nowrap;background:none;color:#fff}
.s8opt:hover{background:rgba(201,182,255,.16)}
.s8opt.on{background:rgba(164,92,240,.32);box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
.s8opt .h{color:#b6aadd;font-size:12px}
.s8seg{display:flex;gap:4px;margin:0 2px 12px}
.s8seg button{flex:1;height:30px;border-radius:8px;font-size:12.5px;border:0;color:#ddd6f8;background:rgba(255,255,255,.06)}
.s8seg button.on{color:#fff;background:linear-gradient(120deg,rgba(164,92,240,.32),rgba(79,127,224,.18));box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 0 16px -6px rgba(170,140,255,.8)}
.s8g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px}
.s8dat{display:flex;gap:8px;margin-top:12px;padding:12px 2px 2px;border-top:1px solid rgba(255,255,255,.10)}
.s8dat label{display:flex;flex-direction:column;gap:4px;font-size:11px;color:#a89cd8;flex:1}
.s8dat input,.s8navn input{height:32px;box-sizing:border-box;background:rgba(255,255,255,.07)!important;border:1px solid rgba(255,255,255,.16)!important;border-radius:8px;color:#fff;font:inherit;font-size:13px;padding:0 8px;color-scheme:dark;box-shadow:none!important}
.s8navn{display:flex;gap:6px;align-items:center;border-top:1px solid rgba(255,255,255,.10);margin-top:6px;padding:9px 4px 2px}
.s8navn input{flex:1;min-width:0}
.s8navn button{border:0;border-radius:8px;height:32px;padding:0 12px;color:#fff;font-size:12.5px;background:linear-gradient(135deg,#8b6cf0,#6c5ce7)}
.s8del{border:0;background:none;color:#b6aadd;width:30px;height:32px;font-size:15px}
.s8tom{margin:0;padding:8px 10px 10px;font-size:12.5px;color:#b6aadd}
.s8lnk{border:0;background:none;color:#c9b6ff;padding:0;font-size:12px;text-decoration:underline;text-decoration-color:rgba(201,182,255,.35);text-underline-offset:3px}
.s8kort{border-radius:17px}
.s8kh{width:100%;display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;padding:15px 22px;border:0;background:none;color:#fff;text-align:left;border-radius:17px}
.s8kh:hover{background:rgba(255,255,255,.04)}
.s8kh .t{font:500 17px/1.2 "Lora",Georgia,serif;min-width:150px}
.s8kh .s{font-size:12.5px;color:#ddd6f8;flex:1 1 220px}
.s8mk{display:inline-flex;align-items:center;gap:7px;height:26px;box-sizing:border-box;padding:0 11px;border-radius:8px;font-size:11.5px;letter-spacing:.04em;white-space:nowrap}
.s8mk i{width:5px;height:5px;border-radius:50%;flex:none}
@keyframes s8puls{0%,100%{opacity:1}50%{opacity:.45}}
.s8kpi{display:flex;flex-wrap:wrap;margin:0 22px 18px;border-radius:10px;border:1px solid rgba(255,255,255,.10);overflow:hidden}
.s8kpi>div{flex:1 1 150px;padding:12px 18px;background:rgba(20,13,44,.22)}
.s8kpi>div+div{border-left:1px solid rgba(255,255,255,.10)}
.s8kpi .l{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#a89cd8}
.s8kpi .v{font-size:24px;font-weight:200;line-height:1.25}
.s8aar{display:flex;gap:2px;align-items:center;padding-right:8px}
.s8aar button{border:0;background:none;color:#c9b6ff;width:28px;height:28px;font-size:15px}
.s8aar span{font-size:13px;font-weight:500;width:40px;text-align:center}
.s8bars{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px;align-items:end;padding:0 22px 16px}
.s8b{background:none;border:0;padding:0;color:#fff;display:flex;flex-direction:column;align-items:stretch;gap:4px}
.s8b .n{font-size:11.5px;color:#ddd6f8;text-align:center;min-height:16px}
.s8b .r{height:56px;display:flex;align-items:flex-end}
.s8b .f{display:block;width:100%;border-radius:5px 5px 2px 2px;min-height:3px;background:linear-gradient(180deg,rgba(201,182,255,.55),rgba(139,108,240,.35))}
.s8b.on .f{background:linear-gradient(180deg,#e3d8ff,#8b6cf0);box-shadow:0 0 16px rgba(170,140,255,.7)}
.s8b:hover .f{filter:brightness(1.3)}
.s8b .m{font-size:11.5px;text-align:center;color:#ddd6f8}
.s8b .m.nu{color:#fff;font-weight:600}
.s8lh{display:flex;flex-wrap:wrap;gap:10px;align-items:baseline;justify-content:space-between;padding:10px 4px 0}
.s8lh .r{display:flex;gap:14px}
.s8tab{overflow-x:auto;padding:0 10px 12px}
.s8tab>div{min-width:940px}
.s8row{width:100%;display:grid;grid-template-columns:74px minmax(0,1.5fr) minmax(0,1.3fr) minmax(0,1.3fr) 40px 40px minmax(0,1fr) 44px minmax(0,1.1fr);gap:12px;align-items:center;min-height:40px;padding:0 12px;border:0;border-bottom:1px solid rgba(255,255,255,.07);border-radius:6px;background:none;color:#fff;text-align:left;font-size:13px}
.s8row.th{min-height:30px;border-top:1px solid rgba(255,255,255,.10);border-bottom:1px solid rgba(255,255,255,.10);border-radius:0;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#a89cd8}
.s8row.th button{background:none;border:0;padding:0;color:inherit;font:inherit;letter-spacing:inherit;text-transform:inherit;white-space:nowrap;text-align:left}
.s8row.th button.r,.s8row .r{text-align:right}
.s8row:not(.th):hover{background:rgba(255,255,255,.06)}
.s8row .ref{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:12.5px;color:#e3d8ff}
.s8row .el{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.s8row .d{color:#ddd6f8}
.s8row .st{display:flex;align-items:center;gap:8px;white-space:nowrap;overflow:hidden}
.s8more{align-self:center;height:34px;padding:0 18px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:linear-gradient(152deg,rgba(255,255,255,.10),rgba(255,255,255,.04));color:#fff;font-size:12.5px}
.s8tomt{margin:0;padding:18px 6px;color:#ddd6f8}
.s8back{position:fixed;inset:0;background:transparent;border:0;z-index:4;cursor:default}
.s8klas{border:0;background:none;color:#b6aadd;font-size:11.5px;padding:0;text-decoration:underline;text-decoration-color:rgba(182,170,221,.35);text-underline-offset:3px}
@media (max-width:720px){.s8sog{width:100%}.s8bars{gap:3px;padding:0 12px 12px}.s8kh{padding:14px 16px}.s8kpi{margin:0 14px 14px}}
`;

/* graderingen: dashboardets blå → violet → magenta → bordeaux, glidende fra første til sidste kort (Wendie 20.10.2026: valgte A) */
const STOPS = [[70,132,236], [112,104,242], [160,92,236], [196,84,180], [176,52,112], [128,28,66]];
let NKORT = 8;
const tone = i => { const t = NKORT > 1 ? Math.min(1, i / (NKORT - 1)) : 0, f = t * (STOPS.length - 1), k = Math.min(STOPS.length - 2, Math.floor(f)), u = f - k;
  return STOPS[k].map((v, j) => Math.round(v + (STOPS[k + 1][j] - v) * u)).join(','); };
const kortStil = (i, aab) => { const c = tone(i);
  return 'border:1px solid rgba(255,255,255,' + (aab ? '.16' : '.11') + ');box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 18px 40px -28px rgba(0,0,0,.9);background:'
    + 'linear-gradient(152deg,rgba(255,255,255,' + (aab ? '.105' : '.085') + ') 0%,rgba(255,255,255,.024) 46%,rgba(255,255,255,.008) 100%),'
    + 'linear-gradient(112deg,rgba(' + c + ',' + (aab ? '.42' : '.34') + '),rgba(' + c + ',' + (aab ? '.18' : '.14') + ')),'
    + 'linear-gradient(180deg,rgba(20,13,44,.40) 0%,rgba(20,13,44,.54) 100%)'; };
/* de lysende statusmærker — samme som dashboardets .kmrk.ok / .kmrk.mangler */
const MK = {
  ok:   ['linear-gradient(120deg,rgba(111,213,184,.24),rgba(79,127,224,.16))', '#9df0d6', '#6fd5b8', '111,213,184'],
  bad:  ['linear-gradient(120deg,rgba(196,87,127,.30),rgba(164,92,240,.18))', '#ffb0c8', '#ff8fa6', '255,143,166'],
  gold: ['linear-gradient(120deg,rgba(242,196,109,.24),rgba(196,87,127,.12))', '#f7d796', '#f2c46d', '242,196,109'],
  vio:  ['linear-gradient(120deg,rgba(164,92,240,.32),rgba(79,127,224,.18))', '#e3d8ff', '#c9b6ff', '170,140,255'],
  dim:  ['rgba(255,255,255,.07)', '#d4cbf2', '#a89cd8', '168,156,216'] };
const maerke = (k, txt, puls) => { const p = MK[k];
  return '<span class="s8mk" style="color:' + p[1] + ';background:' + p[0] + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.14)' + (k === 'dim' ? '' : ',0 0 18px -6px rgba(' + p[3] + ',.6)') + '">'
    + '<i style="background:' + p[2] + (k === 'dim' ? '' : ';box-shadow:0 0 8px rgba(' + p[3] + ',.9)') + (puls ? ';animation:s8puls 3s ease-in-out infinite' : '') + '"></i>' + esc(txt) + '</span>'; };
const prik = (k, lys) => { const p = MK[k];
  return '<span class="s8dot" style="background:' + p[2] + (lys ? ';box-shadow:0 0 9px rgba(' + p[3] + ',1)' : ';opacity:.75') + '"></span>'; };
const ST_LAB = { mellemlanding: 'Layover', bekraeftet: 'Confirmed', bb_sendt: 'Confirmation sent', klar_til_afrejse: 'Ready to travel', god_tur: 'Travelling now', faerdig: 'Completed', canx: 'Cancelled', tabt: 'Lost from the layover' };
const ST_K = { mellemlanding: 'vio', bekraeftet: 'vio', bb_sendt: 'vio', klar_til_afrejse: 'gold', god_tur: 'ok', faerdig: 'dim', canx: 'bad', tabt: 'bad' };

/* ═══ PERIODER ═══ */
const PRESETS = [['all', 'All dates'], ['tm', 'This month'], ['nm', 'Next month'], ['tq', 'This quarter'], ['n3', 'Next 3 months'], ['ty', 'This year'], ['ny', 'Next year'], ['ly', 'Last year']];
function periode(p){
  const T = T0, y = +T.slice(0, 4), mo = +T.slice(5, 7);
  const fix = (yy, mm) => { while(mm > 12){ mm -= 12; yy++; } return [yy, mm]; };
  switch(p || S.preset){
    case 'tm': return [y + '-' + pad(mo) + '-01', y + '-' + pad(mo) + '-' + sidste(y, mo)];
    case 'nm': { const [a, b] = fix(y, mo + 1); return [a + '-' + pad(b) + '-01', a + '-' + pad(b) + '-' + sidste(a, b)]; }
    case 'tq': { const q0 = Math.floor((mo - 1) / 3) * 3 + 1; return [y + '-' + pad(q0) + '-01', y + '-' + pad(q0 + 2) + '-' + sidste(y, q0 + 2)]; }
    case 'n3': { const [a, b] = fix(y, mo + 3); return [T, a + '-' + pad(b) + '-' + pad(Math.min(+T.slice(8), sidste(a, b)))]; }
    case 'ty': return [y + '-01-01', y + '-12-31'];
    case 'ny': return [(y + 1) + '-01-01', (y + 1) + '-12-31'];
    case 'ly': return [(y - 1) + '-01-01', (y - 1) + '-12-31'];
    case 'custom': return [S.from || '', S.to || ''];
    default: return ['', ''];
  }
}
const periodeNavn = (fra, til) => S.preset === 'custom'
  ? (fra && til && fra.slice(0, 7) === til.slice(0, 7) && fra.slice(8) === '01' && +til.slice(8) >= 28 ? MONL[+fra.slice(5, 7) - 1] + ' ' + fra.slice(0, 4) : (fra ? fds(fra) : '…') + ' – ' + (til ? fd(til) : '…'))
  : PRESETS.find(x => x[0] === S.preset)[1];
const efterNavn = () => ({ dep: '', ret: ' · by return', bk: ' · by booking' })[S.by];
const statusNavn = () => ({ upcoming: 'upcoming', all: 'all statuses', done: 'completed', canx: 'cancelled' })[S.st];

/* ═══ FILTRERING ═══ */
function filtre(){
  const [fra, til] = periode(), q = (S.q || '').trim().toLowerCase(), T = T0;
  const st = t => S.st === 'all' ? true : S.st === 'upcoming' ? (aktiv(t) && t.departure_date >= T) : S.st === 'done' ? t.status === 'faerdig' : t.status === 'canx';
  const br = t => S.br === 'all' || (GRP[S.br] || [S.br]).includes(t.branch);
  const ag = t => S.ag === 'all' || t.owner === S.ag;
  const per = t => { if(q) return true; const v = felt(t) || ''; return (!fra || v >= fra) && (!til || v <= til); };
  /* søgningen går på tværs af ALLE år (som den klassiske side) */
  const sq = t => !q || ((t.ref_no || '') + ' ' + ((t.customers || {}).first_name || '') + ' ' + ((t.customers || {}).last_name || '')).toLowerCase().includes(q);
  return { fra, til, q, st, br, ag, per, sq };
}
function raekker(F){
  const r = TRIPS.filter(t => F.st(t) && F.br(t) && F.ag(t) && F.per(t) && F.sq(t));
  const k = S.sort;
  const val = t => k === 'ref' ? (t.ref_no || '') : k === 'name' ? navn(t) : k === 'price' ? +(t.package_sell_dkk || 0) : k === 'pax' ? +(t.pax_count || 0)
    : k === 'nights' ? +(nights(t) || 0) : k === 'dest' ? dest(t) : k === 'agent' ? (t.owner || '') : (felt(t) || '');
  r.sort((a, b) => { const x = val(a), y = val(b); return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'da')) * S.dir; });
  return r;
}

/* ═══ TEGNING ═══ */
function prisTxt(t){
  const cur = t.customer_currency || 'DKK';
  if(t.package_sell_total && cur !== 'DKK') return nf(t.package_sell_total) + ' ' + esc(cur);
  if(t.package_sell_dkk) return nf(t.package_sell_dkk) + ' DKK';
  return '—';
}
function raekke(t){
  const k = ST_K[t.status] || 'dim', p = MK[k];
  return '<button type="button" class="s8row" data-s="aabn" data-id="' + esc(t.id) + '">'
    + '<span class="ref">' + esc(t.ref_no || '—') + '</span>'
    + '<span class="el">' + esc(navn(t)) + '</span>'
    + '<span class="el d">' + esc(dest(t)) + '</span>'
    + '<span style="white-space:nowrap">' + esc(fds(t.departure_date)) + (t.return_date ? ' – ' + esc(fd(t.return_date)) : '') + '</span>'
    + '<span class="r d">' + esc(nights(t)) + '</span>'
    + '<span class="r d">' + esc(t.pax_count || '') + '</span>'
    + '<span class="r" style="white-space:nowrap">' + prisTxt(t) + '</span>'
    + '<span class="d">' + esc(t.owner || '') + '</span>'
    + '<span class="st"><span class="s8dot" style="background:' + p[2] + (k === 'dim' ? '' : ';box-shadow:0 0 8px rgba(' + p[3] + ',.9)') + '"></span>'
    + '<span style="color:' + (k === 'dim' ? '#d4cbf2' : p[1]) + '">' + esc(ST_LAB[t.status] || t.status || '') + '</span></span></button>';
}
const chev = aab => '<span class="s8chev' + (aab ? ' aab' : '') + '" aria-hidden="true">›</span>';

function tegnTop(){
  const rec = P.recent.map(id => TRIPS.find(t => t.id === id)).filter(Boolean);
  const aab = S.open === 'recent';
  $('s8rec').innerHTML = '<div class="s8rel' + (aab ? ' aab' : '') + '">'
    + '<button type="button" class="s8ctl' + (aab ? ' on' : '') + '" data-s="pop" data-k="recent" aria-expanded="' + aab + '">'
    + '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c9b6ff" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"></circle><path d="M12 8v4l3 2"></path></svg>'
    + '<span>Recent · ' + rec.length + '</span>' + chev(aab) + '</button>'
    + (aab ? '<div class="s8pop hoejre" role="dialog" aria-label="Recently opened" style="width:350px"><div class="ov">Recently opened</div>'
      + (rec.length ? rec.map(t => '<button type="button" class="s8opt" data-s="aabn" data-id="' + esc(t.id) + '" style="display:grid;grid-template-columns:64px minmax(0,1fr) auto;height:34px">'
          + '<span style="font-family:\'IBM Plex Mono\',ui-monospace,monospace;font-size:12px;color:#c9b6ff">' + esc(t.ref_no || '—') + '</span>'
          + '<span style="overflow:hidden;text-overflow:ellipsis">' + esc(navn(t)) + ' · ' + esc(dest(t)) + '</span><span class="h">' + esc(fds(t.departure_date)) + '</span></button>').join('')
        : '<p class="s8tom">The last 10 trips you open will show here.</p>') + '</div>' : '')
    + '</div>';
}

function tegn(){
  if(!ROD) return;
  const F = filtre(), rows = raekker(F), T = T0;
  const [fra, til] = [F.fra, F.til];
  tegnTop();

  /* ── filterlinjen ── */
  const ctl = (k, lb, v, aktivt) => { const aab = S.open === k;
    return '<button type="button" class="s8ctl' + (aab || aktivt ? ' on' : '') + '" data-s="pop" data-k="' + k + '" aria-expanded="' + aab + '"><span class="lb">' + esc(lb) + '</span><span>' + esc(v) + '</span>' + chev(aab) + '</button>'; };
  const opt = (on, data, lbl, hint, ekstra) => '<button type="button" class="s8opt' + (on ? ' on' : '') + '" aria-pressed="' + on + '" ' + data + (ekstra || '') + '><span>' + esc(lbl) + '</span><span class="h">' + esc(hint || '') + '</span></button>';
  const pNavn = periodeNavn(fra, til);
  const base = TRIPS.filter(t => F.st(t) && F.ag(t) && F.per(t) && F.sq(t));
  const base2 = TRIPS.filter(t => F.st(t) && F.br(t) && F.per(t) && F.sq(t));
  const ejere = [...new Set(TRIPS.map(t => t.owner).filter(o => o && o !== 'TEST'))].sort();
  const tmNavn = i => { const m = TEAM.find(x => x.initials === i); return m && m.name ? i + ' · ' + m.name.split(' ')[0] : i; };
  const cfgNu = () => ({ st: S.st, by: S.by, preset: S.preset, from: S.preset === 'custom' ? S.from : '', to: S.preset === 'custom' ? S.to : '', br: S.br, ag: S.ag });
  const cNu = cfgNu();

  let h = '<div class="s8grp" role="group" aria-label="Status">'
    + [['upcoming', 'Upcoming', 'vio'], ['all', 'All', 'dim'], ['done', 'Completed', 'ok'], ['canx', 'Cancelled', 'bad']].map(([k, l, c]) =>
      '<button type="button" class="s8ctl' + (S.st === k ? ' on' : '') + '" aria-pressed="' + (S.st === k) + '" data-s="st" data-k="' + k + '">' + prik(c, S.st === k) + esc(l) + '</button>').join('')
    + '</div><span class="s8sep" aria-hidden="true"></span>';
  /* Period */
  h += '<div class="s8rel' + (S.open === 'period' ? ' aab' : '') + '">' + ctl('period', 'Period', pNavn + efterNavn(), S.preset !== 'all');
  if(S.open === 'period') h += '<div class="s8pop" role="dialog" aria-label="Period" style="width:380px;padding:12px"><div class="ov" style="padding:0 2px 7px">Filter on</div>'
    + '<div class="s8seg" role="group" aria-label="Date to filter on">' + [['dep', 'Departure'], ['ret', 'Return'], ['bk', 'Booked']].map(([k, l]) =>
        '<button type="button" class="' + (S.by === k ? 'on' : '') + '" aria-pressed="' + (S.by === k) + '" data-s="by" data-k="' + k + '">' + l + '</button>').join('') + '</div>'
    + '<div class="s8g2">' + PRESETS.map(([k, l]) => { const r = periode(k);
        const hint = k === 'all' ? '' : (r[0].slice(0, 7) === r[1].slice(0, 7) ? MON[+r[0].slice(5, 7) - 1] : MON[+r[0].slice(5, 7) - 1] + '–' + MON[+r[1].slice(5, 7) - 1]);
        return opt(S.preset === k, 'data-s="preset" data-k="' + k + '"', l, hint); }).join('') + '</div>'
    + '<div class="s8dat"><label>From<input type="date" id="s8fra" value="' + esc(fra) + '"></label><label>To<input type="date" id="s8til" value="' + esc(til) + '"></label></div></div>';
  h += '</div>';
  /* Branch */
  h += '<div class="s8rel' + (S.open === 'branch' ? ' aab' : '') + '">' + ctl('branch', 'Branch', { all: 'All', MN: 'MN · Norway', MD: 'MD · Denmark' }[S.br] || S.br, S.br !== 'all');
  if(S.open === 'branch') h += '<div class="s8pop" role="dialog" aria-label="Branch">' + [['all', 'All', ''], ['MN', 'MN · Norway', ' · incl. NO'], ['MD', 'MD · Denmark', ' · incl. HQ']].map(([k, l, x]) =>
      opt(S.br === k, 'data-s="br" data-k="' + k + '"', l, nf(base.filter(t => k === 'all' || GRP[k].includes(t.branch)).length) + x)).join('') + '</div>';
  h += '</div>';
  /* Agent */
  h += '<div class="s8rel' + (S.open === 'agent' ? ' aab' : '') + '">' + ctl('agent', 'Agent', S.ag === 'all' ? 'All' : S.ag, S.ag !== 'all');
  if(S.open === 'agent') h += '<div class="s8pop" role="dialog" aria-label="Agent">' + opt(S.ag === 'all', 'data-s="ag" data-k="all"', 'All', nf(base2.length))
      + ejere.map(i => opt(S.ag === i, 'data-s="ag" data-k="' + esc(i) + '"', tmNavn(i), nf(base2.filter(t => t.owner === i).length))).join('') + '</div>';
  h += '</div>';
  /* Saved */
  h += '<div class="s8rel' + (S.open === 'saved' ? ' aab' : '') + '">' + ctl('saved', 'Saved', P.saved.length + (P.saved.length === 1 ? ' filter' : ' filters'), false);
  if(S.open === 'saved') h += '<div class="s8pop" role="dialog" aria-label="Saved filters" style="width:330px">'
    + (P.saved.length ? P.saved.map((s, i) => { const on = Object.keys(s.cfg || {}).every(k => String(cNu[k] || '') === String(s.cfg[k] || ''));
        return '<div style="display:flex;align-items:center">' + opt(on, 'data-s="gemt" data-i="' + i + '"', s.name, '', ' style="flex:1"')
          + '<button type="button" class="s8del" data-s="gemtslet" data-i="' + i + '" aria-label="Remove the saved filter ' + esc(s.name) + '">×</button></div>'; }).join('')
      : '<p class="s8tom">No saved filters yet. Set the filter you want, name it below and save.</p>')
    + '<div class="s8navn"><label style="flex:1;display:flex"><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Name of the filter</span>'
    + '<input id="s8navn" value="' + esc(S.newName) + '"></label><button type="button" data-s="gem">Save current</button></div></div>';
  h += '</div>';
  const standard = S.st === 'upcoming' && S.preset === 'all' && S.br === 'all' && S.ag === 'all' && !F.q;
  if(!standard) h += '<button type="button" class="s8lnk" data-s="nulstil" style="height:32px;padding:0 6px;font-size:12.5px">Reset</button>';
  if(S.open) h += '<button type="button" class="s8back" data-s="luk" aria-label="Close the menu"></button>';
  $('s8bar').innerHTML = h;

  /* ── månederne ── */
  const grupperet = S.group && S.sort === 'date';
  const gl = [];
  if(grupperet){ const idx = {};
    rows.forEach(t => { const k = (felt(t) || '').slice(0, 7) || 'none'; if(!(k in idx)){ idx[k] = gl.length; gl.push({ key: k, list: [] }); } gl[idx[k]].list.push(t); }); }
  else gl.push({ key: 'all', list: rows });
  const vist = gl;   /* Wendie 20.10.2026: alle måneder vises — ingen «Show more»-knap */
  NKORT = 2 + vist.length;

  const sumD = rows.reduce((s, t) => s + (+t.package_sell_dkk || 0), 0), sumP = rows.reduce((s, t) => s + (+t.pax_count || 0), 0);
  const upN = rows.filter(t => aktiv(t) && t.departure_date >= T).length;
  const ude = TRIPS.filter(t => t.status === 'god_tur').length;
  const summary = F.q ? rows.length + ' found for «' + S.q + '» · all dates'
    : statusNavn() + (S.preset !== 'all' ? ' · ' + pNavn + efterNavn() : '') + ' · ' + nf(rows.length) + ' trips · ' + nf(sumP) + ' guests';

  let b = '<section class="s8kort" aria-label="Overview" style="' + kortStil(0, S.ovOpen) + '">'
    + '<button type="button" class="s8kh" data-s="fov" aria-expanded="' + S.ovOpen + '"><span class="t">Overview</span><span class="s">' + esc(summary) + '</span>'
    + (upN ? maerke('vio', nf(upN) + ' upcoming') : maerke('dim', 'none upcoming')) + chev(S.ovOpen) + '</button>'
    + (S.ovOpen ? '<div class="s8kpi">' + [['Trips', nf(rows.length)], ['Revenue DKK', nf(sumD)], ['Guests', nf(sumP)], ['Upcoming', nf(upN)], ['Travelling now', nf(ude)]]
        .map(([l, v]) => '<div><div class="l">' + l + '</div><div class="v">' + v + '</div></div>').join('') + '</div>' : '')
    + '</section>';

  /* søjler pr. måned for et år — uden afbestilte */
  const aar = S.barYear || +T.slice(0, 4);
  const mc = Array(12).fill(0);
  TRIPS.forEach(t => { if(!aktiv(t) || !F.br(t) || !F.ag(t)) return; const v = felt(t) || ''; if(v.slice(0, 4) === String(aar)) mc[+v.slice(5, 7) - 1]++; });
  const mx = Math.max(1, ...mc), aarN = mc.reduce((a, c) => a + c, 0);
  b += '<section class="s8kort" aria-label="Per month" style="' + kortStil(1, S.chartOpen) + '"><div style="display:flex;align-items:center">'
    + '<button type="button" class="s8kh" data-s="fch" aria-expanded="' + S.chartOpen + '" style="flex:1;padding-right:12px"><span class="t">' + ({ dep: 'Departures', ret: 'Returns', bk: 'Bookings' })[S.by] + ' per month</span>'
    + '<span class="s">click a month to see it</span>' + maerke('ok', aar + ' · ' + nf(aarN) + ' trips') + '</button>'
    + '<div class="s8aar"><button type="button" data-s="aar" data-k="-1" aria-label="Previous year">‹</button><span>' + aar + '</span><button type="button" data-s="aar" data-k="1" aria-label="Next year">›</button>'
    + '<button type="button" data-s="fch" aria-label="Fold the chart" style="width:30px">' + chev(S.chartOpen) + '</button></div></div>'
    + (S.chartOpen ? '<div class="s8bars">' + mc.map((n, i) => {
        const a = aar + '-' + pad(i + 1) + '-01', z = aar + '-' + pad(i + 1) + '-' + sidste(aar, i + 1);
        const inR = !!(fra || til) && !F.q && a <= (til || '9999') && z >= (fra || '0000');
        return '<button type="button" class="s8b' + (inR ? ' on' : '') + '" aria-pressed="' + inR + '" data-s="md" data-a="' + a + '" data-z="' + z + '" aria-label="' + MONL[i] + ' ' + aar + ': ' + n + ' trips">'
          + '<span class="n">' + (n || '') + '</span><span class="r"><span class="f" style="height:' + Math.round(54 * n / mx) + 'px"></span></span>'
          + '<span class="m' + (T.slice(0, 7) === aar + '-' + pad(i + 1) ? ' nu' : '') + '">' + MON[i] + '</span></button>'; }).join('') + '</div>' : '')
    + '</section>';

  b += '<div class="s8lh"><div class="s8eb">' + (grupperet ? 'By month · ' + nf(gl.length) + (gl.length === 1 ? ' month' : ' months') : 'One list · ' + nf(rows.length) + ' trips') + '</div>'
    + '<div class="r"><button type="button" class="s8lnk" data-s="vend" aria-label="Reverse the order">' + (S.sort === 'date' && S.dir < 0 ? 'Newest first' : S.sort === 'date' ? 'Oldest first' : 'Sorted by column') + ' ⇅</button>'
    + '<button type="button" class="s8lnk" data-s="alle" data-k="1">Open all</button><button type="button" class="s8lnk" data-s="alle" data-k="0">Close all</button>'
    + '<button type="button" class="s8lnk" data-s="grp">' + (grupperet ? 'One list' : 'By month') + '</button></div></div>';

  const hoved = '<div class="s8row th">' + [['ref', 'Ref.'], ['name', 'Customer'], ['dest', 'Destination'], ['date', ({ dep: 'Travel dates', ret: 'Dates · by return', bk: 'Dates · by booking' })[S.by]],
      ['nights', 'Nts'], ['pax', 'Pax'], ['price', 'Price'], ['agent', 'Agent'], [null, 'Status']].map(([k, l], i) => {
      const pil = k && S.sort === k ? (S.dir > 0 ? ' ↑' : ' ↓') : '';
      return k ? '<button type="button" class="' + ([4, 5, 6].includes(i) ? 'r' : '') + '" data-s="sort" data-k="' + k + '" aria-label="Sort by ' + esc(l) + '">' + esc(l) + '<span style="color:#c9b6ff">' + pil + '</span></button>'
               : '<span>' + esc(l) + '</span>'; }).join('') + '</div>';

  b += vist.map((g, i) => {
    const aab = g.key in S.fold ? S.fold[g.key] : (g.key === 'all' || i < 2 || !!F.q);   /* ved søgning er alle måneder åbne */
    const pax = g.list.reduce((a, t) => a + (+t.pax_count || 0), 0), dkk = g.list.reduce((a, t) => a + (+t.package_sell_dkk || 0), 0);
    const c = s => g.list.filter(t => t.status === s).length;
    const mk = [];
    if(c('god_tur')) mk.push(maerke('ok', c('god_tur') + ' travelling now'));
    if(c('klar_til_afrejse')) mk.push(maerke('gold', c('klar_til_afrejse') + ' ready to travel'));
    if(c('mellemlanding')) mk.push(maerke('vio', c('mellemlanding') + ' on the layover', true));
    if(c('canx') + c('tabt')) mk.push(maerke('bad', (c('canx') + c('tabt')) + ' cancelled'));
    if(!mk.length) mk.push(c('faerdig') === g.list.length ? maerke('dim', 'all completed') : maerke('vio', 'all confirmed'));
    const navnG = g.key === 'all' ? (F.q ? 'Search results' : 'All trips') : g.key === 'none' ? 'No date' : MONL[+g.key.slice(5) - 1] + ' ' + g.key.slice(0, 4);
    return '<section class="s8kort" aria-label="' + esc(navnG) + '" style="' + kortStil(i + 2, aab) + '">'
      + '<button type="button" class="s8kh" data-s="fold" data-k="' + esc(g.key) + '" data-v="' + (aab ? 0 : 1) + '" aria-expanded="' + aab + '"><span class="t">' + esc(navnG) + '</span>'
      + '<span class="s">' + g.list.length + (g.list.length === 1 ? ' trip' : ' trips') + ' · ' + nf(pax) + ' guests · ' + nf(dkk) + ' DKK</span>' + mk.slice(0, 2).join('') + chev(aab) + '</button>'
      + (aab ? '<div class="s8tab"><div>' + hoved + g.list.map(raekke).join('') + '</div></div>' : '')
      + '</section>';
  }).join('');
  if(!rows.length) b += '<p class="s8tomt">' + (S.st === 'upcoming' && til && til < T ? 'No upcoming trips in a period that has passed — choose All or Completed.' : 'No trips match.') + '</p>';
  $('s8krop').innerHTML = b;
}

/* ═══ KLIK, INPUT ═══ */
const saet = p => { Object.assign(S, { mlimit: 6, open: '', fold: {} }, p); tegn(); };
function klik(ev){
  const nav = ev.target.closest('#nav button[data-v]');
  if(nav){ const r = document.querySelector('#nav button[data-v="' + nav.dataset.v + '"]'); if(r) r.click(); return; }
  const fod = ev.target.closest('[data-d8]');
  if(fod){ ev.preventDefault(); const h = fod.dataset.d8;
    if(h === 'logud') return db.auth.signOut();
    if(h === 'kodeord') return (typeof changePassword === 'function') && changePassword();
    if(h === 'sprog') return (typeof setLang === 'function') && setLang(fod.dataset.c);
    return; }
  const el = ev.target.closest('[data-s]'); if(!el) return;
  const s = el.dataset.s, k = el.dataset.k;
  if(s === 'aabn')    return aabnRejse(el.dataset.id);
  if(s === 'pop')     { S.open = S.open === k ? '' : k; if(k === 'saved' && S.open) S.newName = forslag(); tegn();
                        if(k === 'saved' && S.open){ const i = $('s8navn'); if(i) i.focus(); } return; }
  if(s === 'luk')     { S.open = ''; return tegn(); }
  if(s === 'st')      return saet({ st: k });
  if(s === 'by')      { S.by = k; S.fold = {}; return tegn(); }
  if(s === 'preset')  { const r = periode(k), p = { preset: k };
                        if(S.st === 'upcoming' && r[1] && r[1] < T0) p.st = 'all';          /* som årsvælgeren: en periode der er slut → All */
                        if(r[0]) p.barYear = +r[0].slice(0, 4);
                        return saet(p); }
  if(s === 'br')      return saet({ br: k });
  if(s === 'ag')      return saet({ ag: k });
  if(s === 'gemt')    { const g = P.saved[+el.dataset.i]; if(!g) return;
                        S.q = ''; const sg = $('s8q'); if(sg) sg.value = '';
                        return saet(Object.assign({ barYear: g.cfg.from ? +g.cfg.from.slice(0, 4) : S.barYear }, g.cfg)); }
  if(s === 'gemtslet'){ P.saved.splice(+el.dataset.i, 1); gemPrefs('saved'); return tegn(); }
  if(s === 'gem')     { const n = (S.newName || '').trim(); if(!n) return;
                        P.saved.push({ name: n, cfg: { st: S.st, by: S.by, preset: S.preset, from: S.preset === 'custom' ? S.from : '', to: S.preset === 'custom' ? S.to : '', br: S.br, ag: S.ag } });
                        gemPrefs('saved'); return tegn(); }
  if(s === 'nulstil') { S.q = ''; const sg = $('s8q'); if(sg) sg.value = '';
                        return saet({ st: 'upcoming', by: 'dep', preset: 'all', from: '', to: '', br: 'all', ag: 'all', sort: 'date', dir: 1, barYear: +T0.slice(0, 4) }); }
  if(s === 'fov')     { S.ovOpen = !S.ovOpen; return tegn(); }
  if(s === 'fch')     { S.chartOpen = !S.chartOpen; return tegn(); }
  if(s === 'aar')     { S.barYear = Math.max(2000, (S.barYear || +T0.slice(0, 4)) + (+k)); return tegn(); }
  if(s === 'md')      { const a = el.dataset.a, z = el.dataset.z; S.q = ''; const sg = $('s8q'); if(sg) sg.value = '';
                        return saet({ preset: 'custom', from: a, to: z, st: (z < T0 && S.st === 'upcoming') ? 'all' : S.st }); }
  if(s === 'alle')    { const f = {}; ROD.querySelectorAll('#s8krop [data-s="fold"]').forEach(b => { f[b.dataset.k] = k === '1'; }); S.fold = f; return tegn(); }
  if(s === 'grp')     { S.group = !(S.group && S.sort === 'date'); S.sort = 'date'; S.dir = 1; S.fold = {}; return tegn(); }
  if(s === 'fold')    { S.fold = Object.assign({}, S.fold, { [k]: el.dataset.v === '1' }); return tegn(); }
  if(s === 'sort')    { S.dir = S.sort === k ? -S.dir : 1; S.sort = k; S.fold = {}; return tegn(); }
  /* Wendie 20.10.2026: listen skal kunne vendes, så de nyeste står øverst */
  if(s === 'vend')    { if(S.sort !== 'date'){ S.sort = 'date'; S.dir = -1; } else S.dir = -S.dir; S.fold = {}; return tegn(); }
  if(s === 'ny')      { luk(); return (typeof viewNew === 'function') && viewNew(); }
  if(s === 'klassisk'){ window.__salgKlassisk = true; luk(); return (typeof viewSales === 'function') && viewSales(); }
}
function forslag(){ const [fra, til] = periode();
  return periodeNavn(fra, til) + efterNavn() + (S.br !== 'all' ? ' · ' + S.br : '') + (S.ag !== 'all' ? ' · ' + S.ag : '') + ' · ' + statusNavn(); }
let _q;
function input(ev){
  const el = ev.target;
  if(el.id === 's8q'){ S.q = el.value; clearTimeout(_q); _q = setTimeout(() => { S.mlimit = 6; S.fold = {}; tegn(); }, 140); return; }
  if(el.id === 's8navn'){ S.newName = el.value; return; }
}
function skift(ev){
  const el = ev.target;
  if(el.id === 's8fra' || el.id === 's8til'){
    const [fra, til] = periode();
    const p = { preset: 'custom', from: S.preset === 'custom' ? S.from : fra, to: S.preset === 'custom' ? S.to : til };
    if(el.id === 's8fra') p.from = el.value; else p.to = el.value;
    Object.assign(S, p, { mlimit: 6, fold: {} });
    tegn();
  }
}
function taster(ev){
  if(ev.key === 'Escape' && S.open){ S.open = ''; tegn(); }
  if(ev.key === 'Enter' && ev.target && ev.target.id === 's8navn'){ ev.preventDefault(); const b = ROD.querySelector('[data-s="gem"]'); if(b) b.click(); }
}

/* ═══ ÅBN EN REJSE — R856: listen huskes (filter, foldning, rulleposition) ═══ */
function aabnRejse(id){
  if(!id) return;
  const sk = ROD && ROD.querySelector('.m8html'); S.scroll = sk ? sk.scrollTop : 0;
  S.open = '';
  if(typeof salgHusk === 'function') salgHusk();
  luk();
  if(typeof viewTrip === 'function') viewTrip(id);
}

/* ═══ «RECENT» OG GEMTE FILTRE — pr. bruger i user_prefs; browseren som nødløsning ═══ */
const lsKey = k => 'panda_sales_' + k + '_' + (window.ME || window.MYEMAIL || '');
async function hentPrefs(){
  if(P.hentet) return;
  P.hentet = true;
  try {
    const r = await db.from('user_prefs').select('key,value').in('key', ['sales.recent', 'sales.saved']);
    if(r && !r.error){
      (r.data || []).forEach(x => {
        if(x.key === 'sales.recent' && Array.isArray(x.value && x.value.ids)) P.recent = mergeRecent(x.value.ids, P.recent);
        if(x.key === 'sales.saved' && Array.isArray(x.value && x.value.list)) P.saved = x.value.list;
      });
      return;
    }
  } catch(_){}
  try { P.recent = mergeRecent(JSON.parse(localStorage.getItem(lsKey('recent')) || '[]'), P.recent);
        P.saved = JSON.parse(localStorage.getItem(lsKey('saved')) || '[]'); } catch(_){}
}
const mergeRecent = (gem, nu) => [...nu, ...gem.filter(x => !nu.includes(x))].slice(0, 10);
const _gemT = {};
function gemPrefs(hvad){
  clearTimeout(_gemT[hvad]);
  _gemT[hvad] = setTimeout(async () => {
    const value = hvad === 'recent' ? { ids: P.recent } : { list: P.saved };
    try { localStorage.setItem(lsKey(hvad), JSON.stringify(hvad === 'recent' ? P.recent : P.saved)); } catch(_){}
    try {
      const em = window.MYEMAIL || (typeof session !== 'undefined' && session && session.user && session.user.email) || null;
      const row = { key: 'sales.' + hvad, value, updated_at: new Date().toISOString() };
      if(em) row.user_email = em;
      const r = await db.from('user_prefs').upsert(row, { onConflict: 'user_email,key' });
      if(r && r.error) console.warn('PandaSales: kunne ikke gemme ' + hvad, r.error.message);
    } catch(e){ console.warn('PandaSales: kunne ikke gemme ' + hvad, e); }
  }, hvad === 'recent' ? 600 : 50);
}
/* kaldes fra viewTrip(): alle rejser man åbner — fra Sales, dashboardet, søgningen — kommer i «Recent» */
function husk(id){
  if(!id) return;
  P.recent = [id, ...P.recent.filter(x => x !== id)].slice(0, 10);
  if(P.hentet) gemPrefs('recent');
  else hentPrefs().then(() => { P.recent = [id, ...P.recent.filter(x => x !== id)].slice(0, 10); gemPrefs('recent'); });
}

/* ═══ ÅBN OG LUK ═══ */
function sikrDokument(){
  if(!document.getElementById('s8-dok')){ const s = document.createElement('style'); s.id = 's8-dok'; s.textContent = STIL_DOK; document.head.appendChild(s); }
  if(!document.getElementById('m8-skrift') && typeof M8_SKRIFT_URL !== 'undefined'){
    const l = document.createElement('link'); l.id = 'm8-skrift'; l.rel = 'stylesheet'; l.href = M8_SKRIFT_URL; document.head.appendChild(l); }
  if(!document.getElementById('s8-mono')){ const l = document.createElement('link'); l.id = 's8-mono'; l.rel = 'stylesheet'; l.href = MONO; document.head.appendChild(l); }
}
function skal(){
  /* sidemenuen er dashboardets egen (D8_SKAL) — samme punkter, ikoner og fod */
  const side = (typeof D8_SKAL !== 'undefined' && D8_SKAL.indexOf('<div class="scene">') > 0)
    ? D8_SKAL.slice(0, D8_SKAL.indexOf('<div class="scene">')).replace(' class="on"', '') : '<div class="m8html"><div class="m8body">';
  return side
    + '<div class="scene"><div class="app"><div class="s8">'
    + '<header class="s8hd"><div><div class="s8eb">Sales</div><h1>All trips</h1></div><div class="s8hr">'
    + '<label class="s8sog"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9b6ff" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>'
    + '<span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Search</span><input id="s8q" type="search" placeholder="Name or ref. no. — all dates" autocomplete="off" spellcheck="false"></label>'
    + '<div id="s8rec"></div><button type="button" class="s8ny" data-s="ny">＋ New trip</button></div></header>'
    + '<div class="s8bar" id="s8bar"></div><div id="s8krop" style="display:flex;flex-direction:column;gap:14px"></div>'
    + '<div style="text-align:center;padding:10px 0 4px"><button type="button" class="s8klas" data-s="klassisk">Classic list</button></div>'
    + '</div></div></div>'
    + '</div></div>';
}
function menu(){
  const rigtige = [...document.querySelectorAll('#nav button[data-v]')];
  ROD.querySelectorAll('#nav button[data-v]').forEach(b => {
    const r = rigtige.find(x => x.dataset.v === b.dataset.v);
    if(!r){ b.hidden = true; return; }
    b.hidden = r.style.display === 'none';
    b.classList.toggle('on', b.dataset.v === 'sales');
    if(b.dataset.v === 'sales') b.setAttribute('aria-current', 'page');
  });
  const f = $('d8fod'); if(!f) return;
  const tm = TEAM.find(t => t.initials === window.ME);
  const rolle = (() => { const w = document.querySelector('#who .muted'); return w ? w.textContent.replace(/^\s*·\s*/, '') : ''; })();
  const sprog = (typeof LANGS !== 'undefined' ? LANGS : []).map(([c, n]) =>
    '<a href="#" data-d8="sprog" data-c="' + esc(c) + '"' + (typeof LANG !== 'undefined' && c === LANG ? ' class="on"' : '') + '>' + esc(n) + '</a>').join(' · ');
  f.innerHTML = '<b>' + esc((tm && tm.name) || window.MYNAME || '') + '</b>' + (rolle ? ' <span class="rolle">· ' + esc(rolle) + '</span>' : '') + '<br>'
    + esc(window.MYEMAIL || '') + '<br><a href="#" data-d8="kodeord">Change password</a> · <a href="#" data-d8="logud">Log out</a><br>'
    + (sprog ? '<span class="sprog">' + sprog + '</span><br>' : '') + 'Panda · ' + esc(typeof APP_VERSION !== 'undefined' ? APP_VERSION : '');
}
function luk(){
  if(OBS){ OBS.disconnect(); OBS = null; }
  if(VAERT){ VAERT.remove(); VAERT = null; ROD = null; }
  document.body.classList.remove('s8-paa');
  LAESER = false;
}
/* laget lægges på med det samme, mens rejserne hentes — det gamle design ses aldrig */
function vent(){
  if(!VAERT){
    sikrDokument();
    VAERT = document.createElement('div'); VAERT.id = 's8-vaert';
    ROD = VAERT.attachShadow({ mode: 'open' });
    const grund = (typeof M8_GRUND !== 'undefined' ? M8_GRUND : '') + '\n' + (typeof D8_STIL !== 'undefined' ? D8_STIL : '');
    ROD.innerHTML = '<style>' + grund + '\n' + STIL + '</style>' + skal();
    document.body.appendChild(VAERT);
    ROD.addEventListener('click', klik);
    ROD.addEventListener('input', input);
    ROD.addEventListener('change', skift);
    ROD.addEventListener('keydown', taster);
    const q = $('s8q'); if(q) q.value = S.q || '';
    $('s8krop').innerHTML = '<p class="s8tomt" style="text-align:center;margin-top:40px">Getting the trips …</p>';
    /* lukkes, når Panda viser en anden side i #app (også rejsesiden, der hører under «sales») */
    OBS = new MutationObserver(() => { if(window.__view !== 'sales' || (!LAESER && !document.getElementById('salgkpi'))) luk(); });
    OBS.observe(document.getElementById('app'), { childList: true });
    menu();
    if(!TEAM.length) db.from('team_members').select('initials,name,active').order('initials')
      .then(r => { TEAM = ((r && r.data) || []).filter(t => t.active !== false && t.initials); if(ROD){ menu(); if(TRIPS.length) tegn(); } }, () => {});
  }
  LAESER = true;
  document.body.classList.add('s8-paa');
}
async function aabn(d){
  if(!d || window.__view !== 'sales'){ luk(); return; }
  TRIPS = (d.trips || []).filter(t => t && t.status !== 'voided');
  T0 = d.t0 || new Date().toISOString().slice(0, 10);
  if(!S.barYear) S.barYear = +T0.slice(0, 4);
  if(!VAERT) vent();
  await hentPrefs();
  if(!ROD) return;
  LAESER = false;
  tegn();
  if(S.scroll){ const sk = ROD.querySelector('.m8html'); const y = S.scroll; requestAnimationFrame(() => { if(sk) sk.scrollTop = y; }); S.scroll = 0; }
}

return { version: VERSION, vent, aabn, luk, husk, _S: S, _P: P, _test: { periode, filtre, raekker, tone, mergeRecent } };
})();
