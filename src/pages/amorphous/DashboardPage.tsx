import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { amorphousApi, type Environment } from '../../api/amorphous'

function statusBadge(status: string) {
  if (status === 'materialised') return 'amo-badge amo-badge-live'
  if (status === 'hibernated') return 'amo-badge amo-badge-hibernated'
  if (status === 'frozen') return 'amo-badge amo-badge-frozen'
  return 'amo-badge'
}

export function DashboardPage() {
  const [envs, setEnvs] = useState<Environment[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    amorphousApi
      .environments()
      .then((r) => setEnvs(r.environments))
      .catch(() => setError('Could not load environments. Start the API server.'))
  }, [])

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="amo-section-title" style={{ marginTop: '1rem', marginBottom: 0 }}>
            Your environments
          </h1>
          <p style={{ color: 'var(--amo-muted)' }}>Every spin-up, one adaptive fabric.</p>
        </div>
        <Link to="/spin" className="amo-btn amo-btn-primary">
          + New spin-up
        </Link>
      </div>

      {error && <p style={{ color: 'var(--amo-danger)' }}>{error}</p>}

      {envs.length === 0 && !error && (
        <div className="amo-panel" style={{ marginTop: '1.5rem', textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--amo-muted)' }}>No environments yet.</p>
          <Link to="/spin" className="amo-btn amo-btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
            Spin up your first server
          </Link>
        </div>
      )}

      {envs.length > 0 && (
        <div className="amo-panel" style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
          <table className="amo-table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Provider</th>
                <th>Stack</th>
                <th>Status</th>
                <th>Bill</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {envs.map((env) => (
                <tr key={env.id}>
                  <td>
                    <a href={env.url} target="_blank" rel="noreferrer">
                      {env.url.replace('https://', '')}
                    </a>
                  </td>
                  <td>{(env.provider ?? env.spec?.provider ?? 'aws').toUpperCase()}</td>
                  <td>
                    {env.spec?.language}/{env.spec?.framework}
                  </td>
                  <td>
                    <span className={statusBadge(env.status)}>{env.status}</span>
                  </td>
                  <td>${env.quote?.bill ?? '—'}/mo</td>
                  <td>{new Date(env.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
