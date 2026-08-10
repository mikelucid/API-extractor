import { Link } from 'react-router-dom'
import { ProjectCard } from '../components/ProjectCard'
import { PROJECTS, CATEGORIES } from '../data/projects'
import { useProgress } from '../hooks/useProgress'

export function HomePage() {
  const { state, doneCount, percent } = useProgress()

  return (
    <>
      <section className="hero">
        <p className="hero-brand">CertForge</p>
        <h1>Twelve projects. Seven categories. One AI web developer path.</h1>
        <p>
          Complete the Lovable-style portfolio laid out below, prep for Foundations and
          Practitioner exams, level your LinkedIn vibe coding badge, and line up
          university-accredited Coursera credentials while you resume schooling for the
          student Pro discount.
        </p>
        <div className="cta-row">
          <Link className="btn btn-primary" to="/projects/portfolio">
            Start project 1
          </Link>
          <Link className="btn btn-ghost" to="/path">
            View credential path
          </Link>
        </div>
      </section>

      <div className="panel progress-banner" style={{ ['--p' as string]: percent }}>
        <div className="ring" style={{ ['--p' as string]: percent }}>
          <span>{percent}%</span>
        </div>
        <div>
          <strong>
            {doneCount} of {PROJECTS.length} projects complete
          </strong>
          <p className="muted" style={{ margin: '0.2rem 0 0' }}>
            Progress saves in this browser. Rebuild each project on lovable.dev to earn
            real credits toward vibe level and exam readiness.
          </p>
        </div>
        <Link className="btn btn-accent" to="/resume">
          Resume kit
        </Link>
      </div>

      <div className="callout panel">
        <strong>About “free year Pro + discount for life”</strong>
        <p>
          Lovable’s documented student offer is about <b>50% off Pro for up to 12 months</b>{' '}
          after educational verification — not a guaranteed free Pro year or lifetime price
          lock. Use the Credentials page for the official student link, then keep this lab as
          your 12-project checklist across categories.
        </p>
      </div>

      {CATEGORIES.map((category) => {
        const items = PROJECTS.filter((p) => p.category === category)
        if (items.length === 0) return null
        return (
          <section key={category}>
            <div className="section-head">
              <div>
                <h2>{category}</h2>
                <p>
                  {items.length} project{items.length > 1 ? 's' : ''} in this category
                </p>
              </div>
            </div>
            <div className="project-grid">
              {items.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  status={state.projects[project.id]}
                />
              ))}
            </div>
          </section>
        )
      })}
    </>
  )
}
