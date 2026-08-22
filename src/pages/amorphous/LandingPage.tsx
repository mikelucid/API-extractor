import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <>
      <section className="amo-hero">
        <div>
          <div className="amo-eyebrow">Amorphous Adaptive · Server Fabric</div>
          <h1>
            Declare once.
            <br />
            <span>Deploy on AWS or Google.</span>
          </h1>
          <p className="amo-lead">
            The web host that connects to your cloud, reshapes itself to your workload, and
            stays out of your way. Zero forms. One click. Under 60 seconds.
          </p>
          <div className="amo-cta-row">
            <Link to="/spin" className="amo-btn amo-btn-primary">
              Spin up free server
            </Link>
            <Link to="/admin" className="amo-btn">
              Super admin panel
            </Link>
          </div>
          <div className="amo-trust">
            <span>
              <strong>4h</strong> free on Spot
            </span>
            <span>
              <strong>$29</strong> floor when you persist
            </span>
            <span>
              <strong>0</strong> unnecessary words
            </span>
          </div>
        </div>

        <div className="amo-panel amo-panel-glow">
          <div className="amo-terminal">
            <div>
              <span className="prompt">$</span> spin up node realtime-api postgres redis
            </div>
            <div className="ok">✓ provider: aws · region: us-east-1</div>
            <div className="ok">✓ mix: fargate + lambda + spot</div>
            <div className="ok">✓ materialised in 47s → https://a3f9b2c1.amorphous.dev</div>
            <div style={{ marginTop: '0.75rem', color: '#94a3b8' }}>
              Your server fabric cost: <strong style={{ color: '#eef2ff' }}>$29/mo</strong>{' '}
              (floor applied)
            </div>
          </div>
        </div>
      </section>

      <section className="amo-grid-3">
        <article className="amo-panel amo-card">
          <h3>Pick AWS or Google</h3>
          <p>
            Connect once via IAM role or service account. Amorphous synthesises the right mix
            — EC2, Fargate, Lambda, Spot or Cloud Run, GKE, Preemptible — per workload.
          </p>
        </article>
        <article className="amo-panel amo-card">
          <h3>Super admin control</h3>
          <p>
            One panel to connect cloud accounts, freeze runaway spend, hibernate sandboxes,
            and kill environments. Full visibility. Minimal ops.
          </p>
        </article>
        <article className="amo-panel amo-card">
          <h3>Less work, more code</h3>
          <p>
            Push to repo → fabric rebuilds. No server tickets. Cost guard auto-freezes
            anomalies before they bill. You write app logic; we absorb the cloud.
          </p>
        </article>
      </section>

      <section>
        <h2 className="amo-section-title">Pricing that stays cash-positive</h2>
        <div className="amo-pricing">
          <div className="amo-panel">
            <h3>Free sandbox</h3>
            <p className="amo-price-tag">$0</p>
            <p style={{ color: 'var(--amo-muted)' }}>
              One-click spin. Spot capacity. 4-hour TTL. No credit card. No forms. Hibernate
              until you&apos;re ready to persist.
            </p>
          </div>
          <div className="amo-panel amo-panel-glow">
            <h3>Persistent fabric</h3>
            <p className="amo-price-tag">cloud × 1.25</p>
            <p style={{ color: 'var(--amo-muted)' }}>
              One line item: <em>Your server fabric cost</em>. $29/month floor. Never below
              15% margin. Volume discounts at scale.
            </p>
          </div>
        </div>
      </section>

      <section className="amo-panel" style={{ textAlign: 'center', padding: '2.5rem' }}>
        <h2 className="amo-section-title" style={{ marginTop: 0 }}>
          The industry standard for adaptive hosting
        </h2>
        <p style={{ color: 'var(--amo-muted)', maxWidth: '52ch', margin: '0 auto 1.5rem' }}>
          AWS sells primitives. Vercel does frontend. Railway does backends. Amorphous treats
          the whole workload as one amorphous unit — declare intent, the runtime materialises
          and reshapes across any cloud service.
        </p>
        <Link to="/spin" className="amo-btn amo-btn-primary">
          Start building in 60 seconds
        </Link>
      </section>
    </>
  )
}
