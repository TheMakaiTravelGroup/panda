/* ═══ Panda · modul: læsbar tekst — modules/laesbar.v1.js ═══
   R855 (Wendie 19.10.2026): «teksten på siden generelt [skal være] lidt større, fordi … når jeg
   sidder 80 centimeter fra skærmen, har jeg svært ved faktisk at læse al teksten. Så den må godt
   være lidt tydeligere.» Og: «det her står så småt og med den her hvide tekst, at jeg godt kan
   læse det, men jeg skal anstrenge mig.»

   EGEN FIL (Wendie 19.10.2026: de forskellige filer). index.html sender viola-sidens stilark
   herigennem, før det lægges på siden. Mangler filen, står siden præcis som før.

   Stilarket selv røres ikke. Modulet skalerer skriftstørrelserne efter én regel og gør de
   dæmpede lyse tekstfarver lidt lysere, så de står tydeligere på den lilla bund:
     · de mindste tekster (mærker, overskrifter med versaler, under 10 px) løftes mest — mindst 11 px
     · brødtekst og tabeller (10–13,5 px) får +2 px
     · mellemstore (14–18 px) får +1 px
     · store overskrifter og tal står, som de er
   Standard er 2 (Wendie 19.10.2026: «Endnu større»). Niveauet kan sættes pr. bruger (localStorage «panda_tekst»: 0 = som før, 1 = større, 2 = endnu større). */
(function(){
  'use strict';
  const VERSION = 'laesbar v1';
  const NIV = (function(){ try { const v = localStorage.getItem('panda_tekst'); return v == null ? 2 : Math.max(0, Math.min(2, +v || 0)); } catch(_){ return 2; } })();
  const rund = n => Math.round(n * 2) / 2;
  function px(n, niv){
    if(!niv) return n;
    const ekstra = niv === 2 ? 1 : 0;
    if(n < 10) return rund(Math.max(n * 1.3, 11 + ekstra));
    if(n <= 13.5) return rund(n + 2 + ekstra);
    if(n <= 18) return rund(n + 1 + ekstra * 0.5);
    return n;
  }
  /* lyse, dæmpede tekstfarver (--lys2, --lys3) trækkes mod hvid; mørke (lyse temaer) røres ikke */
  function lysere(hex, andel){
    const m = /^#([0-9a-f]{6})$/i.exec(hex); if(!m) return hex;
    const t = parseInt(m[1], 16), r = t >> 16, g = (t >> 8) & 255, b = t & 255;
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if(lum < 0.5) return hex;
    const f = c => Math.round(c + (255 - c) * andel).toString(16).padStart(2, '0');
    return '#' + f(r) + f(g) + f(b);
  }
  function stil(css, niv){
    niv = niv == null ? NIV : niv;
    if(!niv || typeof css !== 'string') return css;
    let ud = css.replace(/font-size:\s*([0-9.]+)px/g, (_, n) => 'font-size:' + px(+n, niv) + 'px');
    const andel = niv === 2 ? 0.45 : 0.35;
    ud = ud.replace(/(--lys[23]\s*:\s*)(#[0-9a-fA-F]{6})/g, (_, k, h) => k + lysere(h, andel));
    return ud;
  }
  window.PandaTekst = {version: VERSION, niveau: NIV, stil, _test: {px, lysere}};
})();
