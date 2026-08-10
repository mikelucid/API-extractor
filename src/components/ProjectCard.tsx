import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { CertProject } from '../data/projects'
import type { ProjectStatus } from '../hooks/useProgress'

const statusLabel: Record<ProjectStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
}

export function ProjectCard({
  project,
  status,
  style,
}: {
  project: CertProject
  status: ProjectStatus
  style?: CSSProperties
}) {
  const chipClass =
    status === 'done' ? 'chip chip-done' : status === 'in_progress' ? 'chip chip-active' : 'chip'

  return (
    <Link
      to={`/projects/${project.id}`}
      className="panel project-card"
      style={{ animationDelay: `${project.number * 0.04}s`, ...style }}
    >
      <div className="meta-row">
        <span className="chip">#{project.number}</span>
        <span className="chip">{project.category}</span>
        <span className="chip">{project.difficulty}</span>
        <span className={chipClass}>{statusLabel[status]}</span>
      </div>
      <h3>{project.title}</h3>
      <p>{project.summary}</p>
    </Link>
  )
}
