/* ═══ Panda · menu v1 — core/menu.v1.js ════════════════════════════════
   Sidemenuen til Pandas NYE sider (R833/R845). index.html bruger den IKKE.
   Punkter, rækkefølge og ikoner = index.html's viola-menu (D8_SKAL).
   Rettigheder = applyNavPerms() i index.html (hv→leads, finance→finance,
   reports→reports, settings→manage_users).
   href = hvor punktet bor i dag. Når en side flytter ud af index.html
   (fx finance.html i trin 2), rettes KUN dens href her — og i index.html's
   egen menu i samme udgivelse. Indlæses før core/core.v1.js. */
const PANDA_MENU = [
  {v:'dash',      ik:'◧', tx:'Dashboard',     href:'index.html#dash'},
  {v:'hv',        ik:'✉', tx:'Enquiries',     href:'index.html#hv',        perm:'leads'},
  {v:'team',      ik:'◇', tx:'Team Maldivia', href:'index.html#team'},
  {v:'sales',     ik:'✈', tx:'Sales',         href:'index.html#sales'},
  {v:'finance',   ik:'▤', tx:'Finance',       href:'index.html#finance',   perm:'finance'},
  {v:'tasks',     ik:'✓', tx:'Tasks',         href:'index.html#tasks'},
  {v:'marketing', ik:'◈', tx:'Marketing',     href:'index.html#marketing'},
  {v:'reports',   ik:'▦', tx:'Reports',       href:'index.html#reports',   perm:'reports'},
  /* index.html har ingen #settings-adresse (PANDA_ROUTES mangler den), så Settings åbner på #users = «Brugere & roller». */
  {v:'settings',  ik:'⚙', tx:'Settings',      href:'index.html#users',     perm:'manage_users'},
  {v:'new',       ik:'＋', tx:'New trip',      href:'index.html#new',       ny:true},
];

/* aktiv = det punkt, siden hører til. ingen = bruger uden adgang (alle punkter skjules, som i index.html). */
function pandaMenuDraw(aktiv, ingen){
  const m = document.getElementById('sidebar'); if(!m) return;
  if(!session){ m.hidden = true; return; }
  m.hidden = false;
  const synlig = it => !ingen && (!it.perm || hasPerm(it.perm));
  const punkter = PANDA_MENU.filter(synlig).map(it =>
    '<a href="' + escH(it.href) + '" class="p-nav' + (it.v === aktiv ? ' on' : '') + (it.ny ? ' ny' : '') + '"'
    + (it.v === aktiv ? ' aria-current="page"' : '') + ' title="' + escH(it.tx) + '">'
    + '<span class="ik" aria-hidden="true">' + it.ik + '</span><span class="tx">' + escH(it.tx) + '</span></a>').join('');
  const o = (typeof Panda !== 'undefined' && Panda.opts) || {};
  /* Fod som index.html: navn · rolle, e-mail, skift kodeord, log ud. En bruger uden adgang ser kun e-mail og log ud. */
  m.innerHTML = '<div class="p-logo"><b>MALDIVIA</b><small>Travel Design · Panda</small></div>'
    + '<nav>' + punkter + '</nav>'
    + '<div class="p-fod">'
    + (!ingen && window.MYFULLNAME ? '<b>' + escH(window.MYFULLNAME) + '</b>' + (window.MYROLE ? ' <span class="rolle">· ' + escH(window.MYROLE) + '</span>' : '') + '<br>' : '')
    + escH(window.MYEMAIL || '') + '<br>'
    + (!ingen ? '<a href="#" data-p="kodeord">Change password</a> · ' : '') + '<a href="#" data-p="logud">Log out</a><br>'
    + '<span class="ver">Panda · ' + escH(CORE_VERSION) + (o.version ? ' · ' + escH(o.version) : '') + '</span></div>';
  const kp = m.querySelector('[data-p="kodeord"]'); if(kp) kp.onclick = e => { e.preventDefault(); pandaChangePassword(); };
  m.querySelector('[data-p="logud"]').onclick = e => { e.preventDefault(); db.auth.signOut(); };
}
