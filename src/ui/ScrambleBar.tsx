import { t } from '../i18n/cs';
import { useStore } from '../store/createStore';
import { nextScramble, prevScramble, scrambleStore } from '../store/scramble';

export function ScrambleBar() {
  const { history, index, loading, error, event } = useStore(scrambleStore);
  const scramble = history[index];
  const long = (scramble?.length ?? 0) > 120;

  return (
    <div className="scramble-bar hide-when-solving">
      <button
        className="ghost-button"
        onClick={prevScramble}
        disabled={index <= 0}
        title={t.actions.prevScramble}
        aria-label={t.actions.prevScramble}
      >
        ‹
      </button>
      <p className="scramble" data-long={long} data-event={event} aria-live="polite">
        {error ? (
          <>
            {t.scramble.error}{' '}
            <button className="link-button" onClick={() => void nextScramble()}>
              {t.scramble.retry}
            </button>
          </>
        ) : scramble && !loading ? (
          scramble
        ) : (
          <span className="muted">{t.scramble.loading}</span>
        )}
      </p>
      <button
        className="ghost-button"
        onClick={() => void nextScramble()}
        disabled={loading}
        title={t.actions.nextScramble}
        aria-label={t.actions.nextScramble}
      >
        ›
      </button>
    </div>
  );
}
