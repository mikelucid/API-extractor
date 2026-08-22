import { Link, Outlet } from 'react-router-dom'
import '../../styles/amorphous.css'

export function AmorphousLayout() {
  return (
    <div className="amorphous-root">
      <div className="amorphous-shell">
        <header className="amo-header">
          <Link to="/" className="amo-logo">
            <span className="amo-logo-mark" aria-hidden />
            Amorphous
          </Link>
          <nav className="amo-nav">
            <Link to="/spin">Spin up</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/admin">Super Admin</Link>
            <Link to="/spin" className="amo-btn amo-btn-primary">
              Free server →
            </Link>
          </nav>
        </header>
        <Outlet />
        <footer className="amo-footer">
          <span>Amorphous Adaptive — AWS & Google Cloud, one declarative fabric.</span>
          <span>Bill = cloud cost × 1.25 · $29 floor · Zero forms on free tier</span>
        </footer>
      </div>
    </div>
  )
}
