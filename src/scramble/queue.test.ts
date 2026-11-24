import { describe, expect, it, vi } from 'vitest';
import { ScrambleQueue } from './queue';

describe('ScrambleQueue', () => {
  it('po vydání scramblu hned předgeneruje další', async () => {
    let n = 0;
    const gen = vi.fn(async () => `s${++n}`);
    const q = new ScrambleQueue(gen);
    expect(await q.next('333')).toBe('s1');
    expect(gen).toHaveBeenCalledTimes(2); // s1 + záloha s2
    expect(await q.next('333')).toBe('s2');
    expect(gen).toHaveBeenCalledTimes(3);
  });

  it('prefetch negeneruje dvakrát a eventy jsou oddělené', async () => {
    const gen = vi.fn(async (e: string) => e);
    const q = new ScrambleQueue(gen);
    q.prefetch('222');
    q.prefetch('222');
    expect(gen).toHaveBeenCalledTimes(1);
    expect(await q.next('222')).toBe('222');
    expect(await q.next('sq1')).toBe('sq1');
  });

  it('chyba generátoru se předá volajícímu a fronta se zotaví', async () => {
    let fail = true;
    const q = new ScrambleQueue(async () => {
      if (fail) throw new Error('x');
      return 'ok';
    });
    await expect(q.next('333')).rejects.toThrow('x');
    fail = false;
    // záloha vytvořená po chybě také selhala a byla zahozena → nový pokus
    await Promise.resolve();
    expect(await q.next('333')).toBe('ok');
  });
});
