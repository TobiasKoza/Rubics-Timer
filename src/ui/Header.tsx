import { t } from '../i18n/cs';
import { EVENTS, getEvent, isEventId } from '../scramble/events';
import { useStore } from '../store/createStore';
import { currentSession, selectSession, solvesStore, switchToEvent } from '../store/solves';
import { openDialog } from '../store/ui';

const MANAGE = '__manage__';

export function Header() {
  const sessions = useStore(solvesStore, (s) => s.sessions);
  const currentId = useStore(solvesStore, (s) => s.currentSessionId);
  const event = useStore(solvesStore, () => currentSession()?.event ?? '333');

  return (
    <header className="header hide-when-solving">
      <div className="brand">
        <span className="brand-mark" aria-hidden />
        <span className="brand-name">{t.app.title}</span>
      </div>
      <div className="header-controls">
        <select
          className="select"
          aria-label={t.sessions.label}
          value={currentId ?? ''}
          onChange={(e) => {
            if (e.target.value === MANAGE) openDialog({ kind: 'sessions' });
            else void selectSession(Number(e.target.value));
            e.target.blur(); // ať mezerník hned ovládá časovač
          }}
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.name !== getEvent(s.event).name ? ` · ${getEvent(s.event).name}` : ''}
            </option>
          ))}
          <option value={MANAGE}>{t.actions.sessions}</option>
        </select>
        <select
          className="select"
          aria-label="Event"
          value={event}
          onChange={(e) => {
            if (isEventId(e.target.value)) void switchToEvent(e.target.value);
            e.target.blur();
          }}
        >
          {EVENTS.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
      </div>
      <nav className="header-actions">
        <IconButton label={t.actions.stats} onClick={() => openDialog({ kind: 'stats' })}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </IconButton>
        <IconButton label={t.actions.help} onClick={() => openDialog({ kind: 'help' })}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17.5v.01" />
        </IconButton>
        <IconButton label={t.actions.settings} onClick={() => openDialog({ kind: 'settings' })}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </IconButton>
      </nav>
    </header>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className="icon-button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.currentTarget.blur();
        onClick();
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
