import { Link } from 'react-router-dom';
import { Zap, MessageSquare, BarChart3, Code2, Check } from 'lucide-react';
import ChatWidget from '../components/ui/ChatWidget';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-xl">SupportAI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
              Sign In
            </Link>
            <Link
              to="/register"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-800 rounded-full px-4 py-1.5 text-sm text-indigo-300 mb-8">
          <Zap className="w-3.5 h-3.5" />
          Powered by Claude AI
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-6 leading-tight">
          Add AI support to your<br />
          <span className="text-indigo-400">website in 5 minutes</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Give your customers instant answers 24/7. SupportAI embeds directly into any website — no code required. Powered by Claude, trained on your business.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/register"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-lg"
          >
            Start for free
          </Link>
          <Link
            to="/login"
            className="border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-lg"
          >
            Sign in
          </Link>
        </div>
        <p className="text-gray-500 text-sm mt-4">No credit card required · 100 messages free</p>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-12">Everything you need</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: MessageSquare,
              title: 'Custom AI Persona',
              desc: 'Train your AI with a custom system prompt. Make it sound like your brand, know your products, and follow your support policies.',
            },
            {
              icon: BarChart3,
              title: 'Conversation History',
              desc: 'Every conversation is saved. Browse, filter, and review all customer interactions from your dashboard.',
            },
            {
              icon: Code2,
              title: 'One-Line Embed',
              desc: 'Paste a single script tag into any website — Webflow, Shopify, WordPress, or custom HTML. Works everywhere.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="w-12 h-12 bg-indigo-950 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-4">Simple pricing</h2>
        <p className="text-gray-400 text-center mb-12">Start free, upgrade when you're ready</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
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
              className={`rounded-2xl p-8 border ${
                plan.highlight
                  ? 'bg-indigo-600 border-indigo-500'
                  : 'bg-gray-900 border-gray-800'
              }`}
            >
              <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                <span className={plan.highlight ? 'text-indigo-200' : 'text-gray-400'}>{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className={`w-4 h-4 ${plan.highlight ? 'text-indigo-200' : 'text-indigo-400'}`} />
                    <span className={plan.highlight ? 'text-indigo-100' : 'text-gray-300'}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`block text-center font-semibold py-3 rounded-xl transition-colors ${
                  plan.highlight
                    ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-6 text-center">
        <p className="text-gray-500 text-sm">© 2025 SupportAI. Built with Claude by Anthropic.</p>
      </footer>

      {/* Live demo widget */}
      <ChatWidget demoMode color="#6366f1" agentName="SupportAI Demo" welcomeMessage="Hi! I'm a demo of SupportAI. Try asking me anything!" />
    </div>
  );
}
