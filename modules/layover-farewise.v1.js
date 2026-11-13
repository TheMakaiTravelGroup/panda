/* modules/layover-farewise.v1.js — R1016 (Wendie 12.11.2026) + R1041 flyændringer til godkendelse (13.11.2026)
   Viser på hver flyprislinje, hvad Farewise sagde ved sidste hentning (natkørslen kl. 03:17 eller knappen):
   udstedt eller ej, udstedelsesfristen, hvad der blev udfyldt automatisk, og AFVIGELSER (Farewise siger noget andet
   end prislinjen — et menneske tager stilling). Knappen «Fetch from Farewise» henter med det samme for prislinjens PNR.
   Under «Supplier status» står Farewise-bookinger, der ikke er koblet til en rejse i Panda.
   Læser tabellen farewise_pnr (kun læsning). Knappen kalder edge function farewise-hent (read-only hos Farewise).
   Kaldes fra layover-docs (zone) og layover-status (boks). Mangler filen, er alt som før. */
(function(){
  'use strict';
  var RK = null, HENTER = false, SIDST = 0, I_GANG = {}, FC = [], GODK = {}, RT = null;

  function api(){ return window.MLNY && MLNY._api ? MLNY._api() : null; }
  function hent(A){
    var tid = (A.T() || {}).id;
    if(HENTER || (RK && RT === tid && Date.now() - SIDST < 60000)) return;
    HENTER = true; RT = tid;
    try {
      Promise.all([
        db.from('farewise_pnr').select('pnr,data_source,hentet_at,ok,fejl,issued,ticketing_deadline,match_status,price_ids,trip_ids,anvendt,afvigelser,booking'),
        tid ? db.from('flight_changes').select('id,pnr,price_id,art,flyvning,panda,farewise,minutter,niveau,grunde,tekst,status,opdaget_at,task_id')
          .eq('trip_id', tid).or('status.eq.aaben,opdaget_at.gte.' + new Date(Date.now() - 14 * 864e5).toISOString()).order('opdaget_at', {ascending: false}) : Promise.resolve({data: []})
      ]).then(function(rs){ HENTER = false; SIDST = Date.now(); RK = (rs[0] && rs[0].data) || []; FC = (rs[1] && rs[1].data) || [];
          try { A.ydTegn(); A.KROP.frist(true); } catch(_){} }, function(){ HENTER = false; RK = RK || []; });
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
    var fc = FC.filter(function(c){ return c.price_id === id; });
    var godk = fc.filter(function(c){ return c.niveau === 'godkend' && c.status === 'aaben'; });
    var info = fc.filter(function(c){ return c.niveau === 'info'; }).slice(0, 5);
    var aendHtml = (godk.length ? '<div class="fw-g"><b>Flight change' + (godk.length > 1 ? 's' : '') + ' to approve</b>' + godk.map(function(c){
        return '<div class="fw-gk"><p>' + esc(c.tekst) + '</p>' + ((c.grunde || []).length ? '<p class="fw-why">Why: ' + esc(c.grunde.join(' · ')) + '</p>' : '')
          + '<div class="fw-gknap"><button class="b mini fyldt" data-m8="fwgodk" data-id="' + esc(c.id) + '"' + (GODK[c.id] ? ' disabled' : '') + '>' + (GODK[c.id] ? 'Saving…' : 'Approve — use Farewise') + '</button>'
          + '<button class="b mini" data-m8="fwafvis" data-id="' + esc(c.id) + '"' + (GODK[c.id] ? ' disabled' : '') + '>Dismiss</button></div>'
          + '<p class="fw-p">After approving: inform the customer about the change.</p></div>'; }).join('') + '</div>' : '')
      + (info.length ? '<div class="fw-i"><b>Small changes — fixed automatically</b><ul>' + info.map(function(c){ return '<li>' + esc(c.tekst) + ' <span class="fw-d">' + esc(tid(c.opdaget_at)) + '</span></li>'; }).join('') + '</ul></div>' : '');
    return '<div class="fw-boks' + (afv.length || !r.ok || godk.length ? ' fw-obs' : '') + '"><div class="fw-hd"><span><b>Farewise</b> · ' + esc(r.pnr) + ' · checked ' + esc(tid(r.hentet_at)) + '</span>' + knap + '</div>'
      + '<div class="fw-tags">' + tags.join('') + '</div>'
      + (!r.ok ? '<p class="fw-p">' + esc(String(r.fejl || '').replace(/^FareWise \d+: \d+\|Application\|/, '')) + ' — the booking may be an NDC booking that Farewise looks up differently. Rasmus is fixing it.</p>' : '')
      + (anv.length ? '<p class="fw-p">Filled in from Farewise: ' + anv.map(function(a){ return esc(a.t); }).join(' · ') + '</p>' : '')
      + aendHtml
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

  /* R1041: godkend = Farewises flyvning skrives på prislinjen; afvis = intet ændres. Begge lukker opgaven. */
  function nrP(s){ var x = String(s || '').replace(/\s+/g, '').toUpperCase(), m = /^([A-Z0-9]{2})0*(\d+[A-Z]?)$/.exec(x); return m ? m[1] + m[2] : x; }
  function d(iso){ var m = /^(\d{4}-\d{2}-\d{2})/.exec(String(iso || '')); return m ? m[1] : null; }
  function k(iso){ var m = /T(\d{2}):(\d{2})/.exec(String(iso || '')); return m ? m[1] + ':' + m[2] : null; }
  async function behandl(A, id, godkend){
    var c = FC.find(function(x){ return x.id === id; }); if(!c || GODK[id]) return;
    GODK[id] = true; A.ydTegn();
    try {
      var hvem = (window.MYNAME || window.ME || '') + '';
      if(godkend){
        var r = await db.from('element_prices').select('id,segmenter').eq('id', c.price_id).single();
        if(r.error) throw new Error(r.error.message);
        var seg = Array.isArray(r.data.segmenter) ? r.data.segmenter.slice() : [], f = c.farewise || {}, p = c.panda || {};
        var i = seg.findIndex(function(s){ return nrP(s.nr || s.flynr) === nrP(p.nr || p.flynr) && s.dato === p.dato; });
        if(c.art === 'fjernet'){ if(i > -1) seg.splice(i, 1); }
        else if(c.art === 'tilfoejet'){
          var nr = f.carrier + String(f.flightNumber || '').replace(/^0+/, '');
          seg.push({nr: nr, flynr: nr, kode: f.carrier, fra: f.from, til: f.to, dato: d(f.departure), ud: k(f.departure), an: k(f.arrival), ankomstDato: d(f.arrival),
            kabine: f.cabin || null, bk: f.bookingClass || null, status: f.status || null, pnr: c.pnr});
          seg.sort(function(a, b){ return (a.dato + a.ud).localeCompare(b.dato + b.ud); });
        } else if(i > -1){
          var s = Object.assign({}, seg[i]);
          if(c.art === 'tid'){ s.dato = d(f.departure); s.ud = k(f.departure); s.an = k(f.arrival); s.ankomstDato = d(f.arrival); }
          if(f.status) s.status = f.status;
          seg[i] = s;
        } else throw new Error('the flight is no longer on the price line — correct it by hand');
        var u = await db.from('element_prices').update({segmenter: seg}).eq('id', c.price_id);
        if(u.error) throw new Error(u.error.message);
      }
      var nu = new Date().toISOString();
      var v = await db.from('flight_changes').update({status: godkend ? 'godkendt' : 'afvist', behandlet_at: nu, behandlet_af: hvem || null}).eq('id', id);
      if(v.error) throw new Error(v.error.message);
      if(c.task_id) await db.from('tasks').update({status: 'udfoert', done_at: nu}).eq('id', c.task_id).eq('status', 'aaben');
      GODK[id] = false; RK = null; SIDST = 0;
      A.kvitter('gemt', godkend ? 'The flight is updated from Farewise — remember to inform the customer. The page reloads' : 'Dismissed — nothing was changed');
      if(godkend) setTimeout(function(){ location.reload(); }, 1400); else hent(A);
    } catch(e){ GODK[id] = false; A.ydTegn(); A.kvitter('fejl', 'Flight change: ' + ((e && e.message) || e)); }
  }

  var STIL = '.fw-boks{margin:0 0 12px;padding:10px 14px;border-radius:12px;background:#F1EEFB;border:1px solid rgba(60,45,130,.12);color:#1C1934;font:13px/1.45 Inter,system-ui,sans-serif}'
    + '.fw-boks.fw-obs{border-color:rgba(176,120,20,.35);background:#FBF6EC}'
    + '.fw-hd{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.fw-hd b{font-weight:600}'
    + '.fw-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.fw-t{font-size:11.5px;padding:3px 9px;border-radius:7px;background:#E9E5F8;color:#2B2650}'
    + '.fw-t.ok{background:rgba(31,122,77,.12);color:#1F7A4D}.fw-t.obs{background:rgba(176,120,20,.14);color:#8A5A00}.fw-t.galt{background:rgba(178,58,94,.12);color:#B23A5E}'
    + '.fw-p{margin:6px 0 0;color:#6B6690;font-size:12px}.fw-afv{margin:6px 0 0;padding-left:18px;color:#8A4B00}'
    + '.fw-uk{margin:10px 0 0;padding:10px 12px;border-radius:10px;background:#FBF6EC;border:1px solid rgba(176,120,20,.3);font-size:12.5px;color:#1C1934}.fw-uk ul{margin:6px 0 0;padding-left:18px}.fw-r{color:#B23A5E}'
    + '.fw-g{margin:8px 0 0;padding:10px 12px;border-radius:10px;background:#fff;border:1px solid rgba(176,120,20,.35)}.fw-g>b{color:#8A5A00}'
    + '.fw-gk{margin-top:8px;padding-top:8px;border-top:1px solid rgba(176,120,20,.18)}.fw-gk:first-of-type{border-top:0;padding-top:0}.fw-gk p{margin:0}.fw-why{color:#8A4B00;font-size:12px;margin-top:3px!important}'
    + '.fw-gknap{display:flex;gap:8px;margin-top:8px}.fw-i{margin:8px 0 0;font-size:12px;color:#4A4570}.fw-i ul{margin:4px 0 0;padding-left:18px}.fw-d{color:#8A85A8;font-size:11px}'
    + '.venstre .fw-knap{height:28px!important;padding:0 10px!important;font-size:12px!important}';

  function kobl(){
    var A = api(); if(!A) return false;
    A.HANDL.fwhent = function(el){ return hentNu(A, String(el.dataset.pnr || '').toUpperCase()); };
    A.HANDL.fwgodk = function(el){ return behandl(A, el.dataset.id, true); };
    A.HANDL.fwafvis = function(el){ return behandl(A, el.dataset.id, false); };
    return true;
  }
  if(!kobl()){ var n = 0, t = setInterval(function(){ if(kobl() || ++n > 120) clearInterval(t); }, 250); }

  window.LayoverFarewise = {
    linje: function(e, l, i, a){ var h = linje(e, l, i, a); return h ? '<style>' + STIL + '</style>' + h : ''; },
    ukoblede: function(){ var h = ukoblede(); return h ? '<style>' + STIL + '</style>' + h : ''; }
  };
})();
