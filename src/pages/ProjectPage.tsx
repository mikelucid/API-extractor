import type { ComponentType } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PromptBlock } from '../components/PromptBlock'
import { PROJECTS } from '../data/projects'
import {
  PortfolioDemo,
  LinkInBioDemo,
  SaasLandingDemo,
  BookingDemo,
  TasksDemo,
  HabitsDemo,
  FlashcardsDemo,
  StudentProgressDemo,
  EventPollDemo,
  AnalyticsDemo,
  AiWriterDemo,
  StorefrontDemo,
} from '../demos'
import { useProgress, type ProjectStatus } from '../hooks/useProgress'

const DEMOS: Record<string, ComponentType> = {
  portfolio: PortfolioDemo,
  'link-in-bio': LinkInBioDemo,
  'saas-landing': SaasLandingDemo,
  booking: BookingDemo,
  tasks: TasksDemo,
  habits: HabitsDemo,
  flashcards: FlashcardsDemo,
  'student-progress': StudentProgressDemo,
  'event-poll': EventPollDemo,
  analytics: AnalyticsDemo,
  'ai-writer': AiWriterDemo,
  storefront: StorefrontDemo,
}

const STATUSES: ProjectStatus[] = ['todo', 'in_progress', 'done']

export function ProjectPage() {
  const { projectId } = useParams()
  const project = PROJECTS.find((p) => p.id === projectId)
  const { state, setProjectStatus, setNote } = useProgress()

  if (!project) {
    return (
      <section className="project-layout">
        <h1>Project not found</h1>
        <Link to="/">Back to lab</Link>
      </section>
    )
  }

  const Demo = DEMOS[project.id]
  const idx = PROJECTS.findIndex((p) => p.id === project.id)
  const prev = PROJECTS[idx - 1]
  const next = PROJECTS[idx + 1]
  const status = state.projects[project.id]

  return (
    <section className="project-layout">
      <header>
        <div className="meta-row">
          <span className="chip">#{project.number}</span>
          <span className="chip">{project.category}</span>
          <span className="chip">{project.difficulty}</span>
        </div>
        <h1>{project.title}</h1>
        <p className="muted">{project.summary}</p>
        <div className="status-controls">
          <span className="muted">Status:</span>
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={status === s ? 'btn btn-primary' : 'btn btn-ghost'}
              onClick={() => setProjectStatus(project.id, s)}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </header>

      <div className="two-col">
        <article className="panel demo-shell">{Demo ? <Demo /> : null}</article>
        <aside className="stack">
          <div className="panel path-card">
            <h3>Acceptance checklist</h3>
            <ul>
              {project.acceptance.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h3>Skills</h3>
            <div className="meta-row">
              {project.skills.map((skill) => (
                <span key={skill} className="chip">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div className="panel path-card">
            <PromptBlock text={project.lovablePrompt} />
          </div>
          <div className="panel path-card stack">
            <label className="field">
              Build notes
              <textarea
                rows={4}
                value={state.notes[project.id] ?? ''}
                onChange={(e) => setNote(project.id, e.target.value)}
                placeholder="Published URL, exam topics covered, blockers…"
              />
            </label>
          </div>
        </aside>
      </div>

      <div className="status-controls" style={{ justifyContent: 'space-between' }}>
        {prev ? (
          <Link className="btn btn-ghost" to={`/projects/${prev.id}`}>
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link className="btn btn-primary" to={`/projects/${next.id}`}>
            {next.title} →
          </Link>
        ) : (
          <Link className="btn btn-accent" to="/path">
            Credentials next →
          </Link>
        )}
      </div>
    </section>
  )
}
