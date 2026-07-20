/**
 * Headless smoke test for the built widget artifact (dist/v2.js).
 * Boots the real bundle in jsdom against a mocked API and walks the designed
 * states: boot → open (welcome + chips) → answered w/ citation + feedback →
 * honest refusal w/ inline details form → escalate → cap-limit → degraded form.
 * Run: node scripts/smoke.mjs   (after npm run build)
 */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';

const bundle = readFileSync(new URL('../dist/v2.js', import.meta.url), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
function check(name, cond) {
  if (cond) console.log(`  ok  ${name}`);
  else { failures++; console.error(`FAIL  ${name}`); }
}

const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
  url: 'https://client-site.example/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
});
const { window } = dom;

// Node globals the bundle expects in the page environment.
for (const k of ['ReadableStream', 'TextEncoder', 'TextDecoder', 'Response', 'Headers', 'AbortController']) {
  window[k] = globalThis[k];
}

// ── Mock API ─────────────────────────────────────────────
let scenario = 'v2';
const calls = { feedback: [], escalate: [] };
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

function sse(events) {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(ctrl) {
      let i = 0;
      const push = () => {
        if (i >= events.length) return ctrl.close();
        const [event, data] = events[i++];
        ctrl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        setTimeout(push, 5);
      };
      push();
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
}

window.fetch = async (url, init) => {
  const u = String(url);
  if (u.includes('/chat/config')) {
    return json({
      agentName: 'Brampton & Hale Support',
      color: '#2D5A44',
      welcomeMessage: 'Hello — ask me about our services, fees or opening hours.',
      suggestedQuestions: ['How much is a tax return?', 'Do you do audits?'],
      disclaimer: 'General guidance, not financial advice.',
      poweredBy: true,
      status: 'live',
    });
  }
  if (u.includes('/chat/start')) return json({ sessionId: 'sess-1', agentName: 'Brampton & Hale Support', color: '#2D5A44', welcomeMessage: 'Hello' });
  if (u.includes('/history')) return json({ conversation: {}, messages: [] });
  if (u.includes('/chat/feedback')) { calls.feedback.push(JSON.parse(init.body)); return json({ ok: true }); }
  if (u.includes('/chat/escalate')) { calls.escalate.push(JSON.parse(init.body)); return json({ ok: true }); }
  if (u.includes('/chat/message')) {
    if (scenario === 'limit') return json({ error: 'cap' }, 429);
    const content = JSON.parse(init.body).content.toLowerCase();
    if (content.includes('audit')) {
      return sse([
        ['delta', { text: "I don't have that in my knowledge base — can I take your details?" }],
        ['done', { messageId: 'm-refusal', answerStatus: 'not_in_kb', citations: [] }],
      ]);
    }
    return sse([
      ['delta', { text: 'A self-assessment tax return is ' }],
      ['delta', { text: '£180 including VAT.' }],
      ['done', { messageId: 'm-answer', answerStatus: 'answered', citations: [{ title: 'Services & Fees', url: 'https://example.com/fees' }] }],
    ]);
  }
  throw new Error('unexpected fetch: ' + u);
};

// ── Boot the real bundle ─────────────────────────────────
const tag = window.document.createElement('script');
tag.dataset.agentId = 'agent-1';
tag.dataset.apiUrl = 'https://mock.supportai';
window.document.body.appendChild(tag);
// jsdom outside-only: document.currentScript stays null, so the bundle's
// querySelector('script[data-agent-id]') fallback is what finds the tag.
window.eval(bundle);

await sleep(150);

const host = window.document.getElementById('supportai-widget');
check('host element mounted', !!host);
const shadow = host && host.shadowRoot;
check('shadow root attached', !!shadow);
const $ = (sel) => shadow.querySelector(sel);
const $$ = (sel) => [...shadow.querySelectorAll(sel)];

check('launcher rendered', !!$('.launcher'));
check('accent variable applied', $('.root').style.getPropertyValue('--wa') === '#2D5A44');

// Open the panel
$('.launcher').click();
await sleep(250);
check('panel opens', !!$('.panel'));
check('header shows agent name', $('.hdr-name')?.textContent === 'Brampton & Hale Support');
check('welcome bubble shown', $$('.msg-bot').some((n) => n.textContent.includes('ask me about')));
check('suggested chips shown', $$('.chip').length === 2);
check('disclaimer in footer', $('.disclaimer')?.textContent === 'General guidance, not financial advice.');
check('powered-by shown', $('.powered')?.textContent.includes('SupportAI'));

// Answered flow via chip
$$('.chip')[0].click();
await sleep(400);
check('user bubble added', $$('.msg-user').some((n) => n.textContent === 'How much is a tax return?'));
check('chips removed after send', $$('.chip').length === 0);
check('streamed answer assembled', $$('.msg-bot').some((n) => n.textContent.includes('£180 including VAT.')));
check('citation rendered', $('.meta-src')?.textContent.includes('From:') && $('.meta-src')?.textContent.includes('Services & Fees'));
check('citation is a safe link', $('.meta-src a')?.rel === 'noopener noreferrer');
check('feedback buttons rendered', $$('.fb').length === 2);

$('.fb.dn').click();
await sleep(50);
check('thumb-down registers + posts', $('.fb.dn').classList.contains('on') && calls.feedback[0]?.rating === 'down' && calls.feedback[0]?.messageId === 'm-answer');

// Honest refusal flow
const input = $('.composer input');
input.value = 'do you do audits?';
$('.send').click();
await sleep(300);
check('refusal text shown', $$('.msg-bot').some((n) => n.textContent.includes("don't have that in my knowledge base")));
check('refusal status line shown', !!$('.meta-none'));
const form = $('.mini-form');
check('inline details form shown', !!form);

form.querySelectorAll('input')[0].value = 'Jane';
form.querySelectorAll('input')[1].value = 'jane@example.com';
form.querySelector('.btn-accent').click();
await sleep(100);
check('escalation posted with question + source', calls.escalate[0]?.contact === 'jane@example.com' && calls.escalate[0]?.source === 'no_answer' && calls.escalate[0]?.message.includes('audits'));
check('confirmation replaces form', !$('.mini-form') && !!$('.form-done'));

// Cap limit → degraded contact form (never an error screen)
scenario = 'limit';
input.value = 'another question';
$('.send').click();
await sleep(200);
check('degraded panel shown on 429', !!$('.degraded'));
check('degraded is a contact form', $$('.degraded-form input').length === 2 && !!$('.degraded-form textarea'));
check('pending question carried into form', $('.degraded-form textarea').value === 'another question');
check('retry link offered', !!$('.degraded-retry'));

const dg = $('.degraded-form');
dg.querySelectorAll('input')[1].value = '07700 900000';
dg.querySelector('textarea').value = 'please call me';
dg.querySelector('.btn-accent').click();
await sleep(100);
check('degraded escalation posted as quota_fallback', calls.escalate[1]?.source === 'quota_fallback');
check('degraded confirmation shown', !!$('.degraded-ok'));

// ── Inline mode (marketing-site hero demo) ───────────────
scenario = 'v2';
const dom2 = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="demo" style="width:378px;height:566px"></div></body></html>', {
  url: 'https://marketing-site.example/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
});
for (const k of ['ReadableStream', 'TextEncoder', 'TextDecoder', 'Response', 'Headers', 'AbortController']) {
  dom2.window[k] = globalThis[k];
}
dom2.window.fetch = window.fetch; // same mock handler
const tag2 = dom2.window.document.createElement('script');
tag2.dataset.agentId = 'agent-1';
tag2.dataset.apiUrl = 'https://mock.supportai';
tag2.dataset.mode = 'inline';
tag2.dataset.container = '#demo';
dom2.window.document.body.appendChild(tag2);
dom2.window.eval(bundle);
await sleep(250);

const host2 = dom2.window.document.getElementById('supportai-widget');
const s2 = host2 && host2.shadowRoot;
check('inline: host mounted inside container', host2?.parentElement?.id === 'demo');
check('inline: root has inline class', !!s2?.querySelector('.root.inline'));
check('inline: panel open immediately, no click', !!s2?.querySelector('.panel'));
check('inline: no launcher in DOM', !s2?.querySelector('.launcher') || s2.querySelector('.launcher')?.parentElement === null);
check('inline: no close button', !s2?.querySelector('.hdr-close'));
check('inline: welcome + chips render', !!s2?.querySelector('.msg-bot') && s2.querySelectorAll('.chip').length === 2);

console.log(failures === 0 ? '\nSMOKE PASS' : `\nSMOKE FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
