import { NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink to="/" className="brand">
          <div className="brand-mark">CF</div>
          <div className="brand-text">
            <strong>CertForge</strong>
            <span>Lovable AI web developer lab</span>
          </div>
        </NavLink>
        <nav className="nav-links" aria-label="Primary">
          <NavLink to="/" end>
            Lab
          </NavLink>
          <NavLink to="/path">Credentials</NavLink>
          <NavLink to="/resume">Resume & school</NavLink>
          <NavLink to="/projects/portfolio">Projects</NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
