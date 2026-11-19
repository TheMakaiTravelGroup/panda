/* ═══ Panda · modul: Økonomi — modules/okonomi.v1.js ═══
   R1045–R1049 og R1051–R1061 (Wendie 18.–19.11.2026): hele Økonomi-menuen på dansk i dashboard-designet, bygget på
   kontoudskrifterne og e-conomics kontoplan. Sider: Overblik · Budget & resultat · Saldobalance · Leverandørbetalinger ·
   Bank & afstemning · Likviditet · Interne balancer · Afklaring · Flere sider.

   Data (maldivia-core):
     · vk_bank_aar            alle banklinjer 01.01→ (kategori, konto, person, rejse, bilag_fil, econ_bilag) — kan rettes her
     · vk_resultat_rejse      omsætning, omkostning og dækningsbidrag pr. rejse (beregnet 18.11.2026)
     · vk_budget, vk_resultat_afklaring, gl_accounts
     · vk_reference           øjebliksbilleder: e-conomic saldobalance og posteringer, DRIFTSBUDGET, Vendor Payments Due, solgte rejser

   EGEN FIL som Sales (modules/sales.v1.js). index.html har tre korte kroge:
     · finSubtabs()   → knappen «Økonomi 2026»
     · viewResultat() → PandaOkonomi.vent() straks, PandaOkonomi.aabn() henter og tegner
     · PANDA_ROUTES.resultat
   Mangler filen, eller går noget galt, vises et kort med besked i den klassiske Økonomi-side — intet andet påvirkes.

   Selve siden (stil + tegning) er prototypen «Panda · Økonomi», som Wendie har gennemgået 19.11.2026. Den ligger i sin egen
   skygge-rod inde i Pandas skal, så dens stil ikke kan ramme resten af Panda — og omvendt.

   VIGTIGT: tallene pr. rejse er et øjebliksbillede (folder_res 18.11.2026). En rettelse af en banklinje flytter
   driftsudgifterne med det samme, men ikke en rejses omkostning — den genberegnes ved næste kørsel. */
window.PandaOkonomi = (function(){
'use strict';
const VERSION = 'okonomi v1';
const AAR = 2026;
let VAERT = null, ROD = null, INDRE = null, OBS = null, LAESER = false, APP = null, GEMT_S = null, D = null;

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hvem = () => window.ME || window.MYNAME || window.MYEMAIL || '';
const STIL_DOK = 'body.ok-paa{overflow:hidden!important}body.ok-paa #app,body.ok-paa #sidebar{visibility:hidden!important}#ok-vaert{position:fixed;inset:0;z-index:60}';
const STIL_SKAL = '.scene.okscene{padding:0!important;margin:0!important;max-width:none!important;min-width:0}#okhost{display:block;min-width:0}';
const STIL = `
:host{--ink:#14121f;--ink2:#55526b;--ink3:#8683a0;--line:#eceaf4;--vio:#6C4FE0;--vio2:#B9A8FF;--teal:#1B9AAA;--amber:#C77D0A;
  --good:#12805c;--bad:#c9304a;--warn:#a8660a;--card:#fff;--soft:#f6f4fc;--rail:68px}
*{box-sizing:border-box}
.okrod{margin:0;background:#050508;min-height:100%;color:#F3F3F7;font:400 14.5px/1.5 Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
button,select,input,textarea{font:inherit;color:inherit}
button{cursor:pointer}
:focus-visible{outline:2px solid var(--vio2);outline-offset:2px}
/* sidemenu: foldet ind til en skinne, folder ud når musen er over */
.side{position:fixed;left:0;top:0;bottom:0;z-index:30;width:var(--rail);overflow:hidden;background:rgba(10,10,16,.94);border-right:1px solid rgba(255,255,255,.07);padding:20px 12px;transition:width .28s cubic-bezier(.2,.8,.2,1),box-shadow .28s;white-space:nowrap}
.side:hover,.side:focus-within{width:252px;overflow-y:auto;box-shadow:30px 0 60px -20px rgba(0,0,0,.7)}
.logo{display:flex;gap:12px;align-items:center;padding:0 2px 20px}
.logo i{flex:0 0 40px;height:40px;border-radius:11px;background:linear-gradient(135deg,#1d3a2a,#0f1f17);display:grid;place-items:center;font-style:normal;color:#b7e08a;font-size:19px}
.logo small{display:block;font:600 10.5px/1 Inter;letter-spacing:.16em;color:#A3A3BA;text-transform:uppercase;margin-bottom:5px}
.logo b{font:700 19px/1 "Inter Tight",sans-serif}
.nav a{display:flex;align-items:center;gap:14px;height:42px;padding:0 11px;border-radius:12px;color:#fff;text-decoration:none;font:500 14px/1 Inter;opacity:.55}
.nav a svg{flex:0 0 20px}
.nav a span,.logo div{opacity:0;transition:opacity .2s}.side:hover .nav a span,.side:focus-within .nav a span,.side:hover .logo div,.side:focus-within .logo div{opacity:1}
.nav a.on{opacity:1;background:rgba(255,255,255,.1)}
.nav .sub{display:none;margin:4px 0 8px 20px;padding-left:12px;border-left:1px solid rgba(255,255,255,.12);flex-direction:column;gap:1px}
.side:hover .sub,.side:focus-within .sub{display:flex}
.nav .sub button{all:unset;cursor:pointer;display:flex;justify-content:space-between;align-items:center;height:32px;padding:0 10px;border-radius:9px;font:500 13px/1 Inter;color:#cfcfe0}
.nav .sub button:hover{background:rgba(255,255,255,.05)}
.nav .sub button.on{background:rgba(185,168,255,.16);color:#fff}
.nav .sub .n{font:600 11px/1 "JetBrains Mono",monospace;color:#B9A8FF}
.main{margin-left:var(--rail);min-width:0;position:relative;min-height:100vh;background:linear-gradient(180deg,#050508 0,#0b0820 190px,#1d1650 400px,#4a3c9c 620px,#9a8dd0 860px,#d6cfee 1120px,#e4dff4 100%)}
.aur{position:absolute;inset:0 0 auto 0;height:620px;pointer-events:none;background:radial-gradient(760px 340px at 80% 4%,rgba(124,92,240,.42),transparent 70%),radial-gradient(620px 300px at 10% 34%,rgba(227,90,200,.13),transparent 70%),radial-gradient(520px 260px at 48% 70%,rgba(77,141,255,.14),transparent 70%)}
.wrap{position:relative;max-width:1380px;margin:0 auto;padding:24px clamp(16px,3vw,44px) 110px}
.top{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;justify-content:space-between}
.eyebrow{font:600 12px/1.2 Inter;letter-spacing:.14em;text-transform:uppercase;color:#A3A3BA}
.live{display:inline-flex;gap:8px;align-items:center;font:500 11px/1 "JetBrains Mono",monospace;letter-spacing:.1em;text-transform:uppercase;color:#cfcfe0;border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:8px 14px}
.live i{width:7px;height:7px;border-radius:50%;background:#F2C46B}
.tabs{display:flex;gap:4px;padding:5px;border-radius:999px;background:rgba(255,255,255,.07);margin:18px 0 0;overflow-x:auto;max-width:100%;scrollbar-width:none}
.tabs button{all:unset;cursor:pointer;white-space:nowrap;display:inline-flex;gap:8px;align-items:center;height:38px;padding:0 15px;border-radius:999px;font:500 14px/1 Inter;color:#dcdcea}
.tabs button.on{background:rgba(255,255,255,.16);color:#fff;font-weight:600}
.tabs .n{font:600 11px/1 "JetBrains Mono",monospace;background:rgba(255,255,255,.12);border-radius:999px;padding:4px 7px;color:#fff}
.tabs .n.r{color:#FF9BA6}
.hero{padding:46px 0 26px;max-width:920px}
.hero h1{margin:14px 0 14px;font:700 clamp(34px,5vw,58px)/.96 "Inter Tight",sans-serif;letter-spacing:-.04em;color:#ECECF2;text-wrap:balance}
.hero p{margin:0;font-size:15.5px;color:#b9b9cf;max-width:740px}
.hero p b{color:#fff;font-weight:600}
.calc{display:grid;grid-template-columns:auto auto;justify-content:start;gap:7px 34px;font-size:15px;color:#c9c5e6;margin-top:4px;font-variant-numeric:tabular-nums}
.calc span:nth-child(even){text-align:right;color:#fff;font-weight:600}
.calc .st{color:#fff;font-weight:700;border-top:1px solid rgba(255,255,255,.22);padding-top:7px}
.calc .lt{font-size:13px;color:#a9a4cc}.calc .lt+span{font-size:13px;color:#c9c5e6;font-weight:500}
.hero2{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:28px;align-items:center}
.hero2 .hero{padding-bottom:20px}
.glass{background:linear-gradient(152deg,rgba(255,255,255,.11),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.12);border-radius:22px;backdrop-filter:blur(14px);padding:18px 20px;min-width:0}
.gk{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,178px),1fr));gap:12px;margin:6px 0 22px}
.gk .l{font:600 10.5px/1.25 Inter;letter-spacing:.14em;text-transform:uppercase;color:#b9b3dc}
.gk .v{font:700 27px/1.15 "Inter Tight",sans-serif;letter-spacing:-.03em;margin-top:8px;color:#fff}
.gk .u{font-size:12.5px;color:#c9c5e6;margin-top:3px}
.dchip{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:2px 8px;font:600 11.5px/1.4 Inter;white-space:nowrap}
.dchip.g{background:rgba(111,227,165,.16);color:#8ff0bd}.dchip.r{background:rgba(255,106,120,.18);color:#ffa2ab}.dchip.n{background:rgba(255,255,255,.1);color:#d8d5ee}
.grid{display:grid;gap:18px;grid-template-columns:minmax(0,1fr)}
.ro{grid-template-columns:minmax(0,1fr)}
.g2{grid-template-columns:repeat(auto-fit,minmax(min(100%,430px),1fr))}
.g3{grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))}
.g4{grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))}
.card{background:var(--card);color:var(--ink);border-radius:24px;padding:22px 26px 24px;box-shadow:0 30px 60px -34px rgba(20,10,60,.55);min-width:0}
.card.pad0{padding-left:0;padding-right:0}.card.pad0>.ch,.card.pad0>.note{padding-left:26px;padding-right:26px}
.ch{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-bottom:14px}
.ch .t{font:700 11px/1.2 Inter;letter-spacing:.16em;text-transform:uppercase;color:var(--ink)}
.ch .c{font:600 11px/1 "JetBrains Mono",monospace;background:var(--soft);border-radius:7px;padding:5px 8px}
.ch .s{font-size:13px;color:var(--ink2);flex:1 1 200px}
.ch .r{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
h2.big{margin:0 0 4px;font:800 clamp(24px,3vw,34px)/1 "Inter Tight",sans-serif;letter-spacing:-.035em}
.kpi .l{font:600 11px/1.2 Inter;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3)}
.kpi .v{font:700 30px/1.15 "Inter Tight",sans-serif;letter-spacing:-.03em;margin-top:8px}
.kpi .u{font-size:12.5px;color:var(--ink2);margin-top:2px}
.row{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 0;border-top:1px solid var(--line);width:100%;background:none;border-left:0;border-right:0;border-bottom:0;text-align:left}
button.row:hover{background:var(--soft)}
.row:first-of-type{border-top:0}
.ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--soft);font-size:17px}
.ic.a{background:#fbf0dc}.ic.r{background:#fde7ea}.ic.g{background:#dff5ec}.ic.v{background:#ece7fd}
.row .a b{display:block;font:600 14.5px/1.3 Inter}
.row .a span{display:block;font:500 12.5px/1.35 Inter;color:var(--ink2);overflow:hidden;text-overflow:ellipsis}
.row .z{text-align:right;font:600 14px/1.3 Inter;white-space:nowrap}
.row .z small{display:block;font:500 12px/1.3 Inter;color:var(--ink3)}
.good{color:var(--good)}.bad{color:var(--bad)}.warn{color:var(--warn)}.dim{color:var(--ink3)}
.mono{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12.5px}
.pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:3px 9px;font:600 11.5px/1.3 Inter;background:var(--soft);color:var(--ink2);white-space:nowrap}
.pill.a{background:#fbf0dc;color:#8a5407}.pill.r{background:#fde7ea;color:#a8243b}.pill.g{background:#dff5ec;color:#0d6b4c}.pill.v{background:#ece7fd;color:#4b34b8}.pill.t{background:#dcf2f4;color:#0f6a76}
.seg{display:inline-flex;gap:3px;padding:3px;border-radius:999px;background:var(--soft);flex-wrap:wrap}
.seg button{all:unset;cursor:pointer;padding:6px 13px;border-radius:999px;font:500 13px/1.2 Inter;color:var(--ink2);white-space:nowrap}
.seg button.on{background:#fff;color:var(--ink);font-weight:600;box-shadow:0 2px 8px -3px rgba(20,10,60,.35)}
.seg.dk{background:rgba(255,255,255,.1)}.seg.dk button{color:#dcdcea;padding:9px 18px;font-size:14px}.seg.dk button.on{background:#fff;color:var(--ink)}
.f{height:34px;border:1px solid #dcd8ea;border-radius:10px;background:#fff;padding:0 10px;font-size:13px;color:var(--ink);max-width:100%}
.f.s{height:30px;font-size:12.5px;padding:0 6px;border-radius:8px}
td select.f.s{width:auto;max-width:200px}
.f.ch2{border-color:#C77D0A;background:#fffaf0}
.btn{border:0;border-radius:10px;height:34px;padding:0 14px;font:600 13px/1 Inter;background:var(--vio);color:#fff}
.btn.l{background:var(--soft);color:var(--ink)}
.sc{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}
th{font:600 10.5px/1.2 Inter;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);text-align:right;padding:8px 10px;white-space:nowrap;border-bottom:1px solid var(--line)}
td{padding:8px 10px;text-align:right;white-space:nowrap;border-bottom:1px solid #f3f1f8}
th:first-child,td:first-child{text-align:left;padding-left:26px}th:last-child,td:last-child{padding-right:26px}
th.l,td.l{text-align:left}
tr.sum td{font-weight:700;background:#faf9fd;border-top:1px solid #dcd8ea}
tr.klik{cursor:pointer}tr.klik:hover td{background:var(--soft)}
td.neg{color:var(--bad)}td.est{font-style:italic;color:var(--warn)}
td.wrapc{white-space:normal;min-width:240px;max-width:380px;text-align:left}
th button{all:unset;cursor:pointer;letter-spacing:inherit}
.note{font-size:12.5px;color:var(--ink2);margin:14px 0 0;line-height:1.55}
.lg{display:flex;gap:6px 16px;flex-wrap:wrap;font-size:12.5px;color:var(--ink2)}
.lg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.lg b{color:var(--ink);font-weight:600}
.chart{position:relative}
.chart svg{display:block;width:100%;height:auto;overflow:visible}
.chart text{font:500 11px Inter;fill:#8683a0}
.chart text.vl{font:600 10.5px Inter;fill:#14121f}
.chart text.vl{paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round}
.chart.dk text{fill:#c9c5e6;font-size:12px}.chart.dk text.vl{fill:#fff;stroke:#1d1650;stroke-width:4px;font-size:11px}
.chart text.df{font:700 12px Inter}
.glass.hg{padding:24px 26px}.hgh{display:flex;flex-wrap:wrap;gap:8px 16px;justify-content:space-between;align-items:center;margin-bottom:14px}.hgl{display:flex;gap:14px;font-size:12.5px;color:#e6e3f5}.hgl i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.hsum{margin:0 0 16px!important}
.chart.dk text.el{font:700 13px Inter;fill:#fff;paint-order:stroke;stroke:#1d1650;stroke-width:5px;stroke-linejoin:round}
.hero2{margin-top:26px}.hsum{display:flex;flex-wrap:wrap;gap:8px 26px;margin:4px 0 12px}.hsum div{font-size:12.5px;color:#c9c5e6}.hsum b{display:block;font:700 22px/1.2 "Inter Tight";color:#fff;letter-spacing:-.02em}
.tip{position:absolute;pointer-events:none;background:#14121f;color:#fff;border-radius:10px;padding:8px 11px;font-size:12.5px;line-height:1.5;white-space:nowrap;opacity:0;transition:opacity .12s;z-index:5;border:1px solid rgba(255,255,255,.14)}
.tip b{font-weight:600}.tip i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px}
/* månedsfliser */
.mgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(176px,1fr));gap:10px}
.mf{border-radius:16px;padding:12px 14px;background:var(--soft);min-width:0;position:relative;overflow:hidden}
.mf .m{display:flex;justify-content:space-between;align-items:center;font:700 11px/1 Inter;letter-spacing:.13em;text-transform:uppercase;color:var(--ink2)}
.mf .v{font:700 21px/1.15 "Inter Tight";letter-spacing:-.02em;margin:8px 0 6px}
.mf dl{margin:0;display:grid;grid-template-columns:1fr auto;gap:2px 8px;font-size:12px;color:var(--ink2)}
.mf dt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mf dd{margin:0;text-align:right;white-space:nowrap;color:var(--ink);font-weight:600;font-variant-numeric:tabular-nums}
.mf .bar{height:5px;border-radius:3px;background:#e4dff4;margin-top:9px;overflow:hidden}.mf .bar i{display:block;height:100%;border-radius:3px}
.mf.fr{background:repeating-linear-gradient(135deg,#f6f4fc 0 8px,#efecf8 8px 16px)}
/* kontotabel som rækker (ingen vandret rul) */
.kt{font-variant-numeric:tabular-nums}
.kr{display:grid;gap:0 12px;align-items:center;padding:8px 26px;border-top:1px solid #f1eff7;font-size:13px;min-height:42px}
.kr>*{min-width:0}
.kr .n{text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kr.hd{border-top:0;padding-top:2px;padding-bottom:8px;min-height:0;font:600 10.5px/1.25 Inter;letter-spacing:.09em;text-transform:uppercase;color:var(--ink3)}
.kr.hd .n{white-space:normal}
.kr.sek{background:#faf9fd;border-top:1px solid #e6e2f1;font-weight:700;font-size:13.5px}
.kr.sek .nm{display:flex;align-items:center;gap:10px}
.kr.sek .dot{width:10px;height:10px;border-radius:3px;flex:none}
.kr.bd{background:#14121f;color:#fff;font-weight:700;font-size:14px;border-top:0;margin:8px 14px;padding:12px 14px;border-radius:14px}
.kr.bd .dim{color:#b9b3dc}.kr.bd .n[style]{color:#7fd9e3!important}.kr.bd .fill{background:rgba(255,255,255,.16)}.kr.bd .mk{background:#fff}
#side [id^=sk-]{scroll-margin-top:16px}
button.kr{width:100%;border-left:0;border-right:0;border-bottom:0;background:none;text-align:left;color:inherit}
button.kr:hover{background:#faf9fd}
.kr .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kr .nm .mono{color:var(--ink3);margin-right:8px}
.kr.tom{color:var(--ink3)}
.kb{--k:minmax(170px,1.7fr) 96px repeat(4,minmax(74px,.62fr)) minmax(110px,.9fr) minmax(74px,.62fr) minmax(88px,.7fr);grid-template-columns:var(--k)}
.km{grid-template-columns:minmax(200px,2.4fr) repeat(12,minmax(0,1fr)) minmax(56px,1fr);font-size:12px;gap:0 4px}
.km .n{padding:3px 2px;border-radius:5px}
.km .n.bk{color:#0f6a76;background:#e9f6f7}.km .n.sk{color:#8683a0;font-style:italic;background:repeating-linear-gradient(135deg,#f6f4fc 0 5px,#efecf8 5px 10px)}
.ks{grid-template-columns:minmax(170px,1.6fr) repeat(3,minmax(90px,.7fr)) minmax(120px,1fr)}
.fill{height:10px;border-radius:5px;background:#eeebf6;display:flex;overflow:hidden;position:relative}
.fill i{display:block;height:100%}
.fillw{position:relative;padding:4px 0}
.fillw .mk{position:absolute;top:0;bottom:0;width:2px;background:#14121f;border-radius:1px}
.det{padding:6px 26px 16px;background:#faf9fd;border-top:1px solid #f1eff7}
.det .mgrid{grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:6px}
.det .mf{padding:8px 10px;border-radius:11px;background:#fff}
.det .mf .v{font-size:15px;margin:5px 0 2px}
.det button.mf{all:unset;box-sizing:border-box;cursor:pointer;padding:8px 10px;border-radius:11px;background:#fff;display:block}.det button.mf:hover{box-shadow:0 0 0 2px #d9d0f7}.det button.mf.on{background:#14121f;color:#fff}.det button.mf.fr{background:repeating-linear-gradient(135deg,#fff 0 8px,#f4f1fc 8px 16px)}.det .mf .x{font-size:11.5px;color:var(--ink3);line-height:1.35}.det button.mf.on .x,.det button.mf.on .m{color:#cfcbe6}.det button.mf:focus-visible{outline:2px solid var(--vio)}
.wf{display:grid;grid-template-columns:minmax(130px,auto) minmax(0,1fr) auto;gap:8px 14px;align-items:center;font-size:13.5px}
.wf .tr{height:22px;border-radius:6px;background:#f3f1f9;position:relative;overflow:hidden}
.wf .tr i{position:absolute;top:0;bottom:0;border-radius:6px}
.wf b{font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.wf .res{font-weight:700}
.ph{border:1.5px dashed #cfc8e8;background:rgba(255,255,255,.55);box-shadow:none}
.person{display:flex;gap:12px;align-items:center;margin-bottom:10px}
.person i{width:44px;height:44px;border-radius:50%;background:#14121f;color:#fff;display:grid;place-items:center;font:700 14px Inter;font-style:normal}
#toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#14121f;color:#fff;border-radius:12px;padding:11px 18px;font-size:13.5px;opacity:0;transition:opacity .2s;z-index:50;max-width:92vw;box-shadow:0 20px 40px -18px #000;pointer-events:none}

/* resultatopgørelsen: ét roligt kort pr. sektion */
.ro{display:grid;gap:14px}
.roh{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;justify-content:space-between;padding:6px 6px 2px}
.roh h2{margin:0;font:700 26px/1.1 "Inter Tight",sans-serif;letter-spacing:-.03em;color:var(--ink)}
.roh .lg{color:var(--ink2)}
.sekc{background:#fff;color:var(--ink);border-radius:28px;padding:30px 34px 22px;box-shadow:0 30px 60px -38px rgba(20,10,60,.5)}
.sekh{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 24px;align-items:end;margin-bottom:18px}
.sekh .sn{display:flex;align-items:center;gap:12px;font:700 22px/1.1 "Inter Tight",sans-serif;letter-spacing:-.02em;color:var(--ink)}
.sekh .sn i{width:10px;height:10px;border-radius:50%;flex:none}
.sekh .st{font:700 30px/1.05 "Inter Tight",sans-serif;letter-spacing:-.035em;margin-top:10px}
.sekh .ss{font-size:13px;color:var(--ink3);margin-top:6px}
.sekh .ss b{color:var(--ink2);font-weight:600}
.sekh .sr{text-align:right}
.sekh .sv{font:700 34px/1 "Inter Tight",sans-serif;letter-spacing:-.04em}
.sekh .sb{grid-column:1/-1;margin-top:10px}
.sekh .fill{height:6px;border-radius:3px}.sekh .fillw{padding:5px 0}
.ka{display:grid;grid-template-columns:minmax(0,2fr) minmax(84px,.7fr) minmax(96px,.8fr) minmax(90px,150px) minmax(84px,.7fr) minmax(104px,.9fr);gap:0 20px;align-items:center;width:100%;min-height:50px;padding:6px 10px;margin:0 -10px;border:0;border-top:1px solid #f1eff7;background:none;color:inherit;text-align:left;font-size:14px;border-radius:0;font-variant-numeric:tabular-nums;box-sizing:content-box}
button.ka{cursor:pointer}button.ka:hover{background:#faf9fd;border-radius:12px;border-top-color:transparent}
.ka>*{min-width:0}
.ka .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ka .nm .mono{color:#b3afc8;margin-right:12px;font-size:12px}
button.ka .nm:before,button.kr.ks .nm:before{content:"›";display:inline-block;width:14px;color:#b3afc8;transition:transform .2s;font-size:15px}
button.ka[aria-expanded=true] .nm:before,button.kr.ks[aria-expanded=true] .nm:before{transform:rotate(90deg);color:var(--vio)}
button.ka[aria-expanded=true]{background:#f6f4fc;border-radius:12px;border-top-color:transparent}
.ka .n{text-align:right;white-space:nowrap}
.ka .n.q{color:var(--ink3);font-size:13px}
.ka .n.fv{font-weight:600}
.ka .av{text-align:right;font-size:12.5px;font-weight:600;white-space:nowrap}
.ka.hd{min-height:0;padding-top:0;padding-bottom:8px;border-top:0;font:600 10px/1.2 Inter;letter-spacing:.14em;text-transform:uppercase;color:#a8a4bf}
.ka.tom{min-height:38px;color:#b3afc8;font-size:13px}.ka.tom .n.fv{font-weight:400}
.ka .fill{height:4px;border-radius:2px;background:#f0edf8}.ka .fillw{padding:5px 0}.ka .fillw .mk{width:1.5px;background:#8683a0}
.band{border-radius:28px;padding:26px 34px;color:#fff;background:radial-gradient(520px 200px at 88% 0,rgba(185,168,255,.35),transparent 70%),linear-gradient(135deg,#17123a,#2c1f73 60%,#3d2c94);box-shadow:0 30px 60px -34px rgba(20,10,60,.7);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 24px;align-items:end}
.band .sn{font:700 22px/1.1 "Inter Tight",sans-serif;letter-spacing:-.02em;color:#fff}
.band .st{font:700 30px/1.05 "Inter Tight",sans-serif;letter-spacing:-.035em;margin-top:10px}
.band .ss{font-size:13px;color:#cfc8f2;margin-top:6px}.band .ss b{color:#fff;font-weight:600}
.band .sr{text-align:right}.band .sv{font:700 40px/1 "Inter Tight",sans-serif;letter-spacing:-.04em}
.band .sb{grid-column:1/-1;margin-top:10px}.band .fill{height:6px;border-radius:3px;background:rgba(255,255,255,.16)}.band .fillw .mk{background:#fff}
.band .km{color:#fff;padding:0;border:0;min-height:0}.band .km .n.bk{background:rgba(127,217,227,.2);color:#b6f0f6}.band .km .n.sk{background:rgba(255,255,255,.1);color:#d8d5ee}
.sekc .kr{padding-left:0;padding-right:0}.sekc .det{margin:0 -34px;padding-left:34px;padding-right:34px}
@media (max-width:1100px){.ka{grid-template-columns:minmax(0,1.7fr) minmax(80px,.7fr) minmax(90px,.8fr) minmax(80px,.7fr) minmax(100px,.9fr)}.ka .x1{display:none}}
@media (max-width:860px){.sekc,.band{padding:22px 18px 16px;border-radius:22px}.sekh .sv,.band .sv{font-size:26px}.sekh .st,.band .st{font-size:22px}.ka{grid-template-columns:minmax(0,1.5fr) minmax(76px,.8fr) minmax(86px,.9fr);gap:0 12px}.ka .x1,.ka .x2{display:none}.sekc .det{margin:0 -18px;padding-left:18px;padding-right:18px}}
@media (max-width:1180px){.kb{--k:minmax(150px,1.6fr) repeat(4,minmax(70px,.62fr)) minmax(74px,.62fr) minmax(84px,.7fr)}.kb .x1{display:none}.km{font-size:11px}}
@media (max-width:860px){:host{--rail:0px}.side{display:none}.hero{padding:30px 0 18px}.hero2{grid-template-columns:minmax(0,1fr)}.card{padding:18px 18px 20px;border-radius:20px}.card.pad0>.ch,.card.pad0>.note{padding-left:18px;padding-right:18px}th:first-child,td:first-child{padding-left:18px}
  .kr{padding-left:18px;padding-right:18px}.kb{--k:minmax(0,1.5fr) repeat(3,minmax(62px,.7fr))}.kb .x1,.kb .x2{display:none}.ks{grid-template-columns:minmax(0,1.4fr) repeat(3,minmax(64px,.7fr))}.ks .x2{display:none}.det{padding-left:18px;padding-right:18px}.kr.bd{margin:8px 8px}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}

/* i Panda: Pandas egen sidemenu bruges — prototypens skinne er skjult, fanerne er undermenuen */
:host{--rail:0px;display:block}
.side{display:none!important}
.main{margin-left:0;min-height:100vh}
.tabs{position:sticky;top:10px;z-index:20;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);background:rgba(20,16,44,.62)}
.gl{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.gl button{all:unset;cursor:pointer;font:500 11px/1 "JetBrains Mono",monospace;letter-spacing:.08em;text-transform:uppercase;color:#cfcfe0;border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:8px 12px}
.gl button:hover{background:rgba(255,255,255,.08)}
.live.fejl i{background:#ff6b81}.live.ok i{background:#5fd39a}
`;
const HTML = `<div class="okrod"><aside class="side" hidden><nav class="nav" id="nav"></nav></aside><div class="main"><div class="aur"></div><div class="wrap"><div class="top"><div class="eyebrow" id="dato"></div><span class="gl"><button data-gl="viewFinance">Kundebetalinger</button><button data-gl="viewVendorPay">Vendor payments</button><button data-gl="viewGennemgang">Gennemgang</button><span class="live ok" id="okstat"><i></i><span id="okstatt">Rettelser gemmes</span></span></span></div><div class="tabs" id="tabs" role="tablist"></div><div id="side"><div class="hero"><div class="eyebrow">Økonomi</div><h1>Henter tallene …</h1></div></div></div></div><div id="toast" role="status"></div></div>`;

/* ═══ DATA: samme form som prototypens data.json — bygget fra tabellerne ═══ */
async function alle(tabel, orden){
  let ud = [], fra = 0;
  for(;;){ const r = await db.from(tabel).select('*').order(orden).range(fra, fra + 999);
    if(r.error) throw new Error(tabel + ': ' + r.error.message);
    ud = ud.concat(r.data || []); if(!r.data || r.data.length < 1000) break; fra += 1000; }
  return ud;
}
const tal = v => v == null ? v : +v;
function stamme(f){ return String(f || '').split('/').pop().replace(/\.[A-Za-z0-9]{2,5}$/, ''); }
function byg(b, r, bu, a, g, ref, tr){
  const R = {}; (ref || []).forEach(x => { R[x.noegle] = x; });
  const P = k => (R[k] && R[k].payload) || null;
  const navn = {}; (tr || []).forEach(t => { const c = t && t.customers; if(c && t.id) navn[t.id] = ((c.last_name || '') + (c.first_name ? ', ' + c.first_name : '')).replace(/^, /, ''); });
  const solgt = P('solgt') || [], sn = {}; solgt.forEach(s => { sn[s.ref] = s.navn; });
  const sb = P('econ_saldobalance') || {}, ep = P('econ_posteringer') || {}, ub = P('bilag_ubrugte') || {};
  const mangler = ['solgt','econ_saldobalance','econ_posteringer','driftsbudget','kontonavne','vendor_payments_due'].filter(k => !P(k));
  if(mangler.length) throw new Error('Referencedata mangler i vk_reference: ' + mangler.join(', '));
  return {
    bank: b.map(l => ({ id: l.id, i: l.linje_nr, k: l.konto_kode, d: l.dato, t: l.tekst, b: tal(l.beloeb), v: l.valuta, dkk: tal(l.beloeb_dkk),
        s: l.dkk_kilde === 'fast kurs (skøn)' ? 1 : 0, kat: l.kategori, gl: l.gl_konto, p: l.person, r: (l.rejser && l.rejser.length) ? l.rejser : null,
        bl: l.bilag_fil ? stamme(l.bilag_fil) : l.econ_bilag ? (l.econ_match === 'ca' ? '≈ ' : '') + 'e-conomic ' + l.econ_bilag : null,
        fil: l.bilag_fil || null, eb: l.econ_bilag || null, ret: !!l.rettet_at }))
      .sort((x, y) => x.i - y.i),
    rejser: r.map(x => ({ id: x.id, trip_id: x.trip_id, aar: x.aar, ref_no: x.ref_no, afrejse: x.afrejse, omsaetning_dkk: tal(x.omsaetning_dkk), omsaetning_kilde: x.omsaetning_kilde,
        betalt_bank_dkk: tal(x.betalt_bank_dkk), udestaaende_dkk: tal(x.udestaaende_dkk), ikke_fundet_dkk: tal(x.ikke_fundet_dkk), foer_aar_dkk: tal(x.foer_aar_dkk),
        omkostning_dkk: tal(x.omkostning_dkk), db_dkk: tal(x.db_dkk), navn: navn[x.trip_id] || sn[x.ref_no] || '', br: x.branch || String(x.ref_no || '').slice(0, 2), kob_dolphin: tal(x.indkoeb_dolphin_dkk) })),
    bud: bu.map(x => ({ gruppe: x.gruppe, maaned: x.maaned, beloeb_dkk: tal(x.beloeb_dkk), kilde: x.kilde })),
    afk: a.map(x => ({ id: x.id, status: x.status, svar: x.svar, rejser: x.rejser, dolphin_dkk: tal(x.dolphin_dkk), bank_dkk: tal(x.bank_dkk), type: x.type, noegle: x.noegle, note: x.note })),
    gl: g, vp: P('vendor_payments_due'), solgt: solgt, econ: sb.econ || {}, saldo: sb.saldo || [], budget: P('driftsbudget'), kontonavn: P('kontonavne'),
    epost: ep.poster || [], epostTil: ep.til || '', bilagFra: ub.fra || AAR + '-07-01', bilagUbrugte: ub.filer || [], bilagFiler: ub.antal_filer || 0,
    kilder: (ref || []).map(x => ({ noegle: x.noegle, kilde: x.kilde, hentet: x.hentet_at }))
  };
}
async function hent(){
  const en = (q) => q.then(x => { if(x.error) throw new Error(x.error.message); return x.data || []; });
  const [b, r, bu, a, g, ref, tr] = await Promise.all([
    alle('vk_bank_aar', 'linje_nr'),
    en(db.from('vk_resultat_rejse').select('*').eq('aar', AAR).order('afrejse')),
    en(db.from('vk_budget').select('*').eq('aar', AAR)),
    en(db.from('vk_resultat_afklaring').select('*').eq('aar', AAR).order('type').order('created_at')),
    db.from('gl_accounts').select('konto,navn').order('konto').then(x => x.data || []),
    en(db.from('vk_reference').select('*').eq('aar', AAR)),
    db.from('trips').select('id,customers(last_name,first_name)').gte('departure_date', AAR + '-01-01').lte('departure_date', AAR + '-12-31').then(x => x.data || [], () => [])
  ]);
  D = byg(b, r, bu, a, g, ref, tr);
}

/* ═══ GEM ═══ */
const FELT = { kat: 'kategori', gl: 'gl_konto', p: 'person' };
async function gemLinje(l, bf, ny){
  const felt = FELT[bf]; if(!felt || !l.id) return 'ukendt felt';
  const r = await db.from('vk_bank_aar').update({ [felt]: ny, rettet_at: new Date().toISOString(), rettet_af: hvem() }).eq('id', l.id).select('id');
  if(r.error || !r.data || !r.data.length) return (r.error && r.error.message) || 'ingen adgang';
  return '';
}
async function gemAfk(x){
  const lukket = x.status === 'lukket';
  const r = await db.from('vk_resultat_afklaring').update({ status: x.status, svar: x.svar || null, lukket_at: lukket ? new Date().toISOString() : null, lukket_af: lukket ? hvem() : null }).eq('id', x.id).select('id');
  if(r.error || !r.data || !r.data.length) return (r.error && r.error.message) || 'ingen adgang';
  return '';
}

/* ═══ SELVE SIDEN (prototypen) — kører inde i den indre skygge-rod ═══ */
function start(INDRE, D0, API){

var D = D0, T0 = API.idag, AAR = 2026;
var MON = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];
var S = API.S || { p: 'overblik', aar: 2026, vis: 'aar', aaben: '', lev: '30', levVal: 'alle', bq: '', bkat: 'alle', bacc: 'alle', bmon: 'alle', busik: false, bkonto: '', blim: 80,
  rq: '', rmon: 'alle', rsort: 'afrejse', rdir: 1, rbr: 'alle', afk: 'aaben', vpst: {} };
var KAT = { kunde:'Kunde', leverandoer:'Leverandør', drift:'Drift', loen:'Løn', intern:'Intern overførsel', udbytte:'Udbytte', laan:'Lån', refusion:'Refusion til kunde', skat:'Skat', mellemregning:'Mellemregning', afklar:'Afklares' };
var PERS = { WP:'Wendie', RK:'Rasmus', EP:'Emilie', MP:'MP' };
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function nf(n){ return Math.round(+n || 0).toLocaleString('da-DK'); }
function nf2(n){ return (+n || 0).toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function mio(n){ return (n / 1e6).toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' mio.'; }
function tk(n){ return Math.round((+n || 0) / 1000).toLocaleString('da-DK'); }
function kort(n){ var a = Math.abs(n); return a >= 1e6 ? (n / 1e6).toLocaleString('da-DK', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + ' mio' : a >= 1000 ? tk(n) + ' t' : nf(n); }
function pct(a, b){ return b ? (a / b * 100).toLocaleString('da-DK', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + ' %' : '—'; }
function fd(s){ return s ? (+s.slice(8,10)) + '. ' + MON[+s.slice(5,7)-1].toLowerCase() + (s.slice(0,4) != AAR ? ' ' + s.slice(2,4) : '') : ''; }
function sum(a, f){ return a.reduce(function(s, x){ return s + (+(f ? f(x) : x) || 0); }, 0); }
function rng(a, fra, til){ var s = 0; for(var i = fra; i < til; i++) s += a[i] || 0; return s; }
function nul(){ return [0,0,0,0,0,0,0,0,0,0,0,0]; }
function dage(a, b){ return Math.round((new Date(a) - new Date(b)) / 864e5); }
function $(id){ return INDRE.getElementById(id); }
function toast(t){ var e = $('toast'); e.textContent = t; e.style.opacity = 1; clearTimeout(toast.t); toast.t = setTimeout(function(){ e.style.opacity = 0; }, 3600); }
function knavn(k){ k = String(k || '').replace('?',''); return (D.kontonavn && D.kontonavn[k]) || ''; }
function glNavn(k){ return knavn(k); }

/* ── e-conomics kontoplan: sektionerne som i saldobalancen ── */
var SEK = [
  { id:'oms',  navn:'Omsætning', sumnavn:'Omsætning i alt', fra:1000, til:1299, indt:1, farve:'#6C4FE0' },
  { id:'dir',  navn:'Direkte omkostninger', sumnavn:'Direkte omkostninger i alt', fra:1300, til:1999, farve:'#1B9AAA' },
  { id:'lon',  navn:'Lønninger', sumnavn:'Lønninger i alt', fra:2200, til:2299, farve:'#C77D0A' },
  { id:'salg', navn:'Salgs- og rejseomkostninger', sumnavn:'Salgs- og rejseomkostninger i alt', fra:2700, til:2899, farve:'#D6457A' },
  { id:'lok',  navn:'Lokaleomkostninger', sumnavn:'Lokaleomkostninger i alt', fra:3400, til:3499, farve:'#3F7DD8' },
  { id:'adm',  navn:'Administrationsomkostninger', sumnavn:'Administrationsomkostninger i alt', fra:3600, til:3799, farve:'#7A6A9E' },
  { id:'fin',  navn:'Renter og valutakurs', sumnavn:'Renter og valutakurs i alt', fra:4300, til:4499, indt:1, farve:'#12805c' }
];
/* hvilken konto i resultatopgørelsen en banklinje tæller på (null = ikke i resultatet) */
function kontoAf(l){
  var g = String(l.gl || '').replace('?','').trim();
  if(l.kat === 'loen'){ if(g === '6921') return '2223'; if(g.indexOf('2222') === 0) return '2222'; if(/^\d{4}$/.test(g) && +g < 5000) return g; return '2210'; }
  if(l.kat !== 'drift') return null;
  if(!/^\d{4}$/.test(g) || +g >= 5000 || g === '4900') return null;
  return g;
}
/* Model for ét år. Hver række har tre lag pr. måned: F = realiseret (faktisk), B = booket, K = skøn. */
var MODEL = {};
function model(Y){
  if(MODEL[Y]) return MODEL[Y];
  var sidste = D.bank.reduce(function(d, l){ return l.d > d ? l.d : d; }, ''), LM = +sidste.slice(5,7) - 1;
  var R = {}, usik = {};
  function rk(k){ return R[k] || (R[k] = { F: nul(), B: nul(), K: nul(), Bu: nul() }); }
  var dir = rk('dir'), antal = { afrejst: 0, booket: 0 }, skoenIDir = 0;
  if(Y === 2026){
    D.rejser.forEach(function(r){ var i = +r.afrejse.slice(5,7) - 1, k = (r.br === 'MN' || r.br === 'NO') ? '1020' : '1010', af = r.afrejse <= sidste;
      rk(k)[af ? 'F' : 'B'][i] += +r.omsaetning_dkk; dir[af ? 'F' : 'B'][i] += +r.omkostning_dkk; antal[af ? 'afrejst' : 'booket']++;
      if(af) skoenIDir += (+r.udestaaende_dkk) + (+r.ikke_fundet_dkk); });
    D.bank.forEach(function(l){ var k = kontoAf(l); if(!k) return; rk(k).F[+l.d.slice(5,7) - 1] -= l.dkk; if(/\?/.test(l.gl || '')) usik[k] = true; });
    Object.keys(D.budget.konti).forEach(function(k){ var r = rk(k); r.Bu = D.budget.konti[k].slice();
      for(var i = LM; i < 12; i++) r.K[i] = i === LM ? Math.max(0, r.Bu[i] - r.F[i]) : r.Bu[i]; });
    rk('oms_bud').Bu = D.budget.oms.slice(); dir.Bu = D.budget.oms.map(function(o, i){ return o - D.budget.db[i]; });
  } else {
    var M0 = model(2026), dg = M0.sum('db', 'F', 0, 12) / M0.sum('oms', 'F', 0, 12);
    D.solgt.forEach(function(r){ if(+r.afrejse.slice(0,4) !== Y) return; var i = +r.afrejse.slice(5,7) - 1; rk(r.br === 'MN' || r.br === 'NO' ? '1020' : '1010').B[i] += r.dkk; dir.B[i] += r.dkk * (1 - dg); antal.booket++; });
    if(Y === 2027){ /* skøn = 2026-niveau, indtil der er lagt et budget */
      for(var i = 0; i < 12; i++){ ['1010','1020'].forEach(function(k){ var f = M0.R[k] ? M0.R[k].F[i] + M0.R[k].B[i] : 0, r = rk(k); r.K[i] = Math.max(0, f - r.B[i]); });
        var o = rk('1010').K[i] + rk('1020').K[i]; dir.K[i] = o * (1 - dg); }
      Object.keys(M0.R).forEach(function(k){ if(!/^\d{4}$/.test(k) || +k < 2000) return; var a = M0.R[k], r = rk(k); for(var i = 0; i < 12; i++) r.K[i] = a.F[i] + a.K[i]; });
    }
  }
  function konti(s){ var set = {}; Object.keys(D.econ).concat(Object.keys(D.budget.konti), Object.keys(R)).forEach(function(k){ if(/^\d{4}$/.test(k) && +k >= s.fra && +k <= s.til) set[k] = 1; }); return Object.keys(set).sort(); }
  function v(id, lag, i){ /* sektion eller konto, ét lag, én måned */
    if(id === 'oms') return (R['1010'] ? R['1010'][lag][i] : 0) + (R['1020'] ? R['1020'][lag][i] : 0) + (lag === 'Bu' && R.oms_bud ? R.oms_bud.Bu[i] : 0);
    if(id === 'dir') return dir[lag][i];
    if(id === 'fin') return 0;
    if(id === 'db') return v('oms', lag, i) - v('dir', lag, i);
    if(id === 'kap') return v('lon', lag, i) + v('salg', lag, i) + v('lok', lag, i) + v('adm', lag, i);
    if(id === 'res') return v('db', lag, i) - v('kap', lag, i);
    var s = SEK.filter(function(x){ return x.id === id; })[0];
    if(s) return sum(konti(s), function(k){ return R[k] ? R[k][lag][i] : 0; });
    return R[id] ? R[id][lag][i] : 0;
  }
  function su(id, lag, fra, til){ var t = 0; for(var i = fra; i < til; i++) t += lag === 'A' ? v(id,'F',i) + v(id,'B',i) + v(id,'K',i) : v(id, lag, i); return t; }
  var kurs = {}; D.bud.forEach(function(b){ if(b.gruppe === 'Kurs') kurs[b.maaned] = +b.beloeb_dkk; });
  return (MODEL[Y] = { Y: Y, R: R, LM: Y === 2026 ? LM : -1, sidste: sidste, konti: konti, v: v, sum: su, usik: usik, antal: antal, skoenIDir: skoenIDir, kurs: kurs, kursNu: Y === 2026 ? (kurs[11] || 0) : 0 });
}
/* e-conomic (saldobalance 01.01–30.09.26): naturligt fortegn — indtægt +, omkostning + */
function econ(id){
  var s = SEK.filter(function(x){ return x.id === id; })[0];
  function a(k){ var e = D.econ[k]; if(!e) return null; var q = SEK.filter(function(x){ return +k >= x.fra && +k <= x.til; })[0]; return q && q.indt ? -e.ytd : e.ytd; }
  if(s) return sum(Object.keys(D.econ).filter(function(k){ return +k >= s.fra && +k <= s.til; }), a);
  if(id === 'db') return econ('oms') - econ('dir');
  if(id === 'kap') return econ('lon') + econ('salg') + econ('lok') + econ('adm');
  if(id === 'res') return econ('db') - econ('kap');
  if(id === 'resskat') return econ('res') + econ('fin');
  return a(id);
}
/* intern balance mellem ejerne: betalinger mærket med navn + udbytte. Udlæg, der er refunderet, står for sig. */
function intern(){
  var o = { WP: { rejser: 0, udb: 0, udl: 0, n: 0 }, RK: { rejser: 0, udb: 0, udl: 0, n: 0 } };
  D.bank.forEach(function(l){ var p = l.p; if(l.kat === 'udbytte'){ p = / RK /.test(l.t) ? 'RK' : / WP /.test(l.t) ? 'WP' : null; if(p) o[p].udb -= l.dkk; return; }
    if(!o[p]) return; if(/udlæg/.test(l.gl || '')) o[p].udl -= l.dkk; else { o[p].rejser -= l.dkk; o[p].n++; } });
  ['WP','RK'].forEach(function(k){ o[k].bud = sum(D.budget.person[k] || []); o[k].alt = o[k].rejser + o[k].udb; });
  o.diff = o.RK.alt - o.WP.alt; o.diffR = o.RK.rejser - o.WP.rejser;
  return o;
}
function saer(x){ return +x.omkostning_dkk < 0 || +x.db_dkk < 0 || (+x.omsaetning_dkk > 0 && +x.db_dkk / +x.omsaetning_dkk > 0.5); }
function kraeverBilag(l){ return l.kat !== 'intern' && l.b < 0 && !/kortbetaling, 1\.50%|gebyr|fee/i.test(l.t); }
function manglerBilag(){ return D.bank.filter(function(l){ return kraeverBilag(l) && !l.bl; }); }
function usikre(){ return D.bank.filter(function(l){ return /\?/.test(l.gl || '') || l.kat === 'afklar'; }); }
function vpStatus(v, i){ return S.vpst[i] || 'aaben'; }
function vpAabne(){ return D.vp.map(function(v, i){ v.i = i; return v; }).filter(function(v){ return v.belob > 0 && vpStatus(v, v.i) === 'aaben'; }); }

/* ── diagrammer: tal står altid på søjlerne ── */
function tipBind(id, n, html){
  setTimeout(function(){ var c = $(id); if(!c) return; var tip = c.querySelector('.tip');
    c.querySelectorAll('.hit').forEach(function(r){
      r.addEventListener('mousemove', function(){ var bb = c.getBoundingClientRect(), rb = r.getBoundingClientRect(), x = rb.left - bb.left + rb.width / 2;
        tip.innerHTML = html(+r.dataset.i); tip.style.top = '0px'; tip.style.opacity = 1;
        var w = tip.offsetWidth; tip.style.left = Math.max(0, Math.min(bb.width - w, x - w / 2)) + 'px'; });
      r.addEventListener('mouseleave', function(){ tip.style.opacity = 0; }); }); }, 0);
}
function akse(min, max, y, W, pl, dark){
  var span = max - min || 1, trin = Math.pow(10, Math.floor(Math.log10(span / 3))), k = span / trin; trin *= k > 12 ? 5 : k > 6 ? 2 : 1;
  var s = ''; for(var t = Math.ceil(min / trin) * trin; t <= max + 1e-6; t += trin){
    s += '<line x1="' + pl + '" x2="' + W + '" y1="' + y(t).toFixed(1) + '" y2="' + y(t).toFixed(1) + '" stroke="' + (dark ? 'rgba(255,255,255,' + (Math.abs(t) < 1e-6 ? '.34' : '.1') + ')' : (Math.abs(t) < 1e-6 ? '#b9b3d1' : '#eceaf4')) + '" stroke-width="1"/>'
      + '<text x="' + (pl - 6) + '" y="' + (y(t) + 3.5).toFixed(1) + '" text-anchor="end">' + kort(t) + '</text>'; }
  return s;
}
/* søjler: mode 'stak' (lag oven på hinanden) eller 'gruppe' (side om side). Tal over hver søjle. */
function bars(o){
  var W = 760, H = o.h || 250, pl = 46, pb = o.diff ? 54 : 24, pt = o.baand ? 30 : 20, n = o.labels.length, bw = (W - pl) / n, id = 'c' + Math.random().toString(36).slice(2, 8), grp = o.mode === 'gruppe';
  var hi = 0, lo = 0;
  o.labels.forEach(function(_, i){ var p = 0, q = 0; o.series.forEach(function(s){ var v = s.values[i] || 0; if(grp){ hi = Math.max(hi, v); lo = Math.min(lo, v); } else if(v >= 0) p += v; else q += v; }); if(!grp){ hi = Math.max(hi, p); lo = Math.min(lo, q); } });
  hi = hi || 1; var pad = (hi - lo) * .1; hi += pad; if(lo < 0) lo -= pad;
  var sc = (H - pb - pt) / (hi - lo), y = function(v){ return pt + (hi - v) * sc; }, svg = akse(lo, hi, y, W, pl, o.dark), ns = o.series.length;
  if(o.baand) o.labels.forEach(function(_, i){ svg += '<rect x="' + (pl + i * bw + 3).toFixed(1) + '" y="4" width="' + (bw - 6).toFixed(1) + '" height="' + (H - 6) + '" rx="10" fill="' + (o.dark ? 'rgba(255,255,255,' + (o.nu === i ? '.13' : i % 2 ? '.025' : '.06') + ')' : (i % 2 ? '#fbfaff' : '#f4f1fc')) + '"/>'; });
  o.labels.forEach(function(lb, i){
    var x0 = pl + i * bw, up = 0, dn = 0, totP = 0, totN = 0;
    o.series.forEach(function(s, si){ var v = s.values[i] || 0; if(!v && !grp) return;
      var col = s.neg && v < 0 ? s.neg : s.color, w = grp ? bw * .78 / ns : bw * .62, x = grp ? x0 + bw * .11 + si * w : x0 + bw * .19, h = Math.max(1.5, Math.abs(v) * sc - (grp ? 0 : 2));
      var yy = grp ? (v >= 0 ? y(v) : y(0)) : (v >= 0 ? y(up + v) : y(-dn) + 2);
      svg += '<rect x="' + (x + (grp ? 1 : 0)).toFixed(1) + '" y="' + yy.toFixed(1) + '" width="' + (w - (grp ? 2 : 0)).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + Math.min(4, w / 3).toFixed(1) + '" fill="' + col + '"' + (s.fade && s.fade[i] ? ' opacity=".42"' : '') + (s.dash ? ' fill-opacity=".28" stroke="' + col + '" stroke-dasharray="3 2"' : '') + '/>';
      if(grp && o.tal !== false && (ns < 3 || bw > 80)) svg += '<text class="vl" x="' + (x + w / 2).toFixed(1) + '" y="' + (v >= 0 ? y(v) - 4 : y(v) + 12).toFixed(1) + '" text-anchor="middle">' + (o.fmt || tk)(v) + '</text>';
      if(v >= 0){ up += v; totP += v; } else { dn += -v; totN += v; } });
    if(!grp && o.tal !== false){ if(totP) svg += '<text class="vl" x="' + (x0 + bw / 2).toFixed(1) + '" y="' + (y(totP) - 5).toFixed(1) + '" text-anchor="middle">' + (o.fmt || tk)(totP) + '</text>';
      if(totN) svg += '<text class="vl" x="' + (x0 + bw / 2).toFixed(1) + '" y="' + (y(totN) + 13).toFixed(1) + '" text-anchor="middle">' + (o.fmt || tk)(totN) + '</text>'; }
    if(o.diff){ var df = (o.series[0].values[i] || 0) - (o.series[1].values[i] || 0); svg += '<text class="df" x="' + (x0 + bw / 2).toFixed(1) + '" y="' + (H - 11) + '" text-anchor="middle" style="fill:' + (df >= 0 ? (o.dark ? '#8ff0bd' : '#12805c') : (o.dark ? '#ffa2ab' : '#c9304a')) + '">' + (df >= 0 ? '+' : '−') + tk(Math.abs(df)) + '</text>'; }
    svg += '<text x="' + (x0 + bw / 2).toFixed(1) + '" y="' + (H - (o.diff ? 30 : 6)) + '" text-anchor="middle"' + (o.nu === i ? ' style="font-weight:700;fill:' + (o.dark ? '#fff' : '#14121f') + '"' : '') + '>' + esc(lb) + '</text>'
      + '<rect class="hit" data-i="' + i + '" x="' + x0.toFixed(1) + '" y="0" width="' + bw.toFixed(1) + '" height="' + H + '" fill="transparent"' + (o.klik ? ' style="cursor:pointer"' : '') + '/>'; });
  tipBind(id, n, function(i){ return '<b>' + esc(o.labels[i]) + (o.under && o.under[i] ? ' · ' + o.under[i] : '') + '</b><br>' + o.series.map(function(s){ return '<i style="background:' + (s.neg && s.values[i] < 0 ? s.neg : s.color) + '"></i>' + esc(s.name) + ' <b>' + nf(s.values[i]) + '</b>'; }).join('<br>') + (!grp && ns > 1 ? '<br>I alt <b>' + nf(sum(o.series, function(s){ return s.values[i]; })) + '</b>' : ''); });
  if(o.klik) setTimeout(function(){ var c = $(id); if(c) c.querySelectorAll('.hit').forEach(function(r){ r.addEventListener('click', function(){ o.klik(+r.dataset.i); }); }); }, 0);
  return '<div class="chart' + (o.dark ? ' dk' : '') + '" id="' + id + '"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || '') + '">' + svg + '</svg><div class="tip"></div></div>'
    + (o.stille ? '' : (ns > 1 || o.legende ? '<div class="lg" style="margin-top:10px">' + o.series.map(function(s){ return '<span><i style="background:' + s.color + (s.dash ? ';opacity:.4' : '') + '"></i>' + esc(s.name) + ' <b>' + kort(sum(s.values)) + '</b></span>'; }).join('') + '</div>' : '')
    + (o.tal !== false ? '<div class="note" style="margin-top:6px">Tal i tusinde kr.</div>' : ''));
}
/* linjer: akkumuleret, med tal i enden af hver linje */
function linjer(o){
  var W = 760, H = o.h || 300, pl = 54, pr = 132, pb = 28, pt = 26, n = o.labels.length, id = 'c' + Math.random().toString(36).slice(2, 8);
  var alle = []; o.series.forEach(function(s){ s.values.forEach(function(v){ if(v != null) alle.push(v); }); });
  var hi = Math.max.apply(null, alle.concat([0])), lo = Math.min.apply(null, alle.concat([0])), pad = (hi - lo) * .12; hi += pad; if(lo < 0) lo -= pad;
  var y = function(v){ return pt + (hi - v) / (hi - lo) * (H - pb - pt); }, x = function(i){ return pl + i * (W - pl - pr) / (n - 1); }, svg = akse(lo, hi, y, W - pr, pl, o.dark), ender = [];
  svg += '<defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + o.series[0].color + '" stop-opacity=".38"/><stop offset="1" stop-color="' + o.series[0].color + '" stop-opacity="0"/></linearGradient></defs>';
  /* budget og andre linjer først, hovedlinjen øverst */
  o.series.slice().reverse().forEach(function(s){ var si = o.series.indexOf(s), pts = []; s.values.forEach(function(v, i){ if(v != null) pts.push([x(i), y(v), v, i]); }); if(!pts.length) return;
    var d = pts.map(function(p, j){ return (j ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('');
    if(si === 0) svg += '<path d="' + d + 'L' + pts[pts.length-1][0].toFixed(1) + ',' + y(0).toFixed(1) + 'L' + pts[0][0].toFixed(1) + ',' + y(0).toFixed(1) + 'Z" fill="url(#' + id + 'g)"/>';
    svg += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="' + (si ? 2 : 3.2) + '" stroke-linecap="round" stroke-linejoin="round"' + (s.dash ? ' stroke-dasharray="2 6"' : '') + (si ? ' opacity=".9"' : '') + '/>';
    if(si === 0) pts.forEach(function(p, j){ var sidst = j === pts.length - 1;
      svg += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (sidst ? 6 : 3.5) + '" fill="' + s.color + '" stroke="' + (o.dark ? '#1d1650' : '#fff') + '" stroke-width="2"/>';
      if(!sidst) svg += '<text class="vl" x="' + p[0].toFixed(1) + '" y="' + (p[1] - 11).toFixed(1) + '" text-anchor="middle">' + tk(p[2]) + '</text>'; });
    var e = pts[pts.length - 1]; if(si) svg += '<circle cx="' + e[0].toFixed(1) + '" cy="' + e[1].toFixed(1) + '" r="5" fill="' + s.color + '" stroke="' + (o.dark ? '#1d1650' : '#fff') + '" stroke-width="2"/>';
    ender.push({ y: e[1], x: e[0], s: s, v: e[2] }); });
  /* endemærker i højre margin: navn + tal, skubbet fra hinanden så de aldrig ligger oven i hinanden */
  ender.sort(function(a, b){ return a.y - b.y; }); for(var q = 1; q < ender.length; q++) if(ender[q].y - ender[q-1].y < 40) ender[q].y = ender[q-1].y + 40;
  ender.forEach(function(e){ var lx = W - pr + 14;
    svg += '<line x1="' + (e.x + 7).toFixed(1) + '" y1="' + y(e.v).toFixed(1) + '" x2="' + (lx - 4) + '" y2="' + (e.y - 4).toFixed(1) + '" stroke="' + e.s.color + '" stroke-width="1" opacity=".55"/>'
      + '<text class="el" x="' + lx + '" y="' + (e.y - 1).toFixed(1) + '" style="fill:' + e.s.color + '">' + kort(e.v) + '</text><text x="' + lx + '" y="' + (e.y + 14).toFixed(1) + '">' + esc(e.s.slut || e.s.name) + '</text>'; });
  o.labels.forEach(function(lb, i){ svg += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle"' + (o.nu === i ? ' style="fill:#fff;font-weight:700"' : '') + '>' + esc(lb) + '</text>'
    + '<rect class="hit" data-i="' + i + '" x="' + (x(i) - (W - pl - pr) / (n - 1) / 2).toFixed(1) + '" y="0" width="' + ((W - pl - pr) / (n - 1)).toFixed(1) + '" height="' + H + '" fill="transparent"/>'; });
  tipBind(id, n, function(i){ return '<b>' + esc(o.labels[i]) + '</b><br>' + o.series.map(function(s){ return s.values[i] == null ? '' : '<i style="background:' + s.color + '"></i>' + esc(s.name) + ' <b>' + nf(s.values[i]) + '</b><br>'; }).join(''); });
  return '<div class="chart' + (o.dark ? ' dk' : '') + '" id="' + id + '"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || '') + '">' + svg + '</svg><div class="tip"></div></div>';
}
function hbar(v, max, col){ return '<div style="height:8px;border-radius:4px;background:#f0edf8;overflow:hidden"><div style="height:100%;width:' + Math.max(1, Math.abs(v) / max * 100).toFixed(1) + '%;background:' + (col || 'var(--vio)') + ';border-radius:4px"></div></div>'; }
function td(v, c){ return '<td class="' + (c || '') + (v < -0.5 ? ' neg' : '') + '">' + nf(v) + '</td>'; }
function hero(eb, h, p){ return '<div class="hero"><div class="eyebrow">' + eb + '</div><h1>' + h + '</h1>' + (p ? (p.indexOf('<div') === 0 ? p : '<p>' + p + '</p>') : '') + '</div>'; }
/* regnestykke under overskriften: [tekst, tal, 'st' = sumlinje | 'lt' = lille] */
function calc(r){ return '<div class="calc">' + r.map(function(x){ return '<span class="' + (x[2] || '') + '">' + x[0] + '</span><span class="' + (x[2] === 'st' ? 'st' : '') + '">' + x[1] + '</span>'; }).join('') + '</div>'; }
function kpi(l, v, u, c){ return '<div class="card kpi"><div class="l">' + l + '</div><div class="v' + (c ? ' ' + c : '') + '">' + v + '</div><div class="u">' + u + '</div></div>'; }
function gk(l, v, u, chip){ return '<div class="glass"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="u">' + u + (chip ? ' ' + chip : '') + '</div></div>'; }
/* afvigelse mod budget: godt = grøn. For omkostninger er lavere end budget godt. */
function afv(f, b, indt, dark){ if(!b && !f) return ''; var d = f - b, godt = indt ? d >= 0 : d <= 0, t = (d >= 0 ? '+' : '−') + kort(Math.abs(d)).replace('-', '') + (b ? ' · ' + (d >= 0 ? '+' : '−') + Math.abs(d / b * 100).toFixed(0) + ' %' : '');
  return dark ? '<span class="dchip ' + (Math.abs(d) < 1 ? 'n' : godt ? 'g' : 'r') + '">' + t + '</span>' : '<span class="pill ' + (Math.abs(d) < 1 ? '' : godt ? 'g' : 'r') + '">' + t + '</span>'; }
function opt(a, v, f){ return a.map(function(x){ return '<option value="' + esc(x) + '"' + (String(v) === String(x) ? ' selected' : '') + '>' + esc(f ? f(x) : x) + '</option>'; }).join(''); }
function monOpt(v){ return '<option value="alle">Alle måneder</option>' + MON.map(function(x, i){ return '<option value="' + (i+1) + '"' + (+v === i+1 ? ' selected' : '') + '>' + x + '</option>'; }).join(''); }
function aarListe(){ var a = {}; a[AAR] = 1; D.solgt.concat(D.vp).forEach(function(r){ a[+r.afrejse.slice(0,4)] = 1; }); return Object.keys(a).map(Number).sort(); }

/* ═══ SIDER ═══ */
var SIDER = [['overblik','Overblik'],['budget','Budget & resultat'],['saldo','Saldobalance'],['leverandoer','Leverandørbetalinger'],['bank','Bank & afstemning'],['likviditet','Likviditet'],['ejere','Interne balancer'],['afklaring','Afklaring'],['mere','Flere sider']];
var IKON = { Dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  Enquiries:'<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6H3v-6z"/>', 'Team Maldivia':'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.700 6 6"/><circle cx="17.500" cy="9" r="2.400"/><path d="M16.500 14.200c2.700.300 4.500 2.500 4.500 5.300"/>',
  Sales:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>', Knowledge:'<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4z"/><path d="M20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>',
  Finance:'<rect x="3" y="6" width="18" height="13" rx="2.500"/><path d="M3 10h18"/><path d="M7 15h4"/>', Tasks:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.500 12.500l2.500 2.500 4.500-5"/>',
  Marketing:'<path d="M4 10v4h3l6 4V6l-6 4z"/><path d="M17 9.500a4 4 0 0 1 0 5"/>', Reports:'<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7.500" y="11" width="3" height="6"/><rect x="13.500" y="7" width="3" height="10"/>' };
function taeller(p){
  if(p === 'leverandoer') return vpAabne().filter(function(v){ return v.forfald <= T0; }).length;
  if(p === 'bank') return usikre().length;
  if(p === 'afklaring') return D.afk.filter(function(a){ return a.status === 'aaben'; }).length + D.rejser.filter(saer).length;
  return 0;
}
function menu(){
  $('nav').innerHTML = Object.keys(IKON).map(function(p){ return '<a href="#" onclick="return false" class="' + (p === 'Finance' ? 'on' : '') + '" title="' + p + '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IKON[p] + '</svg><span>' + p + '</span></a>'
    + (p === 'Finance' ? '<div class="sub">' + SIDER.map(function(s){ var n = taeller(s[0]); return '<button data-go="' + s[0] + '" class="' + (S.p === s[0] ? 'on' : '') + '">' + s[1] + (n ? '<span class="n">' + n + '</span>' : '') + '</button>'; }).join('') + '</div>' : ''); }).join('');
  $('tabs').innerHTML = SIDER.map(function(s){ var n = taeller(s[0]); return '<button role="tab" data-go="' + s[0] + '" class="' + (S.p === s[0] ? 'on' : '') + '" aria-selected="' + (S.p === s[0]) + '">' + s[1] + (n ? '<span class="n' + (s[0] === 'leverandoer' ? ' r' : '') + '">' + n + '</span>' : '') + '</button>'; }).join('');
}

/* ── OVERBLIK: status for året til nu, kun faktiske tal ── */
function sOverblik(){
  var M = model(2026), L = M.LM, n1 = L + 1;
  var oms = M.sum('oms','F',0,n1), dir = M.sum('dir','F',0,n1), db = oms - dir, kap = M.sum('kap','F',0,n1), res = db - kap;
  var resF = M.sum('res','F',0,L), resB = M.sum('res','Bu',0,L), omsB = M.sum('oms','Bu',0,L), dbB = M.sum('db','Bu',0,L), kapB = M.sum('kap','Bu',0,L);
  var akF = [], akB = [], a = 0, b = 0; for(var i = 0; i < 12; i++){ b += M.v('res','Bu',i); akB.push(b); if(i <= L){ a += M.v('res','F',i); akF.push(a); } else akF.push(null); }
  var bO = M.sum('oms','B',0,12), bD = M.sum('dir','B',0,12);
  var mn = M.R['1020'] ? rng(M.R['1020'].F,0,12) : 0, md = M.R['1010'] ? rng(M.R['1010'].F,0,12) : 0;
  var aab = vpAabne(), forf = aab.filter(function(v){ return v.forfald <= T0; }), snart = aab.filter(function(v){ return v.forfald > T0 && dage(v.forfald, T0) <= 30; });
  var kred = D.vp.filter(function(v){ return v.belob < 0; }), us = usikre(), afk = D.afk.filter(function(q){ return q.status === 'aaben'; }), sr = D.rejser.filter(saer);
  var todo = [
    ['r','⏱','Leverandørbetalinger over forfald', forf.slice(0,3).map(function(v){ return v.vendor + ' ' + nf(v.belob) + ' ' + v.val; }).join(' · ') + (forf.length > 3 ? ' · +' + (forf.length - 3) : ''), forf.length + ' forfaldne', nf(sum(forf, function(v){ return v.dkk; })) + ' kr.', 'leverandoer', 'bad'],
    ['a','📅','Forfalder inden for 30 dage', snart.length + ' betalinger til ' + new Set(snart.map(function(v){ return v.vendor; })).size + ' leverandører', nf(sum(snart, function(v){ return v.dkk; })) + ' kr.', 'næste: ' + (snart.length ? fd(snart.map(function(v){ return v.forfald; }).sort()[0]) : '—'), 'leverandoer', 'warn'],
    ['g','↺','Kreditter, der skal trækkes fra', kred.map(function(v){ return v.vendor + ' ' + nf2(-v.belob) + ' ' + v.val; }).join(' · '), kred.length + ' kreditter', nf(-sum(kred, function(v){ return v.dkk; })) + ' kr.', 'leverandoer', 'good'],
    ['v','?','Banklinjer uden sikker konto', 'Står på 3617 med spørgsmålstegn, indtil du har sat kontoen', us.length + ' linjer', nf(-sum(us, function(l){ return l.dkk; })) + ' kr.', 'bank', ''],
    ['r','📎','Posteringer uden bilag', 'Udgående betalinger siden 1. juli, hvor der ikke ligger et bilag i Databanken (første, grove match)', manglerBilag().length + ' mangler', '', 'bank', 'bad'],
    ['v','✎','Åbne afklaringspunkter', 'Betalinger ikke fundet i bank, beløbsafvigelser, manglende refusioner og åbne usikkerheder', afk.length + ' åbne', '', 'afklaring', ''],
    ['a','!','Rejser med usædvanlige tal', sr.slice(0,4).map(function(r){ return r.ref_no; }).join(' · ') + ' m.fl.', sr.length + ' rejser', '', 'afklaring', 'warn']
  ];
  var maxR = Math.max.apply(null, MON.map(function(_, i){ return Math.abs(M.v('res','F',i)); }));
  return '<div class="hero2"><div>' + hero('Året til nu · 1. jan – ' + fd(M.sidste) + ' · faktiske tal', mio(res) + ' kr. i resultat.', calc([['Omsætning · ' + M.antal.afrejst + ' afrejste rejser', nf(oms)], ['− Direkte omkostninger', nf(dir)], ['= Dækningsbidrag · ' + pct(db, oms), nf(db), 'st'], ['− Løn og drift', nf(kap)], ['= Resultat før kurs', nf(res), 'st'], ['Kursgevinst valutakonti (beregnet)', '+ ' + nf(M.kursNu), 'lt']])) + '</div>'
  + '<div class="glass hg"><div class="hgh"><div class="eyebrow" style="color:#d8d5ee">Resultat pr. måned · faktisk mod budget · t.kr.</div><div class="hgl"><span><i style="background:#B9A8FF"></i>Faktisk</span><span><i style="background:#F2C46B"></i>Budget</span></div></div>'
  + '<div class="hsum"><div><b>' + nf(res) + '</b>Faktisk til ' + fd(M.sidste) + '</div><div><b style="color:#F2C46B">' + nf(akB[L]) + '</b>Budget til og med ' + MON[L].toLowerCase() + '</div><div><b style="color:' + (res >= akB[L] ? '#8ff0bd' : '#ffa2ab') + '">' + (res >= akB[L] ? '+' : '−') + nf(Math.abs(res - akB[L])) + '</b>' + (res >= akB[L] ? 'foran budgettet' : 'efter budgettet') + '</div></div>'
  + bars({ dark: 1, mode: 'gruppe', stille: 1, diff: 1, baand: 1, nu: L, h: 320, labels: MON.slice(0, L + 1), aria: 'Resultat pr. måned, faktisk mod budget',
      series: [{ name: 'Faktisk', color: '#B9A8FF', values: MON.slice(0, L + 1).map(function(_, i){ return M.v('res','F',i); }) }, { name: 'Budget', color: '#F2C46B', values: MON.slice(0, L + 1).map(function(_, i){ return M.v('res','Bu',i); }) }] })
  + '</div></div>'
  + '<div class="gk">'
  + gk('Omsætning · afrejst', nf(oms), 'jan–' + MON[L-1].toLowerCase() + ' mod budget', afv(M.sum('oms','F',0,L), omsB, 1, 1))
  + gk('Dækningsbidrag', nf(db), 'dækningsgrad ' + pct(db, oms), afv(M.sum('db','F',0,L), dbB, 1, 1))
  + gk('Løn og drift', nf(kap), 'jan–' + MON[L-1].toLowerCase() + ' mod budget', afv(M.sum('kap','F',0,L), kapB, 0, 1))
  + gk('Resultat før kurs', nf(res), 'jan–' + MON[L-1].toLowerCase() + ' mod budget', afv(resF, resB, 1, 1))
  + gk('Kursgevinst valutakonti', nf(M.kursNu), 'beregnet pr. 17. nov · med kurs ' + mio(res + M.kursNu))
  + (function(){ var I = intern(), mest = I.diff >= 0 ? 'Rasmus' : 'Wendie';
      return '<button class="glass" data-go="ejere" style="text-align:left;color:inherit;cursor:pointer"><div class="l">Intern balance · Wendie og Rasmus</div><div class="v">' + nf(Math.abs(I.diff)) + '</div><div class="u">' + mest + ' har fået mest · Wendie ' + nf(I.WP.alt) + ' · Rasmus ' + nf(I.RK.alt) + '</div></button>'; })()
  + '</div>'
  + '<div class="grid">'
  + '<div class="card"><div class="ch"><span class="t">Måned for måned</span><span class="s">Faktiske tal · rejser efter afrejsedato, udgifter efter bankdato</span><span class="r"><button class="btn l" data-go="budget">Åbn budget & resultat</button></span></div>'
  + '<div class="mgrid">' + MON.map(function(mm, i){ if(i > L) return ''; var o = M.v('oms','F',i), d = M.v('db','F',i), k = M.v('kap','F',i), r = d - k;
      return '<div class="mf"><div class="m"><span>' + mm + '</span>' + (i === L ? '<span class="pill a">til ' + fd(M.sidste) + '</span>' : '') + '</div><div class="v ' + (r < 0 ? 'bad' : '') + '">' + nf(r) + '</div>'
      + '<dl><dt>Omsætning</dt><dd>' + nf(o) + '</dd><dt>Dækningsbidrag</dt><dd>' + nf(d) + '</dd><dt>Løn og drift</dt><dd>' + nf(k) + '</dd></dl>'
      + '<div class="bar"><i style="width:' + (Math.abs(r) / maxR * 100).toFixed(0) + '%;background:' + (r < 0 ? 'var(--bad)' : 'var(--vio)') + '"></i></div></div>'; }).join('') + '</div>'
  + '<p class="note">Det store tal er månedens resultat før kurs og skat.</p></div>'
  + '<div class="card"><div class="ch"><span class="t">Omsætning pr. afrejsemåned</span><span class="s">Norge og Danmark · afrejste rejser</span></div>'
  + bars({ labels: MON.slice(0, L + 1), aria: 'Omsætning pr. måned delt på MN og MD', baand: 1, h: 230, series: [{ name: 'MN · Norge', color: 'var(--vio)', values: M.R['1020'].F.slice(0, L + 1) }, { name: 'MD · Danmark', color: 'var(--teal)', values: M.R['1010'].F.slice(0, L + 1) }] }) + '</div>'
  + '<div class="grid g3">'
  + [['MN · Norge', ['MN','NO'], mn, 'var(--vio)'], ['MD · Danmark', ['MD','HQ'], md, 'var(--teal)']].map(function(x){ var r = D.rejser.filter(function(q){ return x[1].indexOf(q.br) >= 0 && q.afrejse <= M.sidste; }), d = sum(r, function(q){ return q.db_dkk; });
      return '<div class="card kpi"><div class="l">' + x[0] + '</div><div class="v">' + nf(x[2]) + '</div><div class="u">' + r.length + ' rejser afrejst</div><div style="margin:12px 0 10px">' + hbar(x[2], Math.max(mn, md), x[3]) + '</div>'
      + '<dl style="margin:0;display:grid;grid-template-columns:1fr auto;gap:4px 10px;font-size:13px;color:var(--ink2)"><dt>Dækningsbidrag</dt><dd style="margin:0;font-weight:600;color:var(--ink)">' + nf(d) + '</dd><dt>Dækningsgrad</dt><dd style="margin:0;font-weight:600;color:var(--ink)">' + pct(d, x[2]) + '</dd><dt>Snit pr. rejse</dt><dd style="margin:0;font-weight:600;color:var(--ink)">' + nf(x[2] / r.length) + '</dd></dl></div>'; }).join('')
  + '<div class="card kpi" style="background:#f1fafa"><div class="l">Resten af året · booket</div><div class="v">' + nf(bO) + '</div><div class="u">' + M.antal.booket + ' rejser, der ikke er afrejst endnu</div><div style="margin:12px 0 10px">' + hbar(bO, Math.max(mn, md), 'var(--teal)') + '</div>'
  + '<dl style="margin:0;display:grid;grid-template-columns:1fr auto;gap:4px 10px;font-size:13px;color:var(--ink2)"><dt>Forventet dækningsbidrag</dt><dd style="margin:0;font-weight:600;color:var(--ink)">' + nf(bO - bD) + '</dd><dt>Dækningsgrad</dt><dd style="margin:0;font-weight:600;color:var(--ink)">' + pct(bO - bD, bO) + '</dd></dl><p class="note">Booket er ikke talt med i tallene ovenfor.</p></div>'
  + '</div>'
  + '<div class="card"><div class="ch"><span class="t">Kræver dig</span><span class="c">' + todo.length + '</span></div>'
  + todo.map(function(t){ return '<button class="row" data-go="' + t[6] + '"><span class="ic ' + t[0] + '" aria-hidden="true">' + t[1] + '</span><span class="a"><b>' + t[2] + '</b><span>' + esc(t[3]) + '</span></span><span class="z ' + t[7] + '">' + t[4] + '<small>' + t[5] + '</small></span></button>'; }).join('') + '</div>'
  + '</div>';
}

/* ── BUDGET & RESULTAT: ét år ad gangen. Budgettet fyldes ud: realiseret → booket → skøn ── */
var LAG = [['F','Realiseret','#6C4FE0'],['B','Booket','#1B9AAA'],['K','Skøn','#c5bfdb']];
function fyld(M, id, bud){ var f = M.sum(id,'F',0,12), b = M.sum(id,'B',0,12), k = M.sum(id,'K',0,12), mx = Math.max(f + b + k, bud || 0) || 1;
  return '<div class="fillw" title="Realiseret ' + nf(f) + ' · booket ' + nf(b) + ' · skøn ' + nf(k) + (bud ? ' · budget ' + nf(bud) : '') + '"><div class="fill"><i style="width:' + (f / mx * 100).toFixed(1) + '%;background:#6C4FE0"></i><i style="width:' + (b / mx * 100).toFixed(1) + '%;background:#1B9AAA"></i><i style="width:' + (k / mx * 100).toFixed(1) + '%;background:repeating-linear-gradient(135deg,#c5bfdb 0 4px,#ddd8ec 4px 8px)"></i></div>' + (bud ? '<span class="mk" style="left:calc(' + (bud / mx * 100).toFixed(1) + '% - 1px)"></span>' : '') + '</div>'; }
function spark(M, id, col){ var v = MON.map(function(_, i){ return M.v(id,'F',i) + M.v(id,'B',i) + M.v(id,'K',i); }), mx = Math.max.apply(null, v.map(Math.abs).concat([1]));
  return '<svg width="96" height="24" viewBox="0 0 96 24" aria-hidden="true">' + v.map(function(x, i){ var h = Math.max(1.5, Math.abs(x) / mx * 22), real = i <= M.LM; return '<rect x="' + (i * 8) + '" y="' + (24 - h).toFixed(1) + '" width="6" height="' + h.toFixed(1) + '" rx="1.5" fill="' + (real ? col : '#d5d0e6') + '"/>'; }).join('') + '</svg>'; }
function ktRaekke(M, id, navn, o){
  o = o || {}; var f = M.sum(id,'F',0,12), b = M.sum(id,'B',0,12), k = M.sum(id,'K',0,12), bu = M.sum(id,'Bu',0,12), tot = f + b + k, harBud = M.Y === 2026;
  var kl = o.kl || '', tag = o.knap ? 'button' : 'div', tom = !tot && !bu && !o.kl;
  if(S.vis === 'mdr'){
    return '<' + tag + ' class="kr km ' + kl + (tom ? ' tom' : '') + '"' + (o.knap ? ' data-konto="' + id + '"' : '') + '><span class="nm">' + navn + '</span>'
      + MON.map(function(_, i){ var F = M.v(id,'F',i), B = M.v(id,'B',i), K = M.v(id,'K',i), t = F + B + K, c = !t ? '' : (K && !F && !B) ? ' sk' : (B && !F) ? ' bk' : '';
          return '<span class="n' + c + '" title="' + MON[i] + ': realiseret ' + nf(F) + ' · booket ' + nf(B) + ' · skøn ' + nf(K) + '">' + (t ? tk(t) : '·') + '</span>'; }).join('')
      + '<span class="n"><b>' + tk(tot) + '</b></span></' + tag + '>';
  }
  return '<' + tag + ' class="kr kb ' + kl + (tom ? ' tom' : '') + '"' + (o.knap ? ' data-konto="' + id + '"' : '') + '><span class="nm">' + navn + '</span>'
    + '<span class="x1">' + (o.ingenSpark ? '' : spark(M, id, o.farve || '#6C4FE0')) + '</span>'
    + '<span class="n">' + (f ? nf(f) : '<span class="dim">—</span>') + '</span><span class="n x2" style="color:#0f6a76">' + (b ? nf(b) : '<span class="dim">—</span>') + '</span><span class="n x2 dim" style="font-style:italic">' + (k ? nf(k) : '—') + '</span>'
    + '<span class="n"><b>' + nf(tot) + '</b></span><span class="x1">' + fyld(M, id, harBud ? bu : 0) + '</span>'
    + '<span class="n">' + (harBud ? (bu ? nf(bu) : '<span class="dim">—</span>') : '<span class="dim">—</span>') + '</span><span class="n">' + (harBud && bu ? afv(tot, bu, o.indt) : '') + '</span></' + tag + '>';
}
/* afvigelse som rolig tekst: «78 t under budget» */
function afvT(f, b, indt){ if(!b) return ''; var d = f - b; if(Math.abs(d) < 500) return '<span class="dim">på budget</span>'; var godt = indt ? d >= 0 : d <= 0;
  return '<span class="' + (godt ? 'good' : 'bad') + '">' + kort(Math.abs(d)).replace('-', '') + (d > 0 ? ' over' : ' under') + '</span>'; }
function lagTxt(M, id){ var f = M.sum(id,'F',0,12), b = M.sum(id,'B',0,12), k = M.sum(id,'K',0,12), t = [];
  if(f) t.push('Realiseret <b>' + nf(f) + '</b>'); if(b) t.push('Booket <b>' + nf(b) + '</b>'); if(k) t.push('Skøn <b>' + nf(k) + '</b>'); return t.join(' · '); }
function kaRaekke(M, k, s){
  var f = M.sum(k,'F',0,12), tot = M.sum(k,'A',0,12), bu = M.sum(k,'Bu',0,12), er26 = M.Y === 2026, ingen = s.id === 'dir', tom = !tot && !bu;
  if(ingen) return '<div class="ka tom"><span class="nm"><span class="mono">' + k + '</span>' + esc(knavn(k)) + '</span><span class="n q x2">—</span><span class="n fv">—</span><span class="x1"></span><span class="n q x2">—</span><span class="av x2 dim" style="font-weight:400">se Saldobalance</span></div>';
  return '<button class="ka' + (tom ? ' tom' : '') + '" data-konto="' + k + '" aria-expanded="' + (S.aaben === k) + '"><span class="nm"><span class="mono">' + k + '</span>' + esc(knavn(k)) + (M.usik[k] ? ' <span class="pill a">usikker</span>' : '') + '</span>'
    + '<span class="n q x2">' + (f ? nf(f) : '—') + '</span><span class="n fv">' + (tot ? nf(tot) : '—') + '</span><span class="x1">' + (tot || bu ? fyld(M, k, er26 ? bu : 0) : '') + '</span>'
    + '<span class="n q x2">' + (er26 && bu ? nf(bu) : '—') + '</span><span class="av x2">' + (er26 ? afvT(tot, bu, s.indt) : '') + '</span></button>';
}
function roSektion(M, s){
  var tot = M.sum(s.id,'A',0,12), bu = M.sum(s.id,'Bu',0,12), er26 = M.Y === 2026, konti = M.konti(s), mdr = S.vis === 'mdr';
  var hoved = '<div class="sekh"><div><div class="sn"><i style="background:' + s.farve + '"></i>' + s.navn + '</div><div class="ss">' + lagTxt(M, s.id) + '</div></div>'
    + '<div class="sr"><div class="sv">' + nf(tot) + '</div><div class="ss">' + (er26 && bu ? 'budget ' + nf(bu) + ' · ' + afvT(tot, bu, s.indt) : 'forventet ' + M.Y) + '</div></div><div class="sb">' + fyld(M, s.id, er26 ? bu : 0) + '</div></div>';
  var hd = mdr ? '<div class="kr km hd"><span>Konto</span>' + MON.map(function(mm){ return '<span class="n">' + mm + '</span>'; }).join('') + '<span class="n">I alt</span></div>'
    : '<div class="ka hd"><span>Konto</span><span class="n x2">Realiseret</span><span class="n">Forventet</span><span class="x1">Udfyldt</span><span class="n x2">Budget</span><span class="av x2">Mod budget</span></div>';
  return '<section class="sekc">' + hoved + hd + konti.map(function(k){
      var r = mdr ? (s.id === 'dir' ? '<div class="kr km tom"><span class="nm"><span class="mono">' + k + '</span>' + esc(knavn(k)) + '</span><span class="dim" style="grid-column:2/-1;font-size:12px">fordeles ikke pr. konto endnu — se Saldobalance</span></div>' : ktRaekke(M, k, '<span class="mono">' + k + '</span>' + esc(knavn(k)), { knap: 1, indt: s.indt, farve: s.farve })) : kaRaekke(M, k, s);
      return r + (S.aaben === k && s.id !== 'dir' ? kontoDetalje(M, k, s) : ''); }).join('') + '</section>';
}
function roBaand(M, navn, id, under){
  var tot = M.sum(id,'A',0,12), bu = M.sum(id,'Bu',0,12), er26 = M.Y === 2026;
  return '<section class="band"><div><div class="sn">' + navn + '</div><div class="ss">' + lagTxt(M, id) + (under ? ' · ' + under : '') + '</div></div>'
    + '<div class="sr"><div class="sv">' + nf(tot) + '</div><div class="ss">' + (er26 && bu ? 'budget ' + nf(bu) + ' · ' + afvT(tot, bu, 1).replace('class="good"', 'style="color:#8ff0bd"').replace('class="bad"', 'style="color:#ffa2ab"').replace('class="dim"', '') : 'forventet ' + M.Y) + '</div></div>'
    + '<div class="sb">' + (S.vis === 'mdr' ? ktRaekke(M, id, '', { indt: 1 }).replace('<span class="nm"></span>', '<span class="nm" style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#cfc8f2">Måned for måned</span>') : fyld(M, id, er26 ? bu : 0)) + '</div></section>';
}
function kontoDetalje(M, k, s){
  var lin = (D.budget.linjer || {})[k], er26 = M.Y === 2026, md = S.aabenMd, oms = k === '1010' || k === '1020';
  var linjer = function(i){ if(i == null || i < 0) return '';
    if(oms){ var grp = k === '1020' ? ['MN','NO'] : ['MD','HQ'], kilde = er26 ? D.rejser.map(function(r){ return { ref: r.ref_no, navn: r.navn, d: r.afrejse, br: r.br, v: +r.omsaetning_dkk, st: r.afrejse <= M.sidste ? 'afrejst' : 'booket' }; }) : D.solgt.filter(function(r){ return +r.afrejse.slice(0,4) === M.Y; }).map(function(r){ return { ref: r.ref, navn: r.navn, d: r.afrejse, br: r.br, v: r.dkk, st: 'booket' }; });
      var rr = kilde.filter(function(r){ return +r.d.slice(5,7) - 1 === i && grp.indexOf(r.br) >= 0; }).sort(function(a, b){ return a.d.localeCompare(b.d); });
      return '<div class="sc" style="margin-top:10px;background:#fff;border-radius:14px"><table><tr><th>Rejse</th><th class="l">Afrejse</th><th class="l">Status</th><th>Omsætning</th></tr>' + rr.map(function(r){ return '<tr class="klik" data-rejse="' + r.ref + '"><td><b>' + esc(r.navn || '—') + '</b> <span class="mono dim">' + r.ref + '</span></td><td class="l">' + fd(r.d) + '</td><td class="l"><span class="pill ' + (r.st === 'booket' ? 't' : 'v') + '">' + r.st + '</span></td>' + td(r.v) + '</tr>'; }).join('')
        + (rr.length ? '<tr class="sum"><td>' + rr.length + ' rejser i ' + MON[i].toLowerCase() + '</td><td></td><td></td>' + td(sum(rr, function(r){ return r.v; })) + '</tr>' : '<tr><td colspan="4" class="dim">Ingen rejser i ' + MON[i].toLowerCase() + '.</td></tr>') + '</table></div>'; }
    if(!er26) return '<p class="note">' + MON[i] + ' ' + M.Y + ' er et skøn — der er ingen posteringer endnu.</p>';
    var bl = D.bank.filter(function(l){ return kontoAf(l) === k && +l.d.slice(5,7) - 1 === i; }).sort(function(a, b){ return a.d.localeCompare(b.d); });
    return '<div class="sc" style="margin-top:10px;background:#fff;border-radius:14px"><table><tr><th>Dato</th><th class="l">Bankkonto</th><th class="l">Tekst</th><th class="l">Person</th><th class="l">Bilag</th><th>Beløb</th></tr>'
      + bl.map(function(l){ return '<tr><td>' + fd(l.d) + '</td><td class="l mono dim">' + l.k + '</td><td class="wrapc">' + esc(l.t) + '</td><td class="l">' + (l.p ? PERS[l.p] || l.p : '') + '</td><td class="l">' + (l.bl ? '<span class="pill g" title="' + esc(l.bl) + '">✓ bilag</span>' : kraeverBilag(l) ? '<span class="pill r">mangler</span>' : '<span class="dim">—</span>') + '</td>' + td(-l.dkk) + '</tr>'; }).join('')
      + (bl.length ? '<tr class="sum"><td>' + bl.length + ' posteringer</td><td></td><td></td><td></td><td></td>' + td(-sum(bl, function(l){ return l.dkk; })) + '</tr>' : '<tr><td colspan="6" class="dim">Ingen posteringer i ' + MON[i].toLowerCase() + (i > M.LM ? ' endnu — beløbet er et skøn fra budgettet.' : '.') + '</td></tr>') + '</table></div>'; };
  return '<div class="det"><div class="ch" style="margin:8px 0 10px"><span class="t">' + k + ' ' + esc(knavn(k)) + '</span><span class="s">Klik en måned for at se posteringerne' + (lin && er26 ? ' · budgetlinjer: ' + esc(lin.join(' · ')) : '') + '</span><span class="r"><button class="btn l" data-fold="b">Fold ind ✕</button></span></div>'
    + '<div class="mgrid">' + MON.map(function(mm, i){ var F = M.v(k,'F',i), B = M.v(k,'B',i), K = M.v(k,'K',i), bu = M.v(k,'Bu',i), gang = i === M.LM, st = i < M.LM ? 'realiseret' : gang ? 'til ' + fd(M.sidste) : (B ? 'booket' : 'skøn');
        return '<button class="mf' + (i > M.LM ? ' fr' : '') + (md === i ? ' on' : '') + '" data-kmd="' + i + '"><div class="m"><span>' + mm + '</span></div><div class="v">' + nf(gang ? F + B : F + B + K) + '</div><div class="x">' + st + (er26 && bu ? ' · budget ' + nf(bu) : '') + '</div></button>'; }).join('') + '</div>'
    + linjer(md) + '</div>';
}
function sBudget(){
  var Y = S.aar, M = model(Y), L = M.LM, aar = aarListe(), er26 = Y === 2026;
  var A = function(id){ return M.sum(id,'A',0,12); }, F = function(id){ return M.sum(id,'F',0,12); }, Bu = function(id){ return M.sum(id,'Bu',0,12); };
  var oms = A('oms'), db = A('db'), kap = A('kap'), res = A('res'), fOms = F('oms'), fDb = F('db'), fKap = F('kap'), fRes = fDb - fKap;
  var rejser = M.antal.afrejst + M.antal.booket, lon = A('lon'), mark = sum(['2800','2801','2802','2821'], function(k){ return A(k); });
  var h1 = er26 ? hero('Budget & resultat ' + Y + ' · kun ejere', mio(fRes) + ' kr. realiseret — ' + mio(res) + ' forventet.', calc([['Realiseret til ' + fd(M.sidste), nf(fRes)], ['+ Booket · solgt, ikke afrejst', nf(M.sum('res','B',0,12))], ['+ Skøn · resten af budgettet', nf(M.sum('res','K',0,12))], ['= Forventet resultat ' + Y, nf(res), 'st'], ['Budget ' + Y, nf(Bu('res')), 'lt'], ['Kursgevinst er ikke med', '+ ' + nf(M.kursNu), 'lt']]))
    : hero('Budget & resultat ' + Y + ' · kun ejere', mio(M.sum('oms','B',0,12)) + ' kr. er booket for ' + Y + '.', calc([['Booket omsætning · ' + M.antal.booket + ' rejser', nf(M.sum('oms','B',0,12))], ['Skøn for resten · sat som 2026', nf(M.sum('oms','K',0,12))], ['= Forventet omsætning ' + Y, nf(oms), 'st'], ['Budget for ' + Y, 'ikke lagt endnu', 'lt']]));
  var faner = '<div style="display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin:0 0 16px"><span class="seg dk">' + aar.map(function(y){ return '<button data-aar="' + y + '" class="' + (y === Y ? 'on' : '') + '">' + y + '</button>'; }).join('') + '</span><span style="font-size:12.5px;color:#c9c5e6">Et nyt år får sin egen side, så snart den første rejse med afrejse det år er solgt (' + (aar[aar.length - 1] + 1) + ' er ikke oprettet endnu).</span></div>';
  var nt = '<div class="gk">'
    + gk('Omsætning', nf(oms), er26 ? 'realiseret ' + nf(fOms) : 'heraf booket ' + nf(M.sum('oms','B',0,12)), er26 ? afv(oms, Bu('oms'), 1, 1) : '')
    + gk('Dækningsbidrag', nf(db), 'dækningsgrad ' + pct(db, oms), er26 ? afv(db, Bu('db'), 1, 1) : '')
    + gk('Løn og drift', nf(kap), pct(kap, oms) + ' af omsætningen', er26 ? afv(kap, Bu('kap'), 0, 1) : '')
    + gk('Resultat før renter', nf(res), 'resultatgrad ' + pct(res, oms), er26 ? afv(res, Bu('res'), 1, 1) : '')
    + gk('Løn i % af dækningsbidrag', pct(lon, db), 'løn ' + nf(lon))
    + gk('Marketing i % af omsætning', pct(mark, oms), 'marketing ' + nf(mark))
    + gk('Rejser', rejser, 'snit ' + nf(oms / (rejser || 1)) + ' kr. · DB ' + nf(db / (rejser || 1)) + ' pr. rejse')
    + gk('Nulpunkt', nf(db ? kap / (db / oms) : 0), 'omsætning, der dækker løn og drift')
    + '</div>';
  var tr = function(navn, id, minus, kl){ var v = A(id), f = F(id), mx = oms || 1;
    return '<span class="' + (kl || '') + '">' + navn + '</span><span class="tr"><i style="left:0;width:' + (Math.abs(f) / mx * 100).toFixed(1) + '%;background:' + (minus ? '#c5bfdb' : '#6C4FE0') + '"></i><i style="left:' + (Math.abs(f) / mx * 100).toFixed(1) + '%;width:' + (Math.abs(v - f) / mx * 100).toFixed(1) + '%;background:repeating-linear-gradient(135deg,' + (minus ? '#dcd7ea' : '#b5a6f0') + ' 0 4px,#f3f1f9 4px 8px)"></i></span><b class="' + (kl || '') + (v < 0 ? ' bad' : '') + '">' + (minus ? '− ' : '') + nf(v) + '</b>'; };
  var trappe = '<div class="card"><div class="ch"><span class="t">Fra omsætning til resultat</span><span class="s">Hele ' + Y + ' · fuld farve = realiseret, skraveret = booket og skøn</span></div><div class="wf">'
    + tr('Omsætning', 'oms') + tr('Direkte omkostninger', 'dir', 1) + tr('Dækningsbidrag', 'db', 0, 'res') + SEK.slice(2, 6).map(function(s){ return tr(s.navn, s.id, 1); }).join('') + tr('Resultat før renter', 'res', 0, 'res') + '</div></div>';
  var status = '<div class="card"><div class="ch"><span class="t">Året fyldes ud</span><span class="s">Resultat pr. måned efter status</span></div>'
    + bars({ labels: MON, h: 250, aria: 'Resultat pr. måned efter status', under: MON.map(function(_, i){ return i < L ? 'realiseret' : i === L ? 'i gang' : 'fremtid'; }),
        series: LAG.map(function(l){ return { name: l[1], color: l[2], values: MON.map(function(_, i){ return M.v('res', l[0], i); }) }; }) }) + '</div>';
  var tabel = '<div class="ro"><div class="roh"><h2>Resultatopgørelse ' + Y + '</h2><div style="display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center"><span class="lg">' + LAG.map(function(l){ return '<span><i style="background:' + l[2] + '"></i>' + l[1] + '</span>'; }).join('') + (er26 ? '<span><i style="background:#8683a0;width:2px;border-radius:1px"></i>Budget</span>' : '') + '</span>'
    + '<span class="seg" style="background:rgba(255,255,255,.7)"><button data-vis="aar" class="' + (S.vis === 'aar' ? 'on' : '') + '">Året</button><button data-vis="mdr" class="' + (S.vis === 'mdr' ? 'on' : '') + '">Måned for måned</button></span></div></div>'
    + roSektion(M, SEK[0]) + roSektion(M, SEK[1]) + roBaand(M, 'Dækningsbidrag', 'db', 'dækningsgrad <b>' + pct(db, oms) + '</b>')
    + SEK.slice(2, 6).map(function(s){ return roSektion(M, s); }).join('') + roBaand(M, 'Resultat før renter', 'res', 'resultatgrad <b>' + pct(res, oms) + '</b>')
    + '<p class="note" style="padding:0 8px;color:#55526b">Klik en konto for at se månederne, og en måned for at se posteringerne. ' + (S.vis === 'mdr' ? 'Tal i tusinde kr. · blågrøn = booket · skraveret = skøn. ' : '') + 'Omsætning og direkte omkostninger følger afrejsedatoen (1010 = MD, 1020 = MN). Løn står på 2210 med det, banken har betalt.'
    + (er26 ? ' I de realiserede direkte omkostninger er ' + nf(M.skoenIDir) + ' kr. endnu ikke betalt eller ikke fundet i banken.' : ' Skøn = 2026-niveau.') + '</p></div>';
  var sikker = '';
  if(er26){
    var HOJ = ['MN1658','MN1689','MN1678','MD2106','MD1976','MD1987'], hr = D.rejser.filter(function(r){ return HOJ.indexOf(r.ref_no) >= 0; }), dg0 = M.sum('db','F',0,12) / M.sum('oms','F',0,12);
    var hDb = sum(hr, function(r){ return r.db_dkk; }), hRis = sum(hr, function(r){ return r.db_dkk - r.omsaetning_dkk * dg0; });
    var dolf = sum(D.rejser, function(r){ return r.omkostning_dkk; }) - sum(D.rejser, function(r){ return r.kob_dolphin; }), ude = sum(D.rejser, function(r){ return r.udestaaende_dkk; });
    var kS = M.sum('kap','K',0,12), snit = M.sum('kap','F',L - 6,L) / 6, eKurs = econ('fin');
    var flise = function(l, v, u, c){ return '<div style="background:' + (c || 'var(--soft)') + ';border-radius:18px;padding:16px 18px"><div class="kpi"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="u">' + u + '</div></div></div>'; };
    var pkt = function(ik, kl, t, u, z, zs){ return '<div class="row"><span class="ic ' + kl + '" aria-hidden="true">' + ik + '</span><span class="a"><b>' + t + '</b><span style="white-space:normal">' + u + '</span></span><span class="z">' + z + '<small>' + (zs || '') + '</small></span></div>'; };
    sikker = '<div class="card"><div class="ch"><span class="t">Hvad bliver resultatet for ' + Y + '?</span><span class="s">Før skat · det, der afgør tallet</span></div>'
      + '<div class="grid g3" style="gap:12px;margin-bottom:14px">' + flise('Forsigtigt', nf(res - hRis), 'hvis de seks rejser mangler indkøb · uden kurs') + flise('Forventet · uden kurs', nf(res), 'realiseret + booket + resten af budgettet', '#ece7fd') + flise('Med vores kursgevinst', nf(res + M.kursNu), 'kursgevinst ' + nf(M.kursNu) + ' pr. 17. nov') + '</div>'
      + pkt('?', 'r', 'Seks rejser med meget højt dækningsbidrag', hr.map(function(r){ return r.ref_no + ' ' + esc(r.navn.split(',')[0]) + ' (oms. ' + nf(r.omsaetning_dkk) + ', indkøb ' + nf(r.kob_dolphin) + ')'; }).join(' · ') + '. Afbestilt med beløbet beholdt — eller mangler indkøbet i Dolphin?', 'op til −' + nf(hRis), 'DB i dag ' + nf(hDb))
      + pkt('±', 'r', 'Kursgevinst eller kurstab', 'Vores beregning giver +' + nf(M.kurs[9] || 0) + ' pr. 30. sep. e-conomic viser ' + nf(eKurs) + ' for samme periode. Skal afklares med Martinsen (primokursen på NOK-kontoen).', nf((M.kurs[9] || 0) - eKurs), 'forskel pr. 30. sep')
      + pkt('📅', 'a', 'Resten af året er skøn', 'Udgifter fra ' + fd(M.sidste) + ' til nytår er sat til resten af budgettet. De seneste seks hele måneder har i snit kostet ' + nf(snit) + ' kr. om måneden.', nf(kS), 'skøn for udgifter')
      + pkt('$', 'a', 'Ubetalte leverandørregninger følger kursen', 'Udestående er regnet med dagskursen 17. nov. Én procents kursændring flytter ca. ' + nf(ude / 100) + ' kr.', nf(ude), 'udestående i alt')
      + pkt('⇄', 'v', 'Kontant eller periodiseret', 'Udgifterne står i den måned, de er betalt: revisor ' + nf(132047) + ', Adtention ' + nf(95094) + ' og forsikringer ' + nf(57623) + ' dækker delvist andre perioder. Du afgør, hvordan det skal vises.', '', 'din afgørelse')
      + pkt('✓', 'g', 'Det, der er på plads', 'Alle ni bankkonti stemmer med kontoudtogene. Rejseomkostningerne afviger samlet ' + nf(Math.abs(dolf)) + ' kr. fra Dolphins indkøb på ' + mio(sum(D.rejser, function(r){ return r.kob_dolphin; })) + ' kr. Driftslinjer i valuta er efterregnet med Nationalbankens kurser: forskel 1.143 kr.', '', 'afstemt')
      + '</div>';
  }
  return h1 + faner + nt + '<div class="grid">' + sikker + '<div class="grid g2">' + trappe + status + '</div>' + tabel
    + (er26 ? '' : '<div class="card"><div class="ch"><span class="t">Hvornår sælger vi?</span><span class="s">Salg i 2026 pr. bookingmåned — grundlaget for et bedre skøn end «som 2026»</span></div>' + bars({ labels: MON, h: 200, aria: 'Salg pr. bookingmåned 2026', series: [{ name: 'Solgt i måneden', color: 'var(--teal)', values: MON.map(function(_, i){ return sum(D.solgt.filter(function(x){ return +x.solgt.slice(5,7) === i + 1; }), function(x){ return x.dkk; }); }) }], legende: 1 }) + '</div>')
    + '</div>';
}

/* ── SALDOBALANCE: e-conomics saldobalance, konto for konto, ved siden af vores tal ── */
/* ── saldobalance: posteringer bag hver konto, vores mod e-conomic ── */
function sekAf(k){ return SEK.filter(function(x){ return +k >= x.fra && +k <= x.til; })[0]; }
function vLin(k, mi){ var M = model(2026);
  if(k === '1010' || k === '1020'){ var g = k === '1020' ? ['MN','NO'] : ['MD','HQ'];
    return D.rejser.filter(function(r){ return g.indexOf(r.br) >= 0 && r.afrejse <= M.sidste && +r.afrejse.slice(5,7) - 1 === mi; }).map(function(r){ return { d: r.afrejse, t: (r.navn || '') + ' · ' + r.ref_no, b: +r.omsaetning_dkk, kilde: 'afrejse' }; }); }
  return D.bank.filter(function(l){ return kontoAf(l) === k && +l.d.slice(5,7) - 1 === mi; }).map(function(l){ return { d: l.d, t: l.t, b: -l.dkk, kilde: l.k }; }); }
function eLin(k, mi){ var q = sekAf(k), f = q && q.indt ? -1 : 1; return D.epost.filter(function(e){ return e.k === k && +e.d.slice(5,7) - 1 === mi; }).map(function(e){ return { d: e.d, t: e.t, b: e.b * f, kilde: 'bilag ' + e.bi }; }); }
function parr(a, e){ /* samme beløb i samme måned = samme postering */
  var brugt = {}; a.forEach(function(x){ x.m = false; for(var i = 0; i < e.length; i++) if(!brugt[i] && Math.abs(e[i].b - x.b) < 0.011){ brugt[i] = 1; x.m = true; break; } });
  /* samme postering, men vores beløb er inkl. 25 % moms (e-conomic bogfører uden moms) */
  a.forEach(function(x){ x.moms = 0; if(x.m) return; for(var i = 0; i < e.length; i++) if(!brugt[i] && Math.abs(e[i].b * 1.25 - x.b) < 0.03){ brugt[i] = 1; x.m = true; x.moms = x.b - e[i].b; e[i].moms = 1; break; } });
  e.forEach(function(y, i){ y.m = !!brugt[i]; }); }
function kontoSam(k){
  var s = sekAf(k), vores = !(s.id === 'dir' || s.id === 'fin' || /Periodisering/.test(knavn(k))), oms = s.id === 'oms', v = [], e = [], kunV = 0, kunE = 0, nV = 0, nE = 0, moms = 0, nM = 0;
  for(var i = 0; i < 9; i++){ var a = vores ? vLin(k, i) : [], b = i < 3 ? eLin(k, i) : []; v.push(sum(a, function(x){ return x.b; })); e.push(i < 3 ? sum(b, function(x){ return x.b; }) : null);
    if(i < 3 && vores && !oms){ parr(a, b); a.forEach(function(x){ if(!x.m){ kunV += x.b; nV++; } if(x.moms){ moms += x.moms; nM++; } }); b.forEach(function(x){ if(!x.m){ kunE += x.b; nE++; } }); } }
  var e9 = econ(k) || 0, v9 = vores ? rng(v, 0, 9) : null, eQ1 = rng(e, 0, 3), vQ1 = vores ? rng(v, 0, 3) : null;
  return { k: k, s: s, vores: vores, oms: oms, v: v, e: e, v9: v9, e9: e9, d9: vores ? v9 - e9 : null, vQ1: vQ1, eQ1: eQ1, dQ1: vores ? vQ1 - eQ1 : null, dRest: vores ? (v9 - vQ1) - (e9 - eQ1) : null, kunV: kunV, kunE: kunE, nV: nV, nE: nE, moms: moms, nM: nM };
}
function samTekst(c){
  if(!c.vores) return c.s.id === 'dir' ? 'Vores direkte omkostninger kan ikke deles på denne konto endnu. e-conomic har ' + nf(c.e9) + ' kr. jan–sep.' : 'Vi har ingen posteringer på kontoen. e-conomic har ' + nf(c.e9) + ' kr. jan–sep.';
  if(Math.abs(c.d9) < 1) return 'Stemmer for jan–sep.';
  var t = 'Vi har ' + nf(Math.abs(c.d9)) + ' kr. ' + (c.d9 > 0 ? 'mere' : 'mindre') + ' end e-conomic for jan–sep. ';
  if(c.oms) return t + 'Vi tæller omsætningen i afrejsemåneden; e-conomic bogfører på salgsdatoen og flytter med periodisering (1040/1041), så månederne kan ikke sammenlignes linje for linje.';
  t += 'Jan–mar: ' + (Math.abs(c.dQ1) < 1 ? 'stemmer' : (c.dQ1 > 0 ? '+' : '−') + nf(Math.abs(c.dQ1))) + (c.nM ? ' — heraf ' + nf(c.moms) + ' kr. moms på ' + c.nM + ' posteringer (vi har beløbet inkl. moms)' : '') + (c.nV || c.nE ? ' (' + (c.nV ? c.nV + ' posteringer kun hos os, ' + nf(c.kunV) + ' kr.' : '') + (c.nV && c.nE ? ' · ' : '') + (c.nE ? c.nE + ' kun i e-conomic, ' + nf(c.kunE) + ' kr.' : '') + ')' : '') + '. ';
  t += 'Apr–sep: ' + (Math.abs(c.dRest) < 1 ? 'stemmer' : (c.dRest > 0 ? '+' : '−') + nf(Math.abs(c.dRest))) + ' — her har vi kun e-conomics total, ikke posteringerne.';
  return t;
}
function saldoDetalje(k){
  var c = kontoSam(k), md = S.smd, tab = function(titel, l, farve, tom){ return '<div style="background:#fff;border-radius:14px;min-width:0"><div style="padding:10px 14px 4px;font:700 11px/1.2 Inter;letter-spacing:.14em;text-transform:uppercase;color:' + farve + '">' + titel + ' · ' + nf(sum(l, function(x){ return x.b; })) + '</div><div class="sc"><table><tr><th>Dato</th><th class="l">Tekst</th><th>Beløb</th></tr>'
    + l.sort(function(a, b){ return a.d.localeCompare(b.d); }).map(function(x){ return '<tr><td>' + fd(x.d) + '</td><td class="wrapc" style="min-width:150px">' + esc(x.t) + ' <span class="mono dim">' + esc(x.kilde) + '</span>' + (x.m === false ? ' <span class="pill a">kun her</span>' : '') + (x.moms ? ' <span class="pill v">' + (x.moms === 1 ? 'uden moms' : 'inkl. moms ' + nf(x.moms)) + '</span>' : '') + '</td>' + td(x.b) + '</tr>'; }).join('')
    + (l.length ? '' : '<tr><td colspan="3" class="dim">' + tom + '</td></tr>') + '</table></div></div>'; };
  var under = '';
  if(md != null){ var a = c.vores ? vLin(k, md) : [], b = md < 3 ? eLin(k, md) : []; if(md < 3 && c.vores && !c.oms) parr(a, b); else { a.forEach(function(x){ delete x.m; }); b.forEach(function(x){ delete x.m; }); }
    under = '<div class="grid g2" style="gap:12px;margin-top:10px">' + tab('Vores · ' + MON[md].toLowerCase(), a, '#6C4FE0', c.vores ? 'Ingen posteringer.' : 'Fordeles ikke på denne konto.') + tab('e-conomic · ' + MON[md].toLowerCase(), b, '#a8660a', md < 3 ? 'Ingen posteringer.' : 'Posteringerne efter 31. marts ligger ikke i Databanken — kun totalen fra saldobalancen.') + '</div>'; }
  return '<div class="det"><div class="ch" style="margin:8px 0 6px"><span class="t">' + k + ' ' + esc(knavn(k)) + '</span><span class="r"><button class="btn l" data-fold="s">Fold ind ✕</button></span></div><p style="margin:0 0 12px;font-size:13.5px;color:var(--ink)">' + samTekst(c) + '</p>'
    + '<div class="mgrid">' + MON.slice(0, 9).map(function(mm, i){ var d = c.e[i] == null || !c.vores ? null : c.v[i] - c.e[i];
        return '<button class="mf' + (md === i ? ' on' : '') + '" data-smd="' + i + '"><div class="m"><span>' + mm + '</span></div><div class="v">' + (c.vores ? nf(c.v[i]) : '—') + '</div><div class="x">e-conomic ' + (c.e[i] == null ? 'ukendt' : nf(c.e[i])) + (d == null ? '' : Math.abs(d) < 1 ? ' · stemmer' : ' · ' + (d > 0 ? '+' : '−') + nf(Math.abs(d))) + '</div></button>'; }).join('')
      + '<div class="mf" style="background:#14121f;color:#fff;padding:8px 10px;border-radius:11px"><div class="m" style="color:#cfcbe6"><span>Jan–sep</span></div><div class="v">' + (c.vores ? nf(c.v9) : '—') + '</div><div class="x" style="color:#cfcbe6">e-conomic ' + nf(c.e9) + '</div></div></div>'
    + under + '</div>';
}
function saldoOpsum(M){
  var P = 9, v9 = function(id){ return M.sum(id,'F',0,P); }, led = [['Dækningsbidrag', v9('db') - econ('db'), 1], ['Lønninger', v9('lon') - econ('lon')], ['Salgs- og rejseomkostninger', v9('salg') - econ('salg')], ['Lokaleomkostninger', v9('lok') - econ('lok')], ['Administration', v9('adm') - econ('adm')]];
  var tot = v9('res') - econ('res'), mx = Math.max.apply(null, led.map(function(l){ return Math.abs(l[1]); }));
  var konti = []; SEK.slice(2, 6).forEach(function(s){ M.konti(s).forEach(function(k){ var c = kontoSam(k); if(c.vores && Math.abs(c.d9) >= 1) konti.push(c); }); }); konti.sort(function(a, b){ return Math.abs(b.d9) - Math.abs(a.d9); });
  var kmx = konti.length ? Math.abs(konti[0].d9) : 1;
  return '<div class="card"><div class="ch"><span class="t">Opsummering · hvor ligger forskellene?</span><span class="s">Resultat før afskrivninger, jan–sep</span><span class="r"><span class="pill ' + (Math.abs(tot) < 1 ? 'g' : 'a') + '">Vores resultat er ' + nf(Math.abs(tot)) + ' kr. ' + (tot >= 0 ? 'højere' : 'lavere') + ' end e-conomic</span></span></div>'
    + '<div class="grid g2" style="gap:26px"><div><div class="kpi" style="margin-bottom:8px"><div class="l">Sådan opstår forskellen</div></div>'
    + led.map(function(l){ var godt = l[2] ? l[1] >= 0 : l[1] <= 0, virk = l[2] ? l[1] : -l[1];
        return '<div style="display:grid;grid-template-columns:minmax(0,1fr) 110px;gap:4px 12px;align-items:center;padding:6px 0;font-size:13.5px"><span>' + l[0] + (l[2] ? '' : ' <span class="dim">· vi har ' + (l[1] >= 0 ? 'mere' : 'mindre') + '</span>') + '</span><b style="text-align:right" class="' + (virk >= 0 ? 'good' : 'bad') + '">' + (virk >= 0 ? '+' : '−') + nf(Math.abs(virk)) + '</b><span style="grid-column:1/3">' + hbar(l[1], mx, virk >= 0 ? 'var(--good)' : 'var(--bad)') + '</span></div>'; }).join('')
    + '<div style="display:flex;justify-content:space-between;border-top:1px solid #dcd8ea;padding-top:8px;margin-top:4px;font-weight:700"><span>Virkning på resultatet</span><span class="' + (tot >= 0 ? 'good' : 'bad') + '">' + (tot >= 0 ? '+' : '−') + nf(Math.abs(tot)) + '</span></div>'
    + '<p class="note">Grøn = trækker vores resultat op i forhold til e-conomic, rød = trækker ned.</p></div>'
    + '<div><div class="kpi" style="margin-bottom:8px"><div class="l">De ti konti med størst forskel · klik for posteringerne</div></div>'
    + konti.slice(0, 10).map(function(c){ return '<button class="row" data-skonto="' + c.k + '" data-hop="1" style="grid-template-columns:minmax(0,1fr) auto;padding:7px 0"><span class="a"><b style="font-size:13.5px"><span class="mono dim">' + c.k + '</span> ' + esc(knavn(c.k)) + '</b><span style="white-space:normal">Jan–mar ' + (Math.abs(c.dQ1) < 1 ? 'stemmer' : (c.dQ1 > 0 ? '+' : '−') + nf(Math.abs(c.dQ1))) + (c.nM ? ' · moms ' + nf(c.moms) : '') + (c.nV ? ' · ' + c.nV + ' kun hos os' : '') + (c.nE ? ' · ' + c.nE + ' kun i e-conomic' : '') + ' · apr–sep ' + (c.dRest > 0 ? '+' : '−') + nf(Math.abs(c.dRest)) + '</span>' + hbar(c.d9, kmx, c.d9 > 0 ? '#6C4FE0' : '#C77D0A') + '</span><span class="z">' + (c.d9 > 0 ? '+' : '−') + nf(Math.abs(c.d9)) + '<small>vores ' + nf(c.v9) + '</small></span></button>'; }).join('')
    + '</div></div>'
    + '<p class="note">e-conomics posteringer ligger kun i Databanken til og med 31. marts. For april–september kendes kun totalen pr. konto fra saldobalancen, så de måneder kan ikke spores linje for linje endnu. Et nyt udtræk af «Posteringer» for hele året fra e-conomic løser det. Bemærk: vores tal er bankens beløb inkl. moms, mens e-conomic bogfører uden moms på konti med fradrag — e-conomic har ' + nf(D.saldo.filter(function(x){ return x.nr === '6903'; })[0].per) + ' kr. i købsmoms jan–sep.</p></div>';
}
var BANKKONTO = { '5822':'DB-DKK','5823':'DB-NOK','5824':'DB-USD','5830':'REV-DKK','5831':'REV-NOK','5832':'REV-USD','5833':'REV-EUR','5834':'REV-GBP','6885':'DB-MC' };
function sSaldo(){
  var M = model(2026), P = 9, v9 = function(id){ return M.sum(id,'F',0,P); };
  var sl = D.saldo, find = function(n){ return sl.filter(function(x){ return x.navn === n; })[0] || {}; }, acc = function(k){ return sl.filter(function(x){ return x.nr === k; })[0] || { ytd: 0, per: 0 }; };
  var likv = sum(['5822','5823','5824','5830','5831','5832','5833','5834'], function(k){ return acc(k).ytd; }), forud = -(acc('6834').ytd + acc('6837').ytd), lev = acc('5661').ytd, ek = -find('EGENKAPITAL I ALT').ytd, akt = find('AKTIVER I ALT').ytd;
  var eRes = econ('res'), vRes = v9('res'), eSkat = econ('resskat'), kurs9 = M.kurs[9] || 0;
  var diff = function(a, b, indt){ var d = a - b; return Math.abs(d) < 1 ? '<span class="pill g">stemmer</span>' : '<span class="pill ' + (Math.abs(d) < 1000 ? '' : 'a') + '">' + (d > 0 ? '+' : '−') + nf(Math.abs(d)) + '</span>'; };
  var rk = function(navn, vores, eco, kl, bar, konto){ var mx = Math.max(Math.abs(vores || 0), Math.abs(eco || 0)) || 1, tag = konto ? 'button' : 'div';
    return '<' + tag + ' class="kr ks ' + (kl || '') + '"' + (konto ? ' data-skonto="' + konto + '" id="sk-' + konto + '" aria-expanded="' + (S.sk === konto) + '"' : '') + '><span class="nm">' + navn + '</span><span class="n">' + (vores == null ? '<span class="dim">—</span>' : nf(vores)) + '</span><span class="n">' + (eco == null ? '<span class="dim">—</span>' : nf(eco)) + '</span><span class="n">' + (vores == null || eco == null ? '' : diff(vores, eco)) + '</span>'
      + '<span class="x2">' + (bar === false || vores == null || eco == null ? '' : '<div style="display:grid;gap:3px"><div style="height:5px;border-radius:3px;background:#6C4FE0;width:' + (Math.abs(vores) / mx * 100).toFixed(0) + '%"></div><div style="height:5px;border-radius:3px;background:#C77D0A;width:' + (Math.abs(eco) / mx * 100).toFixed(0) + '%"></div></div>') + '</span></' + tag + '>'; };
  var res = '<div class="card pad0"><div class="ch"><span class="t">Resultatopgørelse</span><span class="s">1. jan – 30. sep 2026 · klik en konto for måneder og posteringer</span><span class="r"><span class="lg"><span><i style="background:#6C4FE0"></i>Vores</span><span><i style="background:#C77D0A"></i>e-conomic</span></span></span></div><div class="kt">'
    + '<div class="kr ks hd"><span>Konto</span><span class="n">Vores jan–sep</span><span class="n">e-conomic jan–sep</span><span class="n">Forskel</span><span class="x2">Sammenligning</span></div>'
    + SEK.map(function(s, si){ var konti = M.konti(s), fin = s.id === 'fin', dir = s.id === 'dir';
        var ud = rk('<span class="nm"><i class="dot" style="background:' + s.farve + '"></i>' + s.navn + '</span>', fin ? kurs9 : v9(s.id), econ(s.id), 'sek')
          + konti.map(function(k){ var e = econ(k), per = /Periodisering/.test(knavn(k));
              return rk('<span class="mono">' + k + '</span>' + esc(knavn(k)), (fin || dir || per) ? null : v9(k), e == null ? 0 : e, (!e && !((fin || dir) ? 0 : v9(k))) ? 'tom' : '', undefined, k) + (S.sk === k ? saldoDetalje(k) : ''); }).join('');
        if(si === 1) ud += rk('Dækningsbidrag', v9('db'), econ('db'), 'bd', false);
        if(si === 5) ud += rk('Resultat før afskrivninger', vRes, eRes, 'bd', false);
        if(si === 6) ud += rk('Resultat før skat', vRes + kurs9, eSkat, 'bd', false);
        return ud; }).join('')
    + '</div><p class="note">Vores omsætning og direkte omkostninger er opgjort efter afrejsedato og kan ikke deles på e-conomics konti endnu (periodisering 1040/1041 og 1360/1361 er Martinsens måde at nå samme princip). Renter og valutakurs: vores tal er den beregnede kursgevinst på valutakontiene pr. 30. sep; e-conomic viser et kurstab. Forskellen hænger sandsynligvis sammen med primokursen på NOK-kontoen (står under Afklaring).</p></div>';
  var bal = function(titel, fra, til){ var i0 = sl.findIndex(function(x){ return x.navn === fra; }), i1 = sl.findIndex(function(x){ return x.navn === til; });
    return '<div class="card pad0"><div class="ch"><span class="t">' + titel + '</span><span class="s">Saldo pr. 30. sep 2026 i e-conomic</span></div><div class="kt"><div class="kr ks hd"><span>Konto</span><span class="n">Saldo 30. sep</span><span class="n">Bevægelse i året</span><span class="n">Vores bevægelse</span><span class="x2"></span></div>'
      + sl.slice(i0 + 1, i1 + 1).map(function(x){
          if(x.t === 'h') return '<div class="kr ks sek"><span class="nm">' + esc(x.navn) + '</span><span></span><span></span><span></span><span class="x2"></span></div>';
          var passiv = titel === 'Passiver', f = passiv ? -1 : 1, bk = BANKKONTO[x.nr], vb = null, val = '';
          if(bk){ var a = D.bank.filter(function(l){ return l.k === bk && l.d <= '2026-09-30'; }); vb = sum(a, function(l){ return l.b; }); val = a.length ? a[0].v : ''; }
          return '<div class="kr ks ' + (x.t === 's' ? (/I ALT$/.test(x.navn) ? 'bd' : 'sek') : '') + '"><span class="nm">' + (x.nr ? '<span class="mono">' + x.nr + '</span>' : '') + esc(x.navn) + '</span><span class="n">' + nf(x.ytd * f) + '</span><span class="n">' + nf(x.per * f) + '</span>'
            + '<span class="n">' + (vb == null ? '' : nf(vb) + (val !== 'DKK' ? ' <span class="dim">' + val + '</span>' : '')) + '</span><span class="x2">' + (vb != null && val === 'DKK' ? diff(vb, x.per * (x.nr === '6885' ? -1 : 1)) : '') + '</span></div>'; }).join('') + '</div></div>'; };
  return hero('Saldobalance · e-conomic pr. 30. sep 2026', 'Vores tal mod e-conomic.', calc([['Vores resultat før afskrivninger · jan–sep', nf(vRes)], ['e-conomic · jan–sep', nf(eRes)], ['Forskel', (vRes - eRes >= 0 ? '+ ' : '− ') + nf(Math.abs(vRes - eRes)), 'st']]))
  + '<div class="gk">' + gk('Likvide beholdninger', nf(likv), 'bankkonti i e-conomic 30. sep') + gk('Forudbetalt af kunder', nf(forud), 'konto 6834 + 6837') + gk('Forudbetalt til leverandører', nf(lev), 'konto 5661') + gk('Egenkapital', nf(ek), 'soliditet ' + pct(ek, akt))
    + gk('Resultat e-conomic', nf(eSkat), 'før skat, jan–sep') + gk('Resultat vores', nf(vRes + kurs9), 'inkl. kursgevinst ' + nf(kurs9)) + gk('Dækningsgrad', pct(econ('db'), econ('oms')), 'vores: ' + pct(v9('db'), v9('oms'))) + gk('Aktiver i alt', nf(akt), 'balancesum 30. sep') + '</div>'
  + '<div class="grid">' + saldoOpsum(M) + res + '<div class="grid g2">' + bal('Aktiver', 'AKTIVER', 'AKTIVER I ALT') + bal('Passiver', 'PASSIVER', 'PASSIVER I ALT') + '</div></div>';
}

function sLev(){
  var alle = D.vp.map(function(v, i){ v.i = i; return v; }), aab = vpAabne();
  var forf = aab.filter(function(v){ return v.forfald <= T0; }), d30 = aab.filter(function(v){ return dage(v.forfald, T0) <= 30; });
  var liste = alle.filter(function(v){ return v.belob > 0; }).filter(function(v){ var st = vpStatus(v, v.i);
    return (S.lev === '30' ? st === 'aaben' && dage(v.forfald, T0) <= 30 : S.lev === 'alle' ? st === 'aaben' : S.lev === 'betalt' ? st === 'betalt' : st === 'afstemt') && (S.levVal === 'alle' || v.val === S.levVal); })
    .sort(function(a, b){ return a.forfald.localeCompare(b.forfald); });
  var kred = alle.filter(function(v){ return v.belob < 0; });
  var mdr = []; for(var k = 0; k < 8; k++){ var dd = new Date(Date.UTC(2026, 10 + k, 1)); mdr.push(dd.toISOString().slice(0, 7)); }
  var ser = [['USD','var(--vio)'],['EUR','var(--teal)'],['DKK','var(--amber)']].map(function(c){ return { name: c[0], color: c[1], values: mdr.map(function(mm, j){ return sum(aab.filter(function(v){ return v.val === c[0] && (j === 0 ? v.forfald.slice(0,7) <= mm : v.forfald.slice(0,7) === mm); }), function(v){ return v.dkk; }); }) }; });
  var behov = ['USD','EUR'].map(function(c){ return [c, sum(d30.filter(function(v){ return v.val === c; }), function(v){ return v.belob; }), sum(aab.filter(function(v){ return v.val === c; }), function(v){ return v.belob; })]; });
  var kode = function(v){ return '19NOV26' + (v.val === 'USD' ? 'RUSD' : v.val === 'EUR' ? 'REUR' : 'DK') + '-' + v.vendor.replace(/[^A-Za-z]/g, '').slice(0, 6); };
  var stSel = function(v){ var st = vpStatus(v, v.i); return '<select class="f s' + (st !== 'aaben' ? ' ch2' : '') + '" data-vp="' + v.i + '" aria-label="Status">' + [['aaben','Ubetalt'],['betalt','Betalt · mangler afstemning'],['afstemt','Afstemt']].map(function(o){ return '<option value="' + o[0] + '"' + (st === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; };
  var ant = function(s){ return alle.filter(function(v){ return v.belob > 0 && vpStatus(v, v.i) === s; }).length; };
  return hero('Leverandørbetalinger', forf.length ? forf.length + ' betalinger er over forfald.' : 'Ingen betalinger over forfald.', calc([['Over forfald', nf(sum(forf, function(v){ return v.dkk; }))], ['Forfalder inden for 30 dage', nf(sum(d30, function(v){ return v.dkk; }) - sum(forf, function(v){ return v.dkk; }))], ['Senere', nf(sum(aab, function(v){ return v.dkk; }) - sum(d30, function(v){ return v.dkk; }))], ['= Udestående i alt · ' + aab.length + ' betalinger', nf(sum(aab, function(v){ return v.dkk; })), 'st'], ['Kilde: Dolphin 16. nov — betalinger fra den dag er ikke ført', '', 'lt']]))
  + '<div class="grid">'
  + '<div class="grid g4">' + kpi('Over forfald', forf.length, nf(sum(forf, function(v){ return v.dkk; })) + ' kr.', forf.length ? 'bad' : '') + behov.map(function(b){ return kpi(b[0] + '-behov, 30 dage', nf(b[1]), 'i alt udestående ' + nf(b[2]) + ' ' + b[0]); }).join('') + kpi('Kreditter til gode', nf(-sum(kred, function(v){ return v.dkk; })), kred.length + ' kreditter', 'good') + '</div>'
  + '<div class="grid g2"><div class="card"><div class="ch"><span class="t">Forfald fremad</span><span class="s">DKK pr. måned, delt på valuta · første søjle inkl. forfaldne</span></div>'
  + bars({ labels: mdr.map(function(mm){ return MON[+mm.slice(5)-1] + (mm.slice(0,4) === '2027' ? ' 27' : ''); }), aria: 'Leverandørbetalinger pr. forfaldsmåned og valuta', series: ser }) + '</div>'
  + '<div class="card"><div class="ch"><span class="t">Kreditter — husk at trække fra</span><span class="c">' + kred.length + '</span></div>'
  + kred.map(function(c){ var nx = aab.filter(function(v){ return v.vendor === c.vendor; }).sort(function(a, b){ return a.forfald.localeCompare(b.forfald); })[0];
      return '<div class="row"><span class="ic g" aria-hidden="true">↺</span><span class="a"><b>' + esc(c.vendor) + '</b><span>Fra ' + c.ref + ' · ' + esc(c.pax) + (nx ? ' → træk fra ' + nx.ref + ', forfald ' + fd(nx.forfald) : ' → ingen kommende betaling') + '</span></span><span class="z good">' + nf2(-c.belob) + ' ' + c.val + '<small>' + nf(-c.dkk) + ' kr.</small></span></div>'; }).join('')
  + '<p class="note">Dolphin registrerer ikke brugte kreditter. Kreditlisten i Panda (supplier_credits) er sandheden — fx står Stuba til rest EUR 320,49 dér.</p></div></div>'
  + '<div class="card pad0"><div class="ch"><span class="t">Betalinger</span><span class="c">' + liste.length + '</span><span class="s">' + nf(sum(liste, function(v){ return v.dkk; })) + ' kr.</span><span class="r">'
  + '<span class="seg">' + [['30','Forfald ≤ 30 dage'],['alle','Alle ubetalte'],['betalt','Mangler afstemning ' + ant('betalt')],['afstemt','Afstemt ' + ant('afstemt')]].map(function(b){ return '<button data-lev="' + b[0] + '" class="' + (S.lev === b[0] ? 'on' : '') + '">' + b[1] + '</button>'; }).join('') + '</span>'
  + '<select class="f" id="levval" aria-label="Valuta"><option value="alle">Alle valutaer</option>' + opt(['USD','EUR','DKK'], S.levVal) + '</select></span></div>'
  + '<div class="sc"><table><tr><th>Leverandør · rejse</th><th class="l">Forfald</th><th class="l">Afrejse</th><th>Beløb</th><th>DKK</th><th class="l">Betalingskode</th><th class="l">Status</th></tr>'
  + liste.map(function(v){ var dg = dage(v.forfald, T0);
      return '<tr><td><b>' + esc(v.vendor) + '</b><br><span class="mono dim">' + v.ref + '</span> <span class="dim">' + esc(v.pax) + ' · ' + v.produkt + '</span></td>'
      + '<td class="l">' + fd(v.forfald) + ' <span class="pill ' + (dg <= 0 ? 'r' : dg <= 7 ? 'a' : '') + '">' + (dg < 0 ? -dg + ' dage over' : dg === 0 ? 'i dag' : 'om ' + dg + ' dage') + '</span></td><td class="l">' + fd(v.afrejse) + '</td>'
      + '<td><b>' + nf2(v.belob) + '</b> ' + v.val + '</td>' + td(v.dkk) + '<td class="l mono dim">' + kode(v) + '</td><td class="l">' + stSel(v) + '</td></tr>'; }).join('')
  + (liste.length ? '' : '<tr><td colspan="7" class="dim">Ingen betalinger i denne visning.</td></tr>') + '</table></div>'
  + '<p class="note">Status følger den nuværende side: Ubetalt → Betalt · mangler afstemning (kø til afstemning) → Afstemt. I Panda sætter Kvitto «afventer kontoudtog», og T-Rex sætter «afstemt», når banklinjen matcher. Betalingskoden er et forslag efter jeres mønster (dato + konto + leverandør). DKK er Dolphins kurs og kun vejledende.</p></div>'
  + '</div>';
}

function bankListe(){
  var q = S.bq.trim().toLowerCase();
  return D.bank.filter(function(l){ return (S.bacc === 'alle' || l.k === S.bacc) && (S.bkat === 'alle' || l.kat === S.bkat) && (S.bmon === 'alle' || +l.d.slice(5,7) === +S.bmon) && (!S.busik || /\?/.test(l.gl || '')) && (!S.bkonto || kontoAf(l) === S.bkonto) && (!S.bbilag || (kraeverBilag(l) && !l.bl))
    && (!q || (l.t + ' ' + (l.gl || '') + ' ' + (l.r || []).join(' ')).toLowerCase().indexOf(q) >= 0); }).sort(function(a, b){ return b.d.localeCompare(a.d) || a.i - b.i; });
}
function sBank(){
  var r = bankListe(), vis = r.slice(0, S.blim), us = usikre(), konti = Array.from(new Set(D.bank.map(function(l){ return l.k; }))).sort();
  var pk = konti.map(function(k){ var a = D.bank.filter(function(l){ return l.k === k; }); return [k, a.length, sum(a, function(l){ return l.b; }), a[0].v]; });
  return hero('Bank & afstemning', manglerBilag().length + ' posteringer mangler bilag.', calc([['Banklinjer siden 1. januar · 9 konti', nf(D.bank.length)], ['Stemmer med kontoudtogene', 'alle 9 konti'], ['Mangler bilag · hele året', nf(manglerBilag().length)], ['Uden sikker konto', nf(us.length)]]))
  + '<div class="grid">'
  + (function(){ var kr = D.bank.filter(kraeverBilag), har = kr.filter(function(l){ return l.bl; }).length, trin = [['1','Kontoudtog ind','Du lægger kontoudtog og transaktionslister i «Til T-Rex».'],['2','Linjerne matches','Hver linje kobles til rejse, leverandør eller udgift ud fra betalingskode, beløb og tidligere mønstre.'],['3','Bilaget findes','Agenten leder i Databanken og i mailen, læser fakturaen, gemmer den og omdøber den til betalingskoden.'],['4','Konteres og huskes','Konto, person og rejse sættes efter reglerne. Hver rettelse fra dig bliver til en ny regel.'],['5','Kun undtagelser til dig','Du ser kun det, der ikke går op: mangler bilag, ukendt modpart eller beløb, der ikke stemmer.']];
      return '<div class="card"><div class="ch"><span class="t">Automatisk afstemning</span><span class="s">Sådan skal det køre, når agenten har opgaven — i dag er trin 3–5 kun delvist bygget</span><span class="r"><span class="pill g">' + har + ' med bilag</span><span class="pill r">' + (kr.length - har) + ' mangler bilag</span><span class="pill a">' + us.length + ' uden sikker konto</span></span></div>'
        + '<div class="grid g4" style="gap:10px;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr))">' + trin.map(function(t){ return '<div style="background:var(--soft);border-radius:16px;padding:14px 16px"><div style="font:700 22px/1 \'Inter Tight\';color:var(--vio)">' + t[0] + '</div><div style="font-weight:600;margin:8px 0 4px">' + t[1] + '</div><div style="font-size:12.5px;color:var(--ink2);line-height:1.45">' + t[2] + '</div></div>'; }).join('') + '</div>'
        + '<p class="note">Et bilag er enten en fil i Databanken (Reconciliation/Documentation/2026 — ' + D.bilagFiler + ' filer, juli–november) eller et bilagsnummer i e-conomic (bogført til ' + fd(D.epostTil) + '). Overførsler kobles på betalingskoden, kortkøb på dato og navn, e-conomic på konto, dato og beløb. «≈» = valutakonto, fundet på dato og omregnet beløb. ' + D.bilagUbrugte.length + ' filer er ikke koblet til en linje endnu.</p></div>'; })()
  + '<div class="card pad0"><div class="ch"><span class="t">Kontoudtog</span><span class="s">Bevægelse 1. jan – 18. nov i kontoens valuta · stemmer 1:1 med bankens filer</span></div><div class="sc"><table><tr><th>Konto</th><th>Linjer</th><th>Bevægelse</th><th class="l">Valuta</th><th class="l">Status</th></tr>'
  + pk.map(function(p){ return '<tr class="klik" data-bacc="' + p[0] + '"><td><b>' + p[0] + '</b></td><td>' + p[1] + '</td><td>' + nf2(p[2]) + '</td><td class="l">' + p[3] + '</td><td class="l"><span class="pill g">✓ afstemt mod kontoudtog</span></td></tr>'; }).join('') + '</table></div></div>'
  + '<div class="card pad0"><div class="ch"><span class="t">Banklinjer</span><span class="c">' + nf(r.length) + '</span><span class="s">' + nf(sum(r, function(l){ return l.dkk; })) + ' kr.</span><span class="r">'
  + (S.bkonto ? '<button class="btn l" data-act="bkontoX">Konto ' + S.bkonto + ' ✕</button>' : '') + '<span class="seg"><button data-busik="0" class="' + (!S.busik && !S.bbilag ? 'on' : '') + '">Alle</button><button data-busik="1" class="' + (S.busik ? 'on' : '') + '">Uden sikker konto ' + us.length + '</button><button data-bbilag="1" class="' + (S.bbilag ? 'on' : '') + '">Mangler bilag ' + manglerBilag().length + '</button></span>'
  + '<select class="f" id="bacc" aria-label="Bankkonto"><option value="alle">Alle konti</option>' + opt(konti, S.bacc) + '</select>'
  + '<select class="f" id="bkat" aria-label="Kategori"><option value="alle">Alle kategorier</option>' + opt(Object.keys(KAT), S.bkat, function(k){ return KAT[k]; }) + '</select>'
  + '<select class="f" id="bmon" aria-label="Måned">' + monOpt(S.bmon) + '</select><input class="f" id="bq" type="search" placeholder="Tekst, konto eller rejse" value="' + esc(S.bq) + '" style="width:180px"></span></div>'
  + '<datalist id="gll">' + D.gl.map(function(g){ return '<option value="' + g.konto + '">' + esc(g.navn) + '</option>'; }).join('') + '</datalist>'
  + '<div class="sc"><table><tr><th>Dato</th><th class="l">Tekst</th><th>Beløb</th><th>DKK</th><th class="l">Kategori</th><th class="l">Konto i e-conomic</th><th class="l">Person</th><th class="l">Tæller som</th><th class="l">Bilag</th><th class="l"></th></tr>'
  + vis.map(function(l){ var g = kontoAf(l);
      return '<tr><td>' + fd(l.d) + '<br><span class="mono dim">' + l.k + '</span></td><td class="wrapc">' + esc(l.t) + (l.r ? '<br>' + l.r.map(function(x){ return '<span class="pill v">' + x + '</span>'; }).join(' ') : '') + '</td>'
      + '<td class="' + (l.b < 0 ? 'neg' : '') + '">' + nf2(l.b) + (l.v !== 'DKK' ? ' <span class="dim">' + l.v + '</span>' : '') + '</td><td class="' + (l.s ? 'est' : '') + '">' + nf2(l.dkk) + '</td>'
      + '<td class="l"><select class="f s' + (l.ret ? ' ch2' : '') + '" data-bf="kat" data-i="' + l.i + '" aria-label="Kategori">' + opt(Object.keys(KAT), l.kat, function(k){ return KAT[k]; }) + '</select></td>'
      + '<td class="l"><input class="f s' + (/\?/.test(l.gl || '') ? ' ch2' : '') + '" data-bf="gl" data-i="' + l.i + '" list="gll" value="' + esc(l.gl || '') + '" style="width:74px" aria-label="Konto"> <span class="dim" style="font-size:12px">' + esc(glNavn(l.gl)) + '</span></td>'
      + '<td class="l"><select class="f s" data-bf="p" data-i="' + l.i + '" aria-label="Person"><option value=""></option>' + opt(Object.keys(PERS), l.p || '', function(k){ return PERS[k]; }) + '</select></td>'
      + '<td class="l dim" style="font-size:12.5px">' + (g ? g + ' ' + esc(knavn(g)) : '—') + '</td><td class="l">' + (l.bl ? '<span class="pill g" title="' + esc(l.bl) + '">✓ ' + esc(l.bl.length > 22 ? l.bl.slice(0, 21) + '…' : l.bl) + '</span>' : kraeverBilag(l) ? '<span class="pill r">mangler</span>' : '<span class="dim">—</span>') + '</td><td class="l">' + (l.ret ? '<span class="pill g">rettet</span>' : '') + '</td></tr>'; }).join('')
  + '</table></div>' + (r.length > vis.length ? '<p class="note"><button class="btn l" data-act="bmere">Vis 150 flere</button> &nbsp;' + nf(vis.length) + ' af ' + nf(r.length) + '</p>' : '')
  + '<p class="note">Kursiv DKK = omregnet med fast kurs (skøn), ikke Nationalbankens kurs på dagen. «Tæller som» er kontoen i resultatopgørelsen; «—» = indgår ikke i resultatet (overførsler, udbytte, lån; kunder og leverandører tælles pr. rejse).</p></div>'
  + '</div>';
}

function sLikv(){
  var ind = MON.map(function(){ return 0; }), lev = ind.slice(), dr = ind.slice(), ln = ind.slice(), an = ind.slice();
  D.bank.forEach(function(l){ var i = +l.d.slice(5,7)-1; if(l.kat === 'kunde') ind[i] += l.dkk; else if(l.kat === 'leverandoer') lev[i] += l.dkk; else if(l.kat === 'drift') dr[i] += l.dkk; else if(l.kat === 'loen') ln[i] += l.dkk; else if(l.kat !== 'intern') an[i] += l.dkk; });
  var net = MON.map(function(_, i){ return ind[i] + lev[i] + dr[i] + ln[i] + an[i]; }), aab = vpAabne();
  var val = ['DKK','NOK','USD','EUR','GBP'].map(function(v){ var a = D.bank.filter(function(l){ return l.v === v; }); return [v, sum(a.filter(function(l){ return l.b > 0; }), function(l){ return l.b; }), sum(a.filter(function(l){ return l.b < 0; }), function(l){ return l.b; })]; });
  return hero('Likviditet', 'Pengene ind og ud.', 'Efter bankdato. Overførsler mellem egne konti er ikke med.')
  + '<div class="grid">'
  + '<div class="card"><div class="ch"><span class="t">Pengestrøm ' + AAR + '</span><span class="s">DKK · ind over stregen, ud under</span></div>'
  + bars({ labels: MON.slice(0, 11), h: 240, aria: 'Pengestrøm pr. måned', series: [{ name: 'Kunder ind', color: 'var(--vio)', values: ind }, { name: 'Leverandører', color: 'var(--teal)', values: lev }, { name: 'Drift og løn', color: 'var(--amber)', values: MON.map(function(_, i){ return dr[i] + ln[i]; }) }, { name: 'Andet (udbytte, refusion, lån, skat)', color: '#9a96b3', values: an }] })
  + '<p class="note">November går til den 18. Netto for året til nu: ' + nf(sum(net, function(x){ return x; })) + ' kr. — heraf udbytte for 2025 på 996.062 kr. i juni.</p></div>'
  + '<div class="grid g2"><div class="card pad0"><div class="ch"><span class="t">Pr. valuta</span><span class="s">Bevægelser i kontoens valuta, inkl. veksling</span></div><div class="sc"><table><tr><th>Valuta</th><th>Ind</th><th>Ud</th><th>Netto</th></tr>'
  + val.map(function(v){ return '<tr><td><b>' + v[0] + '</b></td><td>' + nf(v[1]) + '</td><td class="neg">' + nf(v[2]) + '</td>' + td(v[1] + v[2]) + '</tr>'; }).join('') + '</table></div></div>'
  + '<div class="card"><div class="ch"><span class="t">Valutabehov fremad</span><span class="s">Ubetalte leverandørbetalinger</span></div>'
  + ['USD','EUR'].map(function(c){ var a = aab.filter(function(v){ return v.val === c; }), mx = sum(a, function(v){ return v.belob; });
      return ['2026-11','2026-12','2027-01','2027-02'].map(function(mm, j){ var s = sum(a.filter(function(v){ return j === 0 ? v.forfald.slice(0,7) <= mm : v.forfald.slice(0,7) === mm; }), function(v){ return v.belob; });
        return '<div style="display:grid;grid-template-columns:90px minmax(0,1fr) 100px;gap:10px;align-items:center;padding:5px 0;font-size:13px"><span>' + c + ' · ' + MON[+mm.slice(5)-1].toLowerCase() + '</span>' + hbar(s, mx, c === 'USD' ? 'var(--vio)' : 'var(--teal)') + '<span style="text-align:right;font-weight:600">' + nf(s) + '</span></div>'; }).join(''); }).join('<div style="height:8px"></div>')
  + '<p class="note">Revolut-kvoten (prøve til 16. dec: 2.250.000 kr. gratis veksling) og «bedste konto pr. regning» fra Liquidity-prototypen hører til her. Saldi pr. konto mangler endnu — kontoudtogene her har kun bevægelser.</p></div></div>'
  + '</div>';
}

function sEjere(){
  var pl = D.bank.filter(function(l){ return l.p; }), mel = D.bank.filter(function(l){ return l.kat === 'mellemregning' || /6860/.test(l.gl || ''); }), udb = D.bank.filter(function(l){ return l.kat === 'udbytte'; });
  var ukendt = D.bank.filter(function(l){ return l.kat === 'drift' && l.gl === '2770' && !l.p; });
  var kort = function(k){ var a = pl.filter(function(l){ return l.p === k && !/udlæg/.test(l.gl || ''); }); return '<div class="card"><div class="person"><i>' + k + '</i><div><b style="font-size:16px">' + PERS[k] + '</b><div class="dim" style="font-size:12.5px">' + a.length + ' betalinger mærket (' + k + ')</div></div><div style="margin-left:auto;text-align:right"><div class="kpi"><div class="v">' + nf(-sum(a, function(l){ return l.dkk; })) + '</div></div><div class="dim" style="font-size:12px">studieture · konto 2770</div></div></div>'
    + a.map(function(l){ return '<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid var(--line);font-size:13px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + fd(l.d) + ' · ' + esc(l.t.replace(/^DBT\./, '').slice(0, 60)) + '</span><b>' + nf(-l.dkk) + '</b></div>'; }).join('') + (a.length ? '' : '<p class="note">Ingen mærkede betalinger.</p>') + '</div>'; };
  return hero('Interne balancer · kun ejere', 'Hvem har rejst og købt for hvad.', 'Betalinger mærket (WP), (RK), (EP) og (MP). Bogføres på 2770 Rejseudgifter.')
  + '<div class="grid">'
  + (function(){ var I = intern(), mest = I.diff >= 0 ? 'Rasmus' : 'Wendie', mx = Math.max(I.WP.alt, I.RK.alt) || 1;
      var kol = function(k, navn, col){ var x = I[k]; return '<div><div class="person"><i style="background:' + col + '">' + k + '</i><div><b style="font-size:16px">' + navn + '</b></div><div style="margin-left:auto;font:700 26px/1 \'Inter Tight\';letter-spacing:-.02em">' + nf(x.alt) + '</div></div>' + hbar(x.alt, mx, col)
        + '<dl style="margin:12px 0 0;display:grid;grid-template-columns:1fr auto;gap:6px 12px;font-size:13.5px;color:var(--ink2)"><dt>Studieture og køb · ' + x.n + ' betalinger</dt><dd style="margin:0;font-weight:600;color:var(--ink)">' + nf(x.rejser) + '</dd><dt>Udbytte for 2025</dt><dd style="margin:0;font-weight:600;color:var(--ink)">' + nf(x.udb) + '</dd><dt class="dim">Rejsebudget ' + AAR + ' (konto 2770)</dt><dd class="dim" style="margin:0">' + nf(x.bud) + '</dd>' + (x.udl ? '<dt class="dim">Udlæg, refunderet</dt><dd class="dim" style="margin:0">' + nf(x.udl) + '</dd>' : '') + '</dl></div>'; };
      return '<div class="card"><div class="ch"><span class="t">Balancen mellem Wendie og Rasmus</span><span class="s">Betalinger mærket med navn + udbytte · 1. jan – ' + fd(model(2026).sidste) + '</span><span class="r"><span class="pill ' + (Math.abs(I.diff) < 1 ? 'g' : 'a') + '">' + mest + ' har fået ' + nf(Math.abs(I.diff)) + ' kr. mere</span></span></div>'
        + '<div class="grid g2" style="gap:28px">' + kol('WP', 'Wendie', '#6C4FE0') + kol('RK', 'Rasmus', '#1B9AAA') + '</div>'
        + '<p class="note">Forskellen på studieture og køb alene er ' + nf(Math.abs(I.diffR)) + ' kr. (' + (I.diffR >= 0 ? 'Rasmus' : 'Wendie') + ' mest). To af Wendies betalinger er delt med Emilie (WP+EP) og står fuldt hos Wendie. Kortkøb uden navn på rejsekontoen er ikke fordelt endnu, så balancen er ikke komplet.</p></div>'; })()
  + '<div class="grid g2">' + ['WP','RK','EP','MP'].map(kort).join('') + '</div>'
  + '<div class="grid g2"><div class="card"><div class="ch"><span class="t">Mellemregning og udlæg</span><span class="s">Konto 6860</span></div>'
  + mel.map(function(l){ return '<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid var(--line);font-size:13px"><span>' + fd(l.d) + ' · ' + esc(l.t.slice(0, 50)) + '</span><b class="' + (l.dkk < 0 ? 'bad' : 'good') + '">' + nf(l.dkk) + '</b></div>'; }).join('')
  + '<div style="display:flex;justify-content:space-between;padding:9px 0 0;border-top:1px solid #dcd8ea;font-weight:700"><span>Netto</span><span>' + nf(sum(mel, function(l){ return l.dkk; })) + '</span></div></div>'
  + '<div class="card"><div class="ch"><span class="t">Udbytte for 2025</span><span class="s">Udbetalt 29. juni</span></div>'
  + udb.map(function(l){ return '<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid var(--line);font-size:13px"><span>' + esc(l.t.slice(0, 54)) + '</span><b>' + nf2(-l.dkk) + '</b></div>'; }).join('')
  + '<p class="note">Løn pr. person kan ikke vises endnu: «Lønoverførsel» er en samlet nettoløn til Wendie og Emilie.</p></div></div>'
  + '<div class="card ph" style="color:var(--ink)"><div class="ch"><span class="t">Mangler for at blive rigtig</span></div><div class="row"><span class="ic a" aria-hidden="true">?</span><span class="a"><b>' + ukendt.length + ' rejselinjer uden person</b><span>Kortkøb på 2770 for ' + nf(-sum(ukendt, function(l){ return l.dkk; })) + ' kr. — kortholder står ikke i kontoudtoget. «Hvem rejste?»-køen fra Owners-prototypen hører til her.</span></span><span class="z"><button class="btn l" data-act="ukendt">Se linjerne</button></span></div>'
  + '<div class="row"><span class="ic v" aria-hidden="true">✎</span><span class="a"><b>Elektronik, tøj og andre personlige køb</b><span>Kategorierne fra Owners-prototypen (ni pr. person) er ikke lagt på linjerne endnu.</span></span><span class="z dim">ikke bygget</span></div></div>'
  + '</div>';
}

function sAfk(){
  var l = D.afk.filter(function(a){ return S.afk === 'alle' || a.status === S.afk; }), typer = Array.from(new Set(l.map(function(a){ return a.type; })));
  var ant = function(s){ return D.afk.filter(function(a){ return a.status === s; }).length; };
  return hero('Afklaring', (ant('aaben') + D.rejser.filter(saer).length) + ' punkter venter på et svar.', 'Skriv, hvordan punktet blev afklaret — så lukkes det.')
  + '<div class="grid"><div><span class="seg" style="background:rgba(255,255,255,.75)">' + [['aaben','Åbne ' + ant('aaben')],['lukket','Lukkede ' + ant('lukket')],['alle','Alle']].map(function(b){ return '<button data-afk="' + b[0] + '" class="' + (S.afk === b[0] ? 'on' : '') + '">' + b[1] + '</button>'; }).join('') + '</span></div>'
  + (S.afk !== 'lukket' ? (function(){ var sr = D.rejser.filter(saer); return '<div class="card pad0"><div class="ch"><span class="t">Rejser, hvor tallene skal tjekkes</span><span class="c">' + sr.length + '</span><span class="s">Negativ omkostning, negativt dækningsbidrag eller over 50 % — tjek omsætning og leverandørbetalinger</span></div><div class="sc"><table><tr><th>Rejse</th><th class="l">Afrejse</th><th>Omsætning</th><th>Betalt (bank)</th><th>Udestående</th><th>Omkostning</th><th>Dækningsbidrag</th><th>%</th></tr>'
      + sr.map(function(x){ return '<tr class="klik" data-rejse="' + x.ref_no + '"><td><b>' + esc(x.navn || '—') + '</b> <span class="mono dim">' + x.ref_no + '</span></td><td class="l">' + fd(x.afrejse) + '</td>' + td(+x.omsaetning_dkk) + td(+x.betalt_bank_dkk) + td(+x.udestaaende_dkk) + td(+x.omkostning_dkk) + td(+x.db_dkk) + '<td>' + (+x.omsaetning_dkk ? '<span class="pill a">' + (x.db_dkk / x.omsaetning_dkk * 100).toFixed(0) + ' %</span>' : '—') + '</td></tr>'; }).join('') + '</table></div></div>'; })() : '')
  + typer.map(function(t){ var a = l.filter(function(x){ return x.type === t; });
      return '<div class="card"><div class="ch"><span class="t">' + esc(t) + '</span><span class="c">' + a.length + '</span>' + (a.some(function(x){ return x.dolphin_dkk != null; }) ? '<span class="s">Dolphin ' + nf(sum(a, function(x){ return x.dolphin_dkk; })) + ' kr.</span>' : '') + '</div>'
      + a.map(function(x){ return '<div class="row" style="align-items:start"><span class="ic ' + (x.status === 'lukket' ? 'g' : t === 'Usikkerhed' ? 'v' : 'a') + '" aria-hidden="true">' + (x.status === 'lukket' ? '✓' : '?') + '</span><span class="a"><b>' + esc(x.noegle) + ' ' + (x.rejser || []).map(function(r){ return '<span class="pill v">' + esc(r) + '</span>'; }).join(' ') + '</b><span style="white-space:normal">' + esc(x.note) + '</span>'
          + '<textarea class="f" data-svar="' + x.id + '" placeholder="Svar / hvordan det blev afklaret" style="width:100%;height:auto;min-height:34px;padding:7px 10px;margin-top:8px" aria-label="Svar">' + esc(x.svar || '') + '</textarea></span>'
          + '<span class="z">' + (x.dolphin_dkk != null ? nf(x.dolphin_dkk) + '<small>Dolphin' + (x.bank_dkk != null ? ' · bank ' + nf(x.bank_dkk) : '') + '</small>' : '') + '<button class="btn' + (x.status === 'lukket' ? ' l' : '') + '" style="margin-top:8px" data-luk="' + x.id + '">' + (x.status === 'lukket' ? 'Genåbn' : 'Gem og luk') + '</button></span></div>'; }).join('') + '</div>'; }).join('')
  + (l.length ? '' : '<div class="card">Ingen punkter.</div>') + '</div>';
}

function sMere(){
  var p = [['AML','Rapport over internationale betalinger med ét klik (Excel + PDF for valgfri periode). Findes i Liquidity-prototypen fra 14.10.','Prototype findes'],
    ['Kundeindbetalinger','Kontoudtog → T-Rex foreslår rejse pr. indbetaling → godkendelse med ét klik. Restbetalinger og overskredne. Findes i «Finance · payments»-prototypen fra 20.–21.10.','Prototype findes'],
    ['Bilag fra mailen','Agenten finder fakturaer og kvitteringer i mailen, gemmer dem i Databanken og omdøber dem til betalingskoden. Kræver adgang til postkassen og en regel for, hvilke afsendere der er bilag.','Nyt ønske 19.11']];
  return hero('Flere sider', 'Det, der hører til menuen, men ikke er med her.', 'Besluttet eller prototypet tidligere — skal med i den samlede menu.')
  + '<div class="grid g2">' + p.map(function(x){ return '<div class="card ph" style="color:var(--ink)"><div class="ch"><span class="t">' + x[0] + '</span><span class="pill v">' + x[2] + '</span></div><p style="margin:0;color:var(--ink2)">' + x[1] + '</p></div>'; }).join('') + '</div>';
}

var TEGN = { overblik: sOverblik, budget: sBudget, saldo: sSaldo, leverandoer: sLev, bank: sBank, likviditet: sLikv, ejere: sEjere, afklaring: sAfk, mere: sMere };
function tegn(behold){ var sk = API.sk(), y = sk ? sk.scrollTop : 0; API.S = S; menu(); $('side').innerHTML = TEGN[S.p](); if(sk) sk.scrollTop = behold ? y : sk.scrollTop; }
function go(p){ if(!TEGN[p]) p = 'overblik'; S.p = p; tegn(); var sk0 = API.sk(); if(sk0) sk0.scrollTop = 0; var t = INDRE.querySelector('#tabs .on'); if(t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'center' }); }

INDRE.addEventListener('click', function(ev){
  var e = ev.target.closest('[data-go]'); if(e) return go(e.dataset.go);
  e = ev.target.closest('[data-aar]'); if(e){ S.aar = +e.dataset.aar; S.aaben = ''; return tegn(true); }
  e = ev.target.closest('[data-vis]'); if(e){ S.vis = e.dataset.vis; return tegn(true); }
  e = ev.target.closest('[data-bkonto]'); if(e){ S.bkonto = e.dataset.bkonto; S.bq = ''; S.bkat = 'alle'; S.bacc = 'alle'; S.bmon = 'alle'; S.busik = false; S.blim = 80; return go('bank'); }
  e = ev.target.closest('[data-fold]'); if(e){ if(e.dataset.fold === 's'){ S.sk = ''; S.smd = null; } else { S.aaben = ''; S.aabenMd = null; } return tegn(true); }
  e = ev.target.closest('[data-smd]'); if(e){ S.smd = S.smd === +e.dataset.smd ? null : +e.dataset.smd; return tegn(true); }
  e = ev.target.closest('[data-skonto]'); if(e){ var hop = e.dataset.hop; S.sk = (S.sk === e.dataset.skonto && !hop) ? '' : e.dataset.skonto; S.smd = null; tegn(true); if(hop){ var m = $('sk-' + S.sk); if(m) m.scrollIntoView({ block: 'start', behavior: 'smooth' }); } return; }
  e = ev.target.closest('[data-kmd]'); if(e){ S.aabenMd = S.aabenMd === +e.dataset.kmd ? null : +e.dataset.kmd; return tegn(true); }
  e = ev.target.closest('[data-konto]'); if(e){ S.aaben = S.aaben === e.dataset.konto ? '' : e.dataset.konto; S.aabenMd = null; return tegn(true); }
  e = ev.target.closest('[data-act]'); if(e){ var a = e.dataset.act;
    if(a === 'bmere'){ S.blim += 150; return tegn(true); }
    if(a === 'bkontoX'){ S.bkonto = ''; return tegn(true); }
    if(a === 'ukendt'){ S.bkonto = '2770'; S.bq = ''; S.bkat = 'alle'; S.bmon = 'alle'; S.bacc = 'alle'; S.busik = false; return go('bank'); } }
  e = ev.target.closest('[data-lev]'); if(e){ S.lev = e.dataset.lev; return tegn(true); }
  e = ev.target.closest('[data-bbilag]'); if(e){ S.bbilag = !S.bbilag; S.busik = false; S.blim = 80; return tegn(true); }
  e = ev.target.closest('[data-busik]'); if(e){ S.busik = e.dataset.busik === '1'; S.bbilag = false; S.blim = 80; return tegn(true); }
  e = ev.target.closest('[data-bacc]'); if(e){ S.bacc = e.dataset.bacc; S.blim = 80; return tegn(true); }
  e = ev.target.closest('[data-afk]'); if(e){ S.afk = e.dataset.afk; return tegn(true); }
    e = ev.target.closest('[data-luk]'); if(e){ var x = D.afk.find(function(q){ return q.id === e.dataset.luk; }), ta = INDRE.querySelector('[data-svar="' + x.id + '"]');
    var gl = { status: x.status, svar: x.svar }; if(x.status === 'aaben'){ if(!ta.value.trim()) return toast('Skriv, hvordan punktet blev afklaret, før du lukker det.'); x.svar = ta.value.trim(); x.status = 'lukket'; } else x.status = 'aaben'; tegn(true); return API.gemAfk(x).then(function(fejl){ if(fejl){ x.status = gl.status; x.svar = gl.svar; tegn(true); toast('Ikke gemt: ' + fejl); } else toast(x.status === 'lukket' ? 'Lukket og gemt.' : 'Åbnet igen.'); }); }
  e = ev.target.closest('[data-rejse]'); if(e) return API.rejse(e.dataset.rejse) || toast('Rejsen ' + e.dataset.rejse + ' findes ikke i Panda endnu.');
});
INDRE.addEventListener('change', function(ev){
  var e = ev.target;
  if(e.dataset.vp != null){ S.vpst[e.dataset.vp] = e.value; toast('Status er kun markeret på din skærm — den gemmes ikke endnu.'); return tegn(true); }
  if(e.dataset.bf){ var l = D.bank.find(function(x){ return x.i === +e.dataset.i; }), bf = e.dataset.bf, foer = l[bf], ny = e.value.trim() || null; if((foer || null) === ny) return; if(bf === 'kat' && !KAT[ny]){ e.value = foer; return; } l[bf] = ny; l.ret = true; MODEL = {}; tegn(true); return API.gemLinje(l, bf, ny).then(function(fejl){ if(fejl){ l[bf] = foer; MODEL = {}; tegn(true); toast('Rettelsen blev ikke gemt: ' + fejl); } else toast('Gemt.'); }); }
  var m = { levval: 'levVal', bacc: 'bacc', bkat: 'bkat', bmon: 'bmon' }[e.id]; if(m){ S[m] = e.value; S.blim = 80; return tegn(true); }
});
var sog = 0;
INDRE.addEventListener('input', function(ev){ var e = ev.target; if(e.id !== 'bq') return; S.bq = e.value; S.blim = 80;
  clearTimeout(sog); sog = setTimeout(function(){ tegn(true); var n = $('bq'); if(n){ n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch(_){} } }, 240); });


$('dato').textContent = API.datoTekst;
if(!TEGN[S.p]) S.p = 'overblik';
tegn();
return { tegn: tegn, S: S };

}

/* ═══ SKAL: Pandas menu + scene, som Sales og Dashboard ═══ */
function sikrDokument(){
  if(!document.getElementById('ok-dok')){ const s = document.createElement('style'); s.id = 'ok-dok'; s.textContent = STIL_DOK; document.head.appendChild(s); }
  if(!document.getElementById('m8-skrift') && typeof M8_SKRIFT_URL !== 'undefined'){
    const l = document.createElement('link'); l.id = 'm8-skrift'; l.rel = 'stylesheet'; l.href = M8_SKRIFT_URL; document.head.appendChild(l); }
}
function skal(){
  const side = (typeof D8_SKAL !== 'undefined' && D8_SKAL.indexOf('<div class="scene">') > 0)
    ? D8_SKAL.slice(0, D8_SKAL.indexOf('<div class="scene">')).replace(' class="on"', '') : '<div class="m8html"><div class="m8body">';
  return side + '<div class="scene okscene"><div id="okhost"></div></div></div></div>';
}
function menu(){
  const rigtige = [...document.querySelectorAll('#nav button[data-v]')];
  ROD.querySelectorAll('#nav button[data-v]').forEach(b => {
    const r = rigtige.find(x => x.dataset.v === b.dataset.v);
    if(!r){ b.hidden = true; return; }
    b.hidden = r.style.display === 'none';
    b.classList.toggle('on', b.dataset.v === 'finance');
    if(b.dataset.v === 'finance') b.setAttribute('aria-current', 'page');
  });
  const f = ROD.getElementById('d8fod'); if(!f) return;
  f.innerHTML = '<b>' + esc(window.MYFULLNAME || window.MYNAME || '') + '</b><br>' + esc(window.MYEMAIL || '') + '<br>'
    + '<a href="#" data-d8="kodeord">Skift kodeord</a> · <a href="#" data-d8="logud">Log ud</a><br>Panda · ' + esc(typeof APP_VERSION !== 'undefined' ? APP_VERSION : '') + ' · ' + VERSION;
}
function klikSkal(ev){
  const nav = ev.target.closest && ev.target.closest('#nav button[data-v]');
  if(nav){ const r = document.querySelector('#nav button[data-v="' + nav.dataset.v + '"]'); if(r) r.click(); return; }
  const fod = ev.target.closest && ev.target.closest('[data-d8]');
  if(fod){ ev.preventDefault(); const h = fod.dataset.d8;
    if(h === 'logud') return db.auth.signOut();
    if(h === 'kodeord') return (typeof changePassword === 'function') && changePassword(); }
}
function klikIndre(ev){
  const g = ev.target.closest('[data-gl]'); if(!g) return;
  const f = g.dataset.gl; luk(); if(typeof window[f] === 'function') window[f]();
}
function luk(){
  if(OBS){ OBS.disconnect(); OBS = null; }
  if(APP && APP.S) GEMT_S = APP.S;
  if(VAERT){ VAERT.remove(); VAERT = null; ROD = null; INDRE = null; APP = null; }
  document.body.classList.remove('ok-paa');
  LAESER = false;
}
function vent(){
  if(!VAERT){
    sikrDokument();
    VAERT = document.createElement('div'); VAERT.id = 'ok-vaert';
    ROD = VAERT.attachShadow({ mode: 'open' });
    const grund = (typeof M8_GRUND !== 'undefined' ? M8_GRUND : '') + '\n' + (typeof D8_STIL !== 'undefined' ? D8_STIL : '');
    ROD.innerHTML = '<style>' + grund + '\n' + STIL_SKAL + '</style>' + skal();
    document.body.appendChild(VAERT);
    ROD.addEventListener('click', klikSkal);
    INDRE = ROD.getElementById('okhost').attachShadow({ mode: 'open' });
    INDRE.innerHTML = '<style>' + STIL + '</style>' + HTML;
    INDRE.addEventListener('click', klikIndre);
    /* lukkes, når Panda viser en anden side i #app */
    OBS = new MutationObserver(() => { if(window.__view !== 'finance' || (!LAESER && !document.getElementById('resmark'))) luk(); });
    OBS.observe(document.getElementById('app'), { childList: true });
    menu();
  }
  LAESER = true;
  document.body.classList.add('ok-paa');
}
const UGE = ['Søndag','Mandag','Tirsdag','Onsdag','Torsdag','Fredag','Lørdag'], MND = ['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december'];
async function aabn(){
  if(window.__view !== 'finance'){ luk(); return; }
  if(!VAERT) vent();
  await hent();
  if(!ROD) return;
  LAESER = false;
  const k = document.getElementById('resfejl'); if(k) k.textContent = '';
  const nu = new Date(), p2 = n => String(n).padStart(2, '0');
  APP = start(INDRE, D, {
    S: GEMT_S, idag: nu.getFullYear() + '-' + p2(nu.getMonth() + 1) + '-' + p2(nu.getDate()),
    datoTekst: UGE[nu.getDay()] + ' ' + nu.getDate() + '. ' + MND[nu.getMonth()] + ' · Økonomi',
    sk: () => ROD && ROD.querySelector('.m8html'),
    gemLinje, gemAfk,
    rejse: ref => { const x = D.rejser.find(q => q.ref_no === ref); if(!x || !x.trip_id || typeof viewTrip !== 'function') return false; const id = x.trip_id; luk(); viewTrip(id); return true; }
  });
}

return { version: VERSION, vent, aabn, luk, _byg: byg, _data: () => D, _app: () => APP };
})();
