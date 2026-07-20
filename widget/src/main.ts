import { createWidget } from './ui';
import type { WidgetOptions } from './types';

(() => {
  // currentScript is only valid during initial synchronous execution.
  const script =
    (document.currentScript as HTMLScriptElement | null) ||
    document.querySelector<HTMLScriptElement>('script[data-agent-id]');

  const agentId = script?.dataset.agentId;
  const apiUrl = (script?.dataset.apiUrl || '').replace(/\/+$/, '');

  if (!agentId || !apiUrl) {
    console.error('[SupportAI] the embed script requires data-agent-id and data-api-url');
    return;
  }

  const theme = script?.dataset.theme;
  const inline = script?.dataset.mode === 'inline';
  const containerSel = script?.dataset.container;
  const opts: WidgetOptions = {
    agentId,
    apiUrl,
    accent: script?.dataset.accent,
    theme: theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : undefined,
    inline,
  };

  const boot = () => {
    if (inline) {
      const container = containerSel ? document.querySelector<HTMLElement>(containerSel) : null;
      if (!container) {
        console.error('[SupportAI] data-mode="inline" requires data-container pointing at an existing element');
        return;
      }
      opts.container = container;
    }
    void createWidget(opts);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
