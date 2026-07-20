/**
 * Seed: operator login + the Kettle & Stone demo tenant with a live-ingested
 * knowledge base (runs through the real chunk/embed pipeline, so OPENAI_API_KEY
 * is required). Idempotent — safe to re-run.
 *
 *   OPERATOR_EMAIL=... OPERATOR_PASSWORD=... npm run seed
 *   SEED_DEMO=0 skips the demo tenant.
 *   DEMO_ORIGINS=comma,separated origins for the demo agent's allowlist.
 */
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { withSystem } from './tenant.js';
import { createSource, processSource } from '../services/ingestion.js';

dotenv.config();

const DEMO_DOCS: { name: string; text: string }[] = [
  {
    name: 'coffee-and-brewing',
    text: `# Coffee & brewing

Kettle & Stone roasts speciality coffee in Kent every Tuesday and ships within 48 hours of roasting.

Our range: Morning Bell (medium roast, chocolate and hazelnut notes), Harbour Light (light roast, floral and citrus), Iron Kettle (dark roast, treacle and smoke) and Still Water, our decaffeinated coffee. Still Water uses the Swiss Water process and is 99%+ caffeine-free while keeping full flavour.

Brewing guides: for a V60 pour-over we recommend 15g of coffee to 250g of water at 94°C, total brew time 2:30 to 3:00. For a cafetière use 30g per 500ml, four-minute steep. For espresso start at 18g in, 36g out, in 27 to 30 seconds.

Whole bean or ground: we grind to order for cafetière, filter, espresso or Aeropress at no extra charge. Beans stay freshest whole — use within six weeks of the roast date printed on the bag.`,
  },
  {
    name: 'subscriptions-and-billing',
    text: `# Subscriptions & billing

Kettle & Stone subscriptions deliver freshly roasted coffee every 1, 2 or 4 weeks. You choose the roast or let our roaster pick the Roaster's Choice.

Prices: one 250g bag per delivery is £9.50, two bags £18, three bags £25.50. Subscribers save 10% versus one-off purchases and delivery is free on every subscription order.

You can pause, skip a delivery, change roast or cancel any time from the My Subscription page — no notice period, no fees. Pausing takes effect from your next billing date.

Billing happens two days before each dispatch. We accept Visa, Mastercard, American Express and Apple Pay. VAT invoices are emailed automatically with each charge.`,
  },
  {
    name: 'shipping-and-returns',
    text: `# Shipping & returns

UK delivery is £3.95 by tracked 48-hour service, and free on all orders over £30. Express next-working-day delivery is £5.95, order by 12 noon.

We currently ship to the UK only. Orders placed before noon Monday to Friday dispatch the same day; weekend orders dispatch Monday.

Returns: unopened bags can be returned within 30 days for a full refund. If your coffee arrives damaged, or the roast isn't right for you, email hello@kettleandstone.co within 14 days and we'll replace it or refund you — we'd rather you drank coffee you love.

Missing parcels: tracked delivery covers loss in transit. If a parcel is marked delivered but hasn't arrived, contact us within 7 days and we'll investigate with the courier and send a replacement.`,
  },
];

async function ensureOperator(): Promise<void> {
  const email = (process.env.OPERATOR_EMAIL || 'razwanulchowdhury@gmail.com').toLowerCase();
  const password = process.env.OPERATOR_PASSWORD;
  if (!password) {
    console.log('OPERATOR_PASSWORD not set — skipping operator user.');
    return;
  }
  const hash = await bcrypt.hash(password, 12);
  await withSystem((db) =>
    db.query(
      `INSERT INTO users (tenant_id, role, name, email, password_hash)
       VALUES (NULL, 'operator', 'Razwanul Chowdhury', $1, $2)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [email, hash]
    )
  );
  console.log(`Operator user ready: ${email}`);
}

async function ensureDemoTenant(): Promise<void> {
  if (process.env.SEED_DEMO === '0') return;

  const origins = (
    process.env.DEMO_ORIGINS ||
    'http://localhost:3141,https://supportai-web-rc-1.vercel.app,https://ai-support-agent-eosin.vercel.app,https://razwanulchowdhury.vercel.app'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const existing = await withSystem((db) =>
    db.query(`SELECT id FROM tenants WHERE name = 'Kettle & Stone'`)
  );

  let tenantId: string;
  let agentId: string;
  if (existing.rows[0]) {
    tenantId = existing.rows[0].id;
    const a = await withSystem((db) =>
      db.query(`SELECT id FROM agents WHERE tenant_id = $1 LIMIT 1`, [tenantId])
    );
    agentId = a.rows[0].id;
    console.log(`Demo tenant exists: ${tenantId} (agent ${agentId})`);
  } else {
    const t = await withSystem((db) =>
      db.query(
        `INSERT INTO tenants (name, domain, status, contact_name, contact_email, monthly_amount_pence, setup_fee_pence)
         VALUES ('Kettle & Stone', 'kettleandstone.co', 'active', 'Demo', 'demo@kettleandstone.co', 9900, 50000)
         RETURNING id`
      )
    );
    tenantId = t.rows[0].id;
    const a = await withSystem((db) =>
      db.query(
        `INSERT INTO agents (tenant_id, name, system_prompt, welcome_message, color, disclaimer,
                             suggested_questions, model, monthly_cap, daily_cap, session_cap, allowed_origins)
         VALUES ($1, 'Kettle & Stone Support',
                 'You are the friendly support assistant for Kettle & Stone, a UK speciality coffee subscription. Speak like a knowledgeable barista: warm, concise, British English. Quote prices exactly as written. If the answer is not in the provided context, say so honestly and offer to take the visitor''s details for the team.',
                 'Hello! Ask me anything about our coffee, subscriptions or delivery.',
                 '#b45309',
                 'Answers come from Kettle & Stone''s own guides.',
                 '["How much is UK delivery?", "Do you sell decaf?", "Can I pause my subscription?", "What''s the best V60 recipe?"]',
                 'haiku', 10000, 800, 40, $2)
         RETURNING id`,
        [tenantId, origins]
      )
    );
    agentId = a.rows[0].id;
    console.log(`Demo tenant created: ${tenantId} (agent ${agentId})`);
  }

  const client = await withSystem((db) =>
    db.query(`SELECT id FROM users WHERE email = 'demo@kettleandstone.co'`)
  );
  if (!client.rows[0]) {
    const pw = process.env.DEMO_PASSWORD || 'KettleDemo2026!';
    await withSystem(async (db) =>
      db.query(
        `INSERT INTO users (tenant_id, role, name, email, password_hash)
         VALUES ($1, 'client', 'Demo Customer', 'demo@kettleandstone.co', $2)`,
        [tenantId, await bcrypt.hash(pw, 12)]
      )
    );
    console.log('Demo client login ready: demo@kettleandstone.co');
  }

  for (const doc of DEMO_DOCS) {
    const existingDoc = await withSystem((db) =>
      db.query(`SELECT id, status FROM sources WHERE tenant_id = $1 AND name = $2`, [tenantId, doc.name])
    );
    if (existingDoc.rows[0]?.status === 'synced') continue;
    const sourceId =
      existingDoc.rows[0]?.id ??
      (await createSource({ tenantId, agentId, kind: 'text', name: doc.name }));
    console.log(`Ingesting ${doc.name}...`);
    await processSource(sourceId, doc.text);
  }
  console.log(`Demo knowledge base ready. Agent id: ${agentId}`);
}

async function main(): Promise<void> {
  await ensureOperator();
  await ensureDemoTenant();
  console.log('Seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
