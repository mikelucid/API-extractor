import { useCallback, useEffect, useState } from 'react'
import { adminApi, type Environment, type Provider } from '../../api/amorphous'

const TOKEN_KEY = 'amorphous_admin_token'

type CloudAccount = {
  id: string
  provider: string
  label: string
  account_id?: string
  project_id?: string
  status: string
  live: boolean
  region_default: string
}

export function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '')
  const [authed, setAuthed] = useState(false)
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [envs, setEnvs] = useState<Environment[]>([])
  const [accounts, setAccounts] = useState<CloudAccount[]>([])
  const [error, setError] = useState('')
  const [connectProvider, setConnectProvider] = useState<Provider>('aws')
  const [label, setLabel] = useState('Production AWS')
  const [accountId, setAccountId] = useState('')

  const load = useCallback(async (t: string) => {
    setError('')
    try {
      const data = await adminApi.overview(t)
      if (!data.ok) {
        setAuthed(false)
        setError('Unauthorized')
        return
      }
      setAuthed(true)
      setStats(data.stats)
      setEnvs(data.environments)
      setAccounts(data.cloud_accounts as CloudAccount[])
      localStorage.setItem(TOKEN_KEY, t)
    } catch {
      setAuthed(false)
      setError('Could not reach admin API')
    }
  }, [])

  useEffect(() => {
    if (token) load(token)
  }, [token, load])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    await load(token)
  }

  async function connectCloud(e: React.FormEvent) {
    e.preventDefault()
    await adminApi.connectCloud(token, {
      provider: connectProvider,
      label,
      account_id: accountId,
      project_id: accountId,
      region: connectProvider === 'gcp' ? 'us-central1' : 'us-east-1',
    })
    await load(token)
  }

  async function envAction(action: 'freeze' | 'hibernate' | 'destroy', id: string) {
    if (action === 'freeze') await adminApi.freeze(token, id)
    if (action === 'hibernate') await adminApi.hibernate(token, id)
    if (action === 'destroy') await adminApi.destroy(token, id)
    await load(token)
  }

  if (!authed) {
    return (
      <>
        <h1 className="amo-section-title" style={{ marginTop: '1rem' }}>
          Super Admin
        </h1>
        <p style={{ color: 'var(--amo-muted)' }}>
          Full control over cloud accounts, environments, pricing, and cost freezes.
        </p>
        <form className="amo-panel amo-form" style={{ maxWidth: '420px' }} onSubmit={handleLogin}>
          <div className="amo-field">
            <label>Admin token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="AMORPHOUS_ADMIN_TOKEN"
            />
          </div>
          <button type="submit" className="amo-btn amo-btn-primary">
            Enter super admin
          </button>
          {error && <p style={{ color: 'var(--amo-danger)' }}>{error}</p>}
          <p style={{ fontSize: '0.8rem', color: 'var(--amo-muted)' }}>
            Default dev token: <code>amorphous-super-admin-dev</code>
          </p>
        </form>
      </>
    )
  }

  return (
    <>
      <h1 className="amo-section-title" style={{ marginTop: '1rem' }}>
        Super Admin Panel
      </h1>
      <p style={{ color: 'var(--amo-muted)' }}>
        Connect AWS & Google Cloud. Freeze runaway spend. Hibernate or destroy any environment.
      </p>

      {stats && (
        <div className="amo-stats">
          <div className="amo-stat">
            <div className="amo-stat-value">{String(stats.environments)}</div>
            <div className="amo-stat-label">Environments</div>
          </div>
          <div className="amo-stat">
            <div className="amo-stat-value">{String(stats.active)}</div>
            <div className="amo-stat-label">Active</div>
          </div>
          <div className="amo-stat">
            <div className="amo-stat-value">${String(stats.total_bill_usd)}</div>
            <div className="amo-stat-label">Total bill/mo</div>
          </div>
          <div className="amo-stat">
            <div className="amo-stat-value">{String(stats.cloud_accounts)}</div>
            <div className="amo-stat-label">Cloud accounts</div>
          </div>
        </div>
      )}

      <h2 className="amo-section-title">Connect cloud account</h2>
      <form className="amo-panel amo-form" onSubmit={connectCloud}>
        <div className="amo-provider-toggle">
          <button
            type="button"
            className={`amo-provider-btn ${connectProvider === 'aws' ? 'active-aws' : ''}`}
            onClick={() => setConnectProvider('aws')}
          >
            AWS (IAM role / keys)
          </button>
          <button
            type="button"
            className={`amo-provider-btn ${connectProvider === 'gcp' ? 'active-gcp' : ''}`}
            onClick={() => setConnectProvider('gcp')}
          >
            Google Cloud (service account)
          </button>
        </div>
        <div className="amo-field">
          <label>Label</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="amo-field">
          <label>{connectProvider === 'gcp' ? 'Project ID' : 'AWS Account ID'}</label>
          <input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="123456789012" />
        </div>
        <button type="submit" className="amo-btn amo-btn-primary">
          Connect {connectProvider.toUpperCase()}
        </button>
      </form>

      {accounts.length > 0 && (
        <>
          <h2 className="amo-section-title">Connected accounts</h2>
          <div className="amo-panel">
            <table className="amo-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Provider</th>
                  <th>Account</th>
                  <th>Region</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.label}</td>
                    <td>{a.provider.toUpperCase()}</td>
                    <td>{a.account_id || a.project_id}</td>
                    <td>{a.region_default}</td>
                    <td>
                      <span className="amo-badge amo-badge-live">{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="amo-section-title">All environments</h2>
      <div className="amo-panel" style={{ overflowX: 'auto' }}>
        {envs.length === 0 ? (
          <p style={{ color: 'var(--amo-muted)' }}>No environments spun up yet.</p>
        ) : (
          <table className="amo-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>URL</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Bill</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {envs.map((env) => (
                <tr key={env.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{env.id.slice(0, 8)}…</td>
                  <td>{env.url.replace('https://', '')}</td>
                  <td>{(env.provider ?? 'aws').toUpperCase()}</td>
                  <td>{env.status}</td>
                  <td>${env.quote?.bill ?? '—'}</td>
                  <td className="amo-actions">
                    <button type="button" className="amo-btn" onClick={() => envAction('freeze', env.id)}>
                      Freeze
                    </button>
                    <button type="button" className="amo-btn" onClick={() => envAction('hibernate', env.id)}>
                      Hibernate
                    </button>
                    <button type="button" className="amo-btn" onClick={() => envAction('destroy', env.id)}>
                      Destroy
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
