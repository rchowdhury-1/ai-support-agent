# SupportAI — done-for-you AI support agents for small businesses

SupportAI puts an AI chat widget on a small business's website that answers customers' questions using **only that business's own content** — crawled web pages, PDFs and pasted documents. Every answer is grounded by retrieval, carries citations, and when the agent doesn't know, it says so honestly and captures the visitor's details instead. Unanswered questions accumulate into a monthly **insight report**: "here's what your customers asked that your website couldn't answer."

It is **not self-serve SaaS**. It's a service run by one operator: clients are onboarded through an operator wizard (crawl → tune → sandbox-test → embed → payment link), get a mostly read-only dashboard, and pay a setup fee plus a monthly subscription. There is no public registration anywhere.

**Live:** [supportai-web-rc-1.vercel.app](https://supportai-web-rc-1.vercel.app) (marketing + dashboards) · [supportai-api-rc-1.vercel.app](https://supportai-api-rc-1.vercel.app) (API)

## Architecture (v2)

```
┌────────────────────────────┐      ┌─────────────────────────────┐
│  web/  — Next.js 14        │──────▶  backend/ — Express (TS)    │
│  marketing site            │proxy │  Vercel serverless           │
│  client dashboard          │/auth │  ├─ /chat/*      widget API  │
│  operator dashboard        │/api  │  ├─ /api/*       client API  │
│  (Vercel: supportai-web)   │/bill │  ├─ /api/admin/* operator    │
└────────────────────────────┘      │  ├─ /auth/*      sessions    │
┌────────────────────────────┐      │  └─ /billing/*   Stripe      │
│  widget/ — 27KB Shadow-DOM │──────▶  (Vercel: supportai-api)    │
│  IIFE, SSE streaming,      │      └──────────────┬──────────────┘
│  citations, feedback,      │                     │
│  polite failure states     │      ┌──────────────▼──────────────┐
└────────────────────────────┘      │  Neon Postgres + pgvector   │
                                    │  row-level security FORCEd  │
   Anthropic (generation)           │  on every tenant table      │
   OpenAI (embeddings)              └─────────────────────────────┘
   Stripe (per-tenant billing)
```

- **Generation**: Anthropic (`claude-haiku-4-5` or `claude-sonnet-5`, selectable per agent). One structured call returns `answer`, `status`, `question_type` and `citations` together; the answer streams to the widget as SSE deltas, and citations are validated server-side against the retrieved chunk set — the model cannot invent a source.
- **Retrieval**: OpenAI `text-embedding-3-small` + pgvector cosine similarity (HNSW). Weak retrievals and thumbs-downs feed an operator review queue; unanswerable questions are embedding-grouped into insights.
- **Tenant isolation**: Postgres RLS, `FORCE`d on every tenant-scoped table, driven by transaction-local settings via `withTenant()` / `withSystem()` wrappers. The app connects as a dedicated role *without* `BYPASSRLS` (Neon's default owner role silently bypasses RLS). A query that forgets tenant scoping returns zero rows — enforced by the test suite.
- **Widget safety**: `/chat/*` is origin-bound per agent (`agents.allowed_origins`, matched origin echoed, never `*`). Caps and billing-state checks run *after* session authz and **fail closed** into 402/429, which the widget renders as a polite contact form — never a broken state. Escalation is a plain DB write that works with the LLM down.
- **Auth**: no registration. 15-minute access JWT held in memory only; opaque rotated refresh token (SHA-256 at rest) in an `httpOnly Secure SameSite=Lax` cookie scoped to `/auth`. Token reuse revokes the whole family. The web app proxies `/auth`, `/api` and `/billing` same-origin so the Lax cookie works.
- **Billing**: operator-generated Stripe payment links (subscription + one-off setup); webhook idempotency via a `webhook_events` table keyed by Stripe event id — redeliveries no-op.

## Repository layout

```
ai-support-agent/
├── backend/        # v2 API — Express + TS, deployed serverless on Vercel
│   ├── src/db/         # pool, RLS wrappers, boot guard, migrations, seed
│   ├── src/routes/     # auth, chat (widget), client, admin, billing
│   ├── src/services/   # retrieval, generation, embeddings, chunker, crawler, ingestion
│   └── src/**/*.test.ts  # 86 tests — tenant-isolation suite is the priority
├── web/            # v2 frontend — Next.js 14 App Router + Tailwind
│   ├── app/            # marketing, /login, /dashboard/*, /operator/*
│   └── lib/            # client fetch layer (in-memory token + silent refresh)
├── widget/         # embeddable widget (TS → single IIFE artifact)
├── frontend/       # LEGACY v1 SPA (React+Vite) — frozen, still deployed
└── .github/workflows/ci.yml
```

## The widget

Paste before `</body>` on any site (the operator wizard generates this per tenant):

```html
<script src="https://supportai-web-rc-1.vercel.app/widget/v2.js"
  data-agent-id="AGENT_ID"
  data-api-url="https://supportai-api-rc-1.vercel.app"
  defer></script>
```

Shadow-DOM isolated, per-brand accent/theme, SSE-streamed answers with "From: …" source lines, 👍/👎 feedback, session restore, suggested-question chips, configurable disclaimer, and designed degraded states (paused agent, cap reached, API down → contact form). Speaks the v2 SSE protocol with a transparent v1 JSON fallback via content negotiation.

## Local development

Prereqs: Node 20+, a Neon project (or any Postgres 16 with pgvector).

```bash
cd backend
cp .env.example .env        # fill in — see the file for every variable
npm install
npm run migrate             # numbered SQL migrations, tracked in schema_migrations
npm run seed                # operator login + demo tenant (needs OPENAI_API_KEY)
npm run dev                 # tsx watch, http://localhost:5001

cd ../web
npm install
BACKEND_URL=http://localhost:5001 npm run dev   # http://localhost:3141

cd ../widget
npm install && npm run build && npm test
```

**Safety rails:** the backend refuses to boot or migrate against a production database unless explicitly configured (`PROD_DB_HOSTS` + `NODE_ENV=production`, migrations additionally need `MIGRATE_PROD=1`), and the v1 production endpoint is hard-refused always. Use separate Neon branches for dev/test/prod. Migrations run as the table owner; the app runs as the restricted `APP_DB_ROLE`.

### Tests

```bash
cd backend && npm test      # 86 tests: RLS isolation, auth rotation/reuse,
                            # chat contract + SSE, caps fail-closed,
                            # authz-before-quota, webhook idempotency,
                            # retrieval ranking, ingestion lifecycle
```

CI runs the backend suite against a pgvector container **as a non-superuser role** (so RLS is actually exercised), plus widget build+tests and the web build, on every push.

## API surface

| Area | Routes | Auth |
|---|---|---|
| Widget | `GET /chat/config` · `POST /chat/start` · `POST /chat/message` (SSE) · `GET /chat/:sessionId/history` · `POST /chat/feedback` · `POST /chat/escalate` | public, origin-bound per agent |
| Sessions | `POST /auth/login` · `/refresh` · `/logout` (no register) | refresh cookie |
| Client dashboard | `GET /api/me·overview·conversations[/:id]·insights·enquiries·billing` · `PUT /api/enquiries/:id/status` · `POST /api/conversations/:id/messages/:idx/flag` | client JWT |
| Operator | `/api/admin/tenants` CRUD + agent config, pause/resume, crawl, sources (site/text/PDF), refresh, drift, sandbox, insights triage, review queue, usage, client-user provisioning | operator JWT |
| Billing | `POST /billing/payment-link` (operator) · `POST /billing/portal` (client) · `POST /billing/webhook` (Stripe, signed + idempotent) | mixed |

`/chat/message` SSE protocol: `event: delta` → `{"text": …}` increments, then `event: done` → `{messageId, answerStatus, citations}`. Clients without `Accept: text/event-stream` get the v1-compatible single JSON response.

## Deployment

Both apps deploy from `main` via Vercel Git integration:

| Project | Root | Notes |
|---|---|---|
| `supportai-api` | `backend/` | Native Vercel Express entrypoint (`index.mjs`) over an esbuild-prebuilt `dist/`; ingestion is awaited in-request (serverless kills post-response work) |
| `supportai-web` | `web/` | `BACKEND_URL` env drives the same-origin proxy rewrites; `NEXT_PUBLIC_DEMO_AGENT_ID` powers the live hero demo |

Database migrations are run manually against the production owner URL (`MIGRATE_PROD=1 npm run migrate`). The legacy v1 stack (`frontend/` + Render backend + old Neon branch) remains frozen and live for the original landing-page demo; v2 replaced its API entirely.
