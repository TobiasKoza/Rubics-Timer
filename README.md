# Rubics Timer

Moderní časovač na Rubikovu kostku a další WCA hlavolamy. Běží v prohlížeči, dá se nainstalovat jako aplikace (PWA) na počítač i mobil a funguje offline. Všechna data zůstávají lokálně v prohlížeči (IndexedDB).

**Aplikace:** https://tobiaskoza.github.io/Rubics-Timer/

Jde o přepis původního školního projektu v Pythonu, který najdeš ve složce [`legacy/`](legacy/).

## Funkce

- **Časovač:** start podržením mezerníku nebo prstu na displeji (doba podržení jde nastavit), stop libovolnou klávesou. Čas se měří z `performance.now()` a časových razítek událostí, takže se nezpožďuje ani při zátěži.
- **WCA inspekce:** 15 s s hlasovým nebo zvukovým upozorněním v 8 a 12 s, automaticky +2 a DNF.
- **Multi-phase (splity):** až 4 fáze, každý stisk ukončí jednu fázi. Mezičasy jsou v detailu solvu.
- **Ruční zadání času:** `12.34`, `12,34`, `1:05.21`, `1234` (= 12.34), `12.34+`, `DNF`.
- **Penalizace a undo:** OK / +2 / DNF hned po solvu, smazání a vrácení akce zpět.
- **Scramblery pro všechny WCA eventy:** 2x2–7x7, 3BLD, 4BLD, 5BLD, OH, FMC, Pyraminx, Megaminx, Skewb, Square-1 a Clock. Jde o random-state scramblery z knihovny cubing.js, které běží ve Web Workeru a předgenerují se dopředu. Ke každému scramblu je 2D nebo 3D náhled a scramble se ukládá k solvu.
- **Sessions:** vytvoření, přejmenování, změna eventu, sloučení, rozdělení od vybraného solvu a smazání. Přepíná se bez restartu.
- **Statistiky:** single, mo3, ao5, ao12, ao50, ao100 a ao1000 (aktuální i nejlepší), průměr, σ a počet DNF. Výpočet odpovídá WCA a csTimeru: ořezává se 5 % z každé strany a DNF se bere jako nejhorší čas.
- **Detekce PB** pro single, ao5 a ao12 (odznak, volitelně zvuk).
- **Grafy:** vývoj časů s klouzavými ao5/ao12 a histogram rozložení časů.
- **Detail solvu** (penalizace, scramble, komentář, splity) a **karta průměru** ke zkopírování jako text.
- **Vzhled:** tmavý, světlý nebo podle systému, 6 barev zvýraznění, velikost časovače a scramblu, focus mode během solvu. Respektuje `prefers-reduced-motion`.
- **Data:** záloha a obnova v JSON, export do CSV pro Excel (středníky a desetinná čárka pro českou lokalizaci) a import zálohy z csTimeru.
- **Výkon:** během solvu se překreslují jen číslice. Seznam časů je virtualizovaný a statistiky se po solvu přepočítávají inkrementálně, takže ani 10 000+ solvů nic nezpomalí.

## Klávesové zkratky

Přehled se v aplikaci zobrazí po stisku `?`.

| Klávesa | Akce |
|---|---|
| Mezerník (podržet a pustit) | start |
| Libovolná klávesa | stop (u multi-phase konec fáze) |
| `Esc` | zrušit inspekci nebo solve |
| `1` / `2` / `3` | OK / +2 / DNF hned po zastavení |
| `Alt` + `1` / `2` / `3` | OK / +2 / DNF posledního solvu |
| `Alt` + `Delete` | smazat poslední solve |
| `Ctrl` + `Z` | vrátit poslední akci |
| `→` / `←` | další / předchozí scramble |
| `Shift` + `↓` / `↑` | další / předchozí event |
| `Alt` + `↓` / `↑` | další / předchozí session |
| `S` | statistiky a grafy |
| `,` | nastavení |
| `?` | přehled zkratek |

## Spuštění

Potřebuješ Node.js 22 nebo novější.

```bash
npm install
npm run dev        # vývojový server → http://localhost:5173/Rubics-Timer/
npm test           # unit testy (Vitest)
npm run typecheck  # kontrola typů
npm run build      # produkční build do dist/
npm run preview    # náhled buildu → http://localhost:4173/Rubics-Timer/
```

V dev režimu je v Nastavení → Vývoj tlačítko, které vygeneruje 1000 testovacích solvů.

## Nasazení

Push do větve `master` (nebo `main`) spustí GitHub Actions workflow `.github/workflows/deploy.yml`. Ten spustí testy, sestaví aplikaci a nasadí ji na GitHub Pages. V repozitáři musí být jednou nastaveno **Settings → Pages → Build and deployment → Source: GitHub Actions**. Workflow se to pokusí zapnout sám.

Pro jiný hosting (třeba Vercel nebo Netlify) stačí nasadit obsah složky `dist/`. Pokud aplikace nepoběží v podadresáři `/Rubics-Timer/`, uprav `BASE` ve `vite.config.ts`.

## Struktura

```
src/
  core/      čistá logika bez UI: stavový automat časovače, čas, statistiky, histogram, karta průměru (+ testy)
  db/        IndexedDB (Dexie) a operace se sessions (+ testy nad fake-indexeddb)
  io/        záloha JSON, import csTimeru, CSV (+ testy)
  scramble/  seznam eventů a předgenerovaná fronta scramblů
  store/     stav aplikace (malé vlastní stores pro useSyncExternalStore)
  timer/     controller časovače (vstup, rAF smyčka, zvuky)
  ui/        React komponenty a styly
  i18n/cs.ts všechny texty rozhraní
legacy/      původní Python verze
```

Hlavní knihovny:
- **React**: UI.
- **cubing.js**: random-state scramblery a náhledy.
- **Dexie**: pohodlnější práce s IndexedDB.
- **@tanstack/react-virtual**: virtualizovaný seznam časů.
- **uPlot**: rychlý graf i pro desetitisíce bodů.
- **vite-plugin-pwa**: service worker a manifest.
- **Vitest**: testy.

## Licence

Kód projektu je pod licencí [MIT](LICENSE).

Scrambly a náhledy používají knihovnu [cubing.js](https://github.com/cubing/cubing.js). Ta je dostupná pod licencí **MPL-2.0** (alternativně GPL-3.0-or-later) a projekt ji používá pod MPL-2.0.
