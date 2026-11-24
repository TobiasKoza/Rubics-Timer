import type { EventId } from './events';

/**
 * Fronta předgenerovaných scramblů.
 *
 * cubing.js počítá random-state scrambly ve vlastním Web Workeru, takže hlavní
 * vlákno se neblokuje. Tady jen držíme jeden scramble „v záloze“ pro každý event,
 * aby byl po solvu k dispozici okamžitě (i u 4x4 nebo Square-1, kde trvá hledání déle).
 */

type Generator = (event: EventId) => Promise<string>;

const defaultGenerator: Generator = async (event) => {
  const { randomScrambleForEvent } = await import('cubing/scramble');
  const alg = await randomScrambleForEvent(event);
  return alg.toString();
};

export class ScrambleQueue {
  private readonly pending = new Map<EventId, Promise<string>>();

  constructor(private readonly generate: Generator = defaultGenerator) {}

  /** Vrátí další scramble (z předgenerované zálohy, pokud je) a hned začne chystat další. */
  async next(event: EventId): Promise<string> {
    const ready = this.pending.get(event) ?? this.start(event);
    this.pending.delete(event);
    try {
      return await ready;
    } finally {
      this.prefetch(event);
    }
  }

  /** Začne na pozadí generovat scramble pro event, pokud už se negeneruje. Vrací slib dokončení. */
  prefetch(event: EventId): Promise<unknown> {
    if (!this.pending.has(event)) this.pending.set(event, this.start(event));
    return this.pending.get(event)!.catch(() => undefined);
  }

  private start(event: EventId): Promise<string> {
    const p = this.generate(event);
    // Chyba se projeví až při next(); zamezí "unhandled rejection" u záložních scramblů
    p.catch(() => this.pending.get(event) === p && this.pending.delete(event));
    return p;
  }
}
