/* modules/layover-farewise.v1.js — R1016 (Wendie 12.11.2026)
   Viser på hver flyprislinje, hvad Farewise sagde ved sidste hentning (natkørslen kl. 03:17 eller knappen):
   udstedt eller ej, udstedelsesfristen, hvad der blev udfyldt automatisk, og AFVIGELSER (Farewise siger noget andet
   end prislinjen — et menneske tager stilling). Knappen «Fetch from Farewise» henter med det samme for prislinjens PNR.
   Under «Supplier status» står Farewise-bookinger, der ikke er koblet til en rejse i Panda.
   Læser tabellen farewise_pnr (kun læsning). Knappen kalder edge function farewise-hent (read-only hos Farewise).
   Kaldes fra layover-docs (zone) og layover-status (boks). Mangler filen, er alt som før. */
(function(){
  'use strict';
  var RK = null, HENTER = false, SIDST = 0, I_GANG = {};

  function api(){ return window.MLNY && MLNY._api ? MLNY._api() : null; }
  function hent(A){
    if(HENTER || (RK && Date.now() - SIDST < 60000)) return;
    HENTER = true;
    try {
      db.from('farewise_pnr').select('pnr,data_source,hentet_at,ok,fejl,issued,ticketing_deadline,match_status,price_ids,trip_ids,anvendt,afvigelser,booking')
        .then(function(r){ HENTER = false; SIDST = Date.now(); RK = (r && r.data) || [];
          try { A.ydTegn(); A.KROP.frist(true); } catch(_){} });
    } catch(e){ HENTER = false; RK = []; }
  }
  function tid(iso){ if(!iso) return ''; var d = new Date(iso); if(isNaN(d)) return '';
    var m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    return d.getDate() + ' ' + m + ' ' + String(d.getHours()).padStart(2,'0') + '.' + String(d.getMinutes()).padStart(2,'0'); }
  function dagTxt(iso){ if(!iso) return ''; var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso); if(!m) return iso;
    var mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m[2]-1];
    return (+m[3]) + ' ' + mn + ' ' + m[1] + (m[4] && !(m[4] === '00' && m[5] === '00') ? ' ' + m[4] + '.' + m[5] : ''); }

  /* på flyprislinjen (kaldt fra layover-docs.zone) */
  function linje(e, l, i, attrs){
    var A = api(); if(!A || A.ydArt(e) !== 'fly') return '';
    hent(A);
    var esc = A.esc, pnr = String(A.linjeRef ? A.linjeRef(e, l) || '' : '').trim().toUpperCase();
    var id = l && l._id;
    var r = (RK || []).find(function(x){ return id && (x.price_ids || []).indexOf(id) > -1; })
      || (pnr && (RK || []).find(function(x){ return x.pnr === pnr; }));
    var knap = pnr ? '<button class="b mini fw-knap" data-m8="fwhent" data-pnr="' + esc(pnr) + '"' + (I_GANG[pnr] ? ' disabled' : '') + '>' + (I_GANG[pnr] ? 'Fetching…' : '↻ Fetch from Farewise') + '</button>' : '';
    if(!r){
      if(!pnr) return '';
      return '<div class="fw-boks"><div class="fw-hd"><span><b>Farewise</b> · ' + esc(pnr) + ' · ' + (RK ? 'not in the Farewise list from the editor yet' : 'reading…') + '</span>' + knap + '</div></div>';
    }
    var tags = [];
    if(!r.ok) tags.push('<span class="fw-t galt">Farewise could not find it</span>');
    else if(r.issued) tags.push('<span class="fw-t ok">Issued</span>');
    else tags.push('<span class="fw-t obs">Not issued</span>');
    if(r.ok && !r.issued && r.ticketing_deadline) tags.push('<span class="fw-t' + (new Date(r.ticketing_deadline) < new Date() ? ' galt' : '') + '">Ticketing deadline ' + esc(dagTxt(r.ticketing_deadline)) + '</span>');
    var afv = (r.afvigelser || []).filter(function(a){ return !a.price_id || a.price_id === id; });
    var anv = (r.anvendt || []).filter(function(a){ return !a.price_id || a.price_id === id; });
    return '<div class="fw-boks' + (afv.length || !r.ok ? ' fw-obs' : '') + '"><div class="fw-hd"><span><b>Farewise</b> · ' + esc(r.pnr) + ' · checked ' + esc(tid(r.hentet_at)) + '</span>' + knap + '</div>'
      + '<div class="fw-tags">' + tags.join('') + '</div>'
      + (!r.ok ? '<p class="fw-p">' + esc(String(r.fejl || '').replace(/^FareWise \d+: \d+\|Application\|/, '')) + ' — the booking may be an NDC booking that Farewise looks up differently. Rasmus is fixing it.</p>' : '')
      + (anv.length ? '<p class="fw-p">Filled in from Farewise: ' + anv.map(function(a){ return esc(a.t); }).join(' · ') + '</p>' : '')
      + (afv.length ? '<ul class="fw-afv">' + afv.map(function(a){ return '<li>' + esc(a.t) + '</li>'; }).join('') + '</ul><p class="fw-p">Farewise says something different — check it and correct the price line by hand. Nothing has been changed.</p>' : '')
      + '</div>';
  }

  /* under «Supplier status»: bookinger hos Farewise uden rejse i Panda */
  function ukoblede(){
    var A = api(); if(!A) return ''; hent(A);
    var L = (RK || []).filter(function(x){ return x.match_status === 'ingen' || x.match_status === 'flere'; });
    if(!L.length) return '';
    var esc = A.esc;
    return '<div class="fw-uk"><b>Farewise bookings not linked to a trip in Panda</b>'
      + '<ul>' + L.map(function(x){ var b = x.booking || {};
        return '<li><b>' + esc(x.pnr) + '</b> · ' + esc(b.customer_name || '—') + (b.travel_date_out ? ' · departs ' + esc(b.travel_date_out) : '')
          + (x.issued === false ? ' · <span class="fw-r">not issued' + (x.ticketing_deadline ? ', deadline ' + esc(dagTxt(x.ticketing_deadline)) : '') + '</span>' : x.issued ? ' · issued' : '')
          + (x.match_status === 'flere' ? ' · <span class="fw-r">the PNR is on several trips</span>' : '') + '</li>'; }).join('')
      + '</ul><p class="fw-p">Write the PNR on the flight price line of the right trip — then Panda links it at the next fetch.</p></div>';
  }

  async function hentNu(A, pnr){
    if(I_GANG[pnr]) return; I_GANG[pnr] = true; A.ydTegn();
    try {
      var s = await db.auth.getSession(), tok = s && s.data && s.data.session && s.data.session.access_token;
      if(!tok) throw new Error('not logged in');
      var r = await fetch(SB_URL + '/functions/v1/farewise-hent', { method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, apikey: SB_KEY }, body: JSON.stringify({ pnr: pnr }) });
      var j = await r.json().catch(function(){ return {}; });
      I_GANG[pnr] = false; RK = null; SIDST = 0;
      if(!r.ok || !j.ok) { A.ydTegn(); return A.kvitter('fejl', 'Farewise: ' + (j.fejl || ('HTTP ' + r.status))); }
      var x = (j.resultat || [])[0] || {};
      if(!x.ok) { hent(A); return A.kvitter('advar', 'Farewise could not find ' + pnr); }
      if((x.udfyldt || []).length){
        A.kvitter('gemt', 'Filled in from Farewise: ' + x.udfyldt.join(' · ') + ' — the page reloads');
        setTimeout(function(){ location.reload(); }, 1400);   /* prislinjen er opdateret i basen — hent den friske udgave */
      } else {
        hent(A);
        A.kvitter((x.afvigelser || []).length ? 'advar' : 'gemt', (x.afvigelser || []).length ? 'Farewise checked — ' + x.afvigelser.length + ' difference(s) to look at' : 'Farewise checked — everything matches');
      }
    } catch(e){ I_GANG[pnr] = false; A.ydTegn(); A.kvitter('fejl', 'Farewise: ' + ((e && e.message) || e)); }
  }

  var STIL = '.fw-boks{margin:0 0 12px;padding:10px 14px;border-radius:12px;background:#F1EEFB;border:1px solid rgba(60,45,130,.12);color:#1C1934;font:13px/1.45 Inter,system-ui,sans-serif}'
    + '.fw-boks.fw-obs{border-color:rgba(176,120,20,.35);background:#FBF6EC}'
    + '.fw-hd{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.fw-hd b{font-weight:600}'
    + '.fw-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.fw-t{font-size:11.5px;padding:3px 9px;border-radius:7px;background:#E9E5F8;color:#2B2650}'
    + '.fw-t.ok{background:rgba(31,122,77,.12);color:#1F7A4D}.fw-t.obs{background:rgba(176,120,20,.14);color:#8A5A00}.fw-t.galt{background:rgba(178,58,94,.12);color:#B23A5E}'
    + '.fw-p{margin:6px 0 0;color:#6B6690;font-size:12px}.fw-afv{margin:6px 0 0;padding-left:18px;color:#8A4B00}'
    + '.fw-uk{margin:10px 0 0;padding:10px 12px;border-radius:10px;background:#FBF6EC;border:1px solid rgba(176,120,20,.3);font-size:12.5px;color:#1C1934}.fw-uk ul{margin:6px 0 0;padding-left:18px}.fw-r{color:#B23A5E}'
    + '.venstre .fw-knap{height:28px!important;padding:0 10px!important;font-size:12px!important}';

  function kobl(){
    var A = api(); if(!A) return false;
    A.HANDL.fwhent = function(el){ return hentNu(A, String(el.dataset.pnr || '').toUpperCase()); };
    return true;
  }
  if(!kobl()){ var n = 0, t = setInterval(function(){ if(kobl() || ++n > 120) clearInterval(t); }, 250); }

  window.LayoverFarewise = {
    linje: function(e, l, i, a){ var h = linje(e, l, i, a); return h ? '<style>' + STIL + '</style>' + h : ''; },
    ukoblede: function(){ var h = ukoblede(); return h ? '<style>' + STIL + '</style>' + h : ''; }
  };
})();
