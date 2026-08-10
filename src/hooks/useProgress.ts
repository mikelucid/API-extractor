import { useEffect, useState, useCallback } from 'react'
import { PROJECTS } from '../data/projects'

const STORAGE_KEY = 'certforge-progress-v1'

export type ProjectStatus = 'todo' | 'in_progress' | 'done'

export interface ProgressState {
  projects: Record<string, ProjectStatus>
  notes: Record<string, string>
  credentials: Record<string, boolean>
}

const defaultState = (): ProgressState => ({
  projects: Object.fromEntries(PROJECTS.map((p) => [p.id, 'todo' as ProjectStatus])),
  notes: {},
  credentials: {},
})

function readStorage(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as ProgressState
    return {
      ...defaultState(),
      ...parsed,
      projects: { ...defaultState().projects, ...parsed.projects },
    }
  } catch {
    return defaultState()
  }
}

export function useProgress() {
  const [state, setState] = useState<ProgressState>(() =>
    typeof window === 'undefined' ? defaultState() : readStorage(),
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const setProjectStatus = useCallback((id: string, status: ProjectStatus) => {
    setState((prev) => ({
      ...prev,
      projects: { ...prev.projects, [id]: status },
    }))
  }, [])

  const setNote = useCallback((id: string, note: string) => {
    setState((prev) => ({
      ...prev,
      notes: { ...prev.notes, [id]: note },
    }))
  }, [])

  const toggleCredential = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      credentials: { ...prev.credentials, [id]: !prev.credentials[id] },
    }))
  }, [])

  const doneCount = PROJECTS.filter((p) => state.projects[p.id] === 'done').length
  const percent = Math.round((doneCount / PROJECTS.length) * 100)

  return {
    state,
    setProjectStatus,
    setNote,
    toggleCredential,
    doneCount,
    percent,
  }
}
