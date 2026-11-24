import { useEffect, useState } from 'react';
import { t } from '../i18n/cs';
import { useStore } from '../store/createStore';
import { settingsStore } from '../store/settings';
import { statsStore } from '../store/solves';
import { pbChime } from '../timer/alerts';

const SHOW_MS = 4000;

/** Nenápadné oznámení nového PB pod časovačem (+ volitelný zvuk). */
export function PbBadge() {
  const pb = useStore(statsStore, (s) => s.pb);
  const [visible, setVisible] = useState<typeof pb>(null);

  useEffect(() => {
    if (!pb) return;
    setVisible(pb);
    if (settingsStore.get().pbSound) pbChime();
    const id = setTimeout(() => setVisible(null), SHOW_MS);
    return () => clearTimeout(id);
  }, [pb]);

  return (
    <div className="pb-slot hide-when-solving" aria-live="polite">
      {visible && (
        <span className="pb-badge" key={visible.solveId}>
          {t.pb.title} {visible.kinds.map((k) => t.pb.kinds[k]).join(' · ')}
        </span>
      )}
    </div>
  );
}
