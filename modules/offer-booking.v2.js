/* ═══ Panda · modul: bookingdata fra tilbuddet — modules/offer-booking.v2.js ═══
   R847 (Wendie 19.10.2026): Rasmus har koblet Farewise paa editoren. Det han har
   taget udgangspunkt i — flyplanen, PNR, nettopris, udstedelsesfrist, og hotellets
   bekraeftelsesnummer og afbestillingsfrist — skal med over, naar man trykker
   «Fetch the prices from the offer» paa mellemlandingen.

   EGEN FIL (Wendie 19.10.2026: «husk nu det med de forskellige filer — ikke kun
   1 stor index fil»). index.html har kun fem korte kroge, der kalder herind, og
   de goer ingenting, hvis filen ikke er indlaest. Saa kan modulet aldrig vaelte
   den gamle import: mangler filen, opfoerer Panda sig praecis som v1.75.

   Kilden er Rasmus' tilbuds-opslag v5 (19.10.2026) via maldivia-core/hent-tilbud:
     trip.flight    = {airline, flightSupplier, booking{pnr, status, netPrice,
                       netCurrency, ticketingDeadline, supplier}, carrierClass,
                       out, ret, mids[]  (hver: {date, legs[{date, depart, arrive,
                       plusDay, fromIata, toIata, carrier, cabinClass}]})}
     trip.altFlight = samme form + price, class, route
     trip.hotels[i] = {supplier, booking{confNumber, netPrice, netCurrency,
                       freeCancelUntil, supplier, status}}

   Regler:
     · Intet overskrives. Modulet fylder kun den prislinje, importen LIGE har lavet.
     · Er bookingen en anden end tilbuddet (leverandoer, pris eller valuta), bliver det to
       prislinjer: tilbuddets og bookingens — bookingens er den valgte (Wendie 19.10.2026).
     · Der gaettes ikke: editoren har ingen flynumre, saa de staar tomme.
       Udstedelsesfristen har intet klokkeslaet, saa det staar tomt.
     · «Booket» er ikke «udstedt» (R685) — billetten markeres aldrig som udstedt
       herfra, og hotellet markeres aldrig som bekraeftet. Det goer et menneske.
     · Siger editoren noget, der ikke passer sammen, staar det som advarsel i boksen.
     · R851 (Wendie 19.10.2026): hentes tilbuddet igen, kommer intet ind to gange. Staar
       tilbudsprisen der allerede, kaldes paaLinje med H.eksisterende = true paa DEN linje:
       kun tomme felter fyldes. Den bookede linje laves kun, hvis den ikke allerede findes
       (samme conf./PNR, eller samme leverandoer + beloeb + valuta).
     · Fristen fra editoren vinder over en anden frist paa linjen — og det staar i kvitteringen. */
(function(){
  'use strict';
  const VERSION = 'offer-booking v2';
  const s = v => v == null ? '' : String(v).trim();

  /* «21.12.2026» eller «2026-12-21» → «2026-12-21». Alt andet → null (der gaettes ikke). */
  function isoDato(d){
    d = s(d);
    let m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(m) return d;
    m = d.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
    if(m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
    return null;
  }
  function plusDag(iso, n){
    const x = new Date(iso + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n);
    return x.toISOString().slice(0, 10);
  }
  const kl = t => { const m = s(t).match(/^(\d{1,2})[:.](\d{2})$/); return m ? m[1].padStart(2, '0') + ':' + m[2] : null; };
  /* «Business Class» → Pandas kabine (KABINER). Ukendt → null. */
  function kabine(c){
    c = s(c);
    if(/first/i.test(c)) return 'First';
    if(/premium/i.test(c)) return 'Premium Economy';
    if(/business/i.test(c)) return 'Business';
    if(/economy/i.test(c)) return 'Economy';
    return null;
  }
  /* «Qatar Airways» → «QR» via Pandas egen liste (IATA_SELSKAB). Ukendt → null. */
  function selskabKode(navn, R){
    const M = (R && R.IATA_SELSKAB) || {}, n = s(navn).toLowerCase();
    if(!n) return null;
    return Object.keys(M).find(k => String(M[k]).toLowerCase() === n) || null;
  }
  /* «70679,00» / «70.679» → 70679. Ukendt → null. */
  function tal(v){
    const t = s(v).replace(/\s/g, '');
    if(!t) return null;
    let n;
    if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) n = Number(t.replace(/\./g, '').replace(',', '.'));
    else if(/^\d+(,\d+)?$/.test(t)) n = Number(t.replace(',', '.'));
    else if(/^\d+(\.\d+)?$/.test(t)) n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  /* Retningerne i den raekkefoelge, de flyves: ud, mellem-etaper, hjem. */
  function retninger(f){
    if(!f) return [];
    const mids = Array.isArray(f.mids) ? f.mids : (f.mid ? [f.mid] : []);
    return [f.out].concat(mids, [f.ret]).filter(d => d && Array.isArray(d.legs) && d.legs.length);
  }

  /* Editorens ben → Pandas segmenter (samme felter som en indlaest billet).
     Datoen: retningens dato paa foerste ben; de naeste ben letter samme dag, som det
     forrige landede — eller dagen efter, hvis de letter foer det landede (natten i Doha).
     Lander et ben foer det letter, er det dagen efter (Pandas doegnregel, INDGREB 13). */
  function segmenter(f, R){
    const ud = [], adv = [];
    const pnr = s(f && f.booking && f.booking.pnr) || null;
    const kab0 = kabine(f && f.carrierClass);
    for(const d of retninger(f)){
      let forrigeDato = null, forrigeAn = null;
      d.legs.forEach((lg, j) => {
        const u = kl(lg.depart), a = kl(lg.arrive);
        let dato = isoDato(lg.date);
        if(!dato && j === 0) dato = isoDato(d.date);
        if(!dato && j > 0 && forrigeDato) dato = (u && forrigeAn && u < forrigeAn) ? plusDag(forrigeDato, 1) : forrigeDato;
        const plus = !!lg.plusDay || (!!u && !!a && a < u);
        const ankomst = dato ? (plus ? plusDag(dato, 1) : dato) : null;
        if(!dato) adv.push(s(lg.fromIata) + '–' + s(lg.toIata) + ' has no date in the editor');
        ud.push({nr: null, flynr: null, kode: selskabKode(lg.carrier || (f && f.airline), R),
          dato, ud: u, an: a, ankomstDato: ankomst, plus,
          fra: s(lg.fromIata).toUpperCase() || null, til: s(lg.toIata).toUpperCase() || null, fraBy: null, tilBy: null,
          flyvetid: null, flytype: null, kabine: kabine(lg.cabinClass) || kab0, bk: null,
          bagage: null, forplejning: null, terminal: null, pnr, status: null, _editor: true});
        forrigeDato = ankomst; forrigeAn = a;
      });
    }
    ud.sort((x, y) => ((x.dato || '') + 'T' + (x.ud || '')).localeCompare((y.dato || '') + 'T' + (y.ud || '')));
    return {segmenter: ud, advarsler: adv};
  }
  const rute = S => {
    if(!S.length) return '';
    const veje = []; let v = [S[0]];
    /* et skift: samme lufthavn, og videre senest dagen efter landing (ellers er det en ny etape) */
    const skift = (a, b) => b.fra === a.til && !!b.dato && !!(a.ankomstDato || a.dato) && b.dato <= plusDag(a.ankomstDato || a.dato, 1) && !(b.dato === plusDag(a.ankomstDato || a.dato, 1) && (b.ud || '') > (a.an || ''));
    for(let i = 1; i < S.length; i++){ if(skift(S[i - 1], S[i])) v.push(S[i]); else { veje.push(v); v = [S[i]]; } }
    veje.push(v);
    return veje.map(x => x[0].fra + ' → ' + x[x.length - 1].til).join(' · ');
  };
  const kort = iso => { if(!iso) return ''; const d = new Date(iso + 'T12:00:00Z'); return d.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}); };

  /* ── KROG 1: tbData — flyets raekke i boksen faar editorens data med ── */
  function fly(fx, t, R){
    const f = t && t.flight;
    if(!f) return;
    const b = f.booking || {}, sg = segmenter(f, R);
    fx._editor = {fly: f, alt: t.altFlight || null, seg: sg.segmenter, segAdv: sg.advarsler,
      pnr: s(b.pnr), frist: isoDato(b.ticketingDeadline), status: s(b.status), lev: s(b.supplier), net: tal(b.netPrice), netVal: s(b.netCurrency).toUpperCase().slice(0, 3)};
    const E = fx._editor, dele = [];
    if(sg.segmenter.length) dele.push(rute(sg.segmenter) + ' · ' + sg.segmenter.length + (sg.segmenter.length === 1 ? ' flight' : ' flights'));
    if(f.airline || f.carrierClass) dele.push([s(f.airline), kabine(f.carrierClass) || s(f.carrierClass)].filter(Boolean).join(' · '));
    if(E.pnr) dele.push('PNR ' + E.pnr + (E.status === 'booked' ? ' (booked)' : ''));
    if(E.frist) dele.push('ticketing deadline ' + kort(E.frist));
    if(dele.length && (!fx.hvad || fx.hvad === '—')) fx.hvad = dele.join(' · ');
    else if(dele.length) fx.hvad = fx.hvad + ' · ' + dele.slice(2).join(' · ');
    if(!fx.sted && f.airline) fx.sted = s(f.airline);
  }

  /* ── KROG 2: tbData — hotellets raekke faar bekraeftelsesnummer og afbestillingsfrist med ── */
  function hotel(x, th){
    const b = (th && th.booking) || {};
    const conf = s(b.confNumber), cxl = isoDato(b.freeCancelUntil);
    if(!conf && !cxl && !s(b.supplier)) return;
    x._editor = {conf, cxl, status: s(b.status), lev: s(b.supplier), net: tal(b.netPrice), netVal: s(b.netCurrency).toUpperCase().slice(0, 3)};
    const dele = [];
    if(conf) dele.push('conf. ' + conf);
    if(cxl) dele.push('free cancellation until ' + kort(cxl));
    if(dele.length) x.hvad = [x.hvad, dele.join(' · ')].filter(Boolean).join(' · ');
  }

  /* ── Hvad blev der booket — og er det noget andet end det, tilbuddet byggede paa? ──
     Wendie 19.10.2026: «jeg vil gerne se, hvad det var, vi baserede tilbuddet paa, og hvad det
     var, vi rent faktisk endte med at booke.» Er leverandoer, pris eller valuta en anden i
     bookingen, bliver det TO prislinjer: tilbuddets (som den var) og bookingens (valgt). */
  const ens = (a, b) => s(a).toLowerCase() === s(b).toLowerCase();
  const beloeb = (n, v) => n == null ? '—' : Number(n).toLocaleString('da-DK', {maximumFractionDigits: 2}) + (v ? ' ' + v : '');
  /* bookingens leverandoer med Pandas egen stavemaade: «Maldivia (Contract)» → saesonens kontrakt
     («Kontrakt 2026/27», som Panda selv kalder den), «FareWise» → «Farewise» */
  function levNavn(navn, art, R){
    const v = s(navn); if(!v) return '';
    if(/contract|kontrakt/i.test(v) && R && R.kontraktNavn) return R.kontraktNavn();
    const L = [].concat(R && R.levListe ? R.levListe(art === 'fly' ? 'fly' : 'hotel', null) : [], (R && R.LEVERANDOERER) || []);
    return L.find(x => ens(x, v)) || v;
  }
  function booket(x, E, R){
    const erBooket = E.status === 'booked' || !!E.conf || !!E.pnr;
    const lev = levNavn(E.lev, x.art, R), grund = [];
    if(lev && x.sup && !ens(lev, x.sup)) grund.push('supplier');
    if(E.net != null && x.bel != null && Math.round(E.net) !== Math.round(x.bel)) grund.push('price');
    if(E.netVal && x.val && E.netVal !== x.val) grund.push('currency');
    return {erBooket, lev, grund, toLinjer: erBooket && grund.length > 0 && !(x.hotel && (x.villas || []).length > 1)};
  }

  /* ── KROG 3: tbHtml — korte advarsler (Wendie 12.10: korte tekster) ── */
  function advarsler(D, t, R){
    const A = [];
    for(const x of (D && D.linjer) || []){
      const E = x._editor; if(!E) continue;
      const B = booket(x, E, R);
      if(B.toLinjer) A.push(x.navn + ': the offer was based on ' + (x.sup || '—') + ' ' + beloeb(x.bel, x.val) + ', but it was booked with ' + (B.lev || x.sup || '—') + ' ' + beloeb(E.net != null ? E.net : x.bel, E.netVal || x.val) + '. Both become price lines — the booking is the selected one.');
      else if(B.erBooket && B.grund.length) A.push(x.navn + ': the booking differs from the offer (' + B.grund.join(', ') + '), but the offer has several villas — check the price lines by hand.');
      if(x.art === 'fly'){
        if(E.segAdv && E.segAdv.length) A.push('Flight: ' + E.segAdv.join(' · ') + ' — check the dates on the price line.');
        const alt = E.alt, harAlt = alt && retninger(alt).length;
        if(harAlt) A.push('The offer also has an alternative flight' + (s(alt.route) ? ' («' + s(alt.route) + '»)' : '') + '. Only the main flight is added — if the customer chose the alternative, check the flight.');
        if(E.pnr && !E.frist) A.push('Flight: PNR ' + E.pnr + ' has no ticketing deadline in the editor — add it on the price line.');
      }
    }
    return A;
  }

  /* Fristen fra editoren (R847). Tom → den saettes. Samme dato → intet. En anden dato → editorens vinder,
     og kvitteringen siger fra hvad til hvad (R851; Wendie 19.10: editorens frist er den rigtige). */
  function fristFra(maal, dato, note, tekst, info){
    if(!dato) return;
    const h = maal.hold || {}, foer = h.aktiv && s(h.dato) ? s(h.dato) : '';
    if(foer === dato) return;
    maal.hold = Object.assign({}, h, {aktiv: true, dato, tid: '', note});
    info.push(foer ? tekst + ' changed from ' + kort(foer) + (s(h.tid) ? ' ' + s(h.tid) : '') + ' to ' + kort(dato) + ' (from the editor)'
                   : tekst + ' ' + kort(dato) + ' — becomes a task when the price line is selected');
  }

  /* ── KROG 4: tblaeg — den nye prislinje fyldes ──
     H = {tbLinje, ver} fra index.html: samme opskrift paa en prislinje som importen selv bruger. */
  async function paaLinje(x, e, l, R, H){
    const E = x && x._editor;
    if(!E || !l || l === x._booketLinje) return [];
    const info = [];
    const st = R.st && R.st[e.id];
    const B = booket(x, E, R);
    let maal = l;   /* den linje, bookingens data kommer paa */
    /* R851: findes den bookede linje allerede (fra en tidligere hentning), bruges den */
    if(B.toLinjer && !x._booketLinje && st){
      const fandt = (st.linjer || []).find(z => z !== l && /^Booket i editoren/i.test(s(z.kilde)) && (
        (E.conf && s(z.ref) === s(E.conf)) || (E.pnr && z.raa && s(z.raa.pnr) === s(E.pnr)) ||
        (ens(z.lev, B.lev) && E.net != null && Math.round(+z.pris * 100) === Math.round(+E.net * 100) && s(z.val) === s(E.netVal || l.val))));
      if(fandt){ x._booketLinje = fandt; maal = fandt; info.push(x.navn + ': the booking is already on the service — not added again'); }
    }
    if(B.toLinjer && !x._booketLinje && H && H.tbLinje && st){
      const vill = x.hotel ? JSON.parse(JSON.stringify(l.villaer || null)) : null;
      const b = H.tbLinje(x, 'Booket i editoren · version ' + s(H.ver), vill, E.net != null ? E.net : l.pris);
      b.lev = B.lev || l.lev; b.val = E.netVal || l.val;
      const i = st.linjer.indexOf(l);
      st.linjer.splice(i + 1, 0, b);
      const v0 = Array.isArray(st.valgte) ? st.valgte : [];
      const varValgt = v0.includes(i);
      st.valgte = v0.map(v => v > i ? v + 1 : v).map(v => v === i ? i + 1 : v);
      x._booketLinje = b; maal = b;
      info.push(x.navn + ': offer ' + (l.lev || '—') + ' ' + beloeb(l.pris, l.val) + ' · booked ' + b.lev + ' ' + beloeb(b.pris, b.val) + (varValgt ? ' (selected)' : ''));
    }
    maal.raa = maal.raa || {};
    if(x.art === 'fly'){
      if(E.seg && E.seg.length && !(Array.isArray(maal.segmenter) && maal.segmenter.length)){
        maal.segmenter = JSON.parse(JSON.stringify(E.seg));
        info.push(x.navn + ': ' + E.seg.length + ' flights from the editor on the price line');
      }
      const eks = !!(H && H.eksisterende);   /* R851: en linje, der stod der i forvejen — kun tomme felter */
      if(E.pnr && !(eks && s(maal.raa.pnr))){ if(s(maal.raa.pnr) !== s(E.pnr)) info.push('PNR ' + E.pnr); maal.raa.pnr = E.pnr; }
      const f = E.fly || {};
      if(s(f.airline) && !(eks && s(maal.raa.selskab))) maal.raa.selskab = s(f.airline);
      if(kabine(f.carrierClass) && !(eks && s(maal.raa.klasse))) maal.raa.klasse = kabine(f.carrierClass);
      fristFra(maal, E.frist, 'From the editor' + (E.pnr ? ' · PNR ' + E.pnr : ''), 'ticketing deadline', info);
      maal.raa.editor = {pnr: E.pnr || null, status: E.status || null, lev: E.lev || null, net: E.net, netVal: E.netVal || null, frist: E.frist || null, version: VERSION};
      /* rejseplanen foelger, naar prislinjen er valgt (som en indlaest billet) */
      try {
        const i = (st && st.linjer || []).indexOf(maal);
        if(i >= 0 && R.erValgt && R.erValgt(e.id, i) && R.synkPlanlinjer && maal.segmenter && maal.segmenter.length){
          await R.synkPlanlinjer(e.id);
          R.sorterPlan && R.sorterPlan(); R.tegnPlan && R.tegnPlan();
        }
      } catch(err){ info.push('the itinerary could not be updated — ' + ((err && err.message) || err)); }
    }
    if(x.hotel){
      if(E.conf && !maal.ref){ maal.ref = E.conf; info.push(x.navn + ': conf. ' + E.conf); }
      fristFra(maal, E.cxl, 'From the editor' + (E.conf ? ' · conf. ' + E.conf : ''), 'free cancellation until', info);
      maal.raa.editor = {conf: E.conf || null, status: E.status || null, lev: E.lev || null, net: E.net, netVal: E.netVal || null, cxl: E.cxl || null, version: VERSION};
    }
    return info;
  }

  window.PandaOffer = {version: VERSION, fly, hotel, advarsler, paaLinje,
    _test: {isoDato, plusDag, kabine, selskabKode, tal, segmenter, rute, levNavn, booket}};
})();
