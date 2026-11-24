import { useEffect, useRef, type ReactNode } from 'react';
import { t } from '../i18n/cs';
import { closeDialog } from '../store/ui';

/** Společný modální dialog (nativní <dialog>: fokus, Esc a přístupnost zdarma). */
export function Dialog({
  title,
  children,
  wide,
  onClose = closeDialog,
}: {
  title: ReactNode;
  children: ReactNode;
  wide?: boolean;
  onClose?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current!;
    if (!d.open) d.showModal();
    // fokus na dialog místo prvního tlačítka (zavírací křížek by svítil focus ringem)
    d.focus();
    return () => d.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="dialog"
      tabIndex={-1}
      data-wide={wide}
      // Pozor: ne onClose – nativní „close“ přichází i z úklidu efektu (StrictMode)
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()} // klik na pozadí
    >
      <div className="dialog-body">
        <header className="dialog-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label={t.actions.close}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

/** Řádek nastavení: popisek vlevo, ovládací prvek vpravo. */
export function Row({ label, children, htmlFor }: { label: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="settings-row">
      {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span>{label}</span>}
      {children}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} aria-label={label} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden />
    </label>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
  label,
}: {
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={String(v)} aria-pressed={value === v} disabled={disabled} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // starší prohlížeče / bez oprávnění
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
