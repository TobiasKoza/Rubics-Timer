import { useEffect, useRef } from 'react';
import type { PuzzleID, TwistyPlayer } from 'cubing/twisty';
import { getEvent } from '../scramble/events';
import { useStore } from '../store/createStore';
import { scrambleStore } from '../store/scramble';

/**
 * Náhled zamíchaného stavu přes <twisty-player> z cubing.js.
 * Knihovna se načítá líně, aby nezdržovala první vykreslení časovače.
 * Při změně puzzle se přehrávač vytvoří znovu – přepínání puzzle za běhu
 * vede k závodu se starým scramblem („Bad position“).
 */
export function ScramblePreview({ mode }: { mode: '2D' | '3D' }) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<TwistyPlayer | null>(null);
  const { history, index, event, loading } = useStore(scrambleStore);
  const scramble = loading ? '' : (history[index] ?? '');
  const puzzle = getEvent(event).puzzle as PuzzleID;
  const latestScramble = useRef(scramble);
  latestScramble.current = scramble;

  useEffect(() => {
    let cancelled = false;
    void import('cubing/twisty').then(({ TwistyPlayer }) => {
      if (cancelled || !host.current) return;
      const p = new TwistyPlayer({
        puzzle,
        visualization: mode,
        background: 'none',
        controlPanel: 'none',
        hintFacelets: 'none',
        alg: '',
        // setup = scramble a prázdný alg → přehrávač ukazuje zamíchaný stav
        experimentalSetupAlg: latestScramble.current,
      });
      host.current.replaceChildren(p);
      player.current = p;
    });
    return () => {
      cancelled = true;
      player.current?.remove();
      player.current = null;
    };
  }, [puzzle, mode]);

  useEffect(() => {
    if (player.current) player.current.experimentalSetupAlg = scramble;
  }, [scramble]);

  return <div className="preview hide-when-solving" ref={host} data-mode={mode} aria-hidden />;
}
