export type ProjectCategory =
  | 'Personal'
  | 'Business'
  | 'Productivity'
  | 'Education'
  | 'Community'
  | 'Data & AI'
  | 'E-commerce'

export type ProjectDifficulty = 'Beginner' | 'Intermediate' | 'Advanced'

export interface CertProject {
  id: string
  number: number
  title: string
  category: ProjectCategory
  difficulty: ProjectDifficulty
  summary: string
  skills: string[]
  lovablePrompt: string
  acceptance: string[]
}

export const CATEGORIES: ProjectCategory[] = [
  'Personal',
  'Business',
  'Productivity',
  'Education',
  'Community',
  'Data & AI',
  'E-commerce',
]

export const PROJECTS: CertProject[] = [
  {
    id: 'portfolio',
    number: 1,
    title: 'Portfolio site with projects',
    category: 'Personal',
    difficulty: 'Beginner',
    summary:
      'A personal brand site with hero, project grid, about section, and contact CTA — your first published Lovable app.',
    skills: ['Responsive layout', 'Navigation', 'Tailwind styling', 'Publish flow'],
    lovablePrompt: `Build a personal portfolio website for an AI web developer named Mike Lucid.
Brand first: large "Mike Lucid" wordmark in the hero, then a short headline "AI web developer shipping production apps with Lovable."
Include sticky nav (Work, About, Contact), a project grid with 3 sample case studies, an about blurb, and a contact form.
Use Syne + Outfit fonts, deep teal (#0F3D3E) and mint accents, soft layered gradient background — not purple, not cream.
Make it mobile-first and publish-ready.`,
    acceptance: [
      'Hero shows brand name larger than supporting copy',
      'Project grid filters or links to sample work',
      'Contact form validates email client-side',
      'Looks good at 375px and 1280px',
    ],
  },
  {
    id: 'link-in-bio',
    number: 2,
    title: 'Link-in-bio page',
    category: 'Personal',
    difficulty: 'Beginner',
    summary:
      'A mobile-first hub with profile, featured links, and click tracking — Linktree-style but fully branded.',
    skills: ['Mobile layout', 'Local state', 'Click tracking', 'Theming'],
    lovablePrompt: `Build a link-in-bio page for CertForge / Mike Lucid.
Profile avatar circle, name, short bio, and a vertical stack of link buttons (Portfolio, LinkedIn, Lovable profile, YouTube).
Track clicks in localStorage and show a tiny count under each link.
Mobile-first, full-bleed soft gradient background, no cards with heavy shadows.`,
    acceptance: [
      'All primary links are tappable on phone',
      'Click counts persist after refresh',
      'Profile and brand name dominate the first screen',
    ],
  },
  {
    id: 'saas-landing',
    number: 3,
    title: 'SaaS landing page',
    category: 'Business',
    difficulty: 'Beginner',
    summary:
      'A product marketing page with hero, feature narrative, pricing teaser, and waitlist email capture.',
    skills: ['Marketing sections', 'Forms', 'CTA hierarchy', 'Motion'],
    lovablePrompt: `Build a SaaS landing page for "CertForge" — a lab that helps builders complete Lovable AI web developer certification through 12 category projects.
Hero: brand CertForge, one headline, one sentence, waitlist CTA.
Then one features section, one how-it-works section, and a simple pricing teaser (Free lab / Student Pro path).
Add subtle entrance motion (fade/slide) on scroll. Avoid purple gradients and pill badge clutter.`,
    acceptance: [
      'Single clear CTA above the fold',
      'Waitlist stores emails in localStorage',
      'Three sections max below the hero',
    ],
  },
  {
    id: 'booking',
    number: 4,
    title: 'Appointment booking',
    category: 'Business',
    difficulty: 'Intermediate',
    summary:
      'Pick a service, choose a date/time slot, and confirm a booking — classic client-facing business flow.',
    skills: ['Multi-step forms', 'Date selection', 'Validation', 'Confirmation UI'],
    lovablePrompt: `Build an appointment booking app for a freelance AI web developer.
Steps: 1) choose service (Audit 30m, Build plan 60m, Pair session 90m), 2) pick date + time slot, 3) enter name/email, 4) confirmation summary.
Store bookings in localStorage. Clean calendar/slot UI, no dense dashboard chrome in the first viewport.`,
    acceptance: [
      'Cannot submit without service + slot + contact',
      'Booked slots cannot be double-booked',
      'Confirmation shows all booking details',
    ],
  },
  {
    id: 'tasks',
    number: 5,
    title: 'Task manager',
    category: 'Productivity',
    difficulty: 'Intermediate',
    summary:
      'Create, complete, filter, and delete tasks with priorities — the core CRUD productivity app.',
    skills: ['CRUD', 'Filters', 'Persistence', 'Keyboard UX'],
    lovablePrompt: `Build a task manager with add, complete, delete, and filters (All / Active / Done).
Support priority (Low/Med/High) and persist to localStorage.
Press Enter to add. Clean list UI, not a kanban board. Brand it "Forge Tasks".`,
    acceptance: [
      'Tasks persist across refresh',
      'Filters work correctly',
      'Completed tasks are visually distinct',
    ],
  },
  {
    id: 'habits',
    number: 6,
    title: 'Habit tracker with heatmap',
    category: 'Productivity',
    difficulty: 'Advanced',
    summary:
      'Track daily habits and visualize streaks with a GitHub-style contribution heatmap.',
    skills: ['Date math', 'Heatmaps', 'Streaks', 'Charts-like UI'],
    lovablePrompt: `Build a habit tracker with a GitHub-style heatmap for the last 12 weeks.
Users can add habits, toggle today complete, and see current streak.
Persist data in localStorage. Calm teal/mint palette, expressive typography.`,
    acceptance: [
      'Heatmap reflects completed days',
      'Streak updates when toggling today',
      'Multiple habits supported',
    ],
  },
  {
    id: 'flashcards',
    number: 7,
    title: 'Flashcard & quiz app',
    category: 'Education',
    difficulty: 'Intermediate',
    summary:
      'Study decks with flip cards and a short scored quiz mode for Lovable / web-dev concepts.',
    skills: ['Flip animation', 'Quiz scoring', 'Deck data', 'Learning UX'],
    lovablePrompt: `Build a flashcard app for Lovable AI web developer certification study.
Include a starter deck of 8 cards (prompts, Supabase, publish, credits, Tailwind, GitHub sync, Agent mode, LinkedIn vibe level).
Flip cards, then a quiz mode that scores right/wrong. Local only, no backend.`,
    acceptance: [
      'Cards flip front/back',
      'Quiz reports score out of total',
      'Can restart quiz',
    ],
  },
  {
    id: 'student-progress',
    number: 8,
    title: 'Student progress tracker',
    category: 'Education',
    difficulty: 'Intermediate',
    summary:
      'Track certification module completion percentages and remaining work across courses.',
    skills: ['Progress bars', 'Module lists', 'Percent calc', 'Goals'],
    lovablePrompt: `Build a student progress tracker for an AI web developer certification path.
Modules: Foundations exam prep, Practitioner exam prep, 12 portfolio projects, Coursera Vibe Coding Fundamentals, LinkedIn vibe level, Student Pro verification.
Each module has a 0–100% slider or increment controls. Show overall completion ring.`,
    acceptance: [
      'Overall % is average of modules',
      'Progress persists',
      'Clear next-up recommendation when incomplete',
    ],
  },
  {
    id: 'event-poll',
    number: 9,
    title: 'Event & voting tool',
    category: 'Community',
    difficulty: 'Intermediate',
    summary:
      'Create a meetup-style event and let attendees vote on time options or topics.',
    skills: ['Voting', 'Aggregates', 'Sharing UX', 'Community flows'],
    lovablePrompt: `Build a lightweight event page with title, description, and 3 time-slot poll options.
Visitors pick a name and vote once (tracked in localStorage). Show live tallies with bars.
Brand as a CertForge study meetup.`,
    acceptance: [
      'One vote per browser session',
      'Tallies update immediately',
      'Event details are readable on mobile',
    ],
  },
  {
    id: 'analytics',
    number: 10,
    title: 'Analytics dashboard',
    category: 'Data & AI',
    difficulty: 'Intermediate',
    summary:
      'A metrics overview with KPI tiles and simple charts for a sample product.',
    skills: ['Dashboard layout', 'SVG charts', 'KPI hierarchy', 'Sample data'],
    lovablePrompt: `Build an analytics dashboard for CertForge with KPIs: projects completed, study streak, quiz avg, waitlist signups.
Include a simple bar chart (SVG or CSS) for weekly activity and a line-ish trend for completions.
Keep the first viewport focused — KPIs + one chart — not a dense BI wall.`,
    acceptance: [
      'Four KPIs visible',
      'Chart renders without a chart library if possible',
      'Responsive stacking on mobile',
    ],
  },
  {
    id: 'ai-writer',
    number: 11,
    title: 'AI content generator',
    category: 'Data & AI',
    difficulty: 'Advanced',
    summary:
      'Generate marketing copy from templates (simulated AI) for landing pages and LinkedIn posts.',
    skills: ['Prompt UX', 'Template generation', 'Copy actions', 'Output editing'],
    lovablePrompt: `Build an "AI writer" that simulates generation locally (no API key required).
User picks type (Landing headline, LinkedIn cert post, Lovable project prompt), enters a topic, clicks Generate, gets editable output.
Include copy-to-clipboard. Make the UI feel like a focused writing studio.`,
    acceptance: [
      'Three output types available',
      'Generated text is editable',
      'Copy button confirms success',
    ],
  },
  {
    id: 'storefront',
    number: 12,
    title: 'Digital product storefront',
    category: 'E-commerce',
    difficulty: 'Intermediate',
    summary:
      'Browse digital products, add to cart, and checkout with a mock payment confirmation.',
    skills: ['Catalog', 'Cart state', 'Checkout', 'Order summary'],
    lovablePrompt: `Build a small digital storefront selling CertForge packs: Prompt Pack, Project Blueprints, Resume Kit.
Product list, detail/add to cart, cart drawer or page, checkout form (name/email), order confirmation.
Prices in USD. Persist cart in localStorage. No real payments.`,
    acceptance: [
      'Cart quantity updates correctly',
      'Checkout requires name + email',
      'Order confirmation clears cart',
    ],
  },
]
