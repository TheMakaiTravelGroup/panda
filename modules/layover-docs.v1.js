/* modules/layover-docs.v1.js — R1021 (Wendie 10.11.2026)
   Fakturaen kan KUN lægges på en bestemt prislinje (Wendie 10.11: «fakturaen KUN kan trækkes ind på en specifik prislinje»):
   - Hver flyprislinje har sit eget felt «Drop the Farewise invoice for this price line here». Fakturaen retter netop DEN linje:
     pris = fakturaens total, leverandør Farewise, valuta, PNR, leverandørreference (ordrenr.), flyselskab (kun hvis tomt),
     udstedt + udstedelsesdato og e-ticketnumre pr. rejsende. Gemmes som alle andre rettelser (ydFoer → ydGem).
   - Den store knap øverst tager itinerary/billet som før. Lægges en faktura dér, afvises den og prislinjen åbnes.
   Index kalder modulet fra klipTil (LayoverDocs.klip), knapteksten (LayoverDocs.knap) og plKrop (LayoverDocs.zone). Mangler filen, er alt som før. */
(function(){
  'use strict';
  var SVAR = null;   /* sidste fakturalæsning — vises under knappen, til den lukkes */

  function erPdf(f){ return f && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name || '')); }
  function tal(s){ var t = String(s || '').replace(/[\s ]/g, ''); var k = t.lastIndexOf(','), p = t.lastIndexOf('.');
    if(k > -1 && p > -1){ t = k > p ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, ''); }
    else if(k > -1){ t = /,\d{2}$/.test(t) ? t.replace(',', '.') : t.replace(/,/g, ''); }
    else if(p > -1 && /\.\d{3}$/.test(t)){ t = t.replace(/\./g, ''); }
    var n = parseFloat(t); return isFinite(n) ? n : null; }
  function isoAf(d){ var m = /(\d{1,2})[-./](\d{1,2})[-./](\d{4})/.exec(d || ''); return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : null; }
  function norm(s){ return String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/Ø/g, 'O').replace(/Æ/g, 'AE').replace(/Å/g, 'A').replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim(); }

  /* «9544451081-84» → 9544451081 … 9544451084; «9544451081, 9544451082» → begge */
  function billetter(tekst){
    var ud = [], re = /Billet(?:nummer|nr)\.?\s*:?\s*([0-9][0-9\s,\-\/]*)/gi, m;
    while((m = re.exec(tekst))){
      String(m[1]).split(/[,\/]|\s{2,}/).forEach(function(stk){
        stk = stk.replace(/\s/g, ''); if(!stk) return;
        var r = /^(\d{10,14})(?:-(\d{1,4}))?$/.exec(stk); if(!r) return;
        if(!r[2]){ ud.push(r[1]); return; }
        var start = r[1], slut = start.slice(0, start.length - r[2].length) + r[2];
        var a = +start.slice(-r[2].length), b = +r[2]; if(b < a || b - a > 9){ ud.push(start); return; }
        for(var x = a; x <= b; x++) ud.push(start.slice(0, start.length - r[2].length) + String(x).padStart(r[2].length, '0'));
      });
    }
    return ud.filter(function(v, i, A){ return A.indexOf(v) === i; });
  }

  function erFaktura(t){ return /FAKTURA\s*N[RO]/i.test(t) && /Total\s+i\s+[A-Z]{3}/i.test(t); }

  function laesFaktura(t){
    var r = {}, m;
    m = /FAKTURA\s*N[RO]\.?\s*:?\s*(\d{4,})/i.exec(t); r.faktura = m ? m[1] : null;
    m = /Total\s+i\s+([A-Z]{3})\s*:?\s*([\d.\s ]+,\d{2}|[\d.,]+)/i.exec(t); r.val = m ? m[1].toUpperCase() : null; r.total = m ? tal(m[2]) : null;
    /* hovedrækken: ORDRE DATO DEST./AIRLINE AFREJSE BOOKINGINFO BETALES SENEST — værdierne står på én linje */
    m = /(\d{5,})\s+(\d{2}-\d{2}-\d{4})\s+([A-Z]{3})\/([A-Z0-9]{2})\s+(\d{2}-\d{2}-\d{4})\s+([A-Z0-9]{5,7})\s+(\d{2}-\d{2}-\d{4})/.exec(t);
    if(m){ r.ordre = m[1]; r.dato = isoAf(m[2]); r.dest = m[3]; r.selskab = m[4]; r.afrejse = isoAf(m[5]); r.pnr = m[6]; r.betal = isoAf(m[7]); }
    if(!r.ordre){ m = /ORDRE\s*(?:NR\.?)?\s*:?\s*(\d{5,})/i.exec(t); r.ordre = m ? m[1] : null; }
    if(!r.betal){ m = /BETALES\s+SENEST\s*:?\s*(\d{1,2}[-./]\d{1,2}[-./]\d{4})/i.exec(t); r.betal = m ? isoAf(m[1]) : null; }
    if(!r.dato){ m = /\bDATO\s*:?\s*(\d{1,2}[-./]\d{1,2}[-./]\d{4})/i.exec(t); r.dato = m ? isoAf(m[1]) : null; }
    if(!r.pnr){ m = /GDS\s*Ref\.?\s*:?\s*([A-Z0-9]{5,7})\b/.exec(t) || /BOOKINGINFO\s*:?\s*([A-Z0-9]{5,7})\b/.exec(t); r.pnr = m ? m[1] : null; }
    if(!r.selskab){ m = /Flybillet:[^\n]*?\/\s*([A-Z0-9]{2})\s*\//.exec(t) || /AIRLINE\s*:?\s*[A-Z]{3}\/([A-Z0-9]{2})\b/.exec(t); r.selskab = m ? m[1] : null; }
    m = /Flybillet:\s*([A-Z]{3}(?:-[A-Z]{3})+)/.exec(t); r.rute = m ? m[1] : null;
    r.billetter = billetter(t);
    /* deltagerne: EFTERNAVN/FORNAVN — ikke ruter og ikke «MLE/LH» */
    var navne = [], re = /(^|[^A-Z\-])([A-ZÆØÅ][A-ZÆØÅ\-]{1,})\/([A-ZÆØÅ][A-ZÆØÅ\-]{2,})(?=\s|$)/gm;
    while((m = re.exec(t))){ var fn = m[3];
      if(/^(AIRLINE)$/.test(m[3]) || m[2] === 'DEST') continue;
      var n = m[2] + '/' + fn; if(navne.indexOf(n) < 0) navne.push(n); }
    r.deltagere = navne;
    return r;
  }

  /* fakturanavn «BERG/ANNETTE» ↔ rejsende «Annette Asper Berg» */
  function findPax(navn, pax){
    var d = navn.split('/'), ef = norm(d[0]), fo = norm(d[1]).split(' ')[0];
    var hit = pax.filter(function(p){ var w = norm(p.navn).split(' '); return w.indexOf(ef) > -1 && w[0] === fo; });
    if(hit.length === 1) return hit[0];
    hit = pax.filter(function(p){ var w = norm(p.navn).split(' '); return w.indexOf(fo) > -1 && w.indexOf(ef) > -1; });
    return hit.length === 1 ? hit[0] : null;
  }

  function anvend(A, m, f, F){
    var R = A.RSx(), id = m.id, i = m.i, l = A.ydSt(id).linjer[i]; if(!l) return {fejl:'The price line is gone'};
    var h = l.hold || {}, raa = l.raa || {}, ret = [], adv = [];
    var gl = {pris: l.pris, val: l.val, lev: l.lev, ref: l.ref, pnr: (raa.pnr || (R.segFaelles ? R.segFaelles(l, 'pnr') : '') || '')};
    if(f.total != null && Math.round((+l.pris || 0) * 100) !== Math.round(f.total * 100)){
      R.saetLinjePris(id, i, String(f.total).replace('.', ','));
      ret.push(['Price', (gl.pris != null && gl.pris !== '' ? A.nf(+gl.pris) + ' ' + (gl.val || '') : '—'), A.nf(f.total) + ' ' + (f.val || '')]); }
    if(String(l.lev || '').trim() !== 'Farewise'){ R.saetLinjeLev(id, i, 'Farewise'); ret.push(['Supplier', gl.lev || '—', 'Farewise']); }
    if(f.val && l.val !== f.val){ R.saetLinjeVal(id, i, f.val); ret.push(['Currency', gl.val || '—', f.val]); }
    if(f.ordre && String(l.ref || '').trim() !== f.ordre){ R.saetLinjeRef(id, i, f.ordre); ret.push(['Supplier reference', gl.ref || '—', f.ordre + ' (order)']); }
    if(f.pnr && gl.pnr !== f.pnr){ R.saetLinjeSeg(id, i, 'pnr', f.pnr); ret.push(['PNR', gl.pnr || '—', f.pnr]); }
    /* flyselskabet skrives med navn som i listen (fakturaen har kun koden, fx LH) — ukendt kode røres ikke */
    var SELSKAB = {QR:'Qatar Airways', EY:'Etihad Airways', EK:'Emirates', TK:'Turkish Airlines', LH:'Lufthansa', KL:'KLM', BA:'British Airways', SK:'SAS', SQ:'Singapore Airlines', WY:'Oman Air'};
    var sNavn = f.selskab && SELSKAB[f.selskab];
    if(sNavn && !String(raa.selskab || '').trim() && R.saetLinjeF){ R.saetLinjeF(id, i, 'selskab', sNavn); ret.push(['Airline', '—', sNavn]); }
    /* udstedt — fakturaen kommer først, når billetterne er udstedt */
    if(!(h.udstedt === true || h.udstedt === 'true')){ R.saetLinjeHold(id, i, 'udstedt', true); ret.push(['Status', 'not issued', 'issued']); }
    if(f.dato && h.udstedt_dato !== f.dato){ R.saetLinjeHold(id, i, 'udstedt_dato', f.dato); ret.push(['Issued on', h.udstedt_dato ? A.kd(h.udstedt_dato) : '—', A.kd(f.dato)]); }
    if(!h.udstedt_af && window.ME) R.saetLinjeHold(id, i, 'udstedt_af', window.ME);
    /* e-ticketnumre: billetnumrene følger deltagerlisten i rækkefølge */
    var pax = (R.paxListe && R.paxListe()) || [], et = Object.assign({}, h.eticket || {}), etNy = 0;
    if(f.billetter.length && f.deltagere.length === f.billetter.length && pax.length){
      f.deltagere.forEach(function(n, k){ var p = findPax(n, pax);
        if(!p){ adv.push('Could not match ' + n + ' to a traveller on the trip — enter that e-ticket by hand'); return; }
        if(et[p.id] !== f.billetter[k]){ if(et[p.id]) adv.push('E-ticket for ' + p.navn + ' changed from ' + et[p.id]); et[p.id] = f.billetter[k]; etNy++; } });
      if(etNy){ R.saetLinjeHold(id, i, 'eticket', et); ret.push(['E-tickets', '', etNy + ' of ' + f.deltagere.length + ' entered']); }
    } else if(f.billetter.length){
      var s = f.billetter.join(', ');
      if(h.udstedt_ref !== s){ R.saetLinjeHold(id, i, 'udstedt_ref', s); ret.push(['Ticket numbers', h.udstedt_ref || '—', s]); }
      if(f.deltagere.length !== f.billetter.length) adv.push('The invoice has ' + f.billetter.length + ' ticket numbers for ' + f.deltagere.length + ' travellers — they are saved together, not per traveller');
    }
    /* betalingsfristen sættes ikke på flylinjen (den har intet felt til den) — den vises i svaret og advares, hvis den er overskredet */
    if(f.betal && f.betal < A.iDag()) adv.push('Farewise must be paid by ' + A.kd(f.betal) + ' — that date has passed, check that it has been paid');
    /* passer fakturaen til rejsen? */
    var afr = A.afrejse && A.afrejse();
    if(f.afrejse && afr && String(afr).slice(0, 10) !== f.afrejse) adv.push('The invoice says departure ' + A.kd(f.afrejse) + ', the trip says ' + A.kd(afr) + ' — is it the right invoice?');
    if(gl.pnr && f.pnr && gl.pnr !== f.pnr) adv.push('The PNR on the line was ' + gl.pnr + ' — the invoice says ' + f.pnr);
    if(pax.length && f.deltagere.length && f.deltagere.length !== pax.length) adv.push('The invoice has ' + f.deltagere.length + ' travellers, the trip has ' + pax.length);
    return {ret: ret, adv: adv};
  }

  function behandlFaktura(A, m, fil, f){
    return A.iKoe(async function(){
      var foer = A.ydFoer(), svar;
      try { svar = anvend(A, m, f, fil); } catch(e){ console.error('LayoverDocs', e); svar = {fejl: (e && e.message) || String(e)}; }
      if(svar.fejl){ A.ydTegn(); return A.kvitter('fejl', 'The invoice could not be put on the price line: ' + svar.fejl); }
      if(!svar.ret.length){ SVAR = {f: f, fil: fil.name, ret: [], adv: svar.adv, m: m}; A.ydTegn(); return A.kvitter('gemt', 'The price line already matches invoice ' + (f.faktura || '')); }
      var fe = await A.ydGem(foer);
      if(fe){ SVAR = null; A.ydTegn(); return A.kvitter('fejl', 'The invoice could not be saved — nothing has changed. (' + fe + ')'); }
      SVAR = {f: f, fil: fil.name, ret: svar.ret, adv: svar.adv, m: m};
      A.ydTegn();
      A.kvitter(svar.adv.length ? 'advar' : 'gemt', 'Invoice ' + (f.faktura || '') + ' is on the price line — ' + svar.ret.length + ' field' + (svar.ret.length === 1 ? '' : 's') + ' updated');
      try { A.aabnLinje(m.id, m.i); } catch(_){}
    });
  }

  async function tekstAf(A, f){ if(!erPdf(f)) return null; try { return await A.RSx().pdfTekst(f); } catch(_){ return null; } }

  /* den store knap (klipTil): fakturaer afvises — de skal på en bestemt prislinje. Resten læses som før. */
  async function klip(F, m, A, flyFil){
    var rest = [], fakt = 0;
    for(var k = 0; k < F.length; k++){ var t = await tekstAf(A, F[k]); if(t && erFaktura(t)) fakt++; else rest.push(F[k]); }
    if(fakt){
      A.kvitter('advar', (fakt === 1 ? 'That is an invoice' : fakt + ' of the files are invoices') + ' — drop it on the price line it belongs to, with «Upload invoice» on that price line');
      try { A.aabnLinje(m.id, m.i); } catch(_){}
    }
    if(rest.length){ if(rest.length > 1) A.kvitter('advar', 'Only the first file is read as the flight plan: ' + (rest[0].name || ''));
      return flyFil(m.id, m.i, rest); }
  }

  /* feltet på prislinjen: kun fakturaen, og kun til denne linje */
  async function linjeFiler(A, id, i, F){
    F = [].slice.call(F || []); if(!F.length) return;
    var pdf = F.filter(erPdf);
    if(!pdf.length) return A.kvitter('advar', 'Only the invoice (PDF) goes here — the itinerary and screenshots go in «Upload itinerary»');
    if(pdf.length > 1) return A.kvitter('advar', 'Drop one invoice at a time');
    var t = await tekstAf(A, pdf[0]);
    if(!t) return A.kvitter('fejl', 'The PDF could not be read');
    if(!erFaktura(t)) return A.kvitter('advar', 'That is not a Farewise invoice — the itinerary goes in «Upload itinerary» at the top');
    var f = laesFaktura(t);
    if(f.total == null) return A.kvitter('fejl', 'The invoice was found, but its total could not be read — nothing has been changed');
    return behandlFaktura(A, {id: id, i: i}, pdf[0], f);
  }

  function bind(A){
    var R = A.ROD(); if(!R || R.__ld) return; R.__ld = true;
    var zone = function(ev){ var z = ev.target && ev.target.closest ? ev.target.closest('label.ld-zone') : null; return z; };
    R.addEventListener('dragover', function(ev){ var z = zone(ev); if(!z) return; ev.preventDefault(); z.classList.add('over'); });
    R.addEventListener('dragleave', function(ev){ var z = zone(ev); if(z) z.classList.remove('over'); });
    R.addEventListener('drop', function(ev){ var z = zone(ev); if(!z) return; ev.preventDefault(); ev.stopPropagation(); z.classList.remove('over');
      linjeFiler(A, z.dataset.yd, +z.dataset.i, ev.dataTransfer && ev.dataTransfer.files); });
    R.addEventListener('paste', function(ev){ var z = zone(ev); if(!z) return;
      var F = [].slice.call((ev.clipboardData && ev.clipboardData.items) || []).filter(function(x){ return x.kind === 'file'; }).map(function(x){ return x.getAsFile(); });
      if(F.length){ ev.preventDefault(); linjeFiler(A, z.dataset.yd, +z.dataset.i, F); } });
  }

  function zone(e, l, i, attrs){
    var A = window.MLNY && MLNY._api ? MLNY._api() : null; if(!A) return '';
    bind(A);
    var b = boks(e.id, i);
    return '<style>' + STIL + '</style><label class="ld-zone" tabindex="0" ' + attrs + '><input type="file" accept="application/pdf" hidden data-m8c="ldfil" ' + attrs + '>'
      + '<span class="ld-ik">⇣</span><span>Upload invoice</span></label>' + b;   /* Wendie 10.11.2026: lige under overskriften, tydeligere, kun «Upload invoice» */
  }

  function boks(id, i){
    if(!SVAR || SVAR.m.id !== id || SVAR.m.i !== i) return '';
    var A = window.MLNY && MLNY._api ? MLNY._api() : null; if(!A) return '';
    var e = A.esc, f = SVAR.f;
    var hd = 'Invoice ' + e(f.faktura || '') + (f.ordre ? ' · order ' + e(f.ordre) : '') + (f.betal ? ' · pay by ' + A.kd(f.betal) : '') + (f.pnr ? ' · ' + e(f.pnr) : '') + (f.total != null ? ' · ' + A.nf(f.total) + ' ' + e(f.val || '') : '');
    var rows = SVAR.ret.map(function(r){ return '<tr><td>' + e(r[0]) + '</td><td class="ld-gl">' + e(r[1]) + '</td><td class="ld-ny">' + e(r[2]) + '</td></tr>'; }).join('');
    return '<div class="ld-boks"><div class="ld-hd"><b>' + hd + '</b><button class="ld-x" data-m8="ldluk" title="Close">×</button></div>'
      + (rows ? '<table class="ld-t"><tbody>' + rows + '</tbody></table>' : '<p class="ld-p">The price line already matched the invoice — nothing was changed.</p>')
      + (SVAR.adv.length ? '<ul class="ld-adv">' + SVAR.adv.map(function(a){ return '<li>' + e(a) + '</li>'; }).join('') + '</ul>' : '')
      + '<p class="ld-p">Read from ' + e(SVAR.fil || 'the invoice') + (f.rute ? ' · ' + e(f.rute) : '') + (f.deltagere.length ? ' · ' + e(f.deltagere.join(', ')) : '') + '</p></div>';
  }

  var STIL = '.ld-zone{display:inline-flex;align-items:center;gap:8px;margin:10px 0 12px;padding:8px 16px;border-radius:9px;background:#231F45;color:#fff;font:600 13px/1.2 Inter,system-ui,sans-serif;cursor:pointer;border:1.5px dashed transparent;transition:background .15s}'
    + '.ld-zone:hover{background:#3A3470}.ld-zone.over{background:#fff;color:#231F45;border-color:#7B66E0}.ld-ik{font-size:15px;color:#CFC4FF}.ld-zone.over .ld-ik{color:#7B66E0}'
    + '.ld-boks{margin:0 0 12px;padding:12px 14px;border-radius:12px;background:#F1EEFB;border:1px solid rgba(60,45,130,.12);color:#1C1934;font:13px/1.45 Inter,system-ui,sans-serif}'
    + '.ld-hd{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px}.ld-hd b{font-weight:600}'
    + '.ld-x{border:0;background:none;font-size:18px;line-height:1;cursor:pointer;color:#6B6690}'
    + '.ld-t{width:100%;border-collapse:collapse}.ld-t td{padding:3px 8px 3px 0;border-top:1px solid rgba(60,45,130,.08)}'
    + '.ld-gl{color:#8A86A6;text-decoration:line-through}.ld-ny{font-weight:600}'
    + '.ld-adv{margin:8px 0 0;padding-left:18px;color:#8A4B00}.ld-p{margin:6px 0 0;color:#6B6690;font-size:12px}';

  function kobl(){
    var A = window.MLNY && MLNY._api ? MLNY._api() : null; if(!A) return false;
    A.HANDL.ldluk = function(){ SVAR = null; A.ydTegn(); };
    A.HANDLC.ldfil = function(el){ var F = [].slice.call(el.files || []); el.value = ''; return linjeFiler(A, el.dataset.yd, +el.dataset.i, F); };
    return true;
  }
  if(!kobl()){ var n = 0, t = setInterval(function(){ if(kobl() || ++n > 120) clearInterval(t); }, 250); }

  window.LayoverDocs = {
    knap: 'Upload itinerary',   /* Wendie 10.11.2026: «her skal der kun stå "Upload itinerary"» — træk, ⌘V og klik virker stadig */
    klip: klip, zone: zone,
    _laes: laesFaktura, _erFaktura: erFaktura   /* til test: læser uden at gemme */
  };
})();
