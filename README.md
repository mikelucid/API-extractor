# Amorphous Adaptive — Web Host for AWS & Google Cloud

**Declare once. Deploy everywhere.** Amorphous connects to AWS or Google Cloud, synthesises the right architecture per workload, and gives you a super admin panel for full control — with one-click free spin-ups and zero unnecessary forms.

## Quick start

```bash
# Terminal 1 — API (PHP 8.2+)
cd server && composer install && php -S localhost:8080 -t public

# Terminal 2 — Frontend
npm install && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

| Route | Purpose |
|-------|---------|
| `/` | Marketing landing |
| `/spin` | One-click spin-up wizard (AWS or GCP) |
| `/dashboard` | Your environments |
| `/admin` | Super admin panel (token: `amorphous-super-admin-dev`) |

**Pricing:** `monthly bill = cloud cost × 1.25`, $29 floor, free tier = 4h Spot TTL.

CertForge certification lab routes moved to `/cert/*`.

---

# CertForge — Lovable AI Web Developer Certification Lab

Interactive lab for completing **12 portfolio projects across 7 categories**, tracking progress, and preparing for:

- [Lovable Foundations & Practitioner exams](https://certification-journey-hub.lovable.app/exams)
- LinkedIn vibe coding level (account settings → Connect to LinkedIn)
- University-backed [Vibe Coding Fundamentals](https://www.coursera.org/learn/vibe-coding-fundamentals) (University of Colorado System on Coursera)
- [Student Pro discount](https://lovable.dev/students) (~50% off Pro for up to 12 months after verification)

## Run locally

```bash
npm install
npm run dev
```

## Related package: Agent

Local safety supervisor (datasets + allowlisted agents + constitution gate) lives in [`cursor-rootv2/`](./cursor-rootv2/). The PHP/Laravel filesystem that mirrors each theory document lives in [`server/`](./server/). Both are separate from this certification lab.

## What’s included

| # | Project | Category |
|---|---------|----------|
| 1 | Portfolio site | Personal |
| 2 | Link-in-bio | Personal |
| 3 | SaaS landing | Business |
| 4 | Appointment booking | Business |
| 5 | Task manager | Productivity |
| 6 | Habit heatmap | Productivity |
| 7 | Flashcards & quiz | Education |
| 8 | Student progress | Education |
| 9 | Event voting | Community |
| 10 | Analytics dashboard | Data & AI |
| 11 | AI content generator | Data & AI |
| 12 | Digital storefront | E-commerce |

Each project page has a working demo, acceptance checklist, copy-paste Lovable prompt, and local progress notes.

## Note on Pro offers

Documented student pricing is **~50% off Pro for up to one year** after educational verification. Treat “free year Pro” / “discount for life” claims as unverified unless confirmed in your Lovable account.
