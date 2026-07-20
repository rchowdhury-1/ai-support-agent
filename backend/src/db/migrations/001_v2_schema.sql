-- SupportAI v2 schema. Fresh database (supportai_v2) — no v1 tables here.
-- Every tenant-scoped table has RLS FORCED with a single policy:
--   system context (app.role = 'system', set by withSystem) sees everything;
--   tenant context (app.tenant_id, set by withTenant) sees its own rows only;
--   no context sees nothing. Table owner cannot bypass (FORCE).

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Tenancy ──────────────────────────────────────────────────────────────

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('active', 'pending', 'paused', 'past_due')),
  contact_name VARCHAR(255) NOT NULL DEFAULT '',
  contact_email VARCHAR(255) NOT NULL DEFAULT '',
  onboarding_step SMALLINT,
  setup_fee_pence INTEGER NOT NULL DEFAULT 0,
  monthly_amount_pence INTEGER NOT NULL DEFAULT 0,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('operator', 'client')),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_has_tenant CHECK (role = 'operator' OR tenant_id IS NOT NULL)
);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- ── Agents ───────────────────────────────────────────────────────────────

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  system_prompt TEXT NOT NULL DEFAULT '',
  welcome_message TEXT NOT NULL DEFAULT 'Hello! How can I help you today?',
  color VARCHAR(7) NOT NULL DEFAULT '#2D5A44',
  theme VARCHAR(10) NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  disclaimer TEXT NOT NULL DEFAULT '',
  powered_by BOOLEAN NOT NULL DEFAULT TRUE,
  suggested_questions JSONB NOT NULL DEFAULT '[]',
  model VARCHAR(20) NOT NULL DEFAULT 'haiku' CHECK (model IN ('haiku', 'sonnet')),
  status VARCHAR(10) NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'paused')),
  allowed_origins TEXT[] NOT NULL DEFAULT '{}',
  monthly_cap INTEGER NOT NULL DEFAULT 1000,
  daily_cap INTEGER NOT NULL DEFAULT 200,
  session_cap INTEGER NOT NULL DEFAULT 40,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_agents_tenant_id ON agents(tenant_id);

-- ── Knowledge ────────────────────────────────────────────────────────────

CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  kind VARCHAR(10) NOT NULL CHECK (kind IN ('site', 'pdf', 'text')),
  name VARCHAR(500) NOT NULL,
  url TEXT,
  content_hash CHAR(64),
  size_bytes INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'synced', 'error', 'drift')),
  error_message TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sources_tenant_id ON sources(tenant_id);
CREATE INDEX idx_sources_agent_id ON sources(agent_id);

CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chunks_tenant_id ON chunks(tenant_id);
CREATE INDEX idx_chunks_source_id ON chunks(source_id);
CREATE INDEX idx_chunks_agent_id ON chunks(agent_id);
CREATE INDEX idx_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops);

-- ── Conversations ────────────────────────────────────────────────────────

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  visitor_name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'answered'
    CHECK (status IN ('answered', 'no_answer', 'escalated')),
  messages_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_conversations_tenant_id ON conversations(tenant_id);
CREATE INDEX idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX idx_conversations_session_id ON conversations(session_id);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  answer_status VARCHAR(20)
    CHECK (answer_status IN ('answered', 'partial', 'not_in_kb', 'error')),
  question_type VARCHAR(50),
  citations JSONB,
  retrieval JSONB,
  feedback VARCHAR(4) CHECK (feedback IN ('up', 'down')),
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- ── Insights, enquiries, review queue ────────────────────────────────────

CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  month CHAR(7) NOT NULL, -- 'YYYY-MM'
  question TEXT NOT NULL,
  embedding vector(1536),
  count INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'fixing', 'added', 'not_relevant')),
  first_asked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_asked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_insights_tenant_month ON insights(tenant_id, month);

CREATE TABLE enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  contact VARCHAR(255) NOT NULL,
  question TEXT NOT NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'no_answer'
    CHECK (source IN ('no_answer', 'quota_fallback', 'agent_paused', 'error')),
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_enquiries_tenant_id ON enquiries(tenant_id);

CREATE TABLE review_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('flag', 'down', 'weak', 'insight')),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  insight_id UUID REFERENCES insights(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'content_fix', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_review_items_tenant_id ON review_items(tenant_id);
CREATE INDEX idx_review_items_status ON review_items(status);

-- ── Usage & billing ──────────────────────────────────────────────────────

CREATE TABLE usage_daily (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  messages INTEGER NOT NULL DEFAULT 0,
  tokens_in BIGINT NOT NULL DEFAULT 0,
  tokens_out BIGINT NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, agent_id, day)
);

-- Stripe webhook idempotency: event id is the primary key; a second delivery
-- of the same event no-ops on INSERT ... ON CONFLICT DO NOTHING.
CREATE TABLE webhook_events (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- ── Row-level security ───────────────────────────────────────────────────

-- tenants: clients may read their own row; system sees all.
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON tenants
  USING (
    current_setting('app.role', true) = 'system'
    OR id::text = current_setting('app.tenant_id', true)
  );

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'agents', 'sources', 'chunks', 'conversations', 'messages',
    'insights', 'enquiries', 'review_items', 'usage_daily'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($p$
      CREATE POLICY tenant_isolation ON %I
        USING (
          current_setting('app.role', true) = 'system'
          OR tenant_id::text = current_setting('app.tenant_id', true)
        )
    $p$, t);
  END LOOP;
END $$;

-- refresh_tokens and webhook_events are system-context-only tables.
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;
CREATE POLICY system_only ON refresh_tokens
  USING (current_setting('app.role', true) = 'system');

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events FORCE ROW LEVEL SECURITY;
CREATE POLICY system_only ON webhook_events
  USING (current_setting('app.role', true) = 'system');
