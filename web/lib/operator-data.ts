/**
 * Operator-dashboard demo dataset, transcribed from the approved Claude Design
 * "Operator Dashboard". Served via lib/operator-api.ts; deleted wholesale when
 * the v2 backend replaces the mock adapter.
 */
import type {
  CrawlPage,
  OpConversation,
  ReviewItem,
  SandboxAnswer,
  Source,
  Tenant,
  TriageItem,
  UsageRow,
} from './operator-types';

const BRAMPTON_PROMPT =
  "You are the website assistant for Brampton & Hale, a chartered accountancy practice in Maidstone. Answer only from the provided context. Quote fees exactly as written, including VAT treatment. If the context doesn't contain the answer, say so plainly and offer to take the visitor's details. Keep answers under 80 words, plain British English.";

export const demoTenants: Tenant[] = [
  {
    id: '1', name: 'Brampton & Hale', domain: 'bramptonhale.co.uk', status: 'active', model: 'Haiku',
    used: 1204, cap: 2000, cost: '£14.20', last: '8 min ago', flags: 2, insights: 3,
    agentName: 'Brampton & Hale assistant', systemPrompt: BRAMPTON_PROMPT,
    disclaimer: 'General guidance, not financial advice.', accent: '#2D5A44',
    caps: { monthly: '2,000', daily: '150', session: '12' },
  },
  {
    id: '2', name: 'Aldergate Solicitors', domain: 'aldergatelaw.co.uk', status: 'active', model: 'Sonnet',
    used: 812, cap: 2000, cost: '£22.75', last: '1 h ago', flags: 1, insights: 4,
    agentName: 'Aldergate Solicitors assistant',
    systemPrompt: BRAMPTON_PROMPT.replace('Brampton & Hale, a chartered accountancy practice in Maidstone', 'Aldergate Solicitors, a law firm in Canterbury').replace('fees', 'fees and charges'),
    disclaimer: 'General information, not legal advice.', accent: '#1F3A5F',
    caps: { monthly: '2,000', daily: '150', session: '12' },
  },
  {
    id: '3', name: 'Kentish Heating Co', domain: 'kentishheating.co.uk', status: 'pending', model: 'Haiku',
    used: 0, cap: 1000, cost: '£0.00', last: '—', flags: 0, insights: 0,
    agentName: 'Kentish Heating assistant',
    systemPrompt: "You are the website assistant for Kentish Heating Co, a Gas Safe registered heating firm in Kent. Answer only from the provided context. Quote prices exactly as written. If the context doesn't contain the answer, say so plainly and offer to take the visitor's details. Keep answers under 80 words, plain British English, no jargon.",
    disclaimer: "Estimates are indicative until we've seen the job.", accent: '#B3552E',
    caps: { monthly: '1,000', daily: '80', session: '12' },
    onboardingStep: 4,
  },
  {
    id: '4', name: 'Marlowe & Finch Law', domain: 'marlowefinch.co.uk', status: 'paused', model: 'Haiku',
    used: 640, cap: 1500, cost: '£6.10', last: '3 d ago', flags: 0, insights: 1,
    agentName: 'Marlowe & Finch assistant', systemPrompt: BRAMPTON_PROMPT,
    disclaimer: 'General information, not legal advice.', accent: '#53387A',
    caps: { monthly: '1,500', daily: '120', session: '12' },
  },
  {
    id: '5', name: 'Foxton Roofing', domain: 'foxtonroofing.co.uk', status: 'past_due', model: 'Haiku',
    used: 1490, cap: 1500, cost: '£11.85', last: '2 h ago', flags: 1, insights: 0,
    agentName: 'Foxton Roofing assistant', systemPrompt: BRAMPTON_PROMPT,
    disclaimer: 'Estimates are indicative until we have seen the job.', accent: '#6E3B2A',
    caps: { monthly: '1,500', daily: '120', session: '12' },
  },
];

export const demoSources: Record<string, Source[]> = {
  '1': [
    { id: 's1', icon: 'site', name: 'bramptonhale.co.uk', type: 'Website', size: '14 pages · 212 chunks', status: 'synced', synced: '2 h ago' },
    { id: 's2', icon: 'site', name: '/fees', type: 'Page', size: '1 page · 18 chunks', status: 'drift', synced: '9 d ago' },
    { id: 's3', icon: 'pdf', name: 'Fee schedule 2026.pdf', type: 'PDF', size: '6 pages · 44 chunks', status: 'synced', synced: '12 Jul' },
    { id: 's4', icon: 'text', name: 'Onboarding FAQ (pasted)', type: 'Text', size: '9 chunks', status: 'synced', synced: '3 Mar' },
  ],
  '2': [
    { id: 's6', icon: 'site', name: 'aldergatelaw.co.uk', type: 'Website', size: '22 pages · 340 chunks', status: 'synced', synced: '1 h ago' },
    { id: 's7', icon: 'pdf', name: 'Price transparency 2026.pdf', type: 'PDF', size: '11 pages · 78 chunks', status: 'synced', synced: '2 Jul' },
    { id: 's8', icon: 'text', name: 'Probate FAQ (pasted)', type: 'Text', size: '14 chunks', status: 'synced', synced: '14 Jun' },
  ],
  '3': [
    { id: 's5', icon: 'site', name: 'kentishheating.co.uk', type: 'Website', size: '6 pages · 126 chunks', status: 'processing', synced: 'ingesting…' },
  ],
};

export const demoDrift =
  'Drift detected: /fees changed on the live site on 17 Jul. The agent still answers from the old copy — review and refresh before it misquotes a price.';

export const demoReviewItems: ReviewItem[] = [
  {
    id: 'r1', type: 'flag', tenant: 'Brampton & Hale', question: 'When is the VAT deadline?', time: 'Today 10:05',
    context: 'Sarah flagged this answer: "Deadline wording is confusing for our quarterly clients — can it mention the 7th explicitly?"',
    answer: 'VAT returns are due one calendar month and seven days after the end of your accounting period — for most clients that means 7 August for the June quarter.',
    cite: 'Cited: Tax Deadlines 2026',
    chunks: [{ src: 'tax-deadlines #2', sim: 0.91 }, { src: 'vat-guide #4', sim: 0.72 }],
  },
  {
    id: 'r2', type: 'flag', tenant: 'Aldergate Solicitors', question: 'How much is probate?', time: 'Yesterday 15:22',
    context: 'Client flagged: "We quote 2–4% of estate value, the answer says fixed fee — source page is out of date."',
    answer: 'Probate support is a fixed fee of £1,200 plus VAT for straightforward estates.',
    cite: 'Cited: Wills & Probate Fees',
    chunks: [{ src: 'probate-fees #1', sim: 0.88 }, { src: 'wills-fees #3', sim: 0.69 }],
  },
  {
    id: 'r3', type: 'down', tenant: 'Brampton & Hale', question: 'When is the VAT deadline?', time: 'Yesterday 16:48',
    context: 'Visitor marked the answer unhelpful. Same topic as the open flag — likely the quarterly wording.',
    answer: 'VAT returns are due one calendar month and seven days after the end of your accounting period.',
    cite: 'Cited: Tax Deadlines 2026',
    chunks: [{ src: 'tax-deadlines #2', sim: 0.91 }],
  },
  {
    id: 'r4', type: 'down', tenant: 'Aldergate Solicitors', question: 'How long does conveyancing take?', time: 'Thu 12:31',
    context: 'Visitor marked unhelpful. The answer is accurate but vague — content has no timeline detail beyond "8–12 weeks".',
    answer: 'Residential conveyancing typically takes 8–12 weeks from offer to completion.',
    cite: 'Cited: Conveyancing',
    chunks: [{ src: 'conveyancing #2', sim: 0.83 }],
  },
  {
    id: 'r5', type: 'down', tenant: 'Foxton Roofing', question: "What's your call-out charge?", time: 'Wed 09:12',
    context: 'Visitor marked unhelpful — the cited page still shows the 2025 price. Drift also detected on this source.',
    answer: 'Our call-out charge is £60, which covers an inspection and quote.',
    cite: 'Cited: Prices (updated Jan 2025)',
    chunks: [{ src: 'prices #1', sim: 0.87 }],
  },
  {
    id: 'r6', type: 'weak', tenant: 'Aldergate Solicitors', question: 'Do you do notary services?', time: 'Wed 14:47',
    context: 'Weak retrieval — best match 0.41, below the 0.55 threshold. Agent refused correctly. Worth asking Aldergate if they want notary content added.',
    answer: "I don't have that in my knowledge base — can I take your details so the team can follow up?",
    cite: 'No source cited (refusal)',
    chunks: [{ src: 'services #4', sim: 0.41 }, { src: 'about #1', sim: 0.29 }],
  },
  {
    id: 'r7', type: 'insight', tenant: 'Brampton & Hale', question: 'Do you work with CIS subcontractors?', time: 'Tue 11:20',
    context: 'New insight group — asked 2 times this week by different visitors. Candidate for the July report and a new content block.',
    answer: 'Refused both times — no CIS content exists.',
    cite: 'Suggested: add "CIS & subcontractors" section to Services',
    chunks: [{ src: 'services-fees #2', sim: 0.44 }, { src: 'payroll #1', sim: 0.38 }],
  },
];

export const demoOpConversations: OpConversation[] = [
  { question: 'How much is a self-assessment tax return?', time: 'Today 14:32', status: 'answered', telemetry: '2 msgs · top sim 0.93 services-fees · 640 tok · £0.008' },
  { question: 'Do you do audits?', time: 'Today 09:14', status: 'escalated', telemetry: '2 msgs · top sim 0.44 (below threshold) · refused · details captured' },
  { question: 'When is the VAT deadline?', time: 'Yesterday 16:48', status: 'answered', telemetry: '1 msg · top sim 0.91 tax-deadlines · thumbs-down from visitor · in review queue' },
];

export const demoTriage: TriageItem[] = [
  { id: 't1', question: 'Do you work with CIS subcontractors?', count: 2, meta: 'first seen 16 Jul' },
  { id: 't2', question: 'Do you do audits?', count: 3, meta: 'first seen 12 Jul' },
  { id: 't3', question: 'Can you help with a late tax return?', count: 4, meta: 'escalated twice' },
];

export const demoUsage: UsageRow[] = [
  { name: 'Brampton & Hale', msgs: 1204, cap: 2000, tokens: '2.4M', cost: 14.2, alert: '—' },
  { name: 'Aldergate Solicitors', msgs: 812, cap: 2000, tokens: '2.9M', cost: 22.75, alert: '—' },
  { name: 'Foxton Roofing', msgs: 1490, cap: 1500, tokens: '1.2M', cost: 11.85, alert: '80% alert sent · past due' },
  { name: 'Marlowe & Finch Law', msgs: 640, cap: 1500, tokens: '0.6M', cost: 6.1, alert: 'paused 16 Jul' },
  { name: 'Kentish Heating Co', msgs: 0, cap: 1000, tokens: '—', cost: 0, alert: 'not live' },
];

export const demoUsageBars = [42, 55, 38, 61, 70, 48, 30, 66, 74, 58, 80, 63, 52, 68];

export const demoCrawlPages: CrawlPage[] = [
  { id: 'c1', title: 'Home', path: '/', chunks: '18 chunks', status: 'done' },
  { id: 'c2', title: 'Services & Prices', path: '/services', chunks: '34 chunks', status: 'done' },
  { id: 'c3', title: 'Boiler installation', path: '/boilers', chunks: '26 chunks', status: 'done' },
  { id: 'c4', title: 'Service plans', path: '/plans', chunks: '21 chunks', status: 'processing' },
  { id: 'c5', title: 'About us', path: '/about', chunks: '15 chunks', status: 'processing' },
  { id: 'c6', title: 'Contact & areas covered', path: '/contact', chunks: '12 chunks', status: 'queued' },
  { id: 'c7', title: 'Blog (23 posts)', path: '/blog', chunks: '—', status: 'skipped' },
];

/** Sandbox answers for the wizard test chat (Kentish Heating content). */
export function sandboxAnswer(q: string): SandboxAnswer {
  const low = q.toLowerCase();
  if (low.includes('call-out') || low.includes('callout') || low.includes('charge')) {
    return {
      text: 'Our standard call-out is £85 plus VAT, covering the first hour on site. Evenings and weekends are £120 plus VAT.',
      srcLine: 'From: Services & Prices · would cite in widget',
      chunks: [
        { src: 'services-prices #3', sim: 0.89, excerpt: '"Call-out: £85 + VAT, first hour included…"' },
        { src: 'service-plans #1', sim: 0.71, excerpt: '"Plan members get two free call-outs a year…"' },
      ],
      meta: 'haiku-4 · 312 tokens · 640 ms',
    };
  }
  if (low.includes('boiler') && (low.includes('service') || low.includes('much'))) {
    return {
      text: 'A standard gas boiler service is £75 plus VAT, taking around 45 minutes. We service most makes and models.',
      srcLine: 'From: Services & Prices',
      chunks: [
        { src: 'services-prices #1', sim: 0.86, excerpt: '"Gas boiler servicing from £75 + VAT…"' },
        { src: 'home #2', sim: 0.63, excerpt: '"Gas Safe registered engineers across Kent…"' },
      ],
      meta: 'haiku-4 · 288 tokens · 590 ms',
    };
  }
  return {
    text: "I don't have that in my knowledge base — I'd take the visitor's details here.",
    srcLine: 'Refusal — no source cited',
    chunks: [
      { src: 'services-prices #5', sim: 0.41, excerpt: '"…gas boiler servicing from £75 + VAT…"' },
      { src: 'about-us #2', sim: 0.33, excerpt: '"Founded in 2011 by Dan Kentish…"' },
    ],
    meta: 'haiku-4 · 190 tokens · 470 ms · below 0.55 threshold',
  };
}

const EMBED_SCRIPT = `<script src="https://cdn.supportai.uk/widget.js"
  data-tenant="kentish-heating"
  data-accent="#B3552E"
  defer></script>`;

export const embedSnippets: Record<string, { label: string; code: string; note: string }> = {
  html: {
    label: 'HTML',
    code: EMBED_SCRIPT,
    note: 'Paste before the closing body tag. The widget lazy-loads after page content — no effect on their site speed scores.',
  },
  next: {
    label: 'Next.js',
    code: `// app/layout.tsx\nimport Script from 'next/script'\n\n<Script\n  src="https://cdn.supportai.uk/widget.js"\n  data-tenant="kentish-heating"\n  data-accent="#B3552E"\n  strategy="lazyOnload"\n/>`,
    note: 'Add once in the root layout. lazyOnload keeps it out of the critical path.',
  },
  wp: {
    label: 'WordPress',
    code: `WordPress admin → WPCode plugin → Footer snippet\n(survives theme updates)\n\n${EMBED_SCRIPT}`,
    note: "Use the plugin route on client WordPress sites so theme updates don't wipe it.",
  },
};
