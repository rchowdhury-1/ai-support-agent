# SupportAI widget v2

Implementation of the approved Claude Design "Chat Widget" / "Widget States" design
(project: SupportAI v2). Single TypeScript source, built with esbuild into one
dependency-free IIFE artifact rendered inside a Shadow DOM.

- `src/` — the only editable code. `dist/v2.js` and `frontend/public/widget/v2.js`
  are build outputs; never hand-edit them (this replaces the old hand-synced
  `widget.js` duplication — v1 is left in place untouched until cutover).
- `npm run build` — typecheck-free minified build + copy to `frontend/public/widget/v2.js`
- `npm run check` — TypeScript strict check
- `npm test` — jsdom smoke test: boots the real bundle against a mocked API and
  walks every designed state (28 assertions)
- `preview.html` — browser preview with a fully mocked API (incl. real SSE
  streaming). Serve the folder (`python3 -m http.server 8899`) and open
  `http://localhost:8899/preview.html`. Scenarios: Brampton & Hale, Aldergate
  Solicitors, white-label trade brand, v1 fallback, paused, cap reached, API down.

## Install snippet (client sites)

```html
<script src="https://<app-domain>/widget/v2.js"
        data-agent-id="AGENT_UUID"
        data-api-url="https://<api-domain>"
        defer></script>
```

Optional overrides: `data-accent="#1F3A5F"`, `data-theme="dark"`.
Server config wins when the v2 config endpoint is available.

## API contract (v2 backend — from the approved architecture)

| Endpoint | Notes |
|---|---|
| `GET /chat/config?agentId=` | `{agentName, color, theme, welcomeMessage, suggestedQuestions[], disclaimer, poweredBy, status:'live'\|'paused'}`. 404 → widget runs in v1-compat mode (no citations/feedback/chips/escalate; bootstrap from `/chat/start`). |
| `POST /chat/start` | v1-compatible: `{sessionId, agentName, color, welcomeMessage}` |
| `POST /chat/message` | v2 responds SSE (`event: delta` `{text}`, `event: done` `{messageId, answerStatus, citations:[{title,url}]}`, `event: error`); v1 JSON `{response}` handled transparently. 402/429 → degraded contact-form mode. 5xx/network → one retry, then degraded. |
| `GET /chat/:sessionId/history` | v1-compatible; v2 may add `id`, `citations`, `answer_status` per message and they will render. |
| `POST /chat/feedback` | `{messageId, rating:'up'\|'down'}` (v2 only) |
| `POST /chat/escalate` | `{agentId, sessionId?, name, contact, message, source:'no_answer'\|'quota_fallback'\|'agent_paused'\|'error'}` — plain DB write; must work when the LLM is down. |

## Designed behaviours implemented

Closed launcher (58px, pulse-dot header when open) · welcome + suggested-question
chips · streaming answer with caret · sources line ("From: …", safe external
links) · 👍/👎 feedback · honest refusal → "Not answered from knowledge base" +
inline details form posting the *visitor's question* · degraded mode (paused /
caps / failure) as a polite contact form with "try the chat again" for transient
failures · per-client theming (one accent var + auto ink contrast, light/dark
surface sets) · "Powered by SupportAI" toggle · per-client disclaimer footer ·
mobile full-width sheet · reduced-motion respected · session persistence +
history restore per agent.
