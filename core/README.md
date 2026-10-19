# core/ — Pandas fælles kerne (v1)

Bygget 15.10.2026 fra index.html v1.75 (commit a924e52). Krav: R833–R837 og R845.

## Den vigtigste regel

**index.html bruger ikke kernen.** index.html er stadig hele den kørende Panda. Kernen bruges kun af de nye sider. Den første er finance.html (trin 2).

index.html skifter først til kernen til allersidst, når alle siderne er flyttet og godkendt. Det sker som et selvstændigt trin med egen backup og egen test.

## Filerne

| Fil | Hvad |
|---|---|
| `core/core.v1.js` | Database, login, rettigheder, formatering og sidens start (`Panda.start`) |
| `core/menu.v1.js` | Sidemenuen. Punkterne er de samme som i index.html, og adresserne står ét sted |
| `core/core.v1.css` | Viola i den lyse udgave, Lora og Inter, kort, knapper og tabeller (klasser med `p-`) |
| `core/kopier.v1.json` | Liste over de dele, der er kopieret fra index.html, så de kan sammenlignes |
| `lib/` | Låste biblioteker: supabase-js 2.117.3 og xlsx 0.18.5 (samme versioner som live) |
| `img/` | Billeder som filer: bladet (favicon) og COMO Cocoa Island |
| `dev/core-check.js` | Kernetjekket |

## Før hver udgivelse af index.html eller core/

```
node dev/core-check.js
```

**FEJL** skal være 0. Får du FEJL, er en kopi ændret ét af stederne. Ret den, så den er ens begge steder.

Får du **GENNEMGÅ**, har index.html ændret noget, som kernen har sin egen udgave af. Se efter, om ændringen også skal ind i kernen.

## En ny side

```html
<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="core/core.v1.css"></head><body>
<script src="lib/supabase-js-2.117.3.min.js"></script>
<script src="core/menu.v1.js"></script>
<script src="core/core.v1.js"></script>
<script>
Panda.start({ key:'finance', perm:'finance', version:'finance 1',
  render: async (app) => { app.innerHTML = '…'; } });
</script></body></html>
```

Kernen sørger for resten:
- login
- «No access» (ingen adgang)
- menuen med de rigtige rettigheder
- titlen Panda og bladet som ikon
- rødt fejlkort i stedet for en tom side

## Regler

- **Kun én chat ændrer core/ ad gangen (R835).** Andre chats beder om ændringen.
- **En ny kerne får et nyt navn** (`core.v2.js`). Så henter ingen browser en gammel kerne fra sin cache.
- **Når en side flytter ud af index.html**, rettes dens `href` i `PANDA_MENU` (menu.v1.js). index.html's egen menu rettes i samme udgivelse.
