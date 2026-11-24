import { t } from '../i18n/cs';
import { EVENTS, isEventId } from '../scramble/events';
import { useStore } from '../store/createStore';
import { currentSession, solvesStore, switchToEvent } from '../store/solves';

export function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const event = useStore(solvesStore, () => currentSession()?.event ?? '333');

  return (
    <header className="header hide-when-solving">
      <div className="brand">
        <span className="brand-mark" aria-hidden />
        {t.app.title}
      </div>
      <select
        className="event-select"
        aria-label="Event"
        value={event}
        onChange={(e) => {
          if (isEventId(e.target.value)) void switchToEvent(e.target.value);
          e.target.blur(); // ať mezerník hned ovládá časovač
        }}
      >
        {EVENTS.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.name}
          </option>
        ))}
      </select>
      <button className="icon-button" onClick={onOpenSettings} title={t.actions.settings} aria-label={t.actions.settings}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      </button>
    </header>
  );
}
