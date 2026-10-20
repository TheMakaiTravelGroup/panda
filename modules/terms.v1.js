/* ═══ Panda · modul: vilkår pr. prislinje og ny pris efter bekræftelse — modules/terms.v1.js ═══
   Wendie 20.10.2026:
     R873 · «de individuelle terms for hver ydelse skal ligge under hver ydelse» — et punkt mere under
            Add-ons på prislinjen. Hotel: trinvise afbestillingsgebyrer (fx 25 % → 75 % fra 1/11 → 100 %
            fra 6/12). Fly: ændrings- og afbestillingsgebyr, og om billetten kan refunderes.
            Det næste gebyrtrin står som en frist i kort 01.
     R874 · kort 01 viser det samlede overblik: «hvis kunden afbestiller i dag, hvad er det så, vi får
            tilbage … det samler jo alle ydelserne under den».
     R880 · «New price after confirmation»: den bekræftede pris bliver stående (tabellen price_changes),
            ydelsen viser besparelsen. Om kunden får noget af den, varierer (Wendie) — der spørges hver
            gang, og får kunden noget, bliver det en opgave til sælgeren.

   EGEN FIL. index.html kalder kun herind gennem korte kroge (PandaTerms.*). Mangler filen, er alt
   som før. Vilkårene gemmes i element_prices.vilkaar gennem prislinjens egen gemning (snapshot),
   prisændringerne i price_changes (migration vilkaar_pr_prislinje_og_price_changes, godkendt af
   Wendie 20.10.2026).

   vilkaar = { type: 'fri' | 'trin' | 'gebyr' | 'nonref',
               cxl: [{fra:'YYYY-MM-DD', kind:'pct'|'amt', val}],   — gebyret fra og med datoen (type 'trin')
               gebyr,            — fast afbestillingsgebyr i prislinjens valuta (type 'gebyr')
               aendr,            — ændringsgebyr i prislinjens valuta (fly)
               note, hvem }      — andre regler · ansvarlig for fristen */
(function(){
'use strict';
const VERSION = 'terms v1';
let A = null;
const api = () => A || (A = (window.MLNY && MLNY._api) ? MLNY._api() : null);
const db_ = () => (typeof db !== 'undefined' ? db : null);
const S = {trip: null, pc: [], henter: null, np: null};

/* ── små hjælpere ── */
const esc = s => api().esc(s);
const iso = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) ? String(d) : '';
const idag = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const tal = v => { if(v == null || v === '') return null; const R = api().RSx(); const n = R && R.talInd ? R.talInd(String(v)) : Number(String(v).replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : null; };
const nfD = n => api().nfD(n);
const nf = n => api().nf(n);
const kd = d => api().kd(d);
const strip = h => String(h || '').replace(/<[^>]*>/g, '');
const erFly = e => api().ydArt(e) === 'fly';
const lev = l => api().harLev(l) ? api().plKildeEn(l.lev).replace(/\s*\(.*\)/, '') : '';
const pct = v => (Math.round(v * 10) / 10).toLocaleString('da-DK') + ' %';

const TYPER_H = [['', '— not entered —'], ['fri', 'Free cancellation'], ['trin', 'Fee in steps'], ['gebyr', 'Fixed fee'], ['nonref', 'Non-refundable']];
const TYPER_F = [['', '— not entered —'], ['fri', 'Refundable'], ['gebyr', 'Refundable with a fee'], ['nonref', 'Non-refundable']];

function trin(l){
  const v = l.vilkaar || {};
  return (v.cxl || []).filter(x => x && iso(x.fra) && isFinite(+x.val)).slice().sort((a, b) => a.fra.localeCompare(b.fra));
}
/* afbestillingsgebyret på en dag — i prislinjens valuta; null = ukendt (ingen vilkår) */
function gebyr(l, dag){
  const v = l.vilkaar, p = Number(l.pris) || 0;
  if(!v || !v.type) return null;
  if(v.type === 'fri') return 0;
  if(v.type === 'nonref') return p;
  if(v.type === 'gebyr') return Math.min(Number(v.gebyr) || 0, p);
  if(v.type === 'trin'){
    const T = trin(l).filter(x => x.fra <= dag); if(!T.length) return 0;
    const x = T[T.length - 1];
    return x.kind === 'amt' ? Math.min(+x.val, p) : p * Math.min(+x.val, 100) / 100;
  }
  return null;
}
const iDkk = (l, x) => { const p = Number(l.pris) || 0, d = api().lPris(l); return x == null ? null : p > 0 && d != null ? x / p * d : 0; };
const trinTxt = (l, x) => x.kind === 'amt' ? nfD(x.val) + ' ' + esc(l.val || '') : pct(+x.val);

/* ══ PRISLINJEN: «Terms» under Add-ons (R873) ═══════════════════════════ */
function resume(e, l){
  const v = l.vilkaar || {};
  if(!v.type) return 'not entered';
  const fly = erFly(e), dele = [];
  if(v.type === 'fri') dele.push(fly ? 'refundable' : 'free cancellation');
  if(v.type === 'nonref') dele.push('non-refundable');
  if(v.type === 'gebyr') dele.push((fly ? 'refundable · fee ' : 'fee ') + nfD(v.gebyr || 0) + ' ' + esc(l.val || ''));
  if(v.type === 'trin'){ const T = trin(l), n = gebyr(l, idag());
    dele.push(T.length ? (n ? 'now ' + nfD(n) + ' ' + esc(l.val || '') : 'free now') + T.filter(x => x.fra > idag()).slice(0, 2).map(x => ' · ' + trinTxt(l, x) + ' from ' + kd(x.fra)).join('') : 'no steps yet'); }
  if(fly && v.aendr != null && v.aendr !== '') dele.push('change ' + nfD(v.aendr) + ' ' + esc(l.val || ''));
  return dele.join(' · ');
}
function sektion(e, l, i){
  const a = api(); if(!a) return '';
  const id = e.id, A2 = a.pkA(id, i), v = l.vilkaar || {}, fly = erFly(e), F = a.pkF;
  const sel = (liste, val, attr) => '<select ' + attr + '>' + liste.map(([k, t]) => '<option value="' + k + '"' + (String(val || '') === k ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>';
  let h = '<div class="g gpl">' + F(fly ? 'Refund' : 'Cancellation', sel(fly ? TYPER_F : TYPER_H, v.type, 'data-m8c="vkfelt" data-f="type" ' + A2))
    + (v.type === 'gebyr' ? F('Cancellation fee (' + esc(l.val || '') + ')', '<input value="' + (v.gebyr != null ? esc(nfD(v.gebyr)) : '') + '" placeholder="0" data-m8c="vkfelt" data-f="gebyr" ' + A2 + '>') : '<div class="f"></div>')
    + (fly ? F('Change fee (' + esc(l.val || '') + ')', '<input value="' + (v.aendr != null && v.aendr !== '' ? esc(nfD(v.aendr)) : '') + '" placeholder="—" data-m8c="vkfelt" data-f="aendr" ' + A2 + '>') : '<div class="f"></div>')
    + '<div class="f"></div></div>';
  if(v.type === 'trin'){
    const T = (v.cxl || []);
    h += '<div class="vk-trin">' + (T.length ? '' : '<p class="tomtxt">No steps yet.</p>')
      + T.map((x, j) => '<div class="g gpl">'
        + F(j ? 'From' : 'From (before that: free)', '<input type="date" value="' + esc(x.fra || '') + '" data-m8c="vktrin" data-f="fra" data-j="' + j + '" ' + A2 + '>')
        + F('Fee', '<input value="' + (x.val != null && x.val !== '' ? esc(String(x.val).replace('.', ',')) : '') + '" placeholder="25" data-m8c="vktrin" data-f="val" data-j="' + j + '" ' + A2 + '>')
        + F('In', sel([['pct', '% of the price'], ['amt', esc(l.val || '') + ' (amount)']], x.kind || 'pct', 'data-m8c="vktrin" data-f="kind" data-j="' + j + '" ' + A2))
        + '<button class="x" title="Remove the step" data-m8="vktrinfjern" data-j="' + j + '" ' + A2 + '>×</button></div>').join('')
      + '<button class="b tilf" data-m8="vktrinny" ' + A2 + '>＋ Add a step</button></div>';
  }
  h += '<div class="g gpl1">' + F('Other rules', '<textarea rows="1" placeholder="e.g. no-show = full price · name change free until 14 days before" data-m8c="vkfelt" data-f="note" ' + A2 + '>' + esc(v.note || '') + '</textarea>') + '</div>';
  const n = gebyr(l, idag());
  if(n != null) h += '<p class="note">Cancelled today: we pay <b>' + nfD(n) + ' ' + esc(l.val || '') + '</b> and get back <b>' + nfD(Math.max(0, (Number(l.pris) || 0) - n)) + ' ' + esc(l.val || '') + '</b>.</p>';
  return a.pkKob(id, i, 't', 'Terms', resume(e, l)) + (a.sekAab(id, i, 't') ? h : '');
}
function saetVk(el, fn, tekst){
  const a = api(), id = el.dataset.yd, i = +el.dataset.i;
  return a.pkSaet(() => { const l = a.ydSt(id).linjer[i]; if(!l) return false;
    const v = JSON.parse(JSON.stringify(l.vilkaar || {})); const svar = fn(v, l); if(svar === false) return false;
    l.vilkaar = v; return svar; }, tekst || 'The terms are saved');
}
function kroge(){
  const a = api(); if(!a || a.HANDL.vktrinny) return;
  a.HANDLC.vkfelt = el => { const f = el.dataset.f, raa = el.value;
    if((f === 'gebyr' || f === 'aendr') && String(raa).trim() !== '' && !(tal(raa) >= 0)) return a.kvitter('fejl', 'The amount is not a number — it has not been saved');
    return saetVk(el, v => {
      if(f === 'type'){ v.type = raa || null; if(raa === 'trin' && !(v.cxl || []).length) v.cxl = [{fra: '', kind: 'pct', val: ''}];
        const id = el.dataset.yd, i = +el.dataset.i; a.PK().sek[a.pkNoegle(id, i) + 't'] = true; }
      else if(f === 'gebyr' || f === 'aendr') v[f] = String(raa).trim() === '' ? null : tal(raa);
      else v[f] = String(raa).trim() || null;
    }, f === 'type' ? 'The terms are saved' : 'Saved'); };
  a.HANDLC.vktrin = el => { const f = el.dataset.f, j = +el.dataset.j, raa = el.value;
    if(f === 'val' && String(raa).trim() !== '' && !(tal(raa) >= 0)) return a.kvitter('fejl', 'The fee is not a number — it has not been saved');
    if(f === 'val' && tal(raa) > 100 && ((((a.ydSt(el.dataset.yd).linjer[+el.dataset.i] || {}).vilkaar || {}).cxl || [])[j] || {}).kind !== 'amt')
      return a.kvitter('fejl', 'A fee in % cannot be more than 100 — it has not been saved');
    return saetVk(el, v => { v.cxl = v.cxl || []; const x = v.cxl[j]; if(!x) return false;
      x[f] = f === 'val' ? (String(raa).trim() === '' ? '' : tal(raa)) : raa; }, 'The step is saved'); };
  a.HANDL.vktrinny = el => saetVk(el, v => { const T = v.cxl || [], s = T[T.length - 1];
    v.cxl = T.concat([{fra: '', kind: s ? s.kind : 'pct', val: ''}]); }, 'A step has been added — choose the date');
  a.HANDL.vktrinfjern = el => saetVk(el, v => { v.cxl = (v.cxl || []).filter((_, j) => j !== +el.dataset.j); }, 'The step has been removed');
  /* R880 */
  a.HANDL.npaabn = el => { S.np = {k: a.pkNoegle(el.dataset.yd, el.dataset.i), pris: '', dato: idag(), aarsag: '', note: '', kunde: 'nej', andel: ''}; a.ydTegn();
    setTimeout(() => { const x = a.ROD().querySelector('.np-form input[data-f="pris"]'); if(x) x.focus(); }, 30); };
  a.HANDL.npannuller = () => { S.np = null; a.ydTegn(); };
  a.HANDLC.npfelt = el => { if(!S.np) return; S.np[el.dataset.f] = el.value; if(el.dataset.f === 'kunde') a.ydTegn(); };
  a.HANDL.npgem = el => npGem(el);
}

/* ══ R880 · NY PRIS EFTER BEKRÆFTELSE ════════════════════════════════════ */
const AARSAGER = ['Rate drop', 'Early bird', 'Promotion / offer', 'New contract rate', 'Other'];
function linjensAendr(l){ return S.trip === (api().T() || {}).id ? S.pc.filter(x => x.price_id && x.price_id === l._id) : []; }
function kostKort(l){
  const L = linjensAendr(l); if(!L.length) return '';
  const sp = L.reduce((s, x) => s + (Number(x.old_amount) - Number(x.new_amount) - (Number(x.passed_on) || 0)), 0);
  return sp > 0 ? 'saved ' + nfD(sp) + ' ' + esc(l.val || '') : sp < 0 ? 'raised ' + nfD(-sp) + ' ' + esc(l.val || '') : '';
}
function kost(e, l, i){
  const a = api(); if(!a) return '';
  hent();
  const id = e.id, A2 = a.pkA(id, i), F = a.pkF, k = a.pkNoegle(id, i), valgt = a.valgte(id).includes(i);
  const L = linjensAendr(l);
  let h = '';
  if(L.length) h += '<div class="np-hist"><div class="k" style="margin:10px 0 4px">Price changes after confirmation</div>' + L.map(x => {
      const d = Number(x.old_amount) - Number(x.new_amount);
      return '<div class="linje"><div class="midt"><div class="tekst">' + nfD(x.old_amount) + ' → <b>' + nfD(x.new_amount) + ' ' + esc(x.currency) + '</b>'
        + (d > 0 ? ' <span style="color:#7fe0b0">−' + nfD(d) + '</span>' : d < 0 ? ' <span style="color:var(--fersk)">+' + nfD(-d) + '</span>' : '') + '</div>'
        + '<div class="meta">' + esc(kd(x.changed_on)) + (x.reason ? ' · ' + esc(x.reason) : '') + (Number(x.passed_on) > 0 ? ' · ' + nfD(x.passed_on) + ' ' + esc(x.currency) + ' to the customer' : ' · the customer price is unchanged')
        + (x.note ? ' · ' + esc(x.note) : '') + (x.created_by ? ' · ' + esc(String(x.created_by).split('@')[0].toUpperCase()) : '') + '</div></div></div>'; }).join('') + '</div>';
  if(!valgt || !(Number(l.pris) > 0) || !l._id) return h;
  if(S.np && S.np.k === k){
    const n = S.np, ja = n.kunde === 'ja';
    h += '<div class="anl aaben np-form" style="margin-top:10px"><div class="k" style="margin-bottom:6px">New price after confirmation · now ' + nfD(l.pris) + ' ' + esc(l.val || '') + '</div>'
      + '<div class="g gpl">' + F('New price (' + esc(l.val || '') + ')', '<input value="' + esc(n.pris) + '" placeholder="0" data-m8c="npfelt" data-f="pris">')
      + F('Date', '<input type="date" value="' + esc(n.dato) + '" data-m8c="npfelt" data-f="dato">')
      + F('Why', '<select data-m8c="npfelt" data-f="aarsag"><option value="">—</option>' + AARSAGER.map(x => '<option' + (n.aarsag === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select>')
      + F('The customer', '<select data-m8c="npfelt" data-f="kunde"><option value="nej"' + (ja ? '' : ' selected') + '>We keep the saving</option><option value="ja"' + (ja ? ' selected' : '') + '>Gets part of it</option></select>') + '</div>'
      + '<div class="g gpl">' + (ja ? F('To the customer (' + esc(l.val || '') + ')', '<input value="' + esc(n.andel) + '" placeholder="0" data-m8c="npfelt" data-f="andel">') : '<div class="f"></div>')
      + F('Note', '<input value="' + esc(n.note) + '" placeholder="—" data-m8c="npfelt" data-f="note">') + '<div class="f"></div><div class="f"></div></div>'
      + '<div class="anl-fod"><button class="b fyldt" data-m8="npgem" ' + A2 + '>Save the new price</button><button class="b mini" data-m8="npannuller">Cancel</button></div></div>';
  } else h += '<button class="b tilf" style="margin-top:10px" data-m8="npaabn" ' + A2 + '>＋ New price after confirmation</button>';
  return h;
}
function npGem(el){
  const a = api(), id = el.dataset.yd, i = +el.dataset.i, l = a.ydSt(id).linjer[i], e = a.ydListe().find(x => x.id === id), n = S.np;
  if(!l || !e || !n) return;
  const f = a.ROD().querySelector('.np-form');
  if(f) f.querySelectorAll('[data-m8c="npfelt"]').forEach(x => { n[x.dataset.f] = x.value; });
  const nyt = tal(n.pris), gl = Number(l.pris) || 0, andel = n.kunde === 'ja' ? tal(n.andel) : 0;
  if(!(nyt >= 0) || String(n.pris).trim() === '') return a.kvitter('fejl', 'Write the new price — nothing has been saved');
  if(Math.abs(nyt - gl) < 0.005) return a.kvitter('advar', 'The new price is the same as the old one — nothing has been saved');
  if(n.kunde === 'ja' && !(andel > 0)) return a.kvitter('fejl', 'Write how much the customer gets — nothing has been saved');
  if(andel > Math.max(0, gl - nyt)) return a.kvitter('fejl', 'The customer cannot get more than the saving (' + nfD(Math.max(0, gl - nyt)) + ' ' + (l.val || '') + ') — nothing has been saved');
  if(!iso(n.dato)) return a.kvitter('fejl', 'Choose the date — nothing has been saved');
  const t = a.T(), D = db_(); if(!D) return;
  return a.iKoe(async () => {
    const r = await D.from('price_changes').insert([{trip_id: t.id, element_id: id, price_id: l._id, old_amount: gl, new_amount: nyt, currency: String(l.val || 'DKK').slice(0, 3),
      passed_on: andel || 0, reason: n.aarsag || null, note: String(n.note || '').trim() || null, changed_on: n.dato}]).select('*');
    if(r && r.error) return a.kvitter('fejl', 'The new price could not be saved: ' + r.error.message);
    S.pc = S.pc.concat((r && r.data) || []);
    const R = a.RSx(), foer = a.ydFoer();
    R.saetLinjePris(id, i, nyt.toLocaleString('da-DK', {maximumFractionDigits: 2}));
    const fejl = await a.ydGem(foer);
    if(fejl){ await D.from('price_changes').delete().eq('id', r.data[0].id); S.pc = S.pc.filter(x => x.id !== r.data[0].id);
      a.ydTegn(); return a.kvitter('fejl', 'The price could not be saved — nothing has been changed. ' + fejl); }
    if(andel > 0){
      const due = new Date(); due.setDate(due.getDate() + 2);
      const tr = await D.from('tasks').insert([{trip_id: t.id, task_type: 'egen_frist', title: 'Lower the customer price by ' + nfD(andel) + ' ' + (l.val || '') + ' (new price from ' + (lev(l) || 'the supplier') + ') — and send a new payment document',
        assignee: t.owner || null, due_date: due.toISOString().slice(0, 10), frist_art: 'egen', auto_generated: true, status: 'aaben'}]);
      if(tr && tr.error) a.kvitter('advar', 'The new price is saved, but the task for the customer price could not be made: ' + tr.error.message);
    }
    S.np = null; a.ydTegn(); a.tegn();
    const sp = gl - nyt - (andel || 0);
    a.kvitter('gemt', 'The new price is saved' + (sp > 0 ? ' — saved ' + nfD(sp) + ' ' + (l.val || '') : '') + (andel > 0 ? ' · a task to lower the customer price has been made' : ''));
  });
}
function hent(){
  const a = api(), t = a && a.T(); if(!t || !t.id) return;
  if(S.trip === t.id || S.henter === t.id) return;
  S.henter = t.id; S.pc = []; S.np = null;
  const D = db_(); if(!D){ S.henter = null; return; }
  D.from('price_changes').select('*').eq('trip_id', t.id).order('changed_on').order('created_at').then(r => {
    if(S.henter !== t.id) return;
    S.henter = null; S.trip = t.id; S.pc = (r && !r.error && r.data) || [];
    if(S.pc.length && a.T().id === t.id){ try { a.ydTegn(); } catch(_){} }
  }, () => { S.henter = null; S.trip = t.id; });
}

/* ══ KORT 01 · fristerne og overblikket ═════════════════════════════════ */
function valgteLinjer(){
  const a = api(), ud = [];
  a.ydListe().forEach(e => { const L = a.ydSt(e.id).linjer || []; a.valgte(e.id).forEach(i => { if(L[i]) ud.push({e, l: L[i], i}); }); });
  return ud;
}
/* det næste gebyrtrin på hver valgt prislinje er en frist (R873) */
function frister(L){
  const a = api(), d0 = idag();
  valgteLinjer().forEach(({e, l, i}) => { const v = l.vilkaar || {}; if(v.type !== 'trin') return;
    const nx = trin(l).find(x => x.fra > d0); if(!nx) return;
    L.push({e, i, f: 'vk', hvad: 'Cancellation fee rises to ' + strip(trinTxt(l, nx)), lev: lev(l), pris: a.lPris(l), iso: nx.fra, kl: '',
      aftale: 'until then ' + (gebyr(l, d0) ? nfD(gebyr(l, d0)) + ' ' + (l.val || '') : 'free'), hvem: v.hvem || '', kilde: strip(a.plNavn(e, l, i))});
  });
}
function kort01(){
  const a = api(); if(!a) return '';
  const V = valgteLinjer(); if(!V.length) return '';
  const d0 = idag(), kendte = V.filter(x => gebyr(x.l, d0) != null), ukendte = V.filter(x => gebyr(x.l, d0) == null);
  const datoer = [...new Set(kendte.flatMap(x => (x.l.vilkaar || {}).type === 'trin' ? trin(x.l).map(s => s.fra).filter(f => f > d0) : []))].sort();
  const raek = dag => { let pay = 0, back = 0; kendte.forEach(x => { const g = gebyr(x.l, dag), p = Number(x.l.pris) || 0; pay += iDkk(x.l, g) || 0; back += iDkk(x.l, Math.max(0, p - g)) || 0; }); return {pay, back}; };
  const navn = x => strip(a.ydNavnK(x.e)).split(' — ')[0];
  const nu = raek(d0);
  const chip = !kendte.length ? ['dim', 'no terms entered'] : ukendte.length ? ['obs', ukendte.length + ' without terms'] : nu.pay ? ['obs', 'we pay ' + nf(nu.pay) + ' DKK today'] : ['ok', 'free today'];
  let h = a.frSekHd('If the trip is cancelled', chip);
  if(kendte.length){
    h += '<table class="tab tabmini" id="vkTab"><thead><tr><th style="text-align:left">Cancelled</th><th>We pay</th><th>We get back</th><th>When</th></tr></thead><tbody>'
      + [d0].concat(datoer).map((d, k) => { const r = k ? raek(d) : nu, om = a.frDage(d);
        return '<tr' + (k ? '' : ' style="background:rgba(255,255,255,.04)"') + '><td style="text-align:left">' + (k ? 'From ' + esc(kd(d)) : '<b>Today</b>') + '</td>'
          + '<td class="nw"' + (r.pay ? ' style="color:var(--fersk)"' : '') + '>' + nf(r.pay) + ' DKK</td><td class="nw">' + nf(r.back) + ' DKK</td>'
          + '<td class="nw" style="color:var(--lys3)">' + (k ? 'in ' + (om === 1 ? '1 day' : om + ' days') : 'now') + '</td></tr>'; }).join('')
      + '</tbody></table>';
  }
  if(ukendte.length) h += '<p class="note" style="margin-top:8px">Not included — no terms on the price line: ' + ukendte.map(x => esc(navn(x))).join(' · ') + '.</p>';
  return h;
}

function init(){ kroge(); }
window.PandaTerms = {version: VERSION, sektion: (e, l, i) => { kroge(); return sektion(e, l, i); }, kost: (e, l, i) => { kroge(); return kost(e, l, i); }, kostKort,
  frister, kort01: () => { kroge(); return kort01(); }, init, _S: S, _test: {gebyr, trin, resume}};
})();
