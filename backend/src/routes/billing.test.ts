import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import Stripe from 'stripe';
import app from '../app.js';
import { withSystem } from '../db/tenant.js';
import { createTenant, truncateAll } from '../test/factories.js';

let tenant: { id: string };

function signedEvent(id: string, type: string, object: Record<string, unknown>): { body: string; sig: string } {
  const body = JSON.stringify({
    id,
    object: 'event',
    type,
    data: { object },
    created: Math.floor(Date.now() / 1000),
  });
  const sig = Stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });
  return { body, sig };
}

function post(body: string, sig: string) {
  return request(app)
    .post('/billing/webhook')
    .set('Content-Type', 'application/json')
    .set('stripe-signature', sig)
    .send(body);
}

beforeAll(async () => {
  await truncateAll();
  tenant = await createTenant({ name: 'Kentish Heating Co', status: 'pending' });
});

describe('POST /billing/webhook', () => {
  it('rejects a bad signature', async () => {
    const res = await post('{"id":"evt_x"}', 't=1,v1=deadbeef');
    expect(res.status).toBe(400);
  });

  it('activates the tenant on checkout completion — and replays no-op (idempotency)', async () => {
    const { body, sig } = signedEvent('evt_test_checkout_1', 'checkout.session.completed', {
      id: 'cs_test_1',
      object: 'checkout.session',
      customer: 'cus_test_1',
      subscription: 'sub_test_1',
      metadata: { tenant_id: tenant.id },
    });

    const first = await post(body, sig);
    expect(first.status).toBe(200);
    expect(first.body.duplicate).toBeUndefined();

    const t1 = await withSystem((db) =>
      db.query(`SELECT status, stripe_customer_id, stripe_subscription_id FROM tenants WHERE id = $1`, [
        tenant.id,
      ])
    );
    expect(t1.rows[0]).toMatchObject({
      status: 'active',
      stripe_customer_id: 'cus_test_1',
      stripe_subscription_id: 'sub_test_1',
    });

    // Flip state so a (buggy) reprocess would be visible.
    await withSystem((db) =>
      db.query(`UPDATE tenants SET status = 'paused' WHERE id = $1`, [tenant.id])
    );

    const replay = await post(body, sig);
    expect(replay.status).toBe(200);
    expect(replay.body.duplicate).toBe(true);

    const t2 = await withSystem((db) => db.query(`SELECT status FROM tenants WHERE id = $1`, [tenant.id]));
    expect(t2.rows[0].status).toBe('paused'); // untouched by the replay

    const events = await withSystem((db) =>
      db.query(`SELECT count(*)::int AS n FROM webhook_events WHERE id = 'evt_test_checkout_1'`)
    );
    expect(events.rows[0].n).toBe(1);
  });

  it('maps subscription lifecycle to tenant status', async () => {
    const pastDue = signedEvent('evt_test_sub_pd', 'customer.subscription.updated', {
      id: 'sub_test_1',
      object: 'subscription',
      status: 'past_due',
    });
    await post(pastDue.body, pastDue.sig);
    let t = await withSystem((db) => db.query(`SELECT status FROM tenants WHERE id = $1`, [tenant.id]));
    expect(t.rows[0].status).toBe('past_due');

    const deleted = signedEvent('evt_test_sub_del', 'customer.subscription.deleted', {
      id: 'sub_test_1',
      object: 'subscription',
      status: 'canceled',
    });
    await post(deleted.body, deleted.sig);
    t = await withSystem((db) => db.query(`SELECT status FROM tenants WHERE id = $1`, [tenant.id]));
    expect(t.rows[0].status).toBe('paused');
  });
});
