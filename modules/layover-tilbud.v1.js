/* modules/layover-tilbud.v1.js — R1042 (Wendie 13.11.2026)
   «Fetch the prices from the offer» på mellemlandingen, gjort overskuelig:
   «den grå baggrundsfarve er forfærdelig … jeg kan ikke finde halve og hoved i hvad det er jeg bliver informeret om og skal forholde mig til
    … Det burde fremgå meget tydeligt i formspree hvilket tilbud og løsninger som kunden valgte at booke».
   1) Øverst: hvad kunden bookede (booking_requests fra Formspree): hotel, villa, forplejning, fly, pris, rejsende.
   2) Hotellet kunden bookede er sat på forhånd; de andre hoteller i tilbuddet står samlet og foldet sammen («Not booked by the customer»).
   3) Advarslerne deles i «Check before you add» (kræver en handling) og «Good to know» (kun info). Advarsler om ting kunden ikke valgte, forsvinder.
   Index kalder modulet fra tbData (forvalg) og tbHtml (html). Mangler filen, er alt som før. Læser kun — skriver intet. */
(function(){
  'use strict';
  var BK = {}, HENTER = {}, BRUGT = {};
  /* index sender sine egne hjælpere med (tb-funktionerne ligger inde i mellemlandingens scope) */
  var C = {};
  function esc(v){ return C.esc(v); } function nf(v){ return C.nf(v); } function kd(v){ return C.kd(v); }
  function tbBliver(x){ return C.tbBliver(x); } function tbKan(x){ return C.tbKan(x); } function tbDkk(b, v){ return C.tbDkk(b, v); }
  function pkSel(a, b, c){ return C.pkSel(a, b, c); } function plKildeEn(v){ return C.plKildeEn(v); }
  function tbTegn(){ if(C.tbTegn) C.tbTegn(); }

  function T(){ try { return MLNY._api().T() || {}; } catch(_){ return {}; } }
  function rens(s){ return String(s || '').toLowerCase().replace(/\(.*?\)/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\b(the|resort|maldives|by|and|hotel)\b/g, ' ').replace(/\s+/g, ' ').trim(); }
  function sammeHotel(a, b){ var x = rens(a), y = rens(b); return !!x && !!y && (x === y || x.indexOf(y) > -1 || y.indexOf(x) > -1); }
  function atol(s){ var m = /\(([^)]+)\)/.exec(String(s || '')); return m ? m[1].trim() : ''; }

  /* bookingen fra Formspree for denne rejse (eller dens henvendelse) */
  function booking(){
    var t = T(), id = t.id; if(!id) return null;
    if(BK[id] !== undefined) return BK[id];
    if(!HENTER[id]){ HENTER[id] = true;
      var q = db.from('booking_requests').select('id,modtaget_at,hotel,vaerelsestype,forplejning,pris,valuta,afrejse,hjemrejse,naetter,rejsende,raa,trip_id,lead_id')
        .order('modtaget_at', {ascending: false}).limit(1);
      q = t.lead_id ? q.or('trip_id.eq.' + id + ',lead_id.eq.' + t.lead_id) : q.eq('trip_id', id);
      q.then(function(r){ BK[id] = (r && r.data && r.data[0]) || null; HENTER[id] = false; try { tbTegn(); } catch(_){} },
             function(){ BK[id] = null; HENTER[id] = false; try { tbTegn(); } catch(_){} });
    }
    return undefined;   /* henter stadig */
  }
  /* «== FLYREJSE ==\nValgt: Inkluderet — Etihad Airways · Economy Class · 29. dec. → 6. jan. (fra København)» */
  function flyValg(b){
    var msg = (((b || {}).raa || {}).submission || {}).message || '';
    var m = /==\s*FLY\w*\s*==\s*[\r\n]+\s*Valgt:\s*([^\r\n]+)/i.exec(msg); if(!m) return null;
    var tx = m[1].trim(), alt = /alternativ/i.test(tx), ingen = /^(ingen|uden|eget|ikke)/i.test(tx);
    var en = tx.replace(/^Inkluderet\s*[—-]\s*/i, '').replace(/^Alternativ(?:\s+flyrejse)?\s*[—-]?\s*/i, '').replace(/\(fra /gi, '(from ').replace(/\bfra\b/gi, 'from')
      .replace(/\bdec\./gi, 'Dec').replace(/\bjan\./gi, 'Jan').replace(/\bfeb\./gi, 'Feb').replace(/\bmar\./gi, 'Mar').replace(/\bapr\./gi, 'Apr').replace(/\bmaj\.?/gi, 'May')
      .replace(/(\d{1,2})\.(?=\s)/g, '$1').replace(/København/g, 'Copenhagen').replace(/Aalborg/g, 'Aalborg').replace(/Billund/g, 'Billund').replace(/\bjun\./gi, 'Jun').replace(/\bjul\./gi, 'Jul').replace(/\baug\./gi, 'Aug').replace(/\bsep\./gi, 'Sep').replace(/\bokt\./gi, 'Oct').replace(/\bnov\./gi, 'Nov');
    return {raa: tx, tekst: en, alternativ: alt, ingen: ingen};
  }

  /* tbData: hotellet kunden bookede vælges, de andre hoteller fravælges (kun hvis ingen har sat hak selv) */
  /* Første gang bookingen er der (pr. opslag), sættes hakkene efter den — derefter bestemmer den, der klikker. */
  function forvalg(hoteller, fly, TB, ctx){
    if(ctx) C = ctx;
    var b = booking(); if(!b || !b.hotel) return;
    var bookede = hoteller.filter(function(h){ return sammeHotel(h.navn, b.hotel); });
    if(!bookede.length) return;
    var noegle = T().id + '|' + C.TB.version + '|' + C.TB.n;
    hoteller.forEach(function(h){ h.kundeValgt = bookede.indexOf(h) > -1; h.ikkeValgt = !h.kundeValgt;
      if(!BRUGT[noegle] && !h.dublet){ C.TB.valg[h.k] = h.kundeValgt; var tk = 't' + h.k.slice(1); if(C.TB.valg[tk] != null) C.TB.valg[tk] = h.kundeValgt; } });
    var fv = flyValg(b);
    if(!BRUGT[noegle] && fv && fv.ingen) (fly || []).forEach(function(f){ C.TB.valg[f.k] = false; });
    BRUGT[noegle] = true;
  }

  /* advarslerne: handling eller info — og væk med dem om ting kunden ikke bookede */
  function sorter(adv, D, b, fv){
    var ude = D.linjer.filter(function(x){ return x.hotel && x.ikkeValgt; }).map(function(x){ return x.navn; });
    var gør = [], info = [];
    adv.forEach(function(a){
      if(ude.some(function(n){ return a.indexOf(n + ':') === 0 || a.indexOf(n + ' ') === 0; })) return;
      if(/alternative flight/i.test(a)){
        if(fv && fv.alternativ) gør.push('The customer chose the ALTERNATIVE flight (' + fv.tekst + '). Only the main flight is added — change the flight on the price line.');
        else if(!fv) gør.push(a);
        return;   /* kunden valgte hovedflyet: intet at gøre */
      }
      if(/Both become price lines — the booking is the selected one/.test(a) || /PACKAGE/.test(a)) { info.push(a); return; }
      gør.push(a);
    });
    if(b){
      var h = D.linjer.find(function(x){ return x.hotel && x.kundeValgt; });
      if(!h) gør.push('The customer booked «' + b.hotel + '», but that hotel is not in the offer from the editor. Check that it is the right offer version.');
      else {
        if(b.vaerelsestype && !h.villas.some(function(v){ return rens(v.navn) === rens(b.vaerelsestype) || rens(v.navn).indexOf(rens(b.vaerelsestype)) > -1; }))
          gør.push('The customer booked the villa «' + b.vaerelsestype + '», but the offer has ' + h.villas.map(function(v){ return '«' + v.navn + '»'; }).join(', ') + ' — check the villa on the price line.');
        var at = atol(b.hotel);
        if(at && h.sted && rens(at) !== rens(h.sted)) info.push('Location: the booking says ' + at + ', the offer says ' + h.sted + ' — the offer is used. Check it in the editor if it is wrong.');
      }
      if(D.salg != null && b.pris != null && Math.round(D.salg) !== Math.round(b.pris))
        gør.push('Price: the customer booked ' + nf(b.pris) + ' ' + (b.valuta || '') + ', the offer says ' + nf(D.salg) + ' ' + (D.salgVal || '') + '. The customer\'s price is the one that counts.');
      if(fv && fv.ingen) gør.push('The customer booked WITHOUT flights (' + fv.tekst + '). Untick the flight.');
    }
    return {gør: gør, info: info};
  }

  function dato(ts){ var d = ts ? new Date(ts) : null; if(!d || isNaN(d)) return '';
    return d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' ' + d.getFullYear(); }

  function raekke(x, D, dis){
    var bl = tbBliver(x), kan = tbKan(x), dk = kan ? tbDkk(x.bel, x.val) : '';
    var vm = x.hotel && x.villas.length > 1 && C.TB.valg[x.k] ? '<div class="tb-rute tb-ett">' + pkSel([['en', 'All villas on one price line'], ['hver', 'One price line per villa']], C.TB.vmode[x.k] || 'en', 'class="tb-sted" data-m8c="tbvmode" data-k="' + esc(x.k) + '"' + dis) + '</div>' : '';
    var lev = x.dely ? 'the hotel' : x.sup ? esc(plKildeEn(x.sup)) : '<span class="tv-mangler">none</span>';
    var pris = x.dely ? '<span class="tv-graa">in the hotel price</span>' : x.bel != null ? nf(x.bel) + ' ' + (x.val ? esc(x.val) : '<span class="tv-mangler">no currency</span>') + (dk ? '<small>' + dk + '</small>' : '')
      : '<span class="tv-mangler">' + (D.pakke && x.art !== 'fly' ? 'in the package' : x.udenPris && !x.fandtes ? 'no price yet' : 'price missing') + '</span>';
    var kv = x.kundeValgt ? '<span class="tv-kv">Booked by the customer</span>' : '';
    return '<div class="tv-r tb-' + bl[0] + (C.TB.valg[x.k] && kan ? ' tv-til' : '') + '">'
      + '<label class="tv-v"><input type="checkbox"' + (C.TB.valg[x.k] && kan ? ' checked' : '') + (kan && !x.dublet && !C.TB.laast ? '' : ' disabled') + ' data-m8c="tbvaelg" data-k="' + esc(x.k) + '">'
      + '<span><b>' + esc(x.navn) + '</b> ' + kv + '<small>' + esc((C.ART_NAVN || {})[x.art] || x.art) + (x.sted ? ' · ' + esc(x.sted) : '') + '</small></span></label>'
      + '<div class="tv-hvad">' + (esc(x.hvad) || '—') + vm + '</div>'
      + '<div class="tv-lev"><small>Supplier</small>' + lev + '</div>'
      + '<div class="tv-pris"><small>Cost</small>' + pris + '</div>'
      + '<div class="tv-bl"><small>Becomes</small>' + esc(bl[1]) + '</div></div>';
  }

  function html(ctx){
    C = ctx; var adv = ctx.adv || [], raa = ctx.raa || [], D = ctx.D;
    var b = booking();
    var dis = C.TB.laast ? ' disabled' : '';
    var fv = b ? flyValg(b) : null;
    var S = sorter(adv, D, b, fv);
    raa.forEach(function(r){ S.gør.unshift(r); });
    if(!b && D.alternativer > 1 && !D.pakke) S.gør.push('The offer has ' + D.alternativer + ' hotel options. Tick the one that was sold — the others were alternatives.');
    var t = T(), navnRejse = [(t.customers || {}).first_name, (t.customers || {}).last_name].filter(Boolean).join(' ');

    /* 1 · hvad kunden bookede */
    var kunde;
    if(b === undefined) kunde = '<div class="tv-kunde tv-tom">Looking for the customer\'s booking (Formspree)…</div>';
    else if(!b) kunde = '<div class="tv-kunde tv-tom"><b>No booking from the customer (Formspree) is linked to this trip.</b> Tick what the customer bought.</div>';
    else {
      var rj = Array.isArray(b.rejsende) ? b.rejsende : [];
      var felt = function(k, v, hel){ return v ? '<div' + (hel ? ' class="tv-hel"' : '') + '><dt>' + k + '</dt><dd>' + v + '</dd></div>' : ''; };
      kunde = '<div class="tv-kunde"><div class="tv-k-hd"><b>The customer booked</b><span>Formspree · ' + esc(dato(b.modtaget_at)) + '</span></div><dl>'
        + felt('Hotel', esc(b.hotel || '—'))
        + felt('Villa', esc(b.vaerelsestype || ''))
        + felt('Meal plan', esc(b.forplejning || ''))
        + felt('Flight', fv ? esc(fv.tekst) + (fv.alternativ ? ' <span class="tv-alt">alternative flight</span>' : fv.ingen ? '' : ' <span class="tv-ok">the flight in the offer</span>') : '')
        + felt('Dates', b.afrejse ? esc(kd(b.afrejse)) + (b.hjemrejse ? ' → ' + esc(kd(b.hjemrejse)) : '') + (b.naetter ? ' · ' + b.naetter + ' nights' : '') : '')
        + felt('Travellers', rj.length ? rj.length + ' · ' + esc(rj.map(function(p){ return p.navn; }).join(', ')) : '', true)
        + felt('Price', b.pris != null ? '<b>' + nf(b.pris) + ' ' + esc(b.valuta || '') + '</b>' : '')
        + '</dl></div>';
    }

    /* 2 · beslutninger */
    var beslut = S.gør.length
      ? '<div class="tv-sek"><h4>Check before you add <span class="tv-n">' + S.gør.length + '</span></h4><ol class="tv-gor">' + S.gør.map(function(a){ return '<li>' + esc(a) + '</li>'; }).join('') + '</ol></div>'
      : '<div class="tv-sek"><p class="tv-alt-ok">Nothing to decide — it matches what the customer booked.</p></div>';

    /* 3 · linjerne: det bookede / resten foldet sammen */
    var med = D.linjer.filter(function(x){ return !x.ikkeValgt; }), ude = D.linjer.filter(function(x){ return x.ikkeValgt; });
    var liste = D.linjer.length ? '<div class="tv-sek"><h4>Services from the offer</h4><div class="tv-tab">' + med.map(function(x){ return raekke(x, D, dis); }).join('') + '</div>'
      + (ude.length ? '<details class="tv-ude"' + (ude.some(function(x){ return C.TB.valg[x.k]; }) ? ' open' : '') + '><summary>Not booked by the customer · ' + ude.length + (ude.length === 1 ? ' option' : ' options') + ' in the offer</summary><div class="tv-tab">' + ude.map(function(x){ return raekke(x, D, dis); }).join('') + '</div></details>' : '')
      + '</div>' : '<p class="tomtxt">The offer has no hotels, flights or transfers with a price.</p>';

    /* 4 · info */
    var fod = [];
    S.info.forEach(function(a){ fod.push(esc(a)); });  /* esc her; resten er egen tekst */
    if(D.bank != null) fod.push('Bank fee ' + nf(D.bank) + ' ' + D.bankVal + ' and margin target ' + (D.margen != null ? D.margen : '—') + ' % belong in Pricing.');
    else if(D.margen != null) fod.push('Margin target ' + D.margen + ' % belongs in Pricing.');
    if(D.salg != null) fod.push('The offer\'s sales price: ' + nf(D.salg) + ' ' + esc(D.salgVal) + '.');

    return '<div class="anl aaben tbboks tv">' + STIL
      + '<div class="tv-hd">Offer in the editor · <b>' + esc(C.TB.kunde) + '</b> · version ' + esc(String(C.TB.version)) + (C.TB.ts ? ' · saved ' + esc(dato(C.TB.ts)) : '')
      + (C.TB.praecis ? '' : ' · <span class="tv-mangler">the name differs — the trip says «' + esc(navnRejse) + '»</span>') + '</div>'
      + kunde + beslut + liste
      + (fod.length ? '<div class="tv-info"><b>Good to know</b><ul>' + fod.map(function(f){ return '<li>' + f + '</li>'; }).join('') + '</ul></div>' : '')
      + '<div class="anl-fod"><button class="b fyldt" data-m8="tblaeg"' + dis + '>' + (C.TB.laast ? 'Adding …' : 'Add the selected') + '</button><button class="b mini" data-m8="tbluk"' + dis + '>Close</button></div></div>';
  }

  var STIL = '<style>'
    + '.tbboks.tv{background:#fff!important;border:1px solid rgba(60,45,130,.14)!important;border-radius:16px!important;padding:18px 20px!important;color:#1C1934;font:13px/1.5 Inter,system-ui,sans-serif;box-shadow:0 1px 2px rgba(28,25,52,.04)}'
    + '.tv .tv-hd{font-size:12px;color:#6B6690;margin-bottom:12px}.tv .tv-hd b{color:#1C1934;font-weight:600}'
    + '.tv .tv-kunde{border-radius:12px;background:#EEF7F1;border:1px solid rgba(31,122,77,.22);padding:12px 16px;margin-bottom:14px}'
    + '.tv .tv-kunde.tv-tom{background:#F6F4FC;border-color:rgba(60,45,130,.12);color:#4A4570}'
    + '.tv .tv-k-hd{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:6px}.tv .tv-k-hd b{font-size:14px;color:#1F5C3D}.tv .tv-k-hd span{font-size:11.5px;color:#4E7A62}'
    + '.tv dl{margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:7px 24px}.tv dl>div.tv-hel{grid-column:1/-1}.tv dl>div{display:flex;gap:10px}.tv dt{flex:0 0 84px;color:#4E7A62;font-size:11.5px;text-transform:uppercase;letter-spacing:.06em;padding-top:2px}.tv dd{margin:0;color:#1C1934}'
    + '.tv .tv-ok{font-size:11px;padding:1px 7px;border-radius:6px;background:rgba(31,122,77,.12);color:#1F7A4D;margin-left:4px}.tv .tv-alt{font-size:11px;padding:1px 7px;border-radius:6px;background:rgba(176,120,20,.15);color:#8A5A00;margin-left:4px}'
    + '.tv .tv-sek{margin:0 0 14px}.tv h4{margin:0 0 8px;font-size:13px;font-weight:600;color:#1C1934;display:flex;align-items:center;gap:8px}'
    + '.tv .tv-n{font-size:11px;min-width:20px;height:20px;border-radius:10px;background:#B07814;color:#fff;display:inline-flex;align-items:center;justify-content:center;padding:0 6px}'
    + '.tv .tv-gor{margin:0;padding:0;list-style:none;counter-reset:g}.tv .tv-gor li{counter-increment:g;position:relative;padding:9px 12px 9px 40px;margin-bottom:6px;border-radius:10px;background:#FBF6EC;border:1px solid rgba(176,120,20,.25);color:#3D2E10}'
    + '.tv .tv-gor li::before{content:counter(g);position:absolute;left:12px;top:9px;width:18px;height:18px;border-radius:9px;background:#B07814;color:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center}'
    + '.tv .tv-alt-ok{margin:0;padding:9px 12px;border-radius:10px;background:#EEF7F1;color:#1F5C3D}'
    + '.tv .tv-tab{display:flex;flex-direction:column;gap:6px}'
    + '.tv .tv-r{display:grid;grid-template-columns:minmax(170px,1.1fr) minmax(200px,2fr) minmax(90px,.7fr) minmax(100px,.8fr) minmax(110px,.9fr);gap:14px;align-items:start;padding:11px 14px;border-radius:12px;border:1px solid rgba(60,45,130,.10);background:#FAF9FE}'
    + '.tv .tv-r.tv-til{background:#F3F0FD;border-color:rgba(108,84,214,.35)}'
    + '.tv .tv-r small{display:block;font-size:10.5px;color:#8A85A8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px}'
    + '.tv .tv-pris small:last-child:not(:first-child){text-transform:none;letter-spacing:0;margin:2px 0 0}'
    + '.tv .tv-v{display:flex;gap:10px;align-items:flex-start;cursor:pointer}.tv .tv-v input{width:16px!important;height:16px!important;min-height:0!important;flex:0 0 16px;margin:2px 0 0!important;padding:0!important;accent-color:#6C54D6}'
    + '.tv .tv-v b{font-weight:600;color:#1C1934}.tv .tv-v small{text-transform:none;letter-spacing:0;font-size:11.5px;margin-top:2px}'
    + '.tv .tv-kv{display:inline-block;font-size:10.5px;padding:1px 7px;border-radius:6px;background:rgba(31,122,77,.12);color:#1F7A4D;margin-left:4px;vertical-align:1px}'
    + '.tv .tv-hvad{color:#3A3560}.tv .tv-bl{color:#4A4570}.tv .tb-ny .tv-bl,.tv .tb-paa .tv-bl{color:#1F7A4D;font-weight:500}.tv .tb-ikke .tv-bl,.tv .tb-none .tv-bl{color:#8A85A8}'
    + '.tv .tv-mangler{color:#B23A5E}.tv .tv-graa{color:#8A85A8}'
    + '.tv .tv-ude{margin-top:8px}.tv .tv-ude summary{cursor:pointer;color:#6B6690;font-size:12.5px;padding:6px 2px}.tv .tv-ude .tv-r{opacity:.75}'
    + '.tv .tv-info{margin:4px 0 12px;padding:10px 14px;border-radius:10px;background:#F6F4FC;color:#6B6690;font-size:12px}.tv .tv-info b{color:#4A4570;font-weight:600}.tv .tv-info ul{margin:4px 0 0;padding-left:18px}'
    + '.tv select.tb-sted{margin-top:8px}'
    + '@media (max-width:900px){.tv .tv-r{grid-template-columns:1fr 1fr}.tv .tv-v,.tv .tv-hvad{grid-column:1/-1}}'
    + '</style>';

  window.LayoverTilbud = { forvalg: forvalg, html: html, _test: {flyValg: flyValg, sammeHotel: sammeHotel, sorter: sorter} };
})();
