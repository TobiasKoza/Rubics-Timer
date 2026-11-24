import { t } from '../i18n/cs';
import { Dialog } from './Dialog';

export function HelpDialog() {
  return (
    <Dialog title={t.help.title} wide>
      <div className="help-grid">
        {t.help.groups.map((g) => (
          <section key={g.name}>
            <h3 className="section-title">{g.name}</h3>
            <dl className="shortcut-list">
              {g.items.map(([keys, what]) => (
                <div key={keys}>
                  <dt>
                    {keys.split(' / ').map((k, i) => (
                      <span key={k}>
                        {i > 0 && ' / '}
                        {k.split(' + ').map((part, j) => (
                          <span key={part}>
                            {j > 0 && '+'}
                            <kbd>{part}</kbd>
                          </span>
                        ))}
                      </span>
                    ))}
                  </dt>
                  <dd>{what}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
