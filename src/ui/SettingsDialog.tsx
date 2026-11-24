import { useRef, useState } from 'react';
import { db } from '../db/db';
import { exportAll } from '../db/sessionOps';
import { t } from '../i18n/cs';
import { createBackup, ImportError, parseImport, solvesToCsv } from '../io/formats';
import { useStore } from '../store/createStore';
import {
  resetSettings,
  settingsStore,
  updateSettings,
  type Accent,
  type InspectionAlert,
  type InputMode,
  type PreviewMode,
  type Size,
  type Theme,
} from '../store/settings';
import { clearAllData, currentSession, generateTestSolves, importData, solvesStore } from '../store/solves';
import { showToast } from '../store/ui';
import { Dialog, Row, Segmented, Toggle } from './Dialog';
import { ACCENTS } from './theme';

const SIZES = [
  ['S', 'S'],
  ['M', 'M'],
  ['L', 'L'],
  ['XL', 'XL'],
] as const satisfies readonly (readonly [Size, string])[];

export function SettingsDialog() {
  const s = useStore(settingsStore);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      showToast(err instanceof ImportError ? err.message : String(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={t.settings.title}>
      <h3 className="section-title">{t.settings.sectionTimer}</h3>
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
      <Row label={t.settings.holdMs} htmlFor="hold-ms">
        <input
          id="hold-ms"
          type="number"
          min={0}
          max={2000}
          step={50}
          value={s.holdMs}
          onChange={(e) => updateSettings({ holdMs: clamp(Number(e.target.value), 0, 2000) })}
        />
      </Row>
      <Row label={t.settings.inspection}>
        <Toggle label={t.settings.inspection} checked={s.inspection} onChange={(inspection) => updateSettings({ inspection })} />
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
      <Row label={t.settings.phases}>
        <Segmented<number>
          value={s.phases}
          onChange={(phases) => updateSettings({ phases })}
          options={[
            [1, '1'],
            [2, '2'],
            [3, '3'],
            [4, '4'],
          ]}
        />
      </Row>
      <Row label={t.settings.focusMode}>
        <Toggle label={t.settings.focusMode} checked={s.focusMode} onChange={(focusMode) => updateSettings({ focusMode })} />
      </Row>
      <Row label={t.settings.showRunningTime}>
        <Toggle
          label={t.settings.showRunningTime}
          checked={s.showRunningTime}
          onChange={(showRunningTime) => updateSettings({ showRunningTime })}
        />
      </Row>
      <Row label={t.settings.pbSound}>
        <Toggle label={t.settings.pbSound} checked={s.pbSound} onChange={(pbSound) => updateSettings({ pbSound })} />
      </Row>

      <h3 className="section-title">{t.settings.sectionLook}</h3>
      <Row label={t.settings.theme}>
        <Segmented<Theme>
          value={s.theme}
          onChange={(theme) => updateSettings({ theme })}
          options={[
            ['auto', t.settings.themeAuto],
            ['dark', t.settings.themeDark],
            ['light', t.settings.themeLight],
          ]}
        />
      </Row>
      <Row label={t.settings.accent}>
        <div className="swatches" role="radiogroup" aria-label={t.settings.accent}>
          {(Object.keys(ACCENTS) as Accent[]).map((a) => (
            <button
              key={a}
              role="radio"
              aria-checked={s.accent === a}
              aria-label={ACCENTS[a].name}
              title={ACCENTS[a].name}
              className="swatch"
              style={{ background: `linear-gradient(135deg, ${ACCENTS[a].dark} 50%, ${ACCENTS[a].light} 50%)` }}
              onClick={() => updateSettings({ accent: a })}
            />
          ))}
        </div>
      </Row>
      <Row label={t.settings.timerSize}>
        <Segmented<Size> value={s.timerSize} onChange={(timerSize) => updateSettings({ timerSize })} options={SIZES} />
      </Row>
      <Row label={t.settings.scrambleSize}>
        <Segmented<Size> value={s.scrambleSize} onChange={(scrambleSize) => updateSettings({ scrambleSize })} options={SIZES} />
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

      <h3 className="section-title">{t.settings.sectionData}</h3>
      <p className="muted small">{t.settings.dataHint}</p>
      <div className="button-grid">
        <button
          className="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const backup = createBackup(await exportAll(db));
              download(`rubics-timer-zaloha-${today()}.json`, JSON.stringify(backup), 'application/json');
            })
          }
        >
          {t.settings.exportJson}
        </button>
        <button
          className="button"
          disabled={busy}
          onClick={() => {
            const name = currentSession()?.name ?? 'session';
            download(`${safeName(name)}-${today()}.csv`, solvesToCsv(solvesStore.get().solves), 'text/csv;charset=utf-8');
          }}
        >
          {t.settings.exportCsv}
        </button>
        <button className="button" disabled={busy} onClick={() => fileInput.current?.click()}>
          {t.settings.import}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,.txt,application/json,text/plain"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            void run(async () => {
              const { sessions } = parseImport(await file.text());
              if (sessions.every((x) => x.solves.length === 0)) {
                showToast(t.settings.importEmpty, 'error');
                return;
              }
              const r = await importData(sessions);
              showToast(t.settings.importDone(r.sessions, r.solves));
            });
          }}
        />
        <button className="button danger" disabled={busy} onClick={() => confirm(t.settings.clearConfirm) && run(clearAllData)}>
          {t.settings.clearAll}
        </button>
        <button className="button" onClick={resetSettings}>
          {t.settings.resetSettings}
        </button>
      </div>

      {import.meta.env.DEV && (
        <>
          <h3 className="section-title">{t.settings.dev}</h3>
          <button
            className="button"
            data-testid="dev-generate"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await generateTestSolves(1000);
                showToast(t.settings.devDone);
              })
            }
          >
            {t.settings.devGenerate}
          </button>
        </>
      )}
    </Dialog>
  );
}

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const today = () => new Date().toISOString().slice(0, 10);
const safeName = (s: string) => s.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-|-$/g, '') || 'session';

function clamp(n: number, min: number, max: number): number {
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}
