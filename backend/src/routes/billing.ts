import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import pool from '../db/pool.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2026-06-24.dahlia' }) : null;

const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_STARTER_PRICE_ID || '']: 'starter',
  [process.env.STRIPE_PRO_PRICE_ID || '']: 'pro',
  [process.env.STRIPE_BUSINESS_PRICE_ID || '']: 'business',
};

const router = Router();

function requireStripe(_req: Request, res: Response): boolean {
  if (!stripe) {
    res.status(503).json({ error: 'Billing is not configured' });
    return false;
  }
  return true;
}

// Create checkout session (protected)
router.post('/checkout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!requireStripe(req, res)) return;
  try {
    const { priceId } = req.body;
    if (!priceId) {
      res.status(400).json({ error: 'priceId is required' });
      return;
    }

    const userResult = await pool.query('SELECT email, stripe_customer_id FROM users WHERE id = $1', [req.userId]);
    const user = userResult.rows[0];

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe!.customers.create({ email: user.email });
      customerId = customer.id;
      await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, req.userId]);
    }

    const session = await stripe!.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/dashboard?billing=success`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard?billing=cancelled`,
      metadata: { userId: req.userId! },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Get subscription details (protected)
router.get('/subscription', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userResult = await pool.query(
      'SELECT plan, stripe_subscription_id, monthly_message_count, message_count_reset_at FROM users WHERE id = $1',
      [req.userId]
    );
    const user = userResult.rows[0];

    let subscription = null;
    if (user.stripe_subscription_id && stripe) {
      try {
        subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
      } catch {
        // Subscription may have been deleted
      }
    }

    res.json({
      plan: user.plan,
      monthlyMessageCount: user.monthly_message_count,
      messageCountResetAt: user.message_count_reset_at,
      subscription: subscription ? {
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      } : null,
    });
  } catch (err) {
    console.error('Subscription error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create customer portal session (protected)
router.post('/portal', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!requireStripe(req, res)) return;
  try {
    const userResult = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [req.userId]);
    const customerId = userResult.rows[0]?.stripe_customer_id;

    if (!customerId) {
      res.status(400).json({ error: 'No billing account found' });
      return;
    }

    const session = await stripe!.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.CLIENT_URL}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Stripe webhook (public, verified by signature)
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  if (!requireStripe(req, res)) return;
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    event = stripe!.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        // Get subscription to find the price/plan
        const subscription = await stripe!.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        const plan = PRICE_TO_PLAN[priceId] || 'starter';

        await pool.query(
          `UPDATE users SET plan = $1, stripe_subscription_id = $2, stripe_customer_id = $3
           WHERE id = $4 OR stripe_customer_id = $3`,
          [plan, subscriptionId, customerId, session.metadata?.userId]
        );
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        const plan = PRICE_TO_PLAN[priceId] || 'free';

        if (subscription.status === 'active') {
          await pool.query(
            'UPDATE users SET plan = $1 WHERE stripe_subscription_id = $2',
            [plan, subscription.id]
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await pool.query(
          'UPDATE users SET plan = $1, stripe_subscription_id = NULL WHERE stripe_subscription_id = $2',
          ['free', subscription.id]
        );
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
