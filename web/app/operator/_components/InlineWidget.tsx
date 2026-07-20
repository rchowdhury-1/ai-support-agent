'use client';

import { useEffect } from 'react';

const API_URL =
  process.env.NEXT_PUBLIC_SUPPORTAI_API_URL || 'https://ai-support-agent-backend-xsoi.onrender.com';
const AGENT_ID =
  process.env.NEXT_PUBLIC_DEMO_AGENT_ID || '769557fd-b98b-427f-b2b5-519fc690845f';

/**
 * Mounts the real widget artifact inline (operator live preview). Cleans up on
 * unmount so navigating between tenants doesn't leak instances. Points at the
 * live demo agent; v2: per-tenant agent id + accent from the tenant record.
 */
export function InlineWidget({ accent }: { accent?: string }) {
  useEffect(() => {
    document.getElementById('supportai-widget')?.remove();
    document.getElementById('sai-preview-script')?.remove();
    const s = document.createElement('script');
    s.id = 'sai-preview-script';
    s.src = '/widget/v2.js';
    s.defer = true;
    s.dataset.agentId = AGENT_ID;
    s.dataset.apiUrl = API_URL;
    s.dataset.mode = 'inline';
    s.dataset.container = '#sai-preview';
    if (accent) s.dataset.accent = accent;
    document.body.appendChild(s);
    return () => {
      document.getElementById('supportai-widget')?.remove();
      document.getElementById('sai-preview-script')?.remove();
    };
  }, [accent]);

  return <div id="sai-preview" className="w-full h-[430px]" />;
}
