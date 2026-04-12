# SupportAI — AI Customer Support Platform

A full-stack SaaS platform where businesses sign up, configure an AI support agent, and embed a chat widget on their website. The AI uses Claude (claude-sonnet-4-20250514) to answer customer questions.

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Supabase)
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Auth**: JWT + httpOnly cookie refresh tokens
- **Email**: Resend
- **Deploy**: Netlify (frontend) + Render (backend)

## Project Structure

```
ai-support-agent/
├── backend/          # Express API
│   ├── src/
│   │   ├── db/       # Pool + migrations
│   │   ├── middleware/  # JWT auth
│   │   ├── routes/   # auth, agents, chat, conversations, dashboard
│   │   ├── services/ # Claude API wrapper
│   │   └── index.ts  # App entry point
│   ├── .env.example
│   └── package.json
├── frontend/         # React app
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/    # useAuth
│   │   ├── lib/      # Axios instance
│   │   ├── pages/    # All pages
│   │   └── types/    # TypeScript types
│   ├── .env.example
│   └── package.json
├── widget/
│   └── widget.js     # Standalone embeddable widget
└── README.md
```

## Local Setup

### 1. Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com)
2. Get your connection string from Project Settings → Database → Connection string
3. Run migrations (step 4 below)

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in your .env values (see below)
npm install
npm run migrate       # Creates all DB tables
npm run dev           # Starts on http://localhost:5000
```

**Backend `.env`**:
```
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
ANTHROPIC_API_KEY=sk-ant-...
CLIENT_URL=http://localhost:5173
PORT=5000
NODE_ENV=development
RESEND_API_KEY=re_...   # Optional, for email features
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000
npm install
npm run dev           # Starts on http://localhost:5173
```

**Frontend `.env`**:
```
VITE_API_URL=http://localhost:5000
```

### 4. Run migrations

```bash
cd backend
npm run migrate
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with live demo widget |
| `/register` | Sign up |
| `/login` | Sign in |
| `/dashboard` | Stats overview |
| `/dashboard/agents` | Manage agents |
| `/dashboard/agents/:id` | Configure agent + live preview |
| `/dashboard/conversations` | All conversations |
| `/dashboard/conversations/:id` | Full message thread |

## API Routes

### Auth
- `POST /auth/register` — Create account
- `POST /auth/login` — Sign in
- `POST /auth/refresh` — Refresh access token (uses httpOnly cookie)
- `POST /auth/logout` — Clear session

### Agents (requires Bearer token)
- `GET /agents` — List user's agents
- `POST /agents` — Create agent
- `PUT /agents/:id` — Update agent
- `DELETE /agents/:id` — Delete agent
- `GET /agents/:id/embed` — Get embed code

### Chat (public — used by widget)
- `POST /chat/start` — Start conversation, returns sessionId
- `POST /chat/message` — Send message, calls Claude, returns response
- `GET /chat/:sessionId/history` — Load conversation history

### Conversations (requires Bearer token)
- `GET /conversations` — All conversations (optional `?status=open|closed|escalated`)
- `GET /conversations/:id` — Single conversation with messages
- `PUT /conversations/:id/status` — Update status

### Dashboard (requires Bearer token)
- `GET /dashboard/stats` — Stats + recent conversations

## Embeddable Widget

Paste this into any website's `<body>`:

```html
<script src="https://your-domain.com/widget.js" data-agent-id="YOUR_AGENT_ID" defer></script>
```

- Self-contained, no external dependencies
- Persists session across page refreshes via localStorage
- Mobile responsive
- Typing indicator while Claude responds
- Loads conversation history on return visits

## Deployment

### Backend (Render)
1. Create a new Web Service on [render.com](https://render.com)
2. Connect your repo, set root to `backend/`
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add all environment variables

### Frontend (Netlify)
1. Create a new site on [netlify.com](https://netlify.com)
2. Connect your repo, set base directory to `frontend/`
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add env variable: `VITE_API_URL=https://your-render-backend.onrender.com`

### Widget
After deploying the frontend, update `API_URL` in `widget/widget.js` to point to your production backend URL.

## Claude Integration

Every chat message:
1. Loads full conversation history from PostgreSQL
2. Builds messages array with history
3. Sends to `claude-sonnet-4-20250514` with the agent's custom system prompt
4. Saves user message + AI response to DB
5. Returns AI response to widget

The system prompt is fully customizable per agent, letting businesses define their AI's persona, knowledge, and behavior.
