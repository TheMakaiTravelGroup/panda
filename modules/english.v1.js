/* modules/english.v1.js — R1033 (Wendie 10.11.2026)
   «den skal kunne genkende alle disse koder for flyselskaberne» og «ja alt skal være på engelsk».
   1) Flyselskaber: IATA-koden (LH, QR, EK …) → navnet. Bruges overalt, hvor Panda før havde sine egne små lister
      (billetlæseren, flyplanen, prislinjens Airline-felt, rejseplanen). Navnene på de ti faste i Airline-listen er de samme som før.
   2) Ord fra tilbud, Dolphin og leverandører (norsk/dansk) → engelsk i visningen, fx «Sjøfly · ca. 30 min» → «Seaplane · approx. 30 min».
      Kun visning — data i basen ændres ikke.
   Index slår op her; mangler filen, bruger index sine egne lister som før. */
(function(){
  'use strict';
  var K = {
    /* Mellemøsten og Golfen */
    QR:'Qatar Airways', EY:'Etihad Airways', EK:'Emirates', WY:'Oman Air', GF:'Gulf Air', SV:'Saudia', KU:'Kuwait Airways',
    FZ:'flydubai', G9:'Air Arabia', RJ:'Royal Jordanian', ME:'Middle East Airlines', MS:'EgyptAir', XY:'flynas', J9:'Jazeera Airways', IY:'Yemenia', '6E':'IndiGo',
    /* Europa — Skandinavien */
    SK:'SAS', DY:'Norwegian', D8:'Norwegian', DX:'DAT', WF:'Widerøe', AY:'Finnair', FI:'Icelandair', BT:'airBaltic', LO:'LOT', OG:'Play',
    /* Europa — øvrige */
    LH:'Lufthansa', LX:'Swiss', OS:'Austrian', SN:'Brussels Airlines', EW:'Eurowings', DE:'Condor', '4U':'Germanwings', EN:'Air Dolomiti',
    KL:'KLM', AF:'Air France', BA:'British Airways', VS:'Virgin Atlantic', IB:'Iberia', I2:'Iberia Express', UX:'Air Europa', VY:'Vueling',
    TP:'TAP Air Portugal', AZ:'ITA Airways', EI:'Aer Lingus', TK:'Turkish Airlines', PC:'Pegasus', A3:'Aegean', OA:'Olympic Air',
    OK:'Czech Airlines', RO:'Tarom', FB:'Bulgaria Air', JU:'Air Serbia', OU:'Croatia Airlines', LG:'Luxair', KM:'KM Malta Airlines',
    U2:'easyJet', FR:'Ryanair', W6:'Wizz Air', HV:'Transavia', TO:'Transavia France', LS:'Jet2', BY:'TUI', X3:'TUI fly', OR:'TUI fly',
    PS:'Ukraine International', B2:'Belavia', SU:'Aeroflot', '2L':'Helvetic', WK:'Edelweiss', HG:'Hello',
    /* Indiske Ocean og Afrika */
    Q2:'Maldivian', '4Y':'Flyme', NR:'Manta Air', UL:'SriLankan Airlines', MK:'Air Mauritius', HM:'Air Seychelles', MD:'Air Madagascar',
    UU:'Air Austral', TN:'Air Tahiti Nui', ET:'Ethiopian Airlines', KQ:'Kenya Airways', SA:'South African Airways', WB:'RwandAir',
    TC:'Air Tanzania', AT:'Royal Air Maroc', TU:'Tunisair', AH:'Air Algérie', FA:'FlySafair', MN:'Kulula', '4Z':'Airlink', TM:'LAM Mozambique',
    /* Asien og Oceanien */
    SQ:'Singapore Airlines', TR:'Scoot', CX:'Cathay Pacific', UO:'HK Express', TG:'Thai Airways', FD:'Thai AirAsia', PG:'Bangkok Airways',
    MH:'Malaysia Airlines', AK:'AirAsia', D7:'AirAsia X', GA:'Garuda Indonesia', JT:'Lion Air', ID:'Batik Air', QZ:'Indonesia AirAsia',
    VN:'Vietnam Airlines', VJ:'VietJet Air', PR:'Philippine Airlines', '5J':'Cebu Pacific', AI:'Air India', IX:'Air India Express', UK:'Vistara',
    BG:'Biman Bangladesh', PK:'Pakistan International', KB:'Druk Air', RA:'Nepal Airlines',
    JL:'Japan Airlines', NH:'ANA', KE:'Korean Air', OZ:'Asiana Airlines', CI:'China Airlines', BR:'EVA Air',
    CA:'Air China', MU:'China Eastern', CZ:'China Southern', HU:'Hainan Airlines', HX:'Hong Kong Airlines', NX:'Air Macau',
    QF:'Qantas', JQ:'Jetstar', VA:'Virgin Australia', NZ:'Air New Zealand', FJ:'Fiji Airways',
    /* Amerika */
    AA:'American Airlines', DL:'Delta Air Lines', UA:'United Airlines', AS:'Alaska Airlines', B6:'JetBlue', WN:'Southwest Airlines',
    AC:'Air Canada', WS:'WestJet', AM:'Aeroméxico', LA:'LATAM', JJ:'LATAM Brasil', AV:'Avianca', CM:'Copa Airlines', AR:'Aerolíneas Argentinas',
    G3:'GOL', AD:'Azul', BW:'Caribbean Airlines', JM:'Air Jamaica', UP:'Bahamasair'
  };
  /* navn → kode (også gamle stavemåder i Panda: «Etihad», «Swiss», «SriLankan») */
  var N = {}; Object.keys(K).forEach(function(k){ if(!N[K[k].toLowerCase()]) N[K[k].toLowerCase()] = k; });
  N['etihad'] = 'EY'; N['srilankan'] = 'UL'; N['ethiopian'] = 'ET'; N['singapore'] = 'SQ'; N['qatar'] = 'QR'; N['turkish'] = 'TK';

  function airline(v){
    var s = String(v == null ? '' : v).trim(); if(!s) return '';
    var k = s.toUpperCase();
    if(K[k]) return K[k];
    var m = /^([A-Z0-9]{2})\s*\d{1,4}[A-Z]?$/.exec(k);          /* et flynummer «LH 861» */
    if(m && K[m[1]]) return K[m[1]];
    var c = N[s.toLowerCase()]; return c ? K[c] : s;             /* «Etihad» → «Etihad Airways»; ukendt navn står som det er */
  }
  function kode(v){ var s = String(v || '').trim(); if(K[s.toUpperCase()]) return s.toUpperCase(); return N[s.toLowerCase()] || ''; }
  function kendt(v){ return !!kode(v); }

  /* ord fra norske/danske tilbud og leverandører → engelsk (kun visning) */
  var ORD = [
    [/\bSjøfly\b|\bSjöflyg\b|\bVandfly\b|\bVandflyver\b|\bSøfly\b|\bWaterflyver\b/gi, 'Seaplane'],
    [/\bInnenlandsfly\b|\bIndenrigsfly\b|\bInnenriksfly\b/gi, 'Domestic flight'],
    [/\bSpeedbåt\b|\bSpeedbåd\b|\bHurtigbåt\b|\bHurtigbåd\b/gi, 'Speedboat'],
    [/\bBåt\b|\bBåd\b/g, 'Boat'], [/\bbåt\b|\bbåd\b/g, 'boat'],
    [/\bBil\b/g, 'Car'], [/\bPrivat transfer\b/gi, 'Private transfer'], [/\bFelles transfer\b|\bFælles transfer\b/gi, 'Shared transfer'],
    [/\bca\.\s*/gi, 'approx. '], [/(\d)\s*min\.(?=\s|$|·)/g, '$1 min'], [/(\d)\s*timer\b/gi, '$1 hours'], [/(\d)\s*time\b/gi, '$1 hour'],
    [/\binkludert i hotellets pris\b|\bmed i hotellets pris\b|\binkluderet i hotellets pris\b/gi, 'included by the hotel'],
    [/\bfra resortet\b/gi, 'from the resort'], [/\btil resortet\b/gi, 'to the resort'],
    [/\bfra Velana lufthavn\b/gi, 'from Velana airport'], [/\bi Velana lufthavn\b/gi, 'at Velana airport'], [/\blufthavn(?:en)?\b/gi, 'airport'],
    [/\bikke sat\b|\bikke satt\b/gi, 'not set'], [/\bpr\. person\b|\bper person\b/gi, 'per person'], [/\bpr\. vei\b|\bpr\. vej\b/gi, 'each way'],
    [/\btur\/retur\b/gi, 'return']
  ];
  function tekst(v){ var s = String(v == null ? '' : v); ORD.forEach(function(r){ s = s.replace(r[0], r[1]); }); return s; }

  window.PandaEN = { KODER: K, airline: airline, kode: kode, kendt: kendt, tekst: tekst };
})();
