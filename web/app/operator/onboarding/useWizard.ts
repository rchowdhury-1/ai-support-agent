import { useRef, useState } from 'react';
import {
  addSiteSources,
  addTextSource,
  crawlSite,
  createTenant,
  runSandbox,
  sendPaymentLink,
  updateAgent,
  uploadPdfSource,
} from '@/lib/operator-api';
import type { CrawlPage } from '@/lib/operator-types';
import { ACCENTS, type EmbedSnippets, type SandboxTurn } from './onboarding-ui';

const API_URL =
  process.env.NEXT_PUBLIC_SUPPORTAI_API_URL || 'https://ai-support-agent-backend-xsoi.onrender.com';
const WIDGET_URL = process.env.NEXT_PUBLIC_WIDGET_URL || 'https://supportai-web-rc-1.vercel.app/widget/v2.js';

function embedSnippets(agentId: string): EmbedSnippets {
  const attrs = `data-agent-id="${agentId}"\n  data-api-url="${API_URL}"`;
  return {
    html: {
      label: 'HTML',
      code: `<script src="${WIDGET_URL}"\n  ${attrs}\n  defer></script>`,
      note: 'Paste before the closing </body> tag on every page the widget should appear on.',
    },
    next: {
      label: 'Next.js',
      code: `import Script from 'next/script';\n\n<Script\n  src="${WIDGET_URL}"\n  ${attrs.replace(/\n  /g, '\n  ')}\n  strategy="lazyOnload"\n/>`,
      note: 'Drop into app/layout.tsx inside <body>, after {children}.',
    },
    wp: {
      label: 'WordPress',
      code: `<script src="${WIDGET_URL}"\n  ${attrs}\n  defer></script>`,
      note: 'Appearance → Theme file editor → footer.php, before </body>. Or use any "insert headers & footers" plugin.',
    },
  };
}

/**
 * Owns all onboarding-wizard state and the backend calls. The Wizard component
 * is pure presentation over what this returns; the ./steps/* components each
 * render one step of it.
 */
export function useWizard(initialStep: number, initialTenantId?: string) {
  const [step, setStepRaw] = useState(Math.min(6, Math.max(1, initialStep)));
  const [tenantId, setTenantId] = useState<string | null>(initialTenantId ?? null);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [bizName, setBizName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [creating, setCreating] = useState(false);

  // Step 2
  const [crawlUrl, setCrawlUrl] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [pages, setPages] = useState<CrawlPage[] | null>(null);
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});
  const [ingesting, setIngesting] = useState(false);
  const [ingested, setIngested] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 3
  const [agentName, setAgentName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [model, setModel] = useState<'haiku' | 'sonnet'>('haiku');
  const [accent, setAccent] = useState(ACCENTS[0]!);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [domains, setDomains] = useState<string[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [capMonthly, setCapMonthly] = useState('1000');
  const [capDaily, setCapDaily] = useState('80');
  const [capSession, setCapSession] = useState('12');
  const [savingAgent, setSavingAgent] = useState(false);

  // Step 4
  const [turns, setTurns] = useState<SandboxTurn[]>([]);
  const [sandboxInput, setSandboxInput] = useState('');

  // Step 5/6
  const [embedTab, setEmbedTab] = useState<'html' | 'next' | 'wp'>('html');
  const [copied, setCopied] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [monthly, setMonthly] = useState('99');
  const [setupFee, setSetupFee] = useState('500');
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [sendingLink, setSendingLink] = useState(false);

  const setStep = (n: number) => {
    setStepRaw(n);
    setError(null);
    if (tenantId) updateAgent(tenantId, { onboardingStep: n }).catch(() => undefined);
  };

  const fail = (err: unknown) =>
    setError(err instanceof Error ? err.message : 'Something went wrong');

  const create = async () => {
    if (!bizName.trim()) return setError('Business name is required');
    setCreating(true);
    setError(null);
    try {
      const r = await createTenant({ name: bizName.trim(), contactName, contactEmail });
      setTenantId(r.tenantId);
      setAgentId(r.agentId);
      setAgentName(`${bizName.trim()} assistant`);
      setStepRaw(2);
    } catch (err) {
      fail(err);
    } finally {
      setCreating(false);
    }
  };

  const crawl = async () => {
    if (!tenantId || !crawlUrl.trim()) return;
    setCrawling(true);
    setError(null);
    try {
      let url = crawlUrl.trim();
      if (!/^https?:\/\//.test(url)) url = `https://${url}`;
      const found = await crawlSite(tenantId, url);
      setPages(found);
      setSkipped({});
      try {
        setDomains((d) => (d.length ? d : [new URL(url).hostname]));
      } catch {
        /* keep domains empty */
      }
    } catch (err) {
      fail(err);
    } finally {
      setCrawling(false);
    }
  };

  const ingestSelected = async () => {
    if (!tenantId || !pages) return;
    const urls = pages.filter((p) => !skipped[p.id]).map((p) => p.id);
    if (urls.length === 0) return setError('Select at least one page');
    setIngesting(true);
    setError(null);
    try {
      await addSiteSources(tenantId, urls);
      setIngested(urls.length);
      setStep(3);
    } catch (err) {
      fail(err);
    } finally {
      setIngesting(false);
    }
  };

  const pasteText = async () => {
    if (!tenantId) return;
    const name = window.prompt('Name for this text source (e.g. "Price list"):');
    if (!name) return;
    const text = window.prompt('Paste the text content:');
    if (!text) return;
    try {
      await addTextSource(tenantId, name, text);
      setIngested((n) => n + 1);
    } catch (err) {
      fail(err);
    }
  };

  const onPdfPicked = async (file: File | undefined) => {
    if (!tenantId || !file) return;
    try {
      await uploadPdfSource(tenantId, file);
      setIngested((n) => n + 1);
    } catch (err) {
      fail(err);
    }
  };

  const saveAgent = async () => {
    if (!tenantId) return;
    setSavingAgent(true);
    setError(null);
    try {
      await updateAgent(tenantId, {
        agentName,
        systemPrompt,
        model,
        accent,
        theme,
        disclaimer,
        allowedOrigins: domains.flatMap((d) => [`https://${d}`, `https://www.${d}`.replace('www.www.', 'www.')]),
        monthlyCap: parseInt(capMonthly, 10) || 1000,
        dailyCap: parseInt(capDaily, 10) || 80,
        sessionCap: parseInt(capSession, 10) || 12,
        onboardingStep: 4,
      });
      setStepRaw(4);
    } catch (err) {
      fail(err);
    } finally {
      setSavingAgent(false);
    }
  };

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || !tenantId) return;
    setSandboxInput('');
    const id = turns.length * 2;
    setTurns((t) => [
      ...t,
      { id, role: 'user', text },
      { id: id + 1, role: 'bot', text: '', answer: 'pending' },
    ]);
    try {
      const answer = await runSandbox(tenantId, text);
      setTurns((t) => t.map((turn) => (turn.id === id + 1 ? { ...turn, answer } : turn)));
    } catch (err) {
      setTurns((t) =>
        t.map((turn) =>
          turn.id === id + 1
            ? {
                ...turn,
                answer: {
                  text: err instanceof Error ? err.message : 'Sandbox failed',
                  srcLine: '—',
                  chunks: [],
                  meta: 'error',
                },
              }
            : turn
        )
      );
    }
  };

  const sendLink = async () => {
    if (!tenantId) return;
    setSendingLink(true);
    setError(null);
    try {
      const url = await sendPaymentLink(
        tenantId,
        Math.round(Number(monthly) * 100),
        Math.round(Number(setupFee) * 100)
      );
      setLinkUrl(url);
    } catch (err) {
      fail(err);
    } finally {
      setSendingLink(false);
    }
  };

  const snippets = embedSnippets(agentId ?? '<agent-id>');

  return {
    step, setStep, tenantId, error,
    bizName, setBizName, contactName, setContactName, contactEmail, setContactEmail, creating, create,
    crawlUrl, setCrawlUrl, crawling, crawl, fileRef, onPdfPicked, pasteText,
    pages, skipped, setSkipped, ingesting, ingestSelected, ingested,
    agentName, setAgentName, systemPrompt, setSystemPrompt, model, setModel,
    accent, setAccent, theme, setTheme, domains, setDomains, disclaimer, setDisclaimer,
    capMonthly, setCapMonthly, capDaily, setCapDaily, capSession, setCapSession, savingAgent, saveAgent,
    turns, sandboxInput, setSandboxInput, ask,
    embedTab, setEmbedTab, copied, setCopied, snippets,
    monthly, setMonthly, setupFee, setSetupFee, linkUrl, sendLink, sendingLink,
  };
}
