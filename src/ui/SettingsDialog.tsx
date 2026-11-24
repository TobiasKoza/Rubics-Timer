import { useEffect, useRef, type ReactNode } from 'react';
import { t } from '../i18n/cs';
import { useStore } from '../store/createStore';
import { settingsStore, updateSettings, type InspectionAlert, type InputMode, type PreviewMode } from '../store/settings';

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const s = useStore(settingsStore);

  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()} // klik na pozadí
    >
      <div className="dialog-body">
        <header className="dialog-header">
          <h2>{t.settings.title}</h2>
          <button className="icon-button" onClick={onClose} aria-label={t.actions.close}>
            ✕
          </button>
        </header>

        <Row label={t.settings.inputMode}>
          <Segmented<InputMode>
            value={s.inputMode}
            onChange={(inputMode) => updateSettings({ inputMode })}
            options={[
              ['timer', t.settings.inputTimer],
              ['manual', t.settings.inputManual],
            ]}
          />
        </Row>

        <Row label={t.settings.holdMs}>
          <input
            type="number"
            min={0}
            max={2000}
            step={50}
            value={s.holdMs}
            onChange={(e) => updateSettings({ holdMs: clamp(Number(e.target.value), 0, 2000) })}
          />
        </Row>

        <Row label={t.settings.inspection}>
          <Toggle checked={s.inspection} onChange={(inspection) => updateSettings({ inspection })} />
        </Row>

        <Row label={t.settings.inspectionAlert}>
          <Segmented<InspectionAlert>
            value={s.inspectionAlert}
            onChange={(inspectionAlert) => updateSettings({ inspectionAlert })}
            disabled={!s.inspection}
            options={[
              ['off', t.settings.alertOff],
              ['beep', t.settings.alertBeep],
              ['voice', t.settings.alertVoice],
            ]}
          />
        </Row>

        <Row label={t.settings.focusMode}>
          <Toggle checked={s.focusMode} onChange={(focusMode) => updateSettings({ focusMode })} />
        </Row>

        <Row label={t.settings.showRunningTime}>
          <Toggle checked={s.showRunningTime} onChange={(showRunningTime) => updateSettings({ showRunningTime })} />
        </Row>

        <Row label={t.settings.preview}>
          <Segmented<PreviewMode>
            value={s.preview}
            onChange={(preview) => updateSettings({ preview })}
            options={[
              ['off', t.settings.previewOff],
              ['2D', '2D'],
              ['3D', '3D'],
            ]}
          />
        </Row>
      </div>
    </dialog>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="settings-row">
      <span>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden />
    </label>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="segmented" role="group">
      {options.map(([v, label]) => (
        <button key={v} aria-pressed={value === v} disabled={disabled} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}
