import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { countSolves } from '../db/sessionOps';
import { t } from '../i18n/cs';
import { EVENTS, isEventId, type EventId } from '../scramble/events';
import { useStore } from '../store/createStore';
import {
  changeSessionEvent,
  createNewSession,
  mergeSessionInto,
  removeSession,
  renameSession,
  selectSession,
  solvesStore,
} from '../store/solves';
import { closeDialog } from '../store/ui';
import { Dialog } from './Dialog';

export function SessionsDialog() {
  const sessions = useStore(solvesStore, (s) => s.sessions);
  const currentId = useStore(solvesStore, (s) => s.currentSessionId);
  const solvesLen = useStore(solvesStore, (s) => s.solves.length);
  const [counts, setCounts] = useState<Map<number, number>>(new Map());
  const [newName, setNewName] = useState('');
  const [newEvent, setNewEvent] = useState<EventId>('333');

  // počty solvů – po každé změně sessions nebo solvů
  useEffect(() => {
    void countSolves(db).then(setCounts);
  }, [sessions, solvesLen]);

  return (
    <Dialog title={t.sessions.title} wide>
      <ul className="session-list">
        {sessions.map((s) => {
          const count = counts.get(s.id) ?? 0;
          return (
            <li key={s.id} className="session-item" data-current={s.id === currentId}>
              <input
                className="text-input"
                defaultValue={s.name}
                aria-label={t.sessions.rename}
                onBlur={(e) => e.target.value !== s.name && void renameSession(s.id, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
              <select
                className="select"
                aria-label="Event"
                value={s.event}
                onChange={(e) => isEventId(e.target.value) && void changeSessionEvent(s.id, e.target.value)}
              >
                {EVENTS.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
              <span className="muted small session-count">{t.sessions.solves(count)}</span>
              <div className="session-actions">
                {s.id === currentId ? (
                  <span className="badge">{t.sessions.current}</span>
                ) : (
                  <button
                    className="button small"
                    onClick={() => {
                      void selectSession(s.id);
                      closeDialog();
                    }}
                  >
                    {t.sessions.select}
                  </button>
                )}
                <select
                  className="select small"
                  aria-label={t.sessions.mergeInto}
                  value=""
                  disabled={sessions.length < 2}
                  onChange={(e) => {
                    const target = sessions.find((x) => x.id === Number(e.target.value));
                    if (target && confirm(t.sessions.mergeConfirm(s.name, target.name))) void mergeSessionInto(s.id, target.id);
                  }}
                >
                  <option value="">{t.sessions.mergeInto}</option>
                  {sessions
                    .filter((x) => x.id !== s.id)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                </select>
                <button
                  className="button small danger"
                  onClick={() => confirm(t.sessions.deleteConfirm(s.name, count)) && void removeSession(s.id)}
                >
                  {t.actions.delete}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <form
        className="new-session"
        onSubmit={(e) => {
          e.preventDefault();
          void createNewSession(newName, newEvent);
          setNewName('');
          closeDialog();
        }}
      >
        <h3 className="section-title">{t.sessions.newTitle}</h3>
        <div className="new-session-row">
          <input
            className="text-input"
            placeholder={t.sessions.newName}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <select className="select" value={newEvent} onChange={(e) => isEventId(e.target.value) && setNewEvent(e.target.value)}>
            {EVENTS.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
          <button className="button primary" type="submit">
            {t.sessions.create}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
