import { useEffect, useState } from 'react';
import { CreditCard, Check, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

interface SubscriptionData {
  plan: string;
  monthlyMessageCount: number;
  messageCountResetAt: string;
  subscription: {
    status: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

const plans = [
  {
    name: 'Free',
    key: 'free',
    price: '£0',
    period: '/month',
    features: ['1 agent', '2 documents per agent', '100 messages/month', 'Basic chat widget'],
    priceId: null,
  },
  {
    name: 'Starter',
    key: 'starter',
    price: '£29',
    period: '/month',
    features: ['3 agents', '10 documents per agent', '1,000 messages/month', 'Lead capture', 'Priority support'],
    priceId: import.meta.env.VITE_STRIPE_STARTER_PRICE_ID,
  },
  {
    name: 'Pro',
    key: 'pro',
    price: '£79',
    period: '/month',
    features: ['10 agents', '50 documents per agent', '10,000 messages/month', 'Lead capture', 'Priority support'],
    priceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID,
    popular: true,
  },
  {
    name: 'Business',
    key: 'business',
    price: '£199',
    period: '/month',
    features: ['Unlimited agents', 'Unlimited documents', '100,000 messages/month', 'Lead capture', 'Dedicated support'],
    priceId: import.meta.env.VITE_STRIPE_BUSINESS_PRICE_ID,
  },
];

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    api.get('/billing/subscription')
      .then((res) => setSubscription(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCheckout = async (priceId: string) => {
    setCheckoutLoading(priceId);
    try {
      const res = await api.post('/billing/checkout', { priceId });
      window.location.href = res.data.url;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to start checkout';
      toast.error(msg);
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    try {
      const res = await api.post('/billing/portal');
      window.location.href = res.data.url;
    } catch {
      toast.error('Failed to open billing portal');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const currentPlan = subscription?.plan || 'free';

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Manage your subscription and usage
        </p>
      </div>

      {/* Current usage */}
      {subscription && (
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Current Plan</p>
              <p className="text-xl font-bold text-white capitalize mt-1">{currentPlan}</p>
              {subscription.subscription?.cancelAtPeriodEnd && (
                <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>Cancels at end of period</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Messages this month</p>
              <p className="text-xl font-bold text-white mt-1">{subscription.monthlyMessageCount}</p>
            </div>
            {subscription.subscription && (
              <button
                onClick={handlePortal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                <ExternalLink className="w-4 h-4" />
                Manage Subscription
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.key;
          const isUpgrade = !isCurrent && plan.priceId;

          return (
            <div
              key={plan.key}
              className="card p-6 relative flex flex-col"
              style={plan.popular ? {
                border: '1px solid var(--primary)',
                boxShadow: '0 0 20px rgba(139,92,246,0.1)',
              } : {}}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: 'var(--primary)', color: 'white' }}>
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--primary-light)' }} />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  Current Plan
                </button>
              ) : isUpgrade ? (
                <button
                  onClick={() => handleCheckout(plan.priceId!)}
                  disabled={checkoutLoading === plan.priceId}
                  className="btn-primary w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                >
                  {checkoutLoading === plan.priceId ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Upgrade
                    </>
                  )}
                </button>
              ) : (
                <div className="h-[42px]" /> // Spacer for free plan when already on paid
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
