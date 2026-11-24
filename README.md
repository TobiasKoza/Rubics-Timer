# Rubics Timer

Moderní časovač na Rubikovu kostku a další WCA hlavolamy. Běží v prohlížeči, data drží lokálně v IndexedDB.
Je to přepis původního školního projektu v Pythonu, který je teď ve složce [`legacy/`](legacy/).

> Projekt je rozpracovaný (Fáze 1 z 5). Úplný popis funkcí a klávesových zkratek bude doplněn na konci.

## Spuštění

```bash
npm install
npm run dev      # vývojový server → http://localhost:5173/Rubics-Timer/
npm test         # unit testy (Vitest)
npm run build    # produkční build do dist/
npm run preview  # náhled buildu → http://localhost:4173/Rubics-Timer/
```

## Nasazení

Push do větve `main` (nebo `master`) spustí GitHub Actions workflow `.github/workflows/deploy.yml`,
který otestuje a sestaví aplikaci a nasadí ji na GitHub Pages.
V nastavení repozitáře je potřeba jednou zvolit **Settings → Pages → Source: GitHub Actions**.

## Licence

Kód projektu je pod licencí [MIT](LICENSE).

Scrambly a náhledy používají knihovnu [cubing.js](https://github.com/cubing/cubing.js),
která je dostupná pod licencí **MPL-2.0** (alternativně GPL-3.0-or-later); projekt ji používá pod MPL-2.0.
