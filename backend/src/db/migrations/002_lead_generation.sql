-- Lead-generation repositioning (Phase 1): buying-intent classification,
-- in-conversation qualification, and per-tenant lead-notification channels.
-- Extends the existing `enquiries` table rather than introducing a parallel
-- "leads" table — enquiries already carries the tenant-isolation and RLS
-- wiring this needs.

ALTER TABLE messages
  ADD COLUMN enquiry_intent VARCHAR(20)
    CHECK (enquiry_intent IN ('none', 'pricing', 'availability', 'service_fit', 'booking'));

-- Tracks whether the agent has already asked this conversation's visitor to
-- qualify (name/contact/what-it's-regarding), so it asks once and never nags.
ALTER TABLE conversations
  ADD COLUMN qualification_offered BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE enquiries
  ADD COLUMN intent VARCHAR(20)
    CHECK (intent IN ('none', 'pricing', 'availability', 'service_fit', 'booking'));

ALTER TABLE enquiries DROP CONSTRAINT enquiries_source_check;
ALTER TABLE enquiries ADD CONSTRAINT enquiries_source_check
  CHECK (source IN ('no_answer', 'quota_fallback', 'agent_paused', 'error', 'in_conversation'));

ALTER TABLE enquiries DROP CONSTRAINT enquiries_status_check;
ALTER TABLE enquiries ADD CONSTRAINT enquiries_status_check
  CHECK (status IN ('new', 'contacted', 'converted', 'closed'));

-- Per-tenant notification targets. A tenant may want more than one (e.g. the
-- owner's WhatsApp and the office inbox), so this is one row per channel
-- rather than a single column on agents.
CREATE TABLE notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'webhook', 'whatsapp')),
  target TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notification_channels_agent_id ON notification_channels(agent_id);

ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_channels FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notification_channels
  USING (
    current_setting('app.role', true) = 'system'
    OR tenant_id::text = current_setting('app.tenant_id', true)
  );
