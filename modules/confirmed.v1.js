/* ═══ Panda · modul: den bekræftede rejseside — modules/confirmed.v1.js ═══
   R857 (Wendie 19.10.2026: «bare byg det hele og gennemtest og tjek … at alt virker»).
   Når en rejse er bekræftet, åbner den i den SAMME side som mellemlandingen (R753: «vi skal
   holde den her røde tråd») — med det, der hører til en solgt rejse, lagt ovenpå:

     · toppen: «Confirmed · the trip is sold», ref.nr., låste kurser (R753)
     · stadierne Inquiry · Offer · Price check · Confirmed · Deposit · Balance · Travelling · Home
       (R852) — de skifter selv efter betalinger og datoer, og kan sættes i hånden (R749)
     · kursalarmen som én kort linje, kun når den slår til (R131/R752/R753/R854)
     · 01 Options & deadlines: kundens rater og ubetalte leverandørforfald med (R757)
     · 04 Services: prislinjer, der ikke var valgt ved bekræftelsen, ligger i arkivet (R753);
       ændringer efter bekræftelsen står med rødt — før og efter (R750)
     · 06 Pricing: kurserne er låst (R753), betalingsplanen kan rettes (R754, R9),
       kundens modtagne betalinger vises (R755)
     · 07 Supplier payments & invoices (R757, R345) og 08 Documents (R756)
     · History: arkivet over fravalgte prislinjer (R753)
     · «Cancel the trip» nederst — kræver ref.nr. og WEN/RAS (R752/R753)
     · «← Sales» tilbage til listen, som man forlod den (R856)

   EGEN FIL (Wendie 19.10.2026: de forskellige filer). index.html har korte kroge, der kun
   kalder herind for bekræftede rejser. Mangler filen, åbner bekræftede rejser den klassiske
   rejseside som før v1.79 — intet går tabt.

   Regler:
     · Der skrives KUN i basen, når et menneske trykker: stadie i hånden, betalingsplanen,
       «markér sendt», upload, lås kurserne. At åbne siden skriver intet herfra.
     · Der gættes ikke: mangler et tal (fx låste kurser), siges det i stedet for at regne. */
(function(){
'use strict';
const VERSION = 'confirmed v1';
const FLOW = ['bekraeftet', 'bb_sendt', 'klar_til_afrejse', 'god_tur', 'faerdig'];
/* stadierækken (R852) → den gamle sides STADIER-indeks (0 Mellemlanding … 5 Hjemme) */
const RAIL = [['Inquiry', null], ['Offer', null], ['Price check', 0], ['Confirmed', 1], ['Deposit', 2], ['Balance', 3], ['Travelling', 4], ['Home', 5]];
const KODE = ['mellemlanding', 'bekraeftet', 'depositum', 'restbetaling', 'afsted', 'hjemme'];
const MANUEL = ['depositum', 'restbetaling', 'afsted', 'hjemme'];
const DOK_TYPER = {bookingbekraeftelse: 'Booking confirmation', betalingskvittering: 'Payment receipt', afbestillingsbekraeftelse: 'Cancellation document',
  e_ticket: 'E-ticket', pre_departure: 'Pre-departure', bilag: 'Supplier invoice / voucher', andet: 'Other'};
const DOK_KUNDE = ['bookingbekraeftelse', 'betalingskvittering', 'afbestillingsbekraeftelse', 'pre_departure'];

let A = null;                       /* API fra index.html (MLNY._api) */
const S = {id: null, data: null, henter: null, fejl: null, arkivVis: {}, plan: null, planRet: false, planFejl: '',
  cxRef: '', cxAaben: false, dokUp: false, laaser: false};
/* Pandas klient er en global const i index.html (ikke window.db) — den nås ved navn */
const db_ = () => (typeof db !== 'undefined' ? db : null);

/* ── små hjælpere ── */
const tal = v => { const n = Number(v); return isFinite(n) ? n : null; };
const nfx = n => A.nf(n);
const nf2 = n => A.nf2(n);
const nf4 = n => (n == null || !isFinite(n)) ? '—' : Number(n).toLocaleString('da-DK', {minimumFractionDigits: 4, maximumFractionDigits: 4});
const esc = s => A.esc(s);
const kv = () => String((A.T().customer_currency || 'DKK')).trim() || 'DKK';
const plusDage = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const lok = iso => { if(!iso) return null; const x = new Date(iso); if(isNaN(x)) return String(iso).slice(0, 10);
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };

function aktiv(t){ return !!(t && FLOW.includes(t.status)); }
function skalAabne(status){ return FLOW.includes(status); }

/* ══ DATA — hentes én gang pr. rejse, kun til læsning ══════════════════════ */
function elementer(){ const R = A.RSx(); return (R.ELEMENTER || []).filter(e => !String(e.id).startsWith('x')); }
function prisIds(){ const R = A.RSx(), u = [];
  elementer().forEach(e => ((R.st && R.st[e.id] && R.st[e.id].linjer) || []).forEach(l => { if(l._id) u.push(l._id); })); return u; }
async function hent(){
  const t = A.T(), id = t.id, db = db_();
  if(!db) return null;
  const elIds = elementer().map(e => e.id), pIds = prisIds();
  const q = (p, tom) => Promise.resolve(p).then(r => (r && r.error) ? (console.warn('PandaConfirmed', r.error.message), tom) : ((r && r.data) || tom), () => tom);
  const [pay, vpl, fi, dok, opg, aTur, aEl, aPr, idag] = await Promise.all([
    q(db.from('payments').select('*').eq('trip_id', id).order('payment_date'), []),
    q(db.from('vendor_payment_lines').select('*').eq('trip_id', id), []),
    q(db.from('flight_invoices').select('*, flight_invoice_lines(*)').eq('trip_id', id).order('invoice_date'), []),
    q(db.from('v_rejsedokumenter').select('*').eq('trip_id', id).order('created_at', {ascending: false}), []),
    q(db.from('tasks').select('*').eq('trip_id', id), []),
    q(db.from('audit_log').select('at,action,old_row,new_row').eq('table_name', 'trips').eq('record_id', id).order('at'), []),
    elIds.length ? q(db.from('audit_log').select('at,action,record_id,old_row,new_row').eq('table_name', 'trip_elements').in('record_id', elIds).order('at'), []) : [],
    pIds.length ? q(db.from('audit_log').select('at,action,record_id,old_row,new_row').eq('table_name', 'element_prices').in('record_id', pIds).order('at'), []) : [],
    q(db.rpc('fn_effektive_kurser'), null)
  ]);
  return {pay, vpl, fi, dok, opg, aTur, aEl, aPr, idag, snap: snapshot(aTur, aEl, aPr, elIds)};
}
function sikrData(){
  const t = A.T();
  if(S.id === t.id && (S.data || S.henter)) return;
  S.id = t.id; S.data = null; S.fejl = null; S.plan = null; S.planRet = false; S.planFejl = ''; S.arkivVis = {}; S.cxRef = ''; S.cxAaben = false;
  const id = t.id;
  /* hentes ÉN gang pr. rejse — også når det fejler (ellers ville hver tegning hente igen) */
  S.henter = hent().then(d => { if(S.id !== id) return; S.henter = null;
      if(!d){ S.fejl = 'no connection to the database'; S.data = {pay: [], vpl: [], fi: [], dok: [], opg: [], aTur: [], aEl: [], aPr: [], idag: null, snap: {kendt: false}}; }
      else S.data = d;
      try { A.tegn(); } catch(e){ console.error('PandaConfirmed', e); } },
    e => { if(S.id !== id) return; S.fejl = String((e && e.message) || e); S.henter = null;
      S.data = {pay: [], vpl: [], fi: [], dok: [], opg: [], aTur: [], aEl: [], aPr: [], idag: null, snap: {kendt: false}}; console.error('PandaConfirmed', e); });
}

/* ══ ØJEBLIKSBILLEDET VED BEKRÆFTELSEN (R750/R753) ═════════════════════════
   Hvad var valgt, og til hvilken pris, da rejsen blev bekræftet? Det står i audit_log:
   rejsens første skift fra mellemlanding, og ydelsernes og prislinjernes sidste række før. */
function snapshot(aTur, aEl, aPr, elIds){
  const b = (aTur || []).find(r => r.old_row && r.new_row && r.old_row.status === 'mellemlanding' && r.new_row.status && r.new_row.status !== 'mellemlanding');
  const t = A.T();
  const tid = b ? b.at : null;
  if(!tid) return {kendt: false, tid: t.pricing_rates_at || t.accepted_at || null};
  const foer = (rows, rid) => { let x = null; (rows || []).forEach(r => { if(r.record_id === rid && r.at <= tid) x = r; }); return x; };
  const findes = (rows, rid) => (rows || []).some(r => r.record_id === rid);
  const valg = {}, nye = [];
  (elIds || []).forEach(id => {
    const r = foer(aEl, id);
    if(r && r.action !== 'DELETE' && r.new_row) valg[id] = (r.new_row.chosen_price_ids || []).slice().sort();
    else if(!r && findes(aEl, id)) nye.push(id);        /* oprettet efter bekræftelsen */
  });
  const priser = {};
  Object.values(valg).forEach(ids => ids.forEach(pid => { const r = foer(aPr, pid);
    if(r && r.new_row) priser[pid] = {pris: tal(r.new_row.amount), val: String(r.new_row.currency || '').trim(), lev: r.new_row.supplier_name || ''}; }));
  return {kendt: true, tid, valg, nye, priser, salg: tal(b.new_row.accepted_price), salgVal: b.new_row.accepted_currency || b.new_row.customer_currency || null};
}
function valgtNu(eid){ const R = A.RSx(), s = R.st && R.st[eid]; if(!s) return [];
  return A.valgte(eid).map(i => s.linjer[i] && s.linjer[i]._id).filter(Boolean).sort(); }
function arkiveret(eid, l){
  const sn = S.data && S.data.snap; if(!sn || !sn.kendt || !l || !l._id) return false;
  const v0 = sn.valg[eid]; if(!v0) return false;                       /* ydelsen fandtes ikke — intet arkiv */
  return !v0.includes(l._id) && !valgtNu(eid).includes(l._id);
}
/* ændret efter bekræftelsen: andet valg, ny ydelse, eller en valgt linje har fået et andet beløb */
function aendring(e){
  const sn = S.data && S.data.snap; if(!sn || !sn.kendt) return null;
  if(sn.nye.includes(e.id)) return {ny: true};
  const v0 = sn.valg[e.id]; if(!v0) return null;
  const nu = valgtNu(e.id), R = A.RSx(), s = R.st[e.id];
  const prisSkift = nu.filter(pid => { const p0 = sn.priser[pid]; if(!p0) return false;
    const l = s.linjer.find(z => z._id === pid); return l && (Math.abs((tal(l.pris) || 0) - (p0.pris || 0)) > 0.005 || String(l.val || '').trim() !== p0.val); });
  if(JSON.stringify(v0) === JSON.stringify(nu) && !prisSkift.length) return null;
  const dkk0 = v0.reduce((a, pid) => { const p0 = sn.priser[pid]; return a == null || !p0 ? null : a + (p0.pris || 0) * (kursLaast(p0.val) || 0); }, 0);
  const dkkNu = nu.reduce((a, pid) => { const l = s.linjer.find(z => z._id === pid); const d = l && typeof mlLinjeDkk === 'function' ? mlLinjeDkk(l) : null; return a == null || d == null ? null : a + d; }, 0);
  return {ny: false, valg: JSON.stringify(v0) !== JSON.stringify(nu), pris: prisSkift.length > 0, dkk0, dkkNu};
}

/* ══ KURSER: låst ved bekræftelsen og i dag (R131/R753/R854) ═══════════════ */
const R0 = () => { const r = A.T().pricing_rates; return r && typeof r === 'object' && Object.keys(r).some(k => /^[A-Z]{3}$/.test(k)) ? r : null; };
const effAf = (k, v) => { if(v === 'DKK') return 1; const b = k && k[v]; if(!b || !(Number(b.marked) > 0)) return null;
  if(v === kv()) return 1 / ((1 / Number(b.marked)) * (1 + (Number(b.bankmargin) || 0) / 100) * (1 + (Number(b.buffer) || 0) / 100));   /* R854: kundens valuta → salgskursen */
  return Number(b.effektiv) > 0 ? Number(b.effektiv) : Number(b.marked) * (1 + (Number(b.bankmargin) || 0) / 100) * (1 + (Number(b.buffer) || 0) / 100); };
const kursLaast = v => effAf(R0(), v);
const kursIDag = v => effAf(S.data && S.data.idag, v);
/* DKK pr. enhed af kundens valuta — salget */
const salgLaast = () => kv() === 'DKK' ? 1 : effAf(R0(), kv());
const salgIDag = () => kv() === 'DKK' ? 1 : effAf(S.data && S.data.idag, kv());

/* de valgte linjers beløb pr. valuta (med delydelser) — betalt eller ej */
function eksponering(){
  const R = A.RSx(), ud = [];
  elementer().forEach(e => {
    const s = R.st && R.st[e.id]; if(!s) return;
    const betaltEl = (A.D().els || []).some(x => x.id === e.id && x.vendor_paid);
    A.valgte(e.id).forEach(i => { const l = s.linjer[i]; if(!l) return;
      const udst = !!(l.hold && (l.hold.udstedt === true || l.hold.udstedt === 'true'));
      const haand = l.raa && l.raa.kurs != null && l.raa.kurs !== '';
      const betalt = betaltEl || (A.ydArt(e) === 'fly' && udst);
      const med = (bel, v) => { v = String(v || 'DKK').trim(); if(!(Number(bel))) return;
        ud.push({e, navn: A.ydNavnK(e), bel: Number(bel), val: v, betalt, haand: haand && v === l.val}); };
      med(l.pris, l.val); (l.subs || []).forEach(x => med(x.p, x.val || l.val)); });
  });
  return ud;
}
function kursAlarm(){
  if(!R0() || !(S.data && S.data.idag)) return null;
  const E = eksponering(), t = A.T();
  let kostL = 0, dCost = 0, mangler = false; const pr = {};
  E.forEach(x => { const kl = kursLaast(x.val); if(kl == null){ mangler = true; return; }
    kostL += x.bel * kl;
    if(x.val === 'DKK' || x.betalt || x.haand) return;
    const ki = kursIDag(x.val); if(ki == null){ mangler = true; return; }
    const d = x.bel * (ki - kl); dCost += d;
    const k = x.val + '|' + x.navn; pr[k] = pr[k] || {val: x.val, navn: x.navn, d: 0, kl, ki}; pr[k].d += d; });
  const pris = Number(t.accepted_price) || Number(t.package_sell_total) || 0;
  const sl = salgLaast(), si = salgIDag();
  const salgL = sl ? pris * sl : 0, dSalg = (sl && si) ? pris * (si - sl) : 0;
  const dbL = salgL - kostL, tab = dCost - dSalg;               /* tab > 0: dækningsbidraget er blevet mindre */
  const dgNu = salgL + dSalg > 0 ? (dbL - tab) / (salgL + dSalg) * 100 : 0;
  const snart = ((S.data && S.data.opg) || []).some(o => o.status === 'aaben' && /betal/i.test(String(o.frist_art || o.task_type || '')) && o.due_date && A.dageMellem(A.iDag(), o.due_date) <= 30)
    || (A.D().els || []).some(x => !x.vendor_paid && x.vendor_due_date && A.dageMellem(A.iDag(), x.vendor_due_date) <= 30);
  const grunde = [];
  if(tab > 2000){
    if(dbL > 0 && tab >= dbL / 3) grunde.push('a third of the profit is gone');
    if(dgNu < 10) grunde.push('the margin is below 10 %');
    if(snart && dbL > 0 && tab > dbL * 0.15) grunde.push('a supplier payment is due within 30 days');
  }
  const top = Object.values(pr).sort((a, b) => b.d - a.d)[0] || null;
  return {kostL, dCost, dSalg, dbL, tab, dgNu, grunde, alarm: grunde.length > 0, top, mangler};
}

/* ══ BETALINGSPLANEN (R754, R9) ═══════════════════════════════════════════
   Gemmes i trips.payment_plan som [{l, b, d}] i kundens valuta. Uden en gemt plan:
   depositum og restbetaling fra rejsen, ellers standarden 50 % / 50 % to måneder før afrejse
   (under 60 dage: alt med det samme). Depositum forfalder samme dag som bestillingen (Wendie 20.10.2026). */
function bekraeftetDato(){ const sn = S.data && S.data.snap, t = A.T(); return lok((sn && sn.tid) || t.booking_date || t.accepted_at) || A.iDag(); }
function standardPlan(){
  const t = A.T(), pris = Number(t.accepted_price) || Number(t.package_sell_total) || 0, ud = t.departure_date;
  const bk = bekraeftetDato();
  if(!pris) return [];
  /* Wendie 20.10.2026: «depositum er altid samme dag som bestilling» — datoerne kan rettes i planen */
  if(ud && A.dageMellem(bk, ud) <= 60) return [{l: 'Full payment', b: pris, d: bk}];
  const dep = Math.floor(pris / 2);
  return [{l: 'Deposit', b: dep, d: bk}, {l: 'Balance', b: pris - dep, d: ud ? plusDage(ud, -60) : plusDage(bk, 30)}];
}
function gemtPlan(){
  const t = A.T(), p = t.payment_plan;
  if(Array.isArray(p) && p.length) return p.map(x => ({l: String(x.l || 'Payment'), b: Number(x.b) || 0, d: x.d || null}));
  const pris = Number(t.accepted_price) || Number(t.package_sell_total) || 0;
  if(t.deposit_amount && kv() === 'DKK' && t.balance_due && pris) return [{l: 'Deposit', b: Number(t.deposit_amount), d: t.deposit_due || bekraeftetDato()}, {l: 'Balance', b: pris - Number(t.deposit_amount), d: t.balance_due}];
  if(t.balance_due && pris){ const s0 = standardPlan(); if(s0.length === 2){ s0[1].d = t.balance_due; return s0; } }
  return null;
}
/* Wendie 20.10.2026: depositum og restbetaling er der altid — restbetalingen er altid resten af prisen.
   «Hvis jeg sætter nul i deposit, så er det jo automatisk 100 procent i balance.» Delbetalinger ligger imellem. */
const kundePris = () => { const t = A.T(); return Number(t.accepted_price) || Number(t.package_sell_total) || 0; };
const r2 = n => Math.round(n * 100) / 100;
function planNorm(P0){
  const P = (P0 || []).map(x => Object.assign({}, x)); if(!P.length) return P;
  if(P.length === 1){ const x = P[0]; P.unshift({l: 'Deposit', b: 0, d: x.d && bekraeftetDato() > x.d ? x.d : bekraeftetDato()}); if(!x.l || /full/i.test(x.l)) x.l = 'Balance'; }
  const pris = kundePris(), sidst = P[P.length - 1];
  if(pris) sidst.b = r2(pris - P.slice(0, -1).reduce((a, x) => a + (Number(x.b) || 0), 0));
  return P;
}
const plan = () => planNorm(S.plan || gemtPlan() || standardPlan());
const planErStandard = () => !S.plan && !gemtPlan();
/* modtaget i kundens valuta */
function modtagne(){
  const v = kv();
  return ((S.data && S.data.pay) || []).filter(p => p.direction === 'ind' && p.status !== 'aaben' && p.in_type !== 'refund_til_kunde').map(p => {
    let b = null;
    if(p.customer_amount != null && String(p.customer_currency || '').trim() === v) b = Number(p.customer_amount);
    else if(String(p.currency || '').trim() === v) b = Number(p.amount);
    else if(v === 'DKK' && p.amount_dkk != null) b = Number(p.amount_dkk);
    return {p, b}; });
}
const modtagetSum = () => modtagne().reduce((a, x) => a + (x.b || 0), 0);
function planStatus(){
  let rest = modtagetSum();
  return plan().map(x => { const fra = Math.min(Math.max(rest, 0), x.b); rest -= fra;
    const n = x.d ? A.dageMellem(A.iDag(), x.d) : null;
    return Object.assign({}, x, {betalt: fra, st: fra >= x.b - 0.5 ? 'paid' : fra > 0 ? 'part' : (n != null && n < 0 ? 'overdue' : 'open'), n}); });
}

/* ══ STADIET (R749): selv — men kan sættes i hånden ══════════════════════════ */
function autoStadie(){
  const t = A.T(), i = A.iDag();
  if(t.return_date && i >= t.return_date) return 5;
  if(t.departure_date && i >= t.departure_date) return 4;
  const P = plan(), pris = P.reduce((a, x) => a + x.b, 0), m = modtagetSum();
  if(pris > 0 && m >= pris - 0.5) return 3;
  if(P.length > 1 && m >= P[0].b - 0.5 && m > 0) return 2;
  return 1;
}
function stadie(){ const s = String(A.T().stadie || ''); const i = KODE.indexOf(s);
  return MANUEL.includes(s) ? {i, haand: true} : {i: autoStadie(), haand: false}; }

window.PandaConfirmed = {version: VERSION, aktiv, skalAabne, _S: S,
  kobl: (api) => kobl(api), efterTegn: (api) => efterTegn(api), bund: (api, p) => bund(api, p), top: (api) => top(api),
  _test: {snapshot, standardPlan, planStatus, autoStadie, kursAlarm, eksponering, effAf}};

/* ══════════════════════════════════ TEGNING ══════════════════════════════════ */
const STIL = `
.pcblok{margin:16px 0 4px}
.pcblok .sh{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--lys3);margin:0 0 6px}
.pcblok .sh .tael{letter-spacing:0;text-transform:none;font-size:12px;color:var(--lys3)}
.pcblok tr[data-m8="pcgaatil"]:hover td{background:rgba(255,255,255,.05)}
.pcgem{background:rgba(127,224,176,.13)!important;border:1px solid rgba(127,224,176,.42)!important;color:#c9f5df!important;box-shadow:none!important;font-weight:500}
.pcgem:hover{background:rgba(127,224,176,.22)!important}
.pcblok .sh2{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:26px 0 8px;padding-top:18px;border-top:1px solid rgba(255,255,255,.10)}
.pcblok .sh2 h3{margin:0;font:500 17px/1.2 "Lora",Georgia,serif;color:#fff;letter-spacing:.01em;font-variant-numeric:normal}
.pcblok .sh2 .pcchip{margin-left:auto}
.pcblok table{width:100%}
.pcblok td,.pcblok th{vertical-align:middle}
.pcblok .nw{white-space:nowrap}
.pcchip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:100px;white-space:nowrap;background:rgba(255,255,255,.08);color:var(--lys2)}
.pcchip.ok{background:rgba(143,224,192,.14);color:#8fe0c0}.pcchip.obs{background:rgba(232,201,138,.16);color:#e8c98a}.pcchip.rod{background:rgba(255,138,158,.16);color:#ff8a9e}
.pcalarm{display:flex;gap:10px;align-items:center;margin:12px 0 0;padding:8px 13px;border-radius:10px;border:1px solid rgba(232,201,138,.45);background:rgba(232,201,138,.10);color:#e8c98a;font-size:12.5px;width:max-content;max-width:100%;flex-wrap:wrap}
.pcalarm b{color:#fff;font-weight:600}.pcalarm .sep{opacity:.5}
.rk.yd.pcaend{box-shadow:inset 3px 0 0 #ff8a9e}
.pcaendn{color:#ff8a9e;font-size:12.5px;margin:10px 0 4px;line-height:1.45}
.pl.pcarkiv{display:none}
.pcarkivlnk{display:inline-block;margin:8px 0 2px;font-size:12px;color:var(--lys3);cursor:pointer;border-bottom:1px dotted currentColor}
.pclaas{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;margin:13px 0 6px;font-size:12.5px;color:var(--lys2)}
.pclaas .lk{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--lys3)}
.pclaas .op{color:#e8c98a}.pclaas .ned{color:#8fe0c0}
.pcin{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:7px;color:#fff;font:inherit;font-size:12.5px;padding:5px 8px;width:100%;box-sizing:border-box}
.pcin.tal{text-align:right}
.pcx{background:none;border:0;color:var(--lys3);cursor:pointer;font-size:15px}
.pcsum{display:flex;gap:10px;align-items:center;margin-top:10px;flex-wrap:wrap;font-size:12.5px}
.pcfejl{color:#ff8a9e;font-size:12.5px;margin:6px 0 0}
.pcknap{display:flex;gap:8px;flex-wrap:wrap}
.pccancel{margin:46px 0 30px;padding-top:18px;border-top:1px dashed rgba(255,138,158,.25);display:flex;gap:12px;align-items:center;flex-wrap:wrap;color:var(--lys3);font-size:12.5px}
.pccancel .b{border-color:rgba(255,138,158,.4)!important;color:#ff8a9e!important}
.pccancel input{background:rgba(255,255,255,.06);border:1px solid rgba(255,138,158,.35);border-radius:7px;color:#fff;font:inherit;padding:6px 9px;width:170px}
.pcdokup{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px}
.pcdokup select,.pcdokup input[type=text]{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:7px;color:#fff;font:inherit;font-size:12.5px;padding:5px 8px}
`;
function css(){
  const R = A.ROD(); if(!R || R.getElementById('pcCss')) return;
  const st = document.createElement('style'); st.id = 'pcCss';
  st.textContent = window.PandaTekst ? PandaTekst.stil(STIL) : STIL;   /* R855: samme tekststørrelse som resten */
  R.appendChild(st);
}
function kortHtml(id, nr, titel){
  return '<section class="kort" id="k-' + id + '"><button class="kh" data-m8="fold" aria-expanded="false"><span class="knum">' + nr + '</span><h2>' + titel + '</h2>'
    + '<span class="ksum" id="s-' + id + '"></span><span class="kmrk" id="m-' + id + '"><i class="prik"></i><span></span></span><span class="kpil">›</span></button>'
    + '<div class="kkrop"><div><div class="kind" id="i-' + id + '"></div></div></div></section>';
}
function sikrKort(){
  const R = A.ROD(); if(!R) return;
  css();
  const h = R.getElementById('k-hist');
  if(h && !R.getElementById('k-lev')){
    h.insertAdjacentHTML('beforebegin', kortHtml('lev', '07', 'Supplier payments &amp; invoices') + kortHtml('dok', '08', 'Documents'));
    const n = h.querySelector('.knum'); if(n) n.textContent = '09';
  }
  const v = R.querySelector('.venstre');
  if(v && !R.getElementById('pcCancel')){ const d = document.createElement('div'); d.className = 'pccancel'; d.id = 'pcCancel'; v.appendChild(d); }
  tegnCancel();
  toning();
}
/* Wendie 20.10.2026: «graderingen fortsætter. Selvom vi får flere kort ind … så skal det stadigvæk spille med graderingen.»
   Én glidende overgang over ALLE kortene i venstre side — fra dashboardets blå til bordeaux (gradering A, som Sales) —
   uanset hvor mange kort der er. Sættes som kortets egne farver, så stilarkets 7 faste trin overtrumfes. */
const TONE = [[70,132,236],[112,104,242],[160,92,236],[196,84,180],[176,52,112],[128,28,66]];
function toneAf(t){
  const x = Math.max(0, Math.min(1, t)) * (TONE.length - 1), k = Math.min(TONE.length - 2, Math.floor(x)), f = x - k;
  return TONE[k].map((c, j) => Math.round(c + (TONE[k + 1][j] - c) * f));
}
function toning(){
  const R = A.ROD(); if(!R) return;
  const K = [...R.querySelectorAll('.venstre > section.kort, .venstre section.kort')].filter((x, i, a) => a.indexOf(x) === i);
  const N = K.length; if(N < 2) return;
  K.forEach((k, i) => {
    const [r, g, b] = toneAf(i / (N - 1)), c = (a) => 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    const sig = r + ',' + g + ',' + b; if(k.dataset.tone === sig) return;
    k.dataset.tone = sig;
    k.style.setProperty('--toning', 'linear-gradient(112deg,' + c(.36) + ',' + c(.15) + ')');
    k.style.setProperty('--toningAab', 'linear-gradient(112deg,' + c(.42) + ',' + c(.18) + ')');
    const n = k.querySelector('.knum'); if(n) n.style.color = 'rgb(' + [r, g, b].map(x => Math.round(x + (255 - x) * .42)).join(',') + ')';
  });
}

/* ── kobl: én gang pr. side (KROP-kortene pakkes ind én gang for alle) ── */
function kobl(api){
  A = api;
  const K = A.KROP;
  if(!K.__pc){
    Object.defineProperty(K, '__pc', {value: true, enumerable: false});
    [['frist', efterFrist], ['yd', efterYd], ['pris', efterPris], ['hist', efterHist]].forEach(([k, fn]) => {
      const org = K[k]; if(typeof org !== 'function') return;
      K[k] = function(){ const r = org.apply(this, arguments);
        try { if(A && aktiv(A.T())) fn(); } catch(e){ console.error('PandaConfirmed ' + k, e); } return r; };
    });
    K.lev = function(){ try { if(A && aktiv(A.T())) tegnLev(); } catch(e){ console.error('PandaConfirmed lev', e); } };
    K.dok = function(){ try { if(A && aktiv(A.T())) tegnDok(); } catch(e){ console.error('PandaConfirmed dok', e); } };
    A.KORT.lev = () => aktiv(A.T()) ? markLev() : ['tom', '', ''];
    A.KORT.dok = () => aktiv(A.T()) ? markDok() : ['tom', '', ''];
    Object.assign(A.HANDL, HANDL);
    Object.assign(A.HANDLC, HANDLC);
    /* kurserne er låst på en bekræftet rejse (R753) — de kan ikke hentes eller rettes her */
    ['prhent', 'prkursnul', 'prsalgnul', 'prhaandalle'].forEach(h => { const org = A.HANDL[h]; if(typeof org !== 'function') return;
      A.HANDL[h] = function(){ if(A && aktiv(A.T()) && R0()) return A.kvitter('advar', 'The rates were locked when the trip was confirmed — they cannot be changed here');
        return org.apply(this, arguments); }; });
  }
  if(aktiv(A.T())){ sikrKort(); sikrData(); }
}
function efterTegn(api){ A = api; if(!aktiv(A.T())) return; sikrKort(); sikrData(); }

/* ── toppen (R852/R753/R131) ── */
function top(api){
  A = api; const R = A.ROD(), t = A.T(); if(!R) return;
  sikrKort();
  const e = R.querySelector('.eyebrow'); if(e) e.textContent = 'Confirmed · the trip is sold';
  const st = stadie(), nu = RAIL.findIndex(x => x[1] === st.i);
  const rl = R.getElementById('rail');
  if(rl) rl.innerHTML = RAIL.map((s, i) => '<button class="rtrin' + (i < nu ? ' gjort' : '') + (i === nu ? ' nu' : '') + '" data-m8="pcstadie" data-i="' + i + '"'
    + (i === nu ? ' title="' + (st.haand ? 'Set by hand — click «Confirmed» to let Panda set the stage again' : 'Set by Panda from the payments and the dates — click another stage to set it by hand') + '"' : '')
    + '><span class="rb"></span><span class="rn">' + s[0] + '</span></button>').join('');
  const fk = R.getElementById('rforkl'); if(fk) fk.style.display = 'none';     /* R753: ingen forklaringer under stadierne */
  let al = R.getElementById('pcAlarm');
  const k = S.data ? kursAlarm() : null;
  if(k && k.alarm && k.top){
    if(!al && rl){ al = document.createElement('div'); al.className = 'pcalarm'; al.id = 'pcAlarm'; rl.insertAdjacentElement('afterend', al); }
    if(al) al.innerHTML = '◆ <b>Rate alarm</b><span class="sep">·</span>' + esc(k.top.val) + ' ' + nf4(k.top.ki) + ' <span style="opacity:.7">(locked ' + nf4(k.top.kl) + ')</span>'
      + '<span class="sep">·</span>' + esc(k.top.navn) + '<span class="sep">·</span><b>' + (k.tab >= 0 ? '+' : '−') + nfx(Math.abs(k.tab)) + ' DKK</b><span class="sep">·</span>' + esc(k.grunde[0]);
  } else if(al) al.remove();
}

/* ── bunden i forsidepanelet: status og knapper ── */
function bund(api, p){
  A = api; const R = A.ROD(), t = A.T(); if(!R) return;
  const st = R.getElementById('bStat'), kn = R.querySelector('.bknap');
  const sn = S.data && S.data.snap, dato = (sn && sn.tid) || t.pricing_rates_at || t.accepted_at;
  const lr = R0();
  if(st){ st.className = 'bstat ok';
    st.innerHTML = '<b>Confirmed</b>' + (dato ? ' ' + esc(A.kdA(lok(dato))) : '') + ' · ' + esc(t.ref_no || '—') + ' · '
      + (lr ? 'rates locked' + (lr.dato ? ' (' + esc(A.kd(lr.dato)) + ')' : '') : '<span style="color:#e8c98a">rates not locked</span>')
      + (S.fejl ? '<span class="gt" style="color:#ff8a9e">Part of the page could not be fetched: ' + esc(S.fejl) + '</span>' : ''); }
  if(kn){
    kn.querySelectorAll('#bTilbage, #bBekraeft').forEach(b => { b.hidden = true; b.style.display = 'none'; });
    if(!kn.querySelector('#pcKnap')) kn.insertAdjacentHTML('beforeend', '<span class="pcknap" id="pcKnap"><button class="b fyldt" data-m8="pcsalg">← Sales</button>'
      + '<button class="b" data-m8="pcklassisk" title="The classic trip page — VAT basis, terms, flight invoices and the cancellation dialog">Classic page</button></span>');
  }
}

/* ── 01 Options & deadlines: kundens rater og leverandørernes forfald (R757) ── */
function efterFrist(){
  const R = A.ROD(), ind = R && R.getElementById('i-frist'); if(!ind) return;
  /* Wendie 20.10.2026: «payment due bør være øverst på options og deadlines» */
  let b = R.getElementById('pc-frist'); if(!b){ b = document.createElement('div'); b.id = 'pc-frist'; b.className = 'pcblok'; }
  if(ind.firstChild !== b) ind.insertBefore(b, ind.firstChild);
  if(!S.data){ b.innerHTML = '<p class="note">Fetching the payments …</p>'; return; }
  const rk = [];
  planStatus().forEach(x => { if(x.st === 'paid') return;
    rk.push({hvad: 'Customer · ' + x.l, bel: nfx(x.b - x.betalt) + ' ' + kv(), d: x.d, aft: x.st === 'part' ? nfx(x.betalt) + ' ' + kv() + ' received' : 'payment plan'}); });
  (A.D().els || []).forEach(e => { if(e.vendor_paid || !e.vendor_due_date) return;
    rk.push({hvad: 'Pay ' + ((e.details && e.details.lev) || 'the supplier'), bel: e.buy_amount != null ? nfx(e.buy_amount) + ' ' + String(e.buy_currency || 'DKK').trim() : '—', d: e.vendor_due_date, aft: e.description || ''}); });
  rk.sort((a, z) => String(a.d || '9999') < String(z.d || '9999') ? -1 : 1);
  const chip = d => { if(!d) return '<span class="pcchip">no date</span>'; const n = A.dageMellem(A.iDag(), d);
    return '<span class="pcchip ' + (n < 0 ? 'rod' : n <= 14 ? 'obs' : '') + '">' + (n < 0 ? A.flertal(-n, 'day', 'days') + ' overdue' : n === 0 ? 'today' : A.flertal(n, 'day', 'days')) + '</span>'; };
  /* Wendie 20.10.2026: en tydeligere overskrift — og ingen forklarende tekst */
  const n0 = rk.find(x => x.d), nN = n0 ? A.dageMellem(A.iDag(), n0.d) : null;
  b.innerHTML = '<div class="frsek"><h3>Payments due</h3>' + (rk.length ? '<span class="pcchip ' + (nN != null && nN < 0 ? 'rod' : nN != null && nN <= 14 ? 'obs' : '') + '">'
      + rk.length + ' open' + (nN == null ? '' : nN < 0 ? ' · overdue' : nN === 0 ? ' · next today' : ' · next in ' + A.flertal(nN, 'day', 'days')) + '</span>' : '') + '</div>'
    + (rk.length ? '<table class="tab tabmini"><thead><tr><th style="text-align:left">What</th><th>Amount</th><th>Due</th><th>Due in</th><th style="text-align:left">Note</th></tr></thead><tbody>'
      + rk.map(x => '<tr><td style="text-align:left">' + esc(x.hvad) + '</td><td class="nw">' + esc(x.bel) + '</td><td class="nw">' + (x.d ? esc(A.kdA(x.d)) : '—') + '</td><td>' + chip(x.d) + '</td><td style="text-align:left;color:var(--lys3)">' + esc(x.aft) + '</td></tr>').join('')
      + '</tbody></table>' : '<p class="note">Nothing due — the customer has paid according to the plan, and no supplier payment is open.</p>');
}

/* ── 04 Services: arkiv og rød markering (R750/R753) ── */
function efterYd(){
  const R = A.ROD(), ind = R && R.getElementById('i-yd'); if(!ind || !S.data) return;
  const RS = A.RSx();
  ind.querySelectorAll('.rk.yd[data-yd]').forEach(rk => {
    const id = rk.dataset.yd, e = elementer().find(x => x.id === id), s = RS.st && RS.st[id]; if(!e || !s) return;
    let ar = 0;
    s.linjer.forEach((l, i) => { const a = arkiveret(id, l); if(a) ar++;
      const el = rk.querySelector('.pl[data-yd="' + CSS.escape(id) + '"][data-i="' + i + '"]');
      if(el) el.classList.toggle('pcarkiv', a && !S.arkivVis[id]); });
    const d = rk.querySelector('.rkh .rbel .dkk');
    if(d && ar) d.textContent = A.valgte(id).length + ' selected · ' + ar + ' archived';
    const stige = rk.querySelector('.stige');
    let lk = rk.querySelector('.pcarkivlnk');
    if(ar && stige){ if(!lk){ lk = document.createElement('a'); lk.className = 'pcarkivlnk'; lk.dataset.m8 = 'pcarkiv'; lk.dataset.yd = id; stige.insertAdjacentElement('afterend', lk); }
      lk.textContent = S.arkivVis[id] ? 'hide the ' + ar + ' archived' : 'show ' + A.flertal(ar, 'archived price line', 'archived price lines') + ' — not selected when the trip was confirmed'; }
    else if(lk) lk.remove();
    const ae = aendring(e), rind = rk.querySelector('.rind');
    rk.classList.toggle('pcaend', !!ae);
    let n = rk.querySelector('.pcaendn');
    if(ae && rind){ if(!n){ n = document.createElement('div'); n.className = 'pcaendn'; rind.prepend(n); }
      n.innerHTML = ae.ny ? '● <b>Added after the confirmation.</b> It is not part of what the customer confirmed — see History.'
        : '● <b>Changed after the confirmation</b> — ' + (ae.valg ? 'another price line is selected' : 'the price on the selected line has changed')
          + (ae.dkk0 != null && ae.dkkNu != null ? '. At confirmation ' + nfx(ae.dkk0) + ' DKK · now ' + nfx(ae.dkkNu) + ' DKK (' + (ae.dkkNu - ae.dkk0 >= 0 ? '+' : '−') + nfx(Math.abs(ae.dkkNu - ae.dkk0)) + ' DKK)' : '')
          + '. See History.'; }
    else if(n) n.remove();
  });
}

/* ── 06 Pricing: låste kurser og kundens betalinger (R753/R754/R755/R131) ── */
function efterPris(){
  const R = A.ROD(), ind = R && R.getElementById('i-pris'); if(!ind) return;
  const lr = R0();
  let k = R.getElementById('pc-laas');
  if(!k){ k = document.createElement('div'); k.id = 'pc-laas'; k.className = 'pcblok'; ind.insertBefore(k, ind.firstChild); }
  if(lr){
    ind.querySelectorAll('input.kurstal, #f-salgk').forEach(x => { x.disabled = true; x.title = 'Locked at confirmation'; });
    ind.querySelectorAll('[data-m8="prhent"],[data-m8="prkursnul"],[data-m8="prsalgnul"],[data-m8="prhaandalle"],[data-m8="prhaandnul"]').forEach(x => { x.style.display = 'none'; });
    const mu = ind.querySelector('#kursBoks .mira-u'); if(mu) mu.textContent = 'locked at the confirmation' + (lr.dato ? ' (' + A.kdA(lr.dato) + ')' : '') + ' · cannot be edited';
    const valutaer = [...new Set(eksponering().map(x => x.val).concat([kv()]).filter(v => v && v !== 'DKK'))];
    const iDagK = S.data && S.data.idag;
    const del = valutaer.map(v => { const l = kursLaast(v), i = iDagK ? kursIDag(v) : null;
      const pil = i == null || l == null ? '' : Math.abs(i - l) < 1e-6 ? '' : i > l ? ' <span class="op">· today ' + nf4(i) + ' ↑</span>' : ' <span class="ned">· today ' + nf4(i) + ' ↓</span>';
      return '<span>' + esc(v) + (v === kv() ? ' (customer)' : '') + ' ' + nf4(l) + pil + '</span>'; }).join('');
    const a = S.data ? kursAlarm() : null;
    k.innerHTML = '<div class="pclaas"><span class="lk">Rates locked' + (lr.dato ? ' ' + esc(A.kd(lr.dato)) : '') + '</span>' + (del || '<span>everything is in DKK</span>') + '</div>'
      + (a && !a.mangler && (Math.abs(a.dCost) >= 1 || Math.abs(a.dSalg) >= 1)
        ? '<p class="note">Since the confirmation the unpaid purchases cost <b>' + (a.dCost >= 0 ? nfx(a.dCost) + ' DKK more' : nfx(-a.dCost) + ' DKK less') + '</b>'
          + (kv() !== 'DKK' ? ', and the customer price is worth <b>' + (a.dSalg >= 0 ? nfx(a.dSalg) + ' DKK more' : nfx(-a.dSalg) + ' DKK less') + '</b>' : '')
          + '. The profit moves <b>' + (a.tab > 0 ? '−' : '+') + nfx(Math.abs(a.tab)) + ' DKK</b>. '
          + (a.alarm ? '<span style="color:#e8c98a">Rate alarm: ' + esc(a.grunde.join(', ')) + '.</span>' : 'No rate alarm — it goes off when more than 2.000 DKK and a third of the profit is gone, the margin falls below 10 %, or a supplier payment is due within 30 days and 15 % is gone.') + '</p>'
        : '')
      + '<p class="note">The calculation below uses the rates from the confirmation — they are never recalculated. Paid and issued services are not exposed to the rate.</p>';
  } else {
    const kan = !!(window.PERMS && window.PERMS.economy);
    k.innerHTML = '<p class="note" style="color:#e8c98a"><b>The rates were not locked when this trip was confirmed.</b> The calculation uses today\'s rates, and there is no rate alarm.'
      + (kan ? ' <a data-m8="pclaas" style="cursor:pointer;border-bottom:1px dotted currentColor">Lock the rates from the confirmation date (' + esc(A.kdA(bekraeftetDato())) + ')</a>' : '') + '</p>';
  }
  let b = R.getElementById('pc-betal');
  if(!b){ b = document.createElement('div'); b.id = 'pc-betal'; b.className = 'pcblok'; ind.appendChild(b); }
  tegnBetal(b);
}
function tegnBetal(b){
  b = b || (A.ROD() && A.ROD().getElementById('pc-betal')); if(!b) return;
  if(!S.data){ b.innerHTML = '<p class="note">Fetching the payments …</p>'; return; }
  const t = A.T(), v = kv(), P = planStatus(), pris = Number(t.accepted_price) || Number(t.package_sell_total) || 0, sum = P.reduce((a, x) => a + (Number(x.b) || 0), 0);
  const chip = x => !(x.b > 0) ? '<span style="color:var(--lys3)">—</span>' : x.st === 'paid' ? '<span class="pcchip ok">paid</span>' : x.st === 'part' ? '<span class="pcchip obs">' + nfx(x.betalt) + ' paid</span>'
    : x.st === 'overdue' ? '<span class="pcchip rod">overdue</span>' : '<span class="pcchip">open</span>';
  const rows = P.map((x, i) => '<tr><td style="text-align:left"><input class="pcin" data-m8c="pcplan" data-i="' + i + '" data-f="l" value="' + esc(x.l) + '"></td>'
    + '<td style="width:130px"><input class="pcin tal" data-m8c="pcplan" data-i="' + i + '" data-f="b" value="' + esc(nfx(x.b)) + '" inputmode="decimal"'
      + (i === P.length - 1 ? ' readonly tabindex="-1" title="The balance is always the rest of the price" style="opacity:.8;cursor:default"' : ' title="Amount — or write a percentage, e.g. 20 %"') + '></td>'
    + '<td style="width:64px;color:var(--lys3);white-space:nowrap">' + (pris ? Math.round(x.b / pris * 100) + ' %' : '') + '</td>'
    + '<td style="width:150px"><input class="pcin" type="date" data-m8c="pcplan" data-i="' + i + '" data-f="d" value="' + esc(x.d || '') + '"></td>'
    + '<td>' + chip(x) + '</td><td style="width:26px">' + (i > 0 && i < P.length - 1 ? '<button class="pcx" title="Remove the payment — the amount goes back to the one before" data-m8="pcplanfjern" data-i="' + i + '">×</button>' : '') + '</td></tr>').join('');
  const M = modtagne();
  const ret = S.planRet || planErStandard();
  b.innerHTML = '<div class="sh">Customer payments' + (planErStandard() ? ' <span class="tael">standard plan</span>' : '') + '</div>'
    + '<table class="tab tabmini"><thead><tr><th style="text-align:left">Payment</th><th>Amount (' + esc(v) + ')</th><th></th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>'
    + '<div class="pcsum"><span>Plan ' + nfx(sum) + ' ' + esc(v) + ' · customer price ' + nfx(pris) + ' ' + esc(v) + '</span>'
      + (Math.abs(sum - pris) > 0.5 ? '<span class="pcchip rod">' + (sum > pris ? nfx(sum - pris) + ' too much' : nfx(pris - sum) + ' missing') + '</span>' : '<span class="pcchip ok">matches the price</span>')
      + '<button class="b mini" data-m8="pcplanny">＋ Split / add a payment</button><button class="b mini" data-m8="pcplannul">50 / 50</button><button class="b mini" data-m8="pcplan100" title="Everything as one payment">100 %</button>'
      + (ret ? '<button class="b mini pcgem" data-m8="pcplangem">Save the payment plan</button>' : '') + '</div>'
    + (S.planFejl ? '<p class="pcfejl">' + esc(S.planFejl) + '</p>' : '')
    + '<div class="sh" style="margin-top:16px">Received <span class="tael">' + (M.length ? nfx(modtagetSum()) + ' ' + esc(v) + ' in ' + A.flertal(M.length, 'payment', 'payments') : 'no payments registered yet') + '</span></div>'
    + (M.length ? '<table class="tab tabmini"><tbody>' + M.map(x => '<tr><td style="text-align:left">' + esc(A.kdA(x.p.payment_date || x.p.settled_at || lok(x.p.created_at))) + '</td><td class="nw">'
        + (x.b != null ? nfx(x.b) + ' ' + esc(v) : nfx(x.p.amount) + ' ' + esc(String(x.p.currency || '').trim())) + '</td><td style="text-align:left">' + esc(x.p.payer_name || '—') + '</td>'
        + '<td style="text-align:left;color:var(--lys3)">' + esc([x.p.method, x.p.reconciled_at ? 'reconciled' : (x.p.status === 'betalt' ? 'received' : x.p.status)].filter(Boolean).join(' · ')) + '</td></tr>').join('') + '</tbody></table>' : '');
}

/* ── History: arkivet (R753) ── */
function efterHist(){
  const R = A.ROD(), ind = R && R.getElementById('i-hist'); if(!ind || !S.data) return;
  const RS = A.RSx(), L = [];
  elementer().forEach(e => { const s = RS.st && RS.st[e.id]; if(!s) return;
    s.linjer.forEach((l, i) => { if(arkiveret(e.id, l)) L.push({e, l, i}); }); });
  let b = R.getElementById('pc-arkiv');
  if(!L.length){ if(b) b.remove(); return; }
  if(!b){ b = document.createElement('div'); b.id = 'pc-arkiv'; b.className = 'pcblok'; ind.insertBefore(b, ind.firstChild); }
  /* Wendie 20.10.2026: «der, hvor der står archive, skal man kunne folde ind og ud» — foldet ind som standard */
  const aab = !!S.arkivHist;
  b.innerHTML = '<button type="button" class="sh" data-m8="pcarkivhist" aria-expanded="' + aab + '" style="all:unset;display:flex;gap:10px;align-items:baseline;cursor:pointer;width:100%;font:500 15px/1.3 \'Lora\',Georgia,serif;font-variant-numeric:normal;color:#fff;padding:4px 0">'
    + '<span style="display:inline-block;transition:transform .2s;transform:rotate(' + (aab ? 90 : 0) + 'deg);color:var(--lys3)">›</span>Archive <span class="tael" style="font:400 12px/1.3 Inter,system-ui,sans-serif;color:var(--lys3)">' + A.flertal(L.length, 'price line', 'price lines') + ' not selected at confirmation</span></button>'
    + (!aab ? '' : '<table class="tab tabmini"><tbody>' + L.map(x => '<tr><td style="text-align:left">' + esc(A.ydNavnK(x.e)) + '<span class="u">' + esc(A.plNavn(x.e, x.l, x.i).replace(/<[^>]+>/g, '')) + '</span></td>'
      + '<td style="text-align:left">' + esc(A.levVis(x.l)) + '</td><td class="nw">' + (x.l.pris != null && x.l.pris !== '' ? nfx(x.l.pris) + ' ' + esc(x.l.val || '') : '—') + '</td>'
      + '<td style="text-align:left;color:var(--lys3)">' + esc(x.l.kilde ? (A.plKildeEn ? A.plKildeEn(x.l.kilde) : x.l.kilde) : '') + '</td></tr>').join('') + '</tbody></table>');
}

/* ── 07 Supplier payments & invoices (R757, R345) ── */
function levRaekker(){
  const RS = A.RSx(), ud = [], opg = (S.data && S.data.opg) || [];
  elementer().forEach(e => { const s = RS.st && RS.st[e.id]; if(!s) return;
    const raa = (A.D().els || []).find(x => x.id === e.id) || {}, fly = A.ydArt(e) === 'fly';
    A.valgte(e.id).forEach(i => { const l = s.linjer[i]; if(!l) return;
      const h = l.hold || {}, udst = h.udstedt === true || h.udstedt === 'true';
      const bf = opg.filter(o => o.price_id === l._id && /betal/i.test(String(o.frist_art || '')) && o.status !== 'annulleret').map(o => o.due_date).filter(Boolean).sort()[0];
      const forfald = raa.vendor_due_date || bf || null;
      const status = fly ? (udst ? ['ok', 'issued = paid' + (h.udstedt_dato ? ' ' + A.kd(h.udstedt_dato) : '')] : ['', 'not issued'])
        : (raa.vendor_paid ? ['ok', 'paid' + (raa.vendor_paid_source ? ' · ' + raa.vendor_paid_source : '')] : (h.udstedt === true || h.udstedt === 'true' ? ['', 'confirmed by the supplier · not paid'] : ['', 'not paid']));
      ud.push({e, l, i, lev: A.levVis(l), forfald, status, fly, dkk: typeof mlLinjeDkk === 'function' ? mlLinjeDkk(l) : null}); });
  });
  return ud;
}
function markLev(){ if(!S.data) return ['tom', 'fetching …', ''];
  const L = levRaekker(), aabne = L.filter(x => x.status[0] !== 'ok');
  const forfaldet = aabne.filter(x => x.forfald && x.forfald < A.iDag()).length;
  if(!L.length) return ['tom', 'nothing yet', ''];
  return [aabne.length ? (forfaldet ? 'mangler' : 'obs') : 'ok', aabne.length ? A.flertal(aabne.length, 'open', 'open') + (forfaldet ? ' · ' + forfaldet + ' overdue' : '') : 'all paid', L.length + ' price lines · ' + ((S.data.fi || []).length) + ' flight invoices']; }
function tegnLev(){
  const R = A.ROD(), ind = R && R.getElementById('i-lev'); if(!ind) return;
  if(!S.data){ ind.innerHTML = '<p class="note" style="margin:13px 0 4px">Fetching …</p>'; return; }
  const L = levRaekker(), FI = S.data.fi || [], VP = S.data.vpl || [];
  const flyDkk = L.filter(x => x.fly).reduce((a, x) => a + (x.dkk || 0), 0);
  const fiSum = FI.reduce((a, f) => a + (f.doc_type === 'kreditnota' ? -1 : 1) * (Number(f.total_dkk) || 0), 0);
  ind.innerHTML = '<div class="pcblok"><div class="sh">To pay</div>'
    + (L.length ? '<table class="tab tabmini"><thead><tr><th style="text-align:left">Supplier</th><th style="text-align:left">Ref. / PNR</th><th style="text-align:left">What</th><th>Due</th><th>Amount</th><th style="text-align:left">Status</th></tr></thead><tbody>'
      + L.map(x => '<tr data-m8="pcgaatil" data-yd="' + esc(x.e.id) + '" data-i="' + x.i + '" title="Open the price line under Services on the trip" style="cursor:pointer"><td style="text-align:left">' + esc(x.lev) + '</td>'
        + '<td style="text-align:left;font-family:ui-monospace,Menlo,monospace;letter-spacing:.04em;white-space:nowrap">' + (A.linjeRef && A.linjeRef(x.e, x.l) ? esc(A.linjeRef(x.e, x.l)) : '<span style="color:var(--lys3)">—</span>') + '</td><td style="text-align:left">' + esc(A.ydNavnK(x.e)) + '</td><td class="nw">' + (x.forfald ? esc(A.kdA(x.forfald)) : '—') + '</td>'
        + '<td class="nw">' + (x.l.pris != null && x.l.pris !== '' ? nfx(x.l.pris) + ' ' + esc(x.l.val || '') : '—') + '</td><td style="text-align:left"><span class="pcchip ' + x.status[0] + '">' + esc(x.status[1]) + '</span></td></tr>').join('')
      + '</tbody></table>' : '<p class="note">No price lines are selected.</p>') + '</div>'
    + '<div class="pcblok"><div class="sh">Flight invoices</div>'
    + (FI.length ? '<table class="tab tabmini"><tbody>' + FI.map(f => '<tr><td style="text-align:left">' + esc((f.doc_type === 'kreditnota' ? 'Credit note ' : 'Invoice ') + (f.invoice_no || '')) + '<span class="u">' + esc([f.supplier, f.airline, f.pnr].filter(Boolean).join(' · ')) + '</span></td>'
        + '<td class="nw">' + (f.invoice_date ? esc(A.kdA(f.invoice_date)) : '—') + '</td><td class="nw">' + nfx(f.total_dkk) + ' DKK</td></tr>').join('') + '</tbody></table>'
        + (flyDkk ? '<p class="note">Estimate on the price line ' + nfx(flyDkk) + ' DKK · invoiced ' + nfx(fiSum) + ' DKK · <b>' + (fiSum - flyDkk >= 0 ? nfx(fiSum - flyDkk) + ' DKK more' : nfx(flyDkk - fiSum) + ' DKK less') + '</b> than estimated.</p>' : '')
      : '<p class="note">No flight invoice yet.</p>') + '</div>'
    + (VP.length ? '<div class="pcblok"><div class="sh">Supplier payments registered <span class="tael">from Dolphin\'s vendor payments</span></div><table class="tab tabmini"><tbody>'
        + VP.map(x => '<tr><td style="text-align:left">' + esc(x.product || '—') + '</td><td class="nw">' + (x.vendor_amount != null ? nfx(x.vendor_amount) + ' ' + esc(String(x.currency || '').trim()) : '') + '</td><td class="nw">' + nfx(x.paid_dkk) + ' DKK</td></tr>').join('') + '</tbody></table></div>' : '');
}

/* ── 08 Documents (R756) ── */
function markDok(){ if(!S.data) return ['tom', 'fetching …', ''];
  const D = S.data.dok || [], ikke = D.filter(x => DOK_KUNDE.includes(x.doc_type) && !x.sendt_til_kunde).length;
  return D.length ? [ikke ? 'obs' : 'ok', A.flertal(D.length, 'document', 'documents'), ikke ? ikke + ' not sent' : ''] : ['tom', 'no documents', '']; }
function tegnDok(){
  const R = A.ROD(), ind = R && R.getElementById('i-dok'); if(!ind) return;
  if(!S.data){ ind.innerHTML = '<p class="note" style="margin:13px 0 4px">Fetching …</p>'; return; }
  const D = S.data.dok || [];
  const opt = Object.entries(DOK_TYPER).map(([k, v]) => '<option value="' + k + '"' + (k === 'bilag' ? ' selected' : '') + '>' + esc(v) + '</option>').join('');
  ind.innerHTML = '<div class="pcblok">' + (D.length ? '<table class="tab tabmini"><thead><tr><th style="text-align:left">Document</th><th style="text-align:left">Type</th><th>Date</th><th style="text-align:left">Customer</th><th></th></tr></thead><tbody>'
      + D.map(x => '<tr><td style="text-align:left">' + esc(x.titel || x.file_name || '—') + (x.version > 1 ? ' <span class="u">version ' + x.version + '</span>' : '') + '</td>'
        + '<td style="text-align:left">' + esc(DOK_TYPER[x.doc_type] || x.doc_type) + '</td><td class="nw">' + (x.doc_date ? esc(A.kdA(x.doc_date)) : (x.created_at ? esc(A.kdA(lok(x.created_at))) : '—')) + '</td>'
        + '<td style="text-align:left">' + (x.sendt_til_kunde ? '<span class="pcchip ok">sent ' + esc(A.kd(lok(x.sent_at))) + '</span>' : (DOK_KUNDE.includes(x.doc_type) ? '<span class="pcchip">not sent</span>' : '')) + '</td>'
        + '<td class="nw"><button class="b mini" data-m8="pcdokhent" data-sti="' + esc(x.storage_path || '') + '" data-navn="' + esc(x.file_name || 'file') + '">Open</button>'
        + (DOK_KUNDE.includes(x.doc_type) && !x.sendt_til_kunde ? ' <button class="b mini" data-m8="pcdoksendt" data-id="' + esc(x.id) + '">Mark as sent</button>' : '') + '</td></tr>').join('') + '</tbody></table>'
    : '<p class="note">No documents on the trip yet. Supplier confirmations, invoices and e-tickets go here, so they can always be found in the same place.</p>')
    + '<div class="pcdokup"><input type="file" id="pcDokFil"><select id="pcDokType">' + opt + '</select><input type="text" id="pcDokTitel" placeholder="Title, e.g. Invoice 1814185 — Billetkontoret" style="min-width:240px">'
      + '<button class="b mini fyldt" data-m8="pcdokup">' + (S.dokUp ? 'Uploading …' : 'Upload') + '</button></div>'
    + '<p class="note">Panda never sends anything itself — mark a document as sent when it has gone to the customer. Replacing a document keeps the old version. Travel documents and payment documents made by Claude are kept in the Databank.</p></div>';
}

/* ── «Cancel the trip» nederst (R752/R753) ── */
function tegnCancel(){
  const R = A.ROD(), b = R && R.getElementById('pcCancel'); if(!b) return;
  const t = A.T(), kan = ['WEN', 'RAS'].includes(String(window.ME || ''));
  if(['canx', 'tabt', 'voided'].includes(t.status)){ b.innerHTML = ''; return; }
  if(b.dataset.ref === String(t.ref_no) && b.dataset.kan === String(kan) && b.firstChild) return;
  b.dataset.ref = String(t.ref_no); b.dataset.kan = String(kan);
  b.innerHTML = '<span><b style="color:#ff8a9e">Cancel the trip</b> — money, services and the cancellation document are handled in the cancellation dialog.</span>'
    + (kan ? '<input id="pcCxRef" placeholder="type ' + esc(t.ref_no || 'the ref. no.') + '" autocomplete="off"><button class="b" data-m8="pccancel" id="pcCxKnap" disabled>Cancel the trip…</button>'
      : '<span>Only WEN and RAS can cancel a trip.</span>');
  const i = R.getElementById('pcCxRef'), k = R.getElementById('pcCxKnap');
  if(i && k) i.addEventListener('input', () => { k.disabled = i.value.trim().toUpperCase() !== String(t.ref_no || '').toUpperCase(); });
}

/* ══════════════════════════════════ HANDLINGER ══════════════════════════════════ */
const HANDL = {}, HANDLC = {};
HANDL.pcstadie = el => {
  const i = +el.dataset.i, idx = RAIL[i] && RAIL[i][1];
  if(idx == null || idx < 1) return A.kvitter('advar', 'The trip is confirmed — it cannot go back to ' + (RAIL[i] ? RAIL[i][0] : 'that stage') + '. Use «Cancel the trip» at the bottom, or send it back on the classic page.');
  const kode = (idx === 1 || idx === autoStadie()) ? 'bekraeftet' : KODE[idx];
  if(String(A.T().stadie || 'bekraeftet') === kode) return;
  return A.iKoe(async () => {
    const RS = A.RSx(); if(!RS.saetTrin) return A.kvitter('fejl', 'The stage could not be set — reload the page');
    const foer = A.ydFoer(); RS.saetTrin(KODE.indexOf(kode));
    const fe = await A.ydGem(foer);
    if(fe) return A.kvitter('fejl', 'The stage could not be saved: ' + fe);
    A.T().stadie = kode;
    A.kvitter('gemt', kode === 'bekraeftet' ? 'Panda sets the stage again from the payments and the dates' : 'The stage is set by hand: ' + RAIL[i][0]);
    A.tegn();
  });
};
/* før man går fra siden, gemmes det, der er i gang — ellers kunne en gemning ramme en side, der er væk */
const faerdig = async () => { try { await A.ydGem(A.ydFoer()); } catch(_){} };
HANDL.pcsalg = () => faerdig().then(() => { if(typeof viewSales === 'function') return viewSales(); history.back(); });
HANDL.pcklassisk = () => { const id = A.T().id; return faerdig().then(() => { if(typeof viewTrip === 'function') return viewTrip(id, {klassisk: true}); }); };
HANDL.pcgaatil = el => { if(A.aabnLinje) A.aabnLinje(el.dataset.yd, +el.dataset.i); };   /* Wendie 20.10.2026: kort 07 → prislinjen i kort 04 */
HANDL.pcarkivhist = () => { S.arkivHist = !S.arkivHist; efterHist(); };
HANDL.pcarkiv = el => { const id = el.dataset.yd; S.arkivVis[id] = !S.arkivVis[id]; A.KROP.yd(true); };
const planLaes = () => { const R = A.ROD(), P = plan().map(x => Object.assign({}, x));
  (R ? [...R.querySelectorAll('#pc-betal [data-m8c="pcplan"]')] : []).forEach(x => { const i = +x.dataset.i, f = x.dataset.f; if(!P[i]) return;
    if(f === 'b'){ const v = String(x.value), pct = /%\s*$/.test(v), n = Number(v.replace(/%/g, '').replace(/\s|\./g, '').replace(',', '.'));
      if(isFinite(n)) P[i].b = r2(pct ? kundePris() * n / 100 : n); }
    else if(f === 'd') P[i].d = x.value || null; else P[i].l = x.value; });
  return P; };
/* Wendie 20.10.2026: ændres et beløb, tager den næste delbetaling forskellen, så restbetalingen står; ændres den
   sidste delbetaling før restbetalingen, går forskellen til restbetalingen (som altid er resten). */
HANDLC.pcplan = el => { const gl = plan(), P = planLaes(), i = el ? +el.dataset.i : -1, f = el && el.dataset.f;
  if(f === 'b' && i >= 0 && i < P.length - 1){
    if(P[i].b < 0) P[i].b = 0;
    const diff = P[i].b - (Number(gl[i] && gl[i].b) || 0);
    if(i + 1 < P.length - 1){ P[i + 1].b = r2(P[i + 1].b - diff); if(P[i + 1].b < 0) P[i + 1].b = 0; }
  }
  S.plan = planNorm(P); S.planRet = true; S.planFejl = '';
  const bal = S.plan[S.plan.length - 1]; if(bal && bal.b < 0) S.planFejl = 'The payments are more than the customer price — the balance cannot be negative.';
  tegnBetal(); };
/* en ny delbetaling lægges før restbetalingen og tager halvdelen af betalingen før (i udgangspunktet depositummet):
   50/50 → 25 · 25 · 50. Datoen ligger midt imellem. */
HANDL.pcplanny = () => { const P = planNorm(planLaes()); if(P.length < 2) return;
  const k = P.length - 2, før = P[k], bal = P[P.length - 1], halv = r2(Math.floor((Number(før.b) || 0) / 2));
  før.b = r2(før.b - halv);
  let d = null; if(før.d && bal.d){ const a = new Date(før.d + 'T12:00:00'), b = new Date(bal.d + 'T12:00:00'); d = new Date((a.getTime() + b.getTime()) / 2).toISOString().slice(0, 10); }
  P.splice(P.length - 1, 0, {l: 'Payment ' + P.length, b: halv, d: d || før.d || bal.d});
  S.plan = planNorm(P); S.planRet = true; S.planFejl = ''; tegnBetal(); };
/* kun delbetalinger kan fjernes — beløbet går tilbage til betalingen før */
HANDL.pcplanfjern = el => { const P = planLaes(), i = +el.dataset.i; if(!(i > 0 && i < P.length - 1)) return;
  P[i - 1].b = r2((Number(P[i - 1].b) || 0) + (Number(P[i].b) || 0)); P.splice(i, 1); S.plan = planNorm(P); S.planRet = true; tegnBetal(); };
/* Wendie 20.10.2026: «en mulighed for at sætte balance til hundrede procent» — hele prisen som én betaling.
   Datoen er den sidste betalings dato i planen (typisk restbetalingens), ellers i dag. */
HANDL.pcplan100 = () => { const t = A.T(), pris = Number(t.accepted_price) || Number(t.package_sell_total) || 0, P = planLaes();
  const d = (P.length && P[P.length - 1].d) || A.iDag();
  S.plan = planNorm([{l: 'Deposit', b: 0, d: (P[0] && P[0].d) || A.iDag()}, {l: 'Balance', b: pris, d}]); S.planRet = true; S.planFejl = ''; tegnBetal(); };
HANDL.pcplannul = () => { S.plan = standardPlan(); S.planRet = true; S.planFejl = ''; tegnBetal(); };
HANDL.pcplangem = () => { const P0 = planNorm(planLaes()), t = A.T(), id = t.id, pris = Number(t.accepted_price) || Number(t.package_sell_total) || 0;
  /* betalinger på 0 gemmes ikke (fx depositum 0 ved 100 %) — de står der igen på skærmen, så de kan bruges */
  const P = P0.filter((x, k) => x.b > 0 || k === P0.length - 1), sum = P.reduce((a, x) => a + x.b, 0);
  if(P0.some(x => x.b < 0)){ S.planFejl = 'The payments are more than the customer price — the balance cannot be negative.'; return tegnBetal(); }
  if(!P.length) { S.planFejl = 'The plan needs at least one payment.'; return tegnBetal(); }
  if(Math.abs(sum - pris) > 0.5){ S.planFejl = 'The plan is ' + nfx(sum) + ' ' + kv() + ', but the customer price is ' + nfx(pris) + ' ' + kv() + ' — make them match before saving.'; return tegnBetal(); }
  if(P.some(x => !x.d)){ S.planFejl = 'Every payment needs a due date.'; return tegnBetal(); }
  return A.iKoe(async () => {
    const upd = {payment_plan: P, deposit_due: P.length > 1 ? P[0].d : null, balance_due: P[P.length - 1].d};
    if(kv() === 'DKK') upd.deposit_amount = P.length > 1 ? P[0].b : null;
    const r = await db_().from('trips').update(upd).eq('id', id);
    if(r && r.error){ S.planFejl = 'The plan could not be saved: ' + r.error.message; return tegnBetal(); }
    Object.assign(t, upd); S.plan = null; S.planRet = false; S.planFejl = '';
    A.kvitter('gemt', 'The payment plan is saved — ' + A.flertal(P.length, 'payment', 'payments'));
    A.tegn();
  }); };
HANDL.pcdokhent = el => { if(typeof docHent === 'function') return docHent(el.dataset.sti, el.dataset.navn); };
async function genhentDok(){ const r = await db_().from('v_rejsedokumenter').select('*').eq('trip_id', A.T().id).order('created_at', {ascending: false});
  if(S.data && r && !r.error) S.data.dok = r.data || []; }
HANDL.pcdoksendt = el => A.iKoe(async () => {
  const t = A.T(), til = (t.customers && t.customers.email) || 'the customer';
  const r = await db_().from('documents').update({sent_to: til, sent_at: new Date().toISOString()}).eq('id', el.dataset.id);
  if(r && r.error) return A.kvitter('fejl', 'Could not be marked as sent: ' + r.error.message);
  await genhentDok(); A.kvitter('gemt', 'Marked as sent'); A.tegn(); });
HANDL.pcdokup = () => { const R = A.ROD(), f = R.getElementById('pcDokFil'), fil = f && f.files && f.files[0];
  if(!fil) return A.kvitter('advar', 'Choose a file first');
  if(fil.size > 25 * 1024 * 1024) return A.kvitter('advar', 'The file is larger than 25 MB');
  const type = (R.getElementById('pcDokType') || {}).value || 'andet', titel = ((R.getElementById('pcDokTitel') || {}).value || '').trim(), t = A.T();
  S.dokUp = true; tegnDok();
  return A.iKoe(async () => { try {
    const sti = t.id + '/' + Date.now() + '_' + fil.name.replace(/[^\w.\-]+/g, '_');
    const u = await db_().storage.from('rejsedokumenter').upload(sti, fil, {contentType: fil.type || 'application/octet-stream', upsert: false});
    if(u && u.error) return A.kvitter('fejl', 'The upload failed: ' + u.error.message);
    const g = await db_().from('documents').select('id,version').eq('trip_id', t.id).eq('doc_type', type).is('superseded_by', null).is('element_id', null).order('version', {ascending: false}).limit(1);
    const forrige = ((g && g.data) || [])[0] || null;
    const ny = await db_().from('documents').insert({trip_id: t.id, element_id: null, doc_type: type, version: (forrige ? forrige.version : 0) + 1, storage_path: sti, file_name: fil.name,
      mime_type: fil.type || null, size_bytes: fil.size, title: titel || null, source: 'manuel_upload', is_testdata: String(t.ref_no || '').startsWith('TEST-')}).select('id').single();
    if(ny && ny.error) return A.kvitter('fejl', 'The file was uploaded but could not be registered: ' + ny.error.message);
    if(forrige) await db_().from('documents').update({superseded_by: ny.data.id}).eq('id', forrige.id);
    await genhentDok(); A.kvitter('gemt', 'Uploaded' + (forrige ? ' — version ' + (forrige.version + 1) + ', the old one is kept' : ''));
  } finally { S.dokUp = false; A.tegn(); } }); };
HANDL.pclaas = () => { if(!(window.PERMS && window.PERMS.economy)) return A.kvitter('advar', 'Locking the rates requires access to economy');
  const t = A.T(), id = t.id, d0 = bekraeftetDato();
  if(S.laaser) return; S.laaser = true;
  return A.iKoe(async () => { try {
    const fr = await db_().from('fx_rates').select('rate_date').lte('rate_date', d0).order('rate_date', {ascending: false}).limit(1);
    const dato = fr && fr.data && fr.data[0] && fr.data[0].rate_date;
    if(!dato) return A.kvitter('fejl', 'There are no rates from ' + A.kdA(d0) + ' or before — nothing was locked');
    const k = await db_().rpc('fn_effektive_kurser', {p_dato: dato});
    if(k && k.error) return A.kvitter('fejl', 'The rates could not be fetched: ' + k.error.message);
    if(!k || !k.data || !Object.keys(k.data).some(x => /^[A-Z]{3}$/.test(x))) return A.kvitter('fejl', 'The rate source gave no currencies — nothing was locked');
    const r = await db_().from('trips').update({pricing_rates: k.data, pricing_rates_at: new Date().toISOString()}).eq('id', id).is('pricing_rates', null);
    if(r && r.error) return A.kvitter('fejl', 'The rates could not be locked: ' + r.error.message);
    A.kvitter('gemt', 'The rates from ' + A.kdA(dato) + ' are locked on the trip');
    await faerdig(); if(typeof viewTrip === 'function') viewTrip(id);
  } finally { S.laaser = false; } }); };
HANDL.pccancel = () => { const t = A.T(), R = A.ROD(), i = R && R.getElementById('pcCxRef');
  if(!['WEN', 'RAS'].includes(String(window.ME || ''))) return A.kvitter('advar', 'Only WEN and RAS can cancel a trip');
  if(!i || i.value.trim().toUpperCase() !== String(t.ref_no || '').toUpperCase()) return A.kvitter('advar', 'Type the reference number first');
  const id = t.id;
  return (async () => { if(typeof viewTrip !== 'function') return; await faerdig(); await viewTrip(id, {klassisk: true});
    if(typeof openCancel === 'function') openCancel(id); })(); };
})();
