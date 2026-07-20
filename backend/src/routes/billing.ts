/**
 * Stripe billing. One subscription per tenant, created from an
 * operator-generated payment link (no self-serve plans/tiers). The webhook is
 * idempotent via the webhook_events table: the Stripe event id is the primary
 * key, so a redelivered event no-ops.
 */
import { Router, type Request, type Response } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { requireClient, requireOperator, type AuthedRequest } from '../middleware/auth.js';
import { withSystem } from '../db/tenant.js';

const router = Router();

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

function requireStripe(res: Response): Stripe | null {
  if (!stripe) {
    res.status(503).json({ error: 'Billing is not configured' });
    return null;
  }
  return stripe;
}

// ── POST /billing/webhook (public, signature-verified, idempotent) ───────

router.post('/webhook', async (req: Request, res: Response) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(503).json({ error: 'Billing is not configured' });
    return;
  }
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      req.headers['stripe-signature'] as string,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  try {
    // Idempotency gate: first delivery wins, replays no-op.
    const inserted = await withSystem((db) =>
      db.query(
        `INSERT INTO webhook_events (id, type, payload) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [event.id, event.type, JSON.stringify(event.data.object)]
      )
    );
    if (inserted.rowCount === 0) {
      res.json({ received: true, duplicate: true });
      return;
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenant_id;
        if (tenantId) {
          await withSystem((db) =>
            db.query(
              `UPDATE tenants
               SET status = 'active', stripe_customer_id = $2, stripe_subscription_id = $3,
                   onboarding_step = NULL, updated_at = NOW()
               WHERE id = $1`,
              [tenantId, String(session.customer ?? ''), String(session.subscription ?? '')]
            )
          );
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const status =
          sub.status === 'active' || sub.status === 'trialing'
            ? 'active'
            : sub.status === 'past_due' || sub.status === 'unpaid'
              ? 'past_due'
              : 'paused';
        await withSystem((db) =>
          db.query(
            `UPDATE tenants SET status = $2, updated_at = NOW() WHERE stripe_subscription_id = $1`,
            [sub.id, status]
          )
        );
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await withSystem((db) =>
          db.query(
            `UPDATE tenants SET status = 'paused', updated_at = NOW() WHERE stripe_subscription_id = $1`,
            [sub.id]
          )
        );
        break;
      }
      default:
        break;
    }

    await withSystem((db) =>
      db.query(`UPDATE webhook_events SET processed_at = NOW() WHERE id = $1`, [event.id])
    );
    res.json({ received: true });
  } catch (err) {
    console.error('webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ── POST /billing/portal (client) ────────────────────────────────────────

router.post('/portal', requireClient, async (req: AuthedRequest, res: Response) => {
  const s = requireStripe(res);
  if (!s) return;
  try {
    const { rows } = await withSystem((db) =>
      db.query(`SELECT stripe_customer_id FROM tenants WHERE id = $1`, [req.auth!.tenantId])
    );
    const customerId = rows[0]?.stripe_customer_id;
    if (!customerId) {
      res.status(404).json({ error: 'No billing account on file' });
      return;
    }
    const session = await s.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.CLIENT_URL || 'http://localhost:3141'}/dashboard/billing`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('portal error:', err);
    res.status(500).json({ error: 'Could not open the billing portal' });
  }
});

// ── POST /billing/payment-link (operator) ────────────────────────────────

const paymentLinkSchema = z.object({
  tenantId: z.string().uuid(),
  monthlyAmountPence: z.number().int().min(100),
  setupFeePence: z.number().int().min(0).default(0),
});

router.post('/payment-link', requireOperator, async (req: AuthedRequest, res: Response) => {
  const s = requireStripe(res);
  if (!s) return;
  const parsed = paymentLinkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'tenantId and monthlyAmountPence are required' });
    return;
  }
  try {
    const p = parsed.data;
    const { rows } = await withSystem((db) =>
      db.query(`SELECT name, contact_email FROM tenants WHERE id = $1`, [p.tenantId])
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'gbp',
          product_data: { name: `SupportAI — ${rows[0].name} (monthly)` },
          recurring: { interval: 'month' },
          unit_amount: p.monthlyAmountPence,
        },
        quantity: 1,
      },
    ];
    if (p.setupFeePence > 0) {
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: { name: 'One-off set-up' },
          unit_amount: p.setupFeePence,
        },
        quantity: 1,
      });
    }

    const session = await s.checkout.sessions.create({
      mode: 'subscription',
      line_items: lineItems,
      metadata: { tenant_id: p.tenantId },
      subscription_data: { metadata: { tenant_id: p.tenantId } },
      customer_email: rows[0].contact_email || undefined,
      success_url: `${process.env.CLIENT_URL || 'http://localhost:3141'}/login?paid=1`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3141'}/`,
    });

    await withSystem((db) =>
      db.query(
        `UPDATE tenants SET monthly_amount_pence = $2, setup_fee_pence = $3, updated_at = NOW() WHERE id = $1`,
        [p.tenantId, p.monthlyAmountPence, p.setupFeePence]
      )
    );
    res.json({ url: session.url });
  } catch (err) {
    console.error('payment link error:', err);
    res.status(500).json({ error: 'Could not create the payment link' });
  }
});

export default router;
