import { CREDENTIAL_PATHS } from '../data/paths'
import { useProgress } from '../hooks/useProgress'

export function PathPage() {
  const { state, toggleCredential } = useProgress()

  return (
    <section className="project-layout">
      <header>
        <div className="meta-row">
          <span className="chip">Credential map</span>
        </div>
        <h1>Certification & Pro path</h1>
        <p className="muted">
          Stack exam certs, LinkedIn vibe level, university coursework, and student pricing.
          Check items off as you finish them.
        </p>
      </header>

      <div className="path-grid">
        {CREDENTIAL_PATHS.map((path) => (
          <article key={path.id} className="panel path-card">
            <div className="meta-row">
              <span className="chip">{path.kind}</span>
              <span className={state.credentials[path.id] ? 'chip chip-done' : 'chip'}>
                {state.credentials[path.id] ? 'Marked done' : 'Not done'}
              </span>
            </div>
            <h3>{path.title}</h3>
            <div className="provider">{path.provider}</div>
            <p>{path.summary}</p>
            <ol>
              {path.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="links">
              {path.links.map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                  {link.label} →
                </a>
              ))}
            </div>
            <div style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => toggleCredential(path.id)}
              >
                {state.credentials[path.id] ? 'Undo complete' : 'Mark complete'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
