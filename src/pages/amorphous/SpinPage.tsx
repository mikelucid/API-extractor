import { useState } from 'react'
import { Link } from 'react-router-dom'
import { amorphousApi, type Provider, type QuoteResponse, type SpinSpec } from '../../api/amorphous'

const LANGUAGES = ['node', 'php', 'python', 'go', 'rust']
const FRAMEWORKS: Record<string, string[]> = {
  node: ['express', 'next', 'nestjs'],
  php: ['laravel', 'symfony'],
  python: ['django', 'fastapi'],
  go: ['gin', 'fiber'],
  rust: ['axum', 'actix'],
}

export function SpinPage() {
  const [provider, setProvider] = useState<Provider>('aws')
  const [language, setLanguage] = useState('node')
  const [framework, setFramework] = useState('express')
  const [traffic, setTraffic] = useState<SpinSpec['traffic']>('low')
  const [region, setRegion] = useState('us-east-1')
  const [quote, setQuote] = useState<QuoteResponse | null>(null)
  const [result, setResult] = useState<{ url: string; id: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const spec: SpinSpec = {
    language,
    framework,
    traffic,
    data_stores: ['sqlite'],
    region: provider === 'gcp' ? (region === 'us-east-1' ? 'us-central1' : region) : region,
    provider,
  }

  async function handleQuote() {
    setLoading(true)
    setError('')
    try {
      const q = await amorphousApi.quote(spec)
      setQuote(q)
    } catch {
      setError('Could not fetch quote. Is the API server running?')
    } finally {
      setLoading(false)
    }
  }

  async function handleSpin() {
    setLoading(true)
    setError('')
    try {
      const res = await amorphousApi.spin(spec)
      if (res.ok) {
        setResult({ url: res.environment.url, id: res.environment.id })
        setQuote({ ok: true, plan: res.environment.plan!, quote: res.quote })
      }
    } catch {
      setError('Spin failed. Start the PHP server: cd server && php -S localhost:8080 -t public')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h1 className="amo-section-title" style={{ marginTop: '1rem' }}>
        Spin up in one click
      </h1>
      <p style={{ color: 'var(--amo-muted)', marginBottom: '1.5rem' }}>
        Zero forms on the free tier. Pick AWS or Google Cloud. Materialise in under 60
        seconds.
      </p>

      <div className="amo-form amo-panel amo-panel-glow">
        <div className="amo-provider-toggle">
          <button
            type="button"
            className={`amo-provider-btn ${provider === 'aws' ? 'active-aws' : ''}`}
            onClick={() => {
              setProvider('aws')
              setRegion('us-east-1')
            }}
          >
            <strong>Amazon Web Services</strong>
            <div style={{ fontSize: '0.85rem', color: 'var(--amo-muted)' }}>
              EC2 · Fargate · Lambda · Spot
            </div>
          </button>
          <button
            type="button"
            className={`amo-provider-btn ${provider === 'gcp' ? 'active-gcp' : ''}`}
            onClick={() => {
              setProvider('gcp')
              setRegion('us-central1')
            }}
          >
            <strong>Google Cloud</strong>
            <div style={{ fontSize: '0.85rem', color: 'var(--amo-muted)' }}>
              Cloud Run · GKE · Functions · Preemptible
            </div>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="amo-field">
            <label>Language</label>
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value)
                setFramework(FRAMEWORKS[e.target.value]?.[0] ?? 'express')
              }}
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="amo-field">
            <label>Framework</label>
            <select value={framework} onChange={(e) => setFramework(e.target.value)}>
              {(FRAMEWORKS[language] ?? ['custom']).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="amo-field">
            <label>Traffic</label>
            <select
              value={traffic}
              onChange={(e) => setTraffic(e.target.value as SpinSpec['traffic'])}
            >
              <option value="low">Low (dev / prototype)</option>
              <option value="medium">Medium</option>
              <option value="high">High (100k+ concurrent)</option>
            </select>
          </div>
          <div className="amo-field">
            <label>Region</label>
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              {(provider === 'aws'
                ? ['us-east-1', 'us-west-2', 'eu-west-1']
                : ['us-central1', 'us-east1', 'europe-west1']
              ).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="amo-btn" onClick={handleQuote} disabled={loading}>
            Get quote
          </button>
          <button
            type="button"
            className="amo-btn amo-btn-primary"
            onClick={handleSpin}
            disabled={loading}
          >
            {loading ? 'Materialising…' : 'Spin up free server'}
          </button>
        </div>

        {error && <p style={{ color: 'var(--amo-danger)' }}>{error}</p>}

        {quote && (
          <div className="amo-quote-box">
            <div>
              <strong>{quote.plan.template}</strong> on {quote.plan.provider.toUpperCase()} ·{' '}
              {quote.plan.region}
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              Cloud est. ${quote.quote.aws_cost}/mo → Bill{' '}
              <strong>${quote.quote.bill}/mo</strong>
              {quote.quote.floor_applied && ' (floor applied)'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--amo-muted)' }}>
              {quote.quote.line_item}
            </div>
          </div>
        )}

        {result && (
          <div className="amo-quote-box" style={{ borderColor: 'var(--amo-success)' }}>
            <div className="ok" style={{ color: 'var(--amo-success)', fontWeight: 600 }}>
              ✓ Materialised
            </div>
            <div>
              URL:{' '}
              <a href={result.url} target="_blank" rel="noreferrer">
                {result.url}
              </a>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--amo-muted)' }}>
              Free tier · 4h TTL on Spot · hibernates automatically
            </div>
            <Link to="/dashboard" className="amo-btn" style={{ marginTop: '0.75rem', display: 'inline-block' }}>
              View in dashboard →
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
