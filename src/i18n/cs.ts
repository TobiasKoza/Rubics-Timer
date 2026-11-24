/** Všechny texty rozhraní. Pro další jazyk stačí vytvořit soubor se stejnou strukturou. */
export const cs = {
  app: {
    title: 'Rubics Timer',
  },
  timer: {
    holdHint: 'Podrž mezerník nebo prst na displeji',
    inspectionHint: 'Stiskni mezerník pro inspekci',
    manualPlaceholder: 'např. 12.34, 1:05.21, 1234',
    manualHint: 'Zadej čas a stiskni Enter. Penalizace: „12.34+“, „DNF“.',
    manualInvalid: 'Neplatný čas',
    plus2: '+2',
    dnf: 'DNF',
  },
  penalty: {
    ok: 'OK',
    plus2: '+2',
    dnf: 'DNF',
  },
  actions: {
    deleteLast: 'Smazat',
    undo: 'Zpět',
    nextScramble: 'Další scramble',
    prevScramble: 'Předchozí scramble',
    settings: 'Nastavení',
    close: 'Zavřít',
    copy: 'Kopírovat',
  },
  undo: {
    deleted: (time: string) => `Smazán solve ${time}`,
    penalty: (time: string) => `Změněna penalizace: ${time}`,
    added: (time: string) => `Přidán solve ${time}`,
  },
  scramble: {
    loading: 'Generuji scramble…',
    error: 'Scramble se nepodařilo vygenerovat',
    retry: 'Zkusit znovu',
  },
  stats: {
    single: 'Single',
    current: 'aktuální',
    best: 'nejlepší',
    count: 'Solvů',
    empty: 'Zatím žádné solvy. Hodně štěstí!',
  },
  list: {
    title: 'Časy',
  },
  settings: {
    title: 'Nastavení',
    inputMode: 'Způsob zadávání',
    inputTimer: 'Časovač',
    inputManual: 'Ruční zadání',
    holdMs: 'Doba podržení (ms)',
    inspection: 'WCA inspekce (15 s)',
    inspectionAlert: 'Upozornění v 8 a 12 s',
    alertOff: 'Vypnuto',
    alertBeep: 'Pípnutí',
    alertVoice: 'Hlas',
    focusMode: 'Během solvu skrýt vše kromě času',
    showRunningTime: 'Zobrazovat čas během solvu',
    preview: 'Náhled scramblu',
    previewOff: 'Vypnuto',
  },
  voice: {
    eight: 'Osm sekund',
    twelve: 'Dvanáct sekund',
  },
} as const;

export const t = cs;
