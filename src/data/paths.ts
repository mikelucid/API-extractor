export interface CredentialPath {
  id: string
  title: string
  provider: string
  kind: 'exam' | 'activity' | 'university' | 'discount'
  summary: string
  steps: string[]
  links: { label: string; href: string }[]
  resumeLine: string
}

export const CREDENTIAL_PATHS: CredentialPath[] = [
  {
    id: 'foundations',
    title: 'Lovable Foundations',
    provider: 'Lovable Certification Hub',
    kind: 'exam',
    summary:
      'Beginner exam covering the Lovable interface, components, Tailwind styling, and AI prompting (~45 min, ~40 questions).',
    steps: [
      'Complete Projects 1–4 in this lab to practice UI + prompts',
      'Skim docs.lovable.dev on editor, publish, and Tailwind',
      'Take the Foundations exam at the Certification Hub',
      'Download / verify your certificate and add it to LinkedIn',
    ],
    links: [
      {
        label: 'Certification Hub exams',
        href: 'https://certification-journey-hub.lovable.app/exams',
      },
      { label: 'Lovable docs', href: 'https://docs.lovable.dev/' },
    ],
    resumeLine:
      'Lovable Foundations — Certified in AI-assisted web UI development (components, Tailwind, prompting).',
  },
  {
    id: 'practitioner',
    title: 'Lovable Practitioner',
    provider: 'Lovable Certification Hub',
    kind: 'exam',
    summary:
      'Advanced exam on Supabase, auth, edge functions/APIs, and production deployment (~90 min, ~60 questions).',
    steps: [
      'Finish all 12 lab projects and rebuild 2–3 inside lovable.dev with Cloud/Supabase',
      'Practice auth + database on at least one published app',
      'Review security + publish docs',
      'Sit the Practitioner exam and verify the certificate',
    ],
    links: [
      {
        label: 'Certification Hub exams',
        href: 'https://certification-journey-hub.lovable.app/exams',
      },
      {
        label: 'Verify a certificate',
        href: 'https://certification-journey-hub.lovable.app/verify',
      },
    ],
    resumeLine:
      'Lovable Practitioner — Full-stack AI web apps with databases, authentication, and production deploy.',
  },
  {
    id: 'linkedin-vibe',
    title: 'LinkedIn Vibe Coding level',
    provider: 'Lovable',
    kind: 'activity',
    summary:
      'Usage-based builder levels (Bronze → Diamond) based on messages while building. Connect from account settings to LinkedIn.',
    steps: [
      'Build the 12 projects on lovable.dev (not only this local lab) to accumulate messages',
      'Open lovable.dev/settings?tab=account and note your vibe level',
      'Click Connect to LinkedIn and follow the prompts',
      'Flex responsibly on your profile',
    ],
    links: [
      {
        label: 'Account settings',
        href: 'https://lovable.dev/settings?tab=account',
      },
    ],
    resumeLine:
      'Lovable Vibe Coder — Active AI-native builder (LinkedIn-verified level).',
  },
  {
    id: 'colorado',
    title: 'Vibe Coding Fundamentals',
    provider: 'University of Colorado System (Coursera)',
    kind: 'university',
    summary:
      'University-backed Coursera course covering vibe coding foundations with tools including Lovable, Replit, and Bolt — shareable certificate for resume/LinkedIn.',
    steps: [
      'Enroll in Vibe Coding Fundamentals on Coursera (audit free; certificate via purchase or Coursera Plus)',
      'Complete modules on LLMs, prompting, debugging, and responsible AI',
      'Practice on Lovable alongside this CertForge lab',
      'Add the University of Colorado System certificate to your resume',
    ],
    links: [
      {
        label: 'Course on Coursera',
        href: 'https://www.coursera.org/learn/vibe-coding-fundamentals',
      },
      {
        label: 'Vibe Coding with Lovable',
        href: 'https://www.coursera.org/learn/vibe-coding-with-lovable-from-idea-to-app',
      },
    ],
    resumeLine:
      'Vibe Coding Fundamentals — University of Colorado System (Coursera). AI-assisted development with Lovable and related tools.',
  },
  {
    id: 'student-pro',
    title: 'Student Pro discount',
    provider: 'Lovable',
    kind: 'discount',
    summary:
      'Verified students/teachers can get ~50% off Lovable Pro for up to 12 months (about $12.50/mo). Requires educational email or student ID — not a free Pro year by default.',
    steps: [
      'Resume or enroll in accredited schooling so you have a valid .edu / student ID',
      'Create or use a free Lovable workspace',
      'Visit lovable.dev/students and verify status',
      'Upgrade to Pro with the student price for the eligible year',
    ],
    links: [
      { label: 'Student discount', href: 'https://lovable.dev/students' },
      { label: 'Pricing', href: 'https://lovable.dev/pricing' },
    ],
    resumeLine:
      'Built and shipped a 12-project Lovable portfolio while on student Pro tooling.',
  },
]

export const RESUME_BULLETS = [
  'Completed a 12-project AI web developer portfolio across Personal, Business, Productivity, Education, Community, Data & AI, and E-commerce categories using Lovable-style workflows (React, TypeScript, Tailwind patterns).',
  'Prepared for Lovable Foundations and Practitioner certifications covering prompting, UI systems, Supabase/auth, and production publishing.',
  'Pursuing university-accredited vibe coding coursework (University of Colorado System via Coursera) alongside hands-on Lovable builds.',
]
