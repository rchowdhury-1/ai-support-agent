import { Link } from 'react-router-dom';
import { Zap, MessageSquare, BarChart3, Code2, Check, ArrowRight, Sparkles } from 'lucide-react';
import ChatWidget from '../components/ui/ChatWidget';

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b px-6 py-4 backdrop-blur-md" style={{ borderColor: 'var(--border)', background: 'rgba(3,7,18,0.8)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">SupportAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium transition-colors" style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
              Sign In
            </Link>
            <Link to="/register" className="btn-primary text-sm px-4 py-2">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 hero-grid" />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(139,92,246,0.25) 0%, transparent 70%)',
        }} />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 40% 40% at 80% 60%, rgba(6,182,212,0.1) 0%, transparent 60%)',
        }} />

        <div className="relative max-w-6xl mx-auto px-6 py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-8 border"
            style={{ background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)', color: 'var(--primary-light)' }}>
            <Sparkles className="w-3.5 h-3.5" />
            Powered by Gemini AI
          </div>

          <h1 className="text-6xl sm:text-7xl font-extrabold text-white mb-6 leading-[1.05] tracking-tight">
            AI support that feels<br />
            <span className="gradient-text">like magic</span>
          </h1>

          <p className="text-xl leading-relaxed max-w-2xl mx-auto mb-10" style={{ color: 'var(--text-muted)' }}>
            Deploy an AI support agent on any website in under 5 minutes. Powered by Gemini, trained on your business, live 24/7.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/register" className="btn-primary text-base px-8 py-3.5">
              Start for free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="btn-ghost text-base px-8 py-3.5">
              Sign in
            </Link>
          </div>
          <p className="text-sm mt-4" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
            No credit card · 100 messages free
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">Built for modern teams</h2>
          <p style={{ color: 'var(--text-muted)' }}>Everything you need to deploy AI support at scale</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: MessageSquare,
              title: 'Custom AI Persona',
              desc: 'Train your AI with a custom system prompt. Make it sound like your brand and know your products inside out.',
              accent: 'var(--primary)',
            },
            {
              icon: BarChart3,
              title: 'Full Conversation History',
              desc: 'Every conversation is saved. Browse, filter, and review all customer interactions from your dashboard.',
              accent: 'var(--accent)',
            },
            {
              icon: Code2,
              title: 'One-Line Embed',
              desc: 'Paste a single script tag into any website. Works on Webflow, Shopify, WordPress, and raw HTML.',
              accent: 'var(--primary-light)',
            },
          ].map(({ icon: Icon, title, desc, accent }) => (
            <div key={title} className="card p-6 group">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-300"
                style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
                <Icon className="w-5 h-5" style={{ color: accent }} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">Simple pricing</h2>
          <p style={{ color: 'var(--text-muted)' }}>Start free, upgrade when you're ready</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
          {[
            {
              name: 'Free',
              price: '$0',
              period: '/month',
              features: ['100 messages/month', '1 AI agent', 'Conversation history', 'Embeddable widget', 'Email support'],
              cta: 'Get started free',
              highlight: false,
            },
            {
              name: 'Pro',
              price: '$29',
              period: '/month',
              features: ['Unlimited messages', 'Unlimited agents', 'Full conversation history', 'Priority support', 'Custom branding', 'Advanced analytics'],
              cta: 'Start Pro trial',
              highlight: true,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className="card p-8 relative overflow-hidden"
              style={plan.highlight ? {
                background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.08))',
                borderColor: 'rgba(139,92,246,0.4)',
                boxShadow: '0 0 40px rgba(139,92,246,0.15)',
              } : {}}
            >
              {plan.highlight && (
                <div className="absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--primary)', color: 'white' }}>
                  Popular
                </div>
              )}
              <h3 className="text-base font-semibold text-white mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                <span style={{ color: 'var(--text-muted)' }} className="text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: plan.highlight ? 'rgba(139,92,246,0.2)' : 'rgba(6,182,212,0.15)' }}>
                      <Check className="w-2.5 h-2.5" style={{ color: plan.highlight ? 'var(--primary-light)' : 'var(--accent)' }} />
                    </div>
                    <span style={{ color: plan.highlight ? 'var(--text)' : 'var(--text-muted)' }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={plan.highlight ? 'btn-primary w-full justify-center text-sm' : 'btn-ghost w-full justify-center text-sm'}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6 text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
          © 2025 SupportAI. Built with Gemini by Google.
        </p>
      </footer>

      {/* Live demo widget */}
      <ChatWidget
        demoMode
        color="var(--primary)"
        agentName="SupportAI Demo"
        welcomeMessage="Hi! I'm a demo of SupportAI. Try asking me anything!"
      />
    </div>
  );
}
