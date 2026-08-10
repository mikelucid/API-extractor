import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { PathPage } from './pages/PathPage'
import { ProjectPage } from './pages/ProjectPage'
import { ResumePage } from './pages/ResumePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="path" element={<PathPage />} />
          <Route path="resume" element={<ResumePage />} />
          <Route path="projects/:projectId" element={<ProjectPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
