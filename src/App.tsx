import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AmorphousLayout } from './components/amorphous/AmorphousLayout'
import { AdminPage } from './pages/amorphous/AdminPage'
import { DashboardPage } from './pages/amorphous/DashboardPage'
import { LandingPage } from './pages/amorphous/LandingPage'
import { SpinPage } from './pages/amorphous/SpinPage'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { PathPage } from './pages/PathPage'
import { ProjectPage } from './pages/ProjectPage'
import { ResumePage } from './pages/ResumePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AmorphousLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="spin" element={<SpinPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route element={<Layout />}>
          <Route path="cert" element={<HomePage />} />
          <Route path="cert/path" element={<PathPage />} />
          <Route path="cert/resume" element={<ResumePage />} />
          <Route path="cert/projects/:projectId" element={<ProjectPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
