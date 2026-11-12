/* modules/layover-status.v1.js — R1030 (Wendie 10.11.2026)
   «i deadlines burde vi også have den deadline der var for flyene - og hvornår hotellet skal betales.. og om det er
   udstedt/bekræftet og om det er betalt/afstemt med banken».
   Én række pr. valgt prislinje under «Options & deadlines»:
   - Deadline: flyets udstedelsesfrist / hotellets option- eller afbestillingsfrist (hold.dato) — står der stadig, når den er overholdt.
   - Issued / confirmed: hold.udstedt (+ dato og hvem).
   - Pay supplier by: hold.betal, ellers trip_elements.vendor_due_date.
   - Paid: trip_elements.vendor_paid (+ beløb og valørdato).
   - Bank: afstemt, når betalingen er afstemt mod kontoudtoget (vendor_paid_source «afstemt …» eller en afstemt banklinje).
   Læser kun — skriver intet. Index kalder LayoverStatus.boks() i KROP.frist. Mangler filen, er kortet som før. */
(function(){
  'use strict';
  var RAEK = {}, HENT = {};   /* trip_elements pr. rejse */

  function api(){ return window.MLNY && MLNY._api ? MLNY._api() : null; }
  function udst(h){ return h && (h.udstedt === true || h.udstedt === 'true'); }

  function hent(A, tid){
    if(HENT[tid]) return; HENT[tid] = true;
    try {
      db.from('trip_elements').select('id,vendor_paid,paid_amount_dkk,paid_value_date,vendor_due_date,vendor_paid_source,invoice_received')
        .eq('trip_id', tid).then(function(r){
          var M = {}; ((r && r.data) || []).forEach(function(x){ M[x.id] = x; });
          RAEK[tid] = r && r.error ? null : M;
          try { if(A.T().id === tid) A.KROP.frist(true); } catch(_){}
        });
    } catch(e){ RAEK[tid] = null; }
  }

  function celle(tekst, kl, under){ return '<td class="ls-c' + (kl ? ' ' + kl : '') + '">' + tekst + (under ? '<span class="u">' + under + '</span>' : '') + '</td>'; }

  function raekke(A, e, i, l, rk){
    var esc = A.esc, kd = A.kd, a = A.ydArt(e), fly = a === 'fly', h = l.hold || {}, nu = A.iDag(), ok = udst(h);
    var ref = A.linjeRef ? A.linjeRef(e, l) : '';
    var navn = '<span class="art ' + a + '">' + (A.ART_NAVN[a] || 'Other') + '</span>' + esc(fly ? (ref ? 'Booking ref. ' + ref : 'Flight') : String(A.ydNavnK(e) || '').replace(/<[^>]*>/g, '').split(' — ')[0])
      + (!fly && ref ? ' <span class="u1">· ' + esc(ref) + '</span>' : '');
    /* fristen */
    var fr;
    if(h.dato){
      var lbl = fly ? 'Ticketing' : (ok ? 'Free cancellation' : 'Option');
      var txt = esc(kd(h.dato)) + (h.tid ? ' at ' + esc(String(h.tid).replace(':', '.')) : '');
      fr = fly && ok ? celle(txt, 'gjort', lbl + ' · met')
        : (!ok && h.dato < nu) ? celle(txt, 'galt', lbl + ' · expired')
        : celle(txt, '', lbl);
    } else fr = celle('—', 'tom', fly ? 'no ticketing deadline' : 'no deadline');
    /* udstedt / bekræftet */
    var st = ok ? celle(fly ? 'Issued' : 'Confirmed', 'gjort', [h.udstedt_dato ? kd(h.udstedt_dato) : '', h.udstedt_af || ''].filter(Boolean).map(esc).join(' · '))
      : h.aktiv ? celle('On hold', 'obs', fly ? 'not issued' : 'not confirmed')
      : celle(fly ? 'Not issued' : 'Not confirmed', 'galt', '');
    /* betaling */
    var betal = h.betal || (rk && rk.vendor_due_date) || '';
    var betalt = rk && rk.vendor_paid;
    var bf = betal ? celle(esc(kd(betal)), betalt ? 'gjort' : betal < nu ? 'galt' : '', betalt ? 'paid' : betal < nu ? 'overdue' : 'pay supplier by')
      : celle('—', 'tom', 'no payment deadline');
    var pf = rk === undefined ? celle('…', 'tom', '')
      : rk === null ? celle('—', 'tom', 'could not be read')
      : betalt ? celle('Paid', 'gjort', [rk.paid_amount_dkk != null ? A.nf(+rk.paid_amount_dkk) + ' DKK' : '', rk.paid_value_date ? kd(rk.paid_value_date) : ''].filter(Boolean).join(' · '))
      : celle('Not paid', betal && betal < nu ? 'galt' : 'obs', '');
    var afst = rk && rk.vendor_paid && /afstemt|reconciled/i.test(rk.vendor_paid_source || '');
    var bk = !rk ? celle('—', 'tom', '') : afst ? celle('Reconciled', 'gjort', 'with the bank')
      : betalt ? celle('Not reconciled', 'obs', 'match it in Finance') : celle('—', 'tom', '');
    return '<tr><td class="ls-n">' + navn + '</td>' + fr + st + bf + pf + bk + '</tr>';
  }

  function boks(){
    var A = api(); if(!A) return '';
    var T = A.T(); if(!T || !T.id) return '';
    if(!(T.id in RAEK)){ RAEK[T.id] = undefined; hent(A, T.id); }
    var M = RAEK[T.id], rows = [], afv = 0;
    A.ydListe().forEach(function(e){
      var V = A.valgte(e.id), L = A.ydSt(e.id).linjer || [];
      var idx = V.length ? V : (L.length ? [Math.max(0, L.findIndex(function(l){ return l.slag === 'grundlag'; }))] : []);
      var rk = M === undefined ? undefined : M === null ? null : (M[e.id] || {});
      idx.forEach(function(i){ var l = L[i]; if(!l) return; var r = raekke(A, e, i, l, rk); if(/class="ls-c galt"/.test(r)) afv++; rows.push(r); });
    });
    if(!rows.length) return '';
    var chip = afv ? ['mangler', afv === 1 ? '1 needs attention' : afv + ' need attention'] : ['ok', 'all in order'];
    return '<style>' + STIL + '</style>' + A.boks('ls', 'Supplier status', A.boksChip(chip),
      '<table class="tab tabmini ls-tab"><thead><tr><th style="text-align:left">Service</th><th>Deadline</th><th>Issued / confirmed</th><th>Pay supplier by</th><th>Paid</th><th>Bank</th></tr></thead><tbody>'
      + rows.join('') + '</tbody></table><p class="note" style="margin:8px 0 0">Read from the price lines and Finance — edit the deadlines and the status on the price line under Services on the trip.</p>'
      + (window.LayoverFarewise ? LayoverFarewise.ukoblede() : ''));   /* R1016: Farewise-bookinger uden rejse i Panda */
  }

  var STIL = '.ls-tab th,.ls-tab td{text-align:left!important;vertical-align:top}.ls-tab td.ls-n{white-space:nowrap}.ls-tab td.ls-n .art{margin-right:7px}.ls-tab .u1{color:#6B6690!important}'
    + '.ls-tab td.ls-c{white-space:nowrap;font-weight:600!important;color:#1C1934!important}.ls-tab td.ls-c .u{display:block;font-weight:400;font-size:11.5px;color:#6B6690!important;margin-top:2px}'
    + '.ls-tab td.gjort{color:#1F7A4D!important}.ls-tab td.galt{color:#B23A5E!important}.ls-tab td.obs{color:#9A6A12!important}.ls-tab td.tom{color:#8A86A6!important;font-weight:400!important}';

  /* rejsen skiftes eller Finance afstemmer: hent igen, når kortet tegnes for en anden rejse */
  window.LayoverStatus = { boks: boks, glem: function(tid){ delete RAEK[tid]; delete HENT[tid]; } };
})();
