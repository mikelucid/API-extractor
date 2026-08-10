import { RESUME_BULLETS, CREDENTIAL_PATHS } from '../data/paths'
import { PROJECTS } from '../data/projects'
import { useProgress } from '../hooks/useProgress'

export function ResumePage() {
  const { state, doneCount, percent } = useProgress()
  const doneProjects = PROJECTS.filter((p) => state.projects[p.id] === 'done')

  return (
    <section className="project-layout">
      <header>
        <div className="meta-row">
          <span className="chip">Resume & schooling</span>
        </div>
        <h1>Put CertForge on your resume — and reopen school</h1>
        <p className="muted">
          Use accredited coursework (University of Colorado System on Coursera) plus Lovable
          exam credentials. Student verification unlocks Pro pricing while you study.
        </p>
      </header>

      <div className="two-col">
        <article className="panel path-card">
          <h3>Resume bullets</h3>
          <ul>
            {RESUME_BULLETS.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
            <li>
              Portfolio status: {doneCount}/{PROJECTS.length} category projects complete (
              {percent}%).
              {doneProjects.length > 0
                ? ` Shipped: ${doneProjects.map((p) => p.title).join(', ')}.`
                : ''}
            </li>
          </ul>
          <h3 style={{ marginTop: '1.25rem' }}>Credential lines</h3>
          <ul>
            {CREDENTIAL_PATHS.filter((p) => p.kind !== 'discount').map((path) => (
              <li key={path.id}>
                {path.resumeLine}
                {state.credentials[path.id] ? ' ✓' : ''}
              </li>
            ))}
          </ul>
        </article>

        <article className="panel path-card">
          <h3>Resume college / accredited schooling</h3>
          <ol>
            <li>Re-enroll or confirm active student status at an accredited school.</li>
            <li>
              Keep a school email or ID ready for{' '}
              <a href="https://lovable.dev/students" target="_blank" rel="noreferrer">
                lovable.dev/students
              </a>
              .
            </li>
            <li>
              Add Coursera’s{' '}
              <a
                href="https://www.coursera.org/learn/vibe-coding-fundamentals"
                target="_blank"
                rel="noreferrer"
              >
                Vibe Coding Fundamentals
              </a>{' '}
              (University of Colorado System) for a university-backed certificate.
            </li>
            <li>
              Pair that with Lovable Foundations / Practitioner exams and this 12-project
              portfolio.
            </li>
            <li>
              Optional: SkillsBooster’s{' '}
              <a
                href="https://www.coursera.org/learn/vibe-coding-with-lovable-from-idea-to-app"
                target="_blank"
                rel="noreferrer"
              >
                Vibe Coding with Lovable
              </a>{' '}
              for Lovable-specific practice.
            </li>
          </ol>
          <div className="callout" style={{ marginTop: '1rem' }}>
            <strong>Pro economics (documented)</strong>
            <p>
              Student Pro ≈ 50% off for up to one year after verification. Lifetime discount
              claims should be treated as unverified unless Lovable confirms them in your
              account.
            </p>
          </div>
        </article>
      </div>
    </section>
  )
}
