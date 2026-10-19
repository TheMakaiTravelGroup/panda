#!/usr/bin/env node
/* ═══ Panda · kernetjek — dev/core-check.js ═══════════════════════════
   Hvorfor (R845): index.html og kernen (core/) lever side om side, indtil
   index.html selv skifter til kernen. Så længe må de fælles dele ikke glide
   fra hinanden. Tjekket sammenligner dem tegn for tegn.
   Brug (fra repoets rod):   node dev/core-check.js
   Kør det FØR hver udgivelse af index.html eller core/.
   Resultat:
     OK        — kopien er ens begge steder.
     FEJL      — en kopi er ændret ét sted. Ret den, så den er ens begge steder.
     GENNEMGÅ  — index.html har ændret en del, kernen har sin egen udgave af.
                 Se om ændringen også skal ind i kernen, og byg manifestet igen.
   Afslutter med kode 1 ved FEJL, så det ikke kan overses. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const rod = path.resolve(__dirname, '..');
const les = f => fs.readFileSync(path.join(rod, f), 'utf8');
const sha = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
const man = JSON.parse(les('core/kopier.v1.json'));
const idx = les('index.html'), core = les(man.kernefil);
let fejl = 0, gennemgaa = 0;
console.log('Kernetjek · ' + man.kernefil + ' mod index.html (bygget fra ' + man.bygget_fra.version + ', ' + man.bygget_fra.dato + ')\n');
for (const k of man.kopi) {
  const iIdx = idx.includes(k.tekst), iCore = core.includes(k.tekst), ok = sha(k.tekst) === k.sha;
  if (iIdx && iCore && ok) { console.log('  OK        ' + k.navn); continue; }
  fejl++;
  console.log('  FEJL      ' + k.navn + ' — ' + (!ok ? 'manifestet er rettet i hånden' : !iIdx ? 'ændret i index.html' : 'ændret i kernen'));
}
for (const k of man.tilpasset) {
  if (idx.includes(k.original)) { console.log('  OK        ' + k.navn + ' (tilpasset: ' + k.erstattet_af + ')'); continue; }
  gennemgaa++;
  console.log('  GENNEMGÅ  ' + k.navn + ' — ændret i index.html. Kernens udgave: ' + k.erstattet_af);
}
console.log('\n' + man.kopi.length + ' kopier · ' + man.tilpasset.length + ' tilpassede · ' + fejl + ' FEJL · ' + gennemgaa + ' GENNEMGÅ');
process.exit(fejl ? 1 : 0);
