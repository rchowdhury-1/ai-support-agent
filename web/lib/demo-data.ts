/**
 * Demo dataset for the client dashboard, transcribed from the approved
 * Claude Design "Client Dashboard" — Brampton & Hale Accountants.
 * Served through lib/api.ts so pages never import this directly; the whole
 * file disappears when the v2 backend replaces the mock adapter.
 */
import type { Billing, Conversation, Enquiry, InsightMonth, Overview, SessionUser } from './types';

export const demoUser: SessionUser = {
  name: 'Sarah Brampton',
  initials: 'SB',
  businessName: 'Brampton & Hale',
};

export const demoOverview: Overview = {
  rangeLabel: '1–19 July 2026',
  stats: [
    { label: 'Conversations', value: '128', sub: '↑ 12% on June', tone: 'ink' },
    { label: 'Questions answered', value: '214', sub: 'with a source shown', tone: 'ink' },
    { label: 'Answer rate', value: '91%', sub: 'of everything asked', tone: 'good' },
    { label: 'Enquiries awaiting', value: '2', sub: 'visitors to call back', tone: 'warn' },
  ],
  spark: [3, 5, 4, 6, 8, 7, 9, 6, 8, 10, 9, 12, 11, 9, 13, 12, 14, 11, 15],
  reportTeaser: {
    headline: "Your customers asked 9 things your website couldn't answer.",
    body: '2 answers already added this month — including VAT return pricing, now answered 17 times.',
  },
  waiting: [
    { initials: 'JW', name: 'James Whitfield', question: 'Do you do audits?', time: 'Today, 09:14' },
    { initials: 'PS', name: 'Priya Shah', question: 'Can you help with a late tax return?', time: 'Yesterday, 16:40' },
  ],
};

export const demoConversations: Conversation[] = [
  {
    id: '1',
    who: 'Anonymous visitor',
    initials: 'V',
    firstQuestion: 'How much is a self-assessment tax return?',
    time: 'Today, 14:32',
    status: 'answered',
    messages: [
      { role: 'user', text: 'How much is a self-assessment tax return?' },
      {
        role: 'assistant',
        text: "A self-assessment tax return is £180 including VAT, covering employment income plus one rental property. Anything more involved and we'll quote after a quick look at your records.",
        source: 'Services & Fees',
      },
      { role: 'user', text: 'Does that include the rental income pages?' },
      {
        role: 'assistant',
        text: 'Yes — one rental property is included in the £180 fee. Additional properties are £25 each.',
        source: 'Services & Fees',
      },
    ],
  },
  {
    id: '2',
    who: 'James Whitfield',
    initials: 'JW',
    firstQuestion: 'Do you do audits?',
    time: 'Today, 09:14',
    status: 'escalated',
    messages: [
      { role: 'user', text: 'Do you do audits?' },
      { role: 'assistant', text: "I don't have that in my knowledge base — can I take your details so the team can follow up?", noSource: true },
      { role: 'user', text: 'James Whitfield, james@whitfieldjoinery.co.uk' },
      { role: 'assistant', text: "Thanks James — I've passed your details to the team. They'll be in touch within one working day.", noSource: true },
    ],
  },
  {
    id: '3',
    who: 'Anonymous visitor',
    initials: 'V',
    firstQuestion: 'When is the VAT deadline?',
    time: 'Yesterday, 16:48',
    status: 'answered',
    messages: [
      { role: 'user', text: 'When is the VAT deadline?' },
      {
        role: 'assistant',
        text: 'VAT returns are due one calendar month and seven days after the end of your accounting period — for most clients that means 7 August for the June quarter.',
        source: 'Tax Deadlines 2026',
        visitorThumbDown: true,
      },
    ],
  },
  {
    id: '4',
    who: 'Anonymous visitor',
    initials: 'V',
    firstQuestion: 'Do you handle company formation?',
    time: 'Yesterday, 11:02',
    status: 'no_answer',
    messages: [
      { role: 'user', text: 'Do you handle company formation?' },
      { role: 'assistant', text: "I don't have that in my knowledge base — can I take your details so the team can follow up?", noSource: true },
    ],
  },
  {
    id: '5',
    who: 'Anonymous visitor',
    initials: 'V',
    firstQuestion: 'What are your opening hours?',
    time: 'Thu, 15:20',
    status: 'answered',
    messages: [
      { role: 'user', text: 'What are your opening hours?' },
      {
        role: 'assistant',
        text: "We're open 9am to 5:30pm, Monday to Friday — with Saturday mornings by appointment during January.",
        source: 'Contact & Opening Hours',
      },
    ],
  },
  {
    id: '6',
    who: 'Priya Shah',
    initials: 'PS',
    firstQuestion: 'Can you help with a late tax return?',
    time: 'Wed, 16:40',
    status: 'escalated',
    messages: [
      { role: 'user', text: 'Can you help with a late tax return?' },
      { role: 'assistant', text: "I don't have that in my knowledge base — can I take your details so the team can follow up?", noSource: true },
      { role: 'user', text: 'Priya Shah — priya.shah@gmail.com please' },
      { role: 'assistant', text: "Thanks Priya — I've passed your details to the team. They'll be in touch within one working day.", noSource: true },
    ],
  },
];

export const demoInsightMonths: InsightMonth[] = [
  {
    key: '2026-06',
    label: 'June 2026',
    empty: true,
    rows: [],
    emptyStats: { answered: 412 },
  },
  {
    key: '2026-07',
    label: 'July 2026',
    empty: false,
    summary: {
      found: 9,
      foundSub: 'in 6 topics',
      added: 2,
      addedSub: '1 more being fixed',
      answeredSince: 44,
      topics: ['Fees 34%', 'Deadlines 22%', 'Payroll 11%'],
    },
    rows: [
      { id: 'i1', question: 'Do you do payroll for small teams?', count: 6, meta: '3 phrasings · first seen 3 Jul', status: 'added' },
      { id: 'i2', question: 'What do you charge for VAT returns?', count: 4, meta: '2 phrasings · first seen 8 Jul', status: 'added' },
      { id: 'i3', question: 'Can you help with a late tax return?', count: 4, meta: '2 phrasings · first seen 10 Jul', status: 'fixing' },
      { id: 'i4', question: 'Do you do audits?', count: 3, meta: 'first seen 12 Jul', status: 'new' },
      { id: 'i5', question: 'Do you work with CIS subcontractors?', count: 2, meta: 'first seen 16 Jul', status: 'new' },
      { id: 'i6', question: 'Do you handle company formation?', count: 2, meta: 'marked by Raz — outside your services', status: 'not_relevant' },
    ],
    beforeAfter: {
      beforeDate: 'Before — 12 July',
      beforeText: '"I don\'t have that in my knowledge base — can I take your details so the team can follow up?"',
      beforeAsked: 'Asked: "What do you charge for VAT returns?"',
      afterDate: 'After — 14 July',
      afterText: '"Quarterly VAT returns start at £45 for straightforward businesses — we\'ll confirm after a look at your bookkeeping."',
      afterMeta: 'From: Services & Fees · answered 17 times since',
    },
  },
];

export const demoEnquiries: Enquiry[] = [
  { id: 'e1', name: 'James Whitfield', initials: 'JW', email: 'james@whitfieldjoinery.co.uk', question: 'Do you do audits?', time: '18 Jul, 09:14', status: 'new' },
  { id: 'e2', name: 'Priya Shah', initials: 'PS', email: 'priya.shah@gmail.com', question: 'Can you help with a late tax return?', time: '17 Jul, 16:40', status: 'new' },
  { id: 'e3', name: 'Tom Barrow', initials: 'TB', email: 'tom@barrowandco.uk', question: 'Do you handle company formation?', time: '15 Jul, 11:02', status: 'contacted' },
  { id: 'e4', name: 'Ellen Mercer', initials: 'EM', email: 'e.mercer@outlook.com', question: 'Payroll for 6 staff — possible?', time: '12 Jul, 10:26', status: 'closed' },
];

export const demoBilling: Billing = {
  planStatus: 'active',
  setupLine: '£500 — paid 12 Mar 2026 ✓',
  monthlyLine: '£99 / month',
  renewalLine: '1 Aug 2026',
  cardLine: '•••• 4242 · expires 08/28',
  invoices: [
    { label: 'July 2026 — monthly service', amount: '£99.00' },
    { label: 'June 2026 — monthly service', amount: '£99.00' },
    { label: 'March 2026 — setup', amount: '£500.00' },
  ],
};
