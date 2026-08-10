import { useEffect, useMemo, useState } from 'react'

function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])
  return [value, setValue] as const
}

export function PortfolioDemo() {
  const projects = [
    { name: 'CertForge Lab', blurb: '12-project certification tracker' },
    { name: 'Habit Heat', blurb: 'Streak heatmap for daily practice' },
    { name: 'Prompt Studio', blurb: 'Local AI copy generator' },
  ]
  const [filter, setFilter] = useState('All')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const items = filter === 'All' ? projects : projects.filter((p) => p.name.includes(filter))

  return (
    <div className="demo-shell stack">
      <h2>Mike Lucid</h2>
      <p className="muted">AI web developer shipping production apps with Lovable.</p>
      <div className="status-controls">
        {['All', 'Cert', 'Habit', 'Prompt'].map((f) => (
          <button key={f} type="button" className="btn btn-ghost" onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>
      <ul className="list">
        {items.map((p) => (
          <li key={p.name}>
            <strong>{p.name}</strong>
            <span className="muted">{p.blurb}</span>
          </li>
        ))}
      </ul>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (!email.includes('@')) return
          setSent(true)
        }}
      >
        <label className="field">
          Contact email
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" />
        </label>
        <button className="btn btn-primary" type="submit">
          {sent ? 'Message queued' : 'Send message'}
        </button>
      </form>
    </div>
  )
}

export function LinkInBioDemo() {
  const links = [
    { id: 'portfolio', label: 'Portfolio', href: '#' },
    { id: 'linkedin', label: 'LinkedIn', href: '#' },
    { id: 'lovable', label: 'Lovable profile', href: '#' },
    { id: 'youtube', label: 'YouTube', href: '#' },
  ]
  const [counts, setCounts] = useLocal<Record<string, number>>('cf-bio-clicks', {})

  return (
    <div className="demo-shell stack" style={{ textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--brand)',
          color: '#e8f6f0',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto',
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
        }}
      >
        ML
      </div>
      <h2 style={{ marginBottom: 0 }}>Mike Lucid</h2>
      <p className="muted">Building CertForge — Lovable AI web developer path</p>
      {links.map((link) => (
        <button
          key={link.id}
          type="button"
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={() => setCounts({ ...counts, [link.id]: (counts[link.id] ?? 0) + 1 })}
        >
          {link.label}
          <span style={{ opacity: 0.75 }}>({counts[link.id] ?? 0})</span>
        </button>
      ))}
    </div>
  )
}

export function SaasLandingDemo() {
  const [emails, setEmails] = useLocal<string[]>('cf-waitlist', [])
  const [email, setEmail] = useState('')

  return (
    <div className="demo-shell stack">
      <h2>Ship your Lovable certification portfolio</h2>
      <p className="muted">
        CertForge guides twelve category projects, exam prep, and school-backed Pro pricing.
      </p>
      <form
        className="status-controls"
        onSubmit={(e) => {
          e.preventDefault()
          if (!email.includes('@')) return
          setEmails([...emails, email])
          setEmail('')
        }}
      >
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Join waitlist"
          style={{ flex: 1, minWidth: 180, borderRadius: 999, border: '1px solid var(--line)', padding: '0.7rem 1rem' }}
        />
        <button className="btn btn-accent" type="submit">
          Join
        </button>
      </form>
      <p className="muted">{emails.length} on the waitlist (saved locally).</p>
      <div className="kpi-grid">
        <div className="kpi">
          <strong>12</strong>
          <span className="muted">Projects</span>
        </div>
        <div className="kpi">
          <strong>7</strong>
          <span className="muted">Categories</span>
        </div>
        <div className="kpi">
          <strong>2</strong>
          <span className="muted">Exam tracks</span>
        </div>
      </div>
    </div>
  )
}

type Booking = { service: string; slot: string; name: string; email: string }

export function BookingDemo() {
  const services = ['Audit 30m', 'Build plan 60m', 'Pair session 90m']
  const slots = ['Mon 10:00', 'Mon 14:00', 'Tue 11:00', 'Wed 16:00', 'Thu 09:00']
  const [bookings, setBookings] = useLocal<Booking[]>('cf-bookings', [])
  const [service, setService] = useState(services[0])
  const [slot, setSlot] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [done, setDone] = useState<Booking | null>(null)
  const taken = new Set(bookings.map((b) => b.slot))

  return (
    <div className="demo-shell stack">
      <h2>Book a session</h2>
      {done ? (
        <div className="callout panel">
          <strong>Confirmed</strong>
          <p>
            {done.service} with {done.name} on {done.slot}. Confirmation sent to {done.email}{' '}
            (simulated).
          </p>
          <button type="button" className="btn btn-ghost" onClick={() => setDone(null)}>
            Book another
          </button>
        </div>
      ) : (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            if (!service || !slot || !name || !email.includes('@') || taken.has(slot)) return
            const booking = { service, slot, name, email }
            setBookings([...bookings, booking])
            setDone(booking)
          }}
        >
          <label className="field">
            Service
            <select value={service} onChange={(e) => setService(e.target.value)}>
              {services.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Slot
            <select value={slot} onChange={(e) => setSlot(e.target.value)} required>
              <option value="">Select a time</option>
              {slots.map((s) => (
                <option key={s} value={s} disabled={taken.has(s)}>
                  {s}
                  {taken.has(s) ? ' (taken)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="field">
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <button className="btn btn-primary" type="submit">
            Confirm booking
          </button>
        </form>
      )}
    </div>
  )
}

type Task = { id: string; title: string; priority: 'Low' | 'Med' | 'High'; done: boolean }

export function TasksDemo() {
  const [tasks, setTasks] = useLocal<Task[]>('cf-tasks', [])
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('Med')
  const [filter, setFilter] = useState<'All' | 'Active' | 'Done'>('All')
  const visible = tasks.filter((t) =>
    filter === 'All' ? true : filter === 'Done' ? t.done : !t.done,
  )

  return (
    <div className="demo-shell stack">
      <h2>Forge Tasks</h2>
      <form
        className="status-controls"
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          setTasks([
            ...tasks,
            { id: crypto.randomUUID(), title: title.trim(), priority, done: false },
          ])
          setTitle('')
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task"
          style={{ flex: 1, minWidth: 160, borderRadius: 12, border: '1px solid var(--line)', padding: '0.7rem' }}
        />
        <select value={priority} onChange={(e) => setPriority(e.target.value as Task['priority'])}>
          <option>Low</option>
          <option>Med</option>
          <option>High</option>
        </select>
        <button className="btn btn-primary" type="submit">
          Add
        </button>
      </form>
      <div className="status-controls">
        {(['All', 'Active', 'Done'] as const).map((f) => (
          <button key={f} type="button" className="btn btn-ghost" onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>
      <ul className="list">
        {visible.map((task) => (
          <li key={task.id}>
            <input
              type="checkbox"
              checked={task.done}
              onChange={() =>
                setTasks(tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)))
              }
            />
            <span style={{ textDecoration: task.done ? 'line-through' : 'none', flex: 1 }}>
              {task.title}
            </span>
            <span className="chip">{task.priority}</span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setTasks(tasks.filter((t) => t.id !== task.id))}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function HabitsDemo() {
  const [habits, setHabits] = useLocal<{ id: string; name: string; days: string[] }[]>(
    'cf-habits',
    [{ id: '1', name: 'Ship one CertForge prompt', days: [] }],
  )
  const [name, setName] = useState('')
  const today = new Date().toISOString().slice(0, 10)
  const weeks = 12

  function toggle(id: string) {
    setHabits(
      habits.map((h) => {
        if (h.id !== id) return h
        const has = h.days.includes(today)
        return {
          ...h,
          days: has ? h.days.filter((d) => d !== today) : [...h.days, today],
        }
      }),
    )
  }

  function streak(days: string[]) {
    let count = 0
    const cursor = new Date()
    for (;;) {
      const key = cursor.toISOString().slice(0, 10)
      if (!days.includes(key)) break
      count += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    return count
  }

  return (
    <div className="demo-shell stack">
      <h2>Habit heatmap</h2>
      <form
        className="status-controls"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          setHabits([...habits, { id: crypto.randomUUID(), name: name.trim(), days: [] }])
          setName('')
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New habit"
          style={{ flex: 1, borderRadius: 12, border: '1px solid var(--line)', padding: '0.7rem' }}
        />
        <button className="btn btn-primary" type="submit">
          Add
        </button>
      </form>
      {habits.map((habit) => (
        <div key={habit.id} className="stack">
          <div className="status-controls">
            <strong>{habit.name}</strong>
            <span className="chip">Streak {streak(habit.days)}</span>
            <button type="button" className="btn btn-ghost" onClick={() => toggle(habit.id)}>
              {habit.days.includes(today) ? 'Undo today' : 'Complete today'}
            </button>
          </div>
          <div className="heatmap" aria-hidden>
            {Array.from({ length: weeks * 7 }, (_, i) => {
              const d = new Date()
              d.setDate(d.getDate() - (weeks * 7 - 1 - i))
              const key = d.toISOString().slice(0, 10)
              return <div key={key + habit.id} className={`heat-cell${habit.days.includes(key) ? ' on' : ''}`} />
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

const CARDS = [
  { q: 'What is Agent / Build mode?', a: 'Lovable plans and implements changes end-to-end with less step-by-step babysitting.' },
  { q: 'What does publishing do?', a: 'Deploys your project to a lovable.app URL (custom domains on paid plans).' },
  { q: 'Why connect GitHub?', a: 'Two-way sync for ownership, collaboration, and deploying outside Lovable.' },
  { q: 'What are credits?', a: 'Usage units for AI builds and related platform actions on your plan.' },
  { q: 'What is Foundations?', a: 'Beginner Lovable certification exam on UI, Tailwind, and prompting.' },
  { q: 'What is Practitioner?', a: 'Advanced exam covering Supabase, auth, APIs, and production deploy.' },
  { q: 'Student Pro discount?', a: 'About 50% off Pro for up to 12 months after educational verification.' },
  { q: 'LinkedIn vibe level?', a: 'Activity-based Bronze→Diamond builder level you can connect to LinkedIn.' },
]

export function FlashcardsDemo() {
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [mode, setMode] = useState<'study' | 'quiz'>('study')
  const [qi, setQi] = useState(0)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [finished, setFinished] = useState(false)
  const card = CARDS[i]

  return (
    <div className="demo-shell stack">
      <div className="status-controls">
        <button type="button" className="btn btn-ghost" onClick={() => { setMode('study'); setFlipped(false) }}>
          Study
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setMode('quiz')
            setQi(0)
            setScore(0)
            setAnswered(false)
            setFinished(false)
          }}
        >
          Quiz
        </button>
      </div>
      {mode === 'study' ? (
        <>
          <button type="button" className="flash-card" onClick={() => setFlipped(!flipped)}>
            {flipped ? card.a : card.q}
          </button>
          <div className="status-controls">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setI((i + 1) % CARDS.length)
                setFlipped(false)
              }}
            >
              Next card
            </button>
            <span className="muted">
              {i + 1}/{CARDS.length}
            </span>
          </div>
        </>
      ) : finished ? (
        <div className="callout panel">
          <strong>
            Score {score}/{CARDS.length}
          </strong>
          <button type="button" className="btn btn-primary" onClick={() => { setQi(0); setScore(0); setFinished(false); setAnswered(false) }}>
            Restart quiz
          </button>
        </div>
      ) : (
        <>
          <h2>{CARDS[qi].q}</h2>
          <p className="muted">{answered ? CARDS[qi].a : 'Do you know it?'}</p>
          <div className="status-controls">
            {!answered ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setScore(score + 1)
                    setAnswered(true)
                  }}
                >
                  I knew it
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setAnswered(true)}>
                  Missed it
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-accent"
                onClick={() => {
                  if (qi + 1 >= CARDS.length) setFinished(true)
                  else {
                    setQi(qi + 1)
                    setAnswered(false)
                  }
                }}
              >
                Next
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function StudentProgressDemo() {
  const modules = [
    'Foundations exam prep',
    'Practitioner exam prep',
    '12 portfolio projects',
    'Coursera Vibe Coding Fundamentals',
    'LinkedIn vibe level',
    'Student Pro verification',
  ]
  const [progress, setProgress] = useLocal<Record<string, number>>(
    'cf-student-progress',
    Object.fromEntries(modules.map((m) => [m, 0])),
  )
  const avg = Math.round(modules.reduce((s, m) => s + (progress[m] ?? 0), 0) / modules.length)
  const next = modules.find((m) => (progress[m] ?? 0) < 100)

  return (
    <div className="demo-shell stack">
      <h2>Student progress</h2>
      <div className="ring" style={{ ['--p' as string]: avg, margin: '0 auto' }}>
        <span>{avg}%</span>
      </div>
      {modules.map((m) => (
        <label key={m} className="field">
          {m} ({progress[m]}%)
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={progress[m]}
            onChange={(e) => setProgress({ ...progress, [m]: Number(e.target.value) })}
          />
        </label>
      ))}
      <p className="muted">{next ? `Next up: ${next}` : 'All modules at 100%. Nice.'}</p>
    </div>
  )
}

export function EventPollDemo() {
  const options = ['Thu 6pm', 'Sat 11am', 'Sun 4pm']
  const [votes, setVotes] = useLocal<Record<string, number>>(
    'cf-event-votes',
    Object.fromEntries(options.map((o) => [o, 0])),
  )
  const [voted, setVoted] = useLocal<boolean>('cf-event-voted', false)
  const [name, setName] = useState('')
  const total = Object.values(votes).reduce((a, b) => a + b, 0) || 1

  return (
    <div className="demo-shell stack">
      <h2>CertForge study meetup</h2>
      <p className="muted">Vote on a time to review Foundations questions together.</p>
      {!voted ? (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
          }}
        >
          <label className="field">
            Your name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <div className="status-controls">
            {options.map((o) => (
              <button
                key={o}
                type="button"
                className="btn btn-primary"
                disabled={!name.trim()}
                onClick={() => {
                  setVotes({ ...votes, [o]: (votes[o] ?? 0) + 1 })
                  setVoted(true)
                }}
              >
                Vote {o}
              </button>
            ))}
          </div>
        </form>
      ) : (
        <p className="chip chip-done">Thanks{name ? `, ${name}` : ''} — vote recorded.</p>
      )}
      {options.map((o) => {
        const pct = Math.round(((votes[o] ?? 0) / total) * 100)
        return (
          <div key={o} className="bar-row">
            <span>{o}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span>{votes[o] ?? 0}</span>
          </div>
        )
      })}
    </div>
  )
}

export function AnalyticsDemo() {
  const week = [4, 6, 3, 8, 5, 9, 7]
  const max = Math.max(...week)

  return (
    <div className="demo-shell stack">
      <h2>CertForge analytics</h2>
      <div className="kpi-grid">
        <div className="kpi">
          <strong>7</strong>
          <span className="muted">Projects done</span>
        </div>
        <div className="kpi">
          <strong>12</strong>
          <span className="muted">Study streak</span>
        </div>
        <div className="kpi">
          <strong>86%</strong>
          <span className="muted">Quiz avg</span>
        </div>
        <div className="kpi">
          <strong>41</strong>
          <span className="muted">Waitlist</span>
        </div>
      </div>
      <svg viewBox="0 0 280 120" width="100%" height="140" role="img" aria-label="Weekly activity bars">
        {week.map((v, i) => {
          const h = (v / max) * 90
          return (
            <rect
              key={i}
              x={20 + i * 36}
              y={110 - h}
              width="24"
              height={h}
              rx="6"
              fill={i % 2 === 0 ? '#0f3d3e' : '#e25b45'}
            />
          )
        })}
      </svg>
    </div>
  )
}

export function AiWriterDemo() {
  const types = ['Landing headline', 'LinkedIn cert post', 'Lovable project prompt'] as const
  const [type, setType] = useState<(typeof types)[number]>(types[0])
  const [topic, setTopic] = useState('AI web developer certification')
  const [output, setOutput] = useState('')
  const [copied, setCopied] = useState(false)

  function generate() {
    const templates: Record<(typeof types)[number], string> = {
      'Landing headline': `CertForge turns “${topic}” into twelve shipped apps — then exam-ready proof for Lovable Foundations & Practitioner.`,
      'LinkedIn cert post': `I just finished another CertForge milestone on ${topic}. Building in public with Lovable: prompts → published apps → credential path (Foundations, Practitioner, Coursera vibe coding).`,
      'Lovable project prompt': `Build a polished web app about ${topic}. Brand-first hero, one CTA, mobile-ready layout, teal/mint palette (no purple), persist key state in localStorage, and include clear empty states.`,
    }
    setOutput(templates[type])
  }

  return (
    <div className="demo-shell stack">
      <h2>AI writer studio</h2>
      <label className="field">
        Type
        <select value={type} onChange={(e) => setType(e.target.value as (typeof types)[number])}>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Topic
        <input value={topic} onChange={(e) => setTopic(e.target.value)} />
      </label>
      <button type="button" className="btn btn-primary" onClick={generate}>
        Generate
      </button>
      <textarea rows={5} value={output} onChange={(e) => setOutput(e.target.value)} placeholder="Output appears here" />
      <button
        type="button"
        className="btn btn-ghost"
        disabled={!output}
        onClick={async () => {
          await navigator.clipboard.writeText(output)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1200)
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

type Product = { id: string; name: string; price: number; blurb: string }

const PRODUCTS: Product[] = [
  { id: 'prompts', name: 'Prompt Pack', price: 19, blurb: '12 category prompts ready for Lovable' },
  { id: 'blueprints', name: 'Project Blueprints', price: 39, blurb: 'Acceptance criteria + UX outlines' },
  { id: 'resume', name: 'Resume Kit', price: 15, blurb: 'Bullet formulas + credential lines' },
]

export function StorefrontDemo() {
  const [cart, setCart] = useLocal<Record<string, number>>('cf-cart', {})
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [order, setOrder] = useState<string | null>(null)
  const lines = useMemo(
    () =>
      PRODUCTS.filter((p) => (cart[p.id] ?? 0) > 0).map((p) => ({
        ...p,
        qty: cart[p.id] ?? 0,
      })),
    [cart],
  )
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0)

  return (
    <div className="demo-shell stack">
      <h2>CertForge store</h2>
      {order ? (
        <div className="callout panel">
          <strong>Order {order} confirmed</strong>
          <p>Thanks {name}. Receipt simulated for {email}.</p>
          <button type="button" className="btn btn-ghost" onClick={() => setOrder(null)}>
            Continue shopping
          </button>
        </div>
      ) : (
        <>
          <div className="store-grid">
            {PRODUCTS.map((p) => (
              <div key={p.id} className="cart-line">
                <div>
                  <strong>{p.name}</strong>
                  <div className="muted">
                    ${p.price} — {p.blurb}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setCart({ ...cart, [p.id]: (cart[p.id] ?? 0) + 1 })}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
          <h3>Cart (${total})</h3>
          {lines.length === 0 ? (
            <p className="muted">Cart is empty.</p>
          ) : (
            lines.map((l) => (
              <div key={l.id} className="cart-line">
                <span>
                  {l.name} × {l.qty}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    const next = { ...cart }
                    next[l.id] = Math.max(0, (next[l.id] ?? 0) - 1)
                    if (next[l.id] === 0) delete next[l.id]
                    setCart(next)
                  }}
                >
                  −1
                </button>
              </div>
            ))
          )}
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault()
              if (!lines.length || !name.trim() || !email.includes('@')) return
              setOrder(`CF-${Date.now().toString().slice(-6)}`)
              setCart({})
            }}
          >
            <label className="field">
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="field">
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <button className="btn btn-accent" type="submit" disabled={!lines.length}>
              Checkout
            </button>
          </form>
        </>
      )}
    </div>
  )
}
