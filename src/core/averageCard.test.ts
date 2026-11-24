import { describe, expect, it } from 'vitest';
import { averageCard, averageCardText, excludedIndices, type CardSolve } from './averageCard';

const s = (sec: number, penalty: CardSolve['penalty'] = 'OK'): CardSolve => ({
  timeMs: sec * 1000,
  penalty,
  scramble: `scr${sec}`,
});

describe('ao5/ao12 karta', () => {
  it('v ao5 označí nejlepší a nejhorší, DNF je nejhorší', () => {
    const solves = [s(11), s(10), s(12), s(13, 'DNF'), s(14)];
    expect(excludedIndices(solves, 'ao')).toEqual([false, true, false, true, false]);
    expect(averageCard(solves, 'ao')).toMatchObject({ label: 'ao5', value: 12_330 });
  });

  it('při shodných časech zahodí jen jeden', () => {
    expect(excludedIndices([s(10), s(10), s(10), s(10), s(10)], 'ao').filter(Boolean)).toHaveLength(2);
  });

  it('mo3 nic nezahazuje', () => {
    expect(excludedIndices([s(1), s(2), s(3)], 'mo')).toEqual([false, false, false]);
  });

  it('text pro schránku', () => {
    const text = averageCardText([s(11), s(10), s(12), s(13, 'DNF'), s(9, '+2')], 'ao', new Date(2026, 10, 24));
    expect(text).toBe(
      [
        'Vygenerováno Rubics Timerem 24. 11. 2026',
        'ao5: 11.33',
        '',
        'Časy: 11.00, (10.00), 12.00, (DNF(13.00)), 11.00+',
        '',
        '1. 11.00   scr11',
        '2. (10.00)   scr10',
        '3. 12.00   scr12',
        '4. (DNF(13.00))   scr13',
        '5. 11.00+   scr9',
      ].join('\n'),
    );
  });
});
