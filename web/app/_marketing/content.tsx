/** Marketing-page copy and icon data, kept out of the page component. */

export const steps = [
  {
    n: '01',
    title: 'We load your content',
    body: "Your website, PDFs and price lists — nothing else. We do the loading and checking for you; you approve what it's allowed to know.",
  },
  {
    n: '02',
    title: 'It answers your customers',
    body: "Instantly and politely, with the source shown under every answer. When it doesn't know, it says so and takes a message instead.",
  },
  {
    n: '03',
    title: "You learn what they're asking",
    body: "Each month you get the questions your website couldn't answer — and we turn them into new answers, one by one.",
  },
];

export const verticals = [
  {
    name: 'Accountants',
    pain: 'Stop repeating your fees for the fortieth time this month.',
    qs: ['How much is a self-assessment return?', 'When is the VAT deadline?', 'Do you work with contractors?'],
  },
  {
    name: 'Law firms',
    pain: 'Every call starts with the same three questions.',
    qs: ['How much does a simple will cost?', 'Do you offer fixed-fee conveyancing?', 'Are you taking on new family cases?'],
  },
  {
    name: 'Trades',
    pain: 'Stop answering "what’s your call-out charge?" twelve times a week.',
    qs: ['What’s your call-out charge?', 'Do you cover the whole of Kent?', 'Are you Gas Safe registered?'],
  },
];

export const trustIcons: Record<string, React.ReactNode> = {
  shield: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10z" />
      <path d="m9 11.6 2 2 4-4.4" />
    </svg>
  ),
  doc: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </svg>
  ),
  chat: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 10h.01M12 10h.01M16 10h.01" />
    </svg>
  ),
  eye: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7.2 11-7.2S23 12 23 12s-4 7.2-11 7.2S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

export const trust = [
  {
    icon: 'shield',
    title: 'Only your approved content',
    body: "It answers from the pages and documents you've signed off — nothing scraped, nothing invented.",
  },
  {
    icon: 'doc',
    title: 'Every answer shows its source',
    body: 'A line under each reply says exactly where it came from — "From: Services & Fees" — so anyone can check.',
  },
  {
    icon: 'chat',
    title: 'It says "I don’t know"',
    body: "When it can't answer, it says so honestly, takes the customer's details, and hands over to you. No guessing, ever.",
  },
  {
    icon: 'eye',
    title: 'You see everything',
    body: 'Every conversation sits in your dashboard, and a disclaimer of your choosing appears under every answer.',
  },
];
