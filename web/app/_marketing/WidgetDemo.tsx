'use client';

import { useEffect } from 'react';

const API_URL =
  process.env.NEXT_PUBLIC_SUPPORTAI_API_URL || 'https://ai-support-agent-backend-xsoi.onrender.com';
const AGENT_ID =
  process.env.NEXT_PUBLIC_DEMO_AGENT_ID || '769557fd-b98b-427f-b2b5-519fc690845f';
export const DEMO_BRAND = process.env.NEXT_PUBLIC_DEMO_BRAND || 'Kettle & Stone';

/**
 * Mounts the real production widget artifact (public/widget/v2.js) in inline
 * mode inside the hero — the landing page demo IS the product, not a mock.
 * Talks to the live demo agent; the widget's v1-compat mode covers the current
 * backend and lights up citations/chips automatically once v2 ships.
 */
export function WidgetDemo() {
  useEffect(() => {
    if (document.getElementById('supportai-widget') || document.getElementById('sai-demo-script')) return;
    const s = document.createElement('script');
    s.id = 'sai-demo-script';
    s.src = '/widget/v2.js';
    s.defer = true;
    s.dataset.agentId = AGENT_ID;
    s.dataset.apiUrl = API_URL;
    s.dataset.mode = 'inline';
    s.dataset.container = '#sai-demo';
    document.body.appendChild(s);
  }, []);

  return (
    <div className="flex flex-col items-center gap-[14px]">
      <div className="flex items-center gap-2 font-mono text-[10.5px] font-semibold uppercase tracking-[.15em] text-ink3">
        <span className="w-[7px] h-[7px] rounded-full bg-good" />
        Live demo — try it yourself
      </div>
      <div id="sai-demo" className="w-[min(378px,90vw)] h-[566px]" />
      <div className="text-xs text-ink3 text-center max-w-[40ch] leading-normal">
        It only knows {DEMO_BRAND}&rsquo;s content — our demo business. Ask it anything.
      </div>
    </div>
  );
}
