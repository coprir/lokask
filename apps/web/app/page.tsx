/* apps/web/app/page.tsx — LOKASK Landing Page (Next.js 14 App Router) */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LOKASK — Skills Marketplace for Cyprus',
  description: 'Find trusted local service providers or earn money with your skills. The marketplace built for immigrant students and third-country nationals in Cyprus.',
  openGraph: {
    title: 'LOKASK — Skills to Income',
    description: 'Book local services or become a provider. Zero platform fees.',
    type: 'website',
  },
};

export default function LandingPage() {
  return (
    <main className="bg-slate-950 text-white min-h-screen overflow-hidden">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-lg font-black">⚡</div>
            <span className="text-xl font-black tracking-widest text-white">LOKASK</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#categories" className="hover:text-white transition-colors">Categories</a>
            <a href="#providers" className="hover:text-white transition-colors">For providers</a>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-sm text-slate-300 hover:text-white transition-colors px-3 py-2">
              Sign in
            </a>
            <a href="/signup" className="text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-4 py-2 transition-colors">
              Get started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-16">
        {/* Background mesh */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-900/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-6 py-24 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-violet-950/60 border border-violet-700/40 rounded-full px-4 py-2 text-sm text-violet-300 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Now live across Cyprus 🇨🇾
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-none mb-6">
            <span className="text-white">Your skills,</span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              your income.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            The marketplace built for immigrant students and third-country nationals in Cyprus.
            Find services or <strong className="text-white">earn money</strong> with what you know.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <a href="/signup" className="w-full sm:w-auto bg-violet-600 hover:bg-violet-500 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all hover:scale-105 hover:shadow-xl hover:shadow-violet-500/30">
              Start for free →
            </a>
            <a href="#how-it-works" className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-semibold text-lg px-8 py-4 rounded-2xl transition-colors border border-slate-700">
              See how it works
            </a>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-8 text-center">
            {[
              { value: '0%', label: 'Platform fee' },
              { value: '6', label: 'Languages supported' },
              { value: '12+', label: 'Service categories' },
              { value: '🇨🇾', label: 'Built for Cyprus' },
            ].map(stat => (
              <div key={stat.label} className="flex flex-col">
                <span className="text-3xl font-black text-white">{stat.value}</span>
                <span className="text-sm text-slate-500 mt-1">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Simple. Fast. Fair.
            </h2>
            <p className="text-lg text-slate-400 max-w-xl mx-auto">
              From signup to first booking in under 5 minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: '👤',
                title: 'Create your profile',
                desc: 'Sign up free, choose your role (customer, provider, or both), and verify your identity.',
                color: 'from-violet-600 to-violet-800',
              },
              {
                step: '02',
                icon: '🔍',
                title: 'Find or list services',
                desc: 'Browse nearby providers with real reviews, or list your own service in minutes.',
                color: 'from-cyan-600 to-cyan-800',
              },
              {
                step: '03',
                icon: '💰',
                title: 'Book & get paid',
                desc: 'Secure Stripe payments. 100% goes to the provider — zero platform commission.',
                color: 'from-emerald-600 to-emerald-800',
              },
            ].map((item) => (
              <div key={item.step} className="relative group">
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 h-full hover:border-slate-700 transition-colors">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-2xl mb-6`}>
                    {item.icon}
                  </div>
                  <div className="text-xs font-black text-slate-600 tracking-widest mb-3">STEP {item.step}</div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="py-24 bg-slate-900/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Every skill has a market
            </h2>
            <p className="text-lg text-slate-400">12 categories and growing.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { emoji: '🧹', label: 'Cleaning', color: '#06B6D4' },
              { emoji: '📚', label: 'Tutoring', color: '#8B5CF6' },
              { emoji: '🔧', label: 'Handyman', color: '#F59E0B' },
              { emoji: '💅', label: 'Beauty', color: '#EC4899' },
              { emoji: '📦', label: 'Delivery', color: '#10B981' },
              { emoji: '💻', label: 'Tech Support', color: '#3B82F6' },
              { emoji: '👨‍🍳', label: 'Cooking', color: '#EF4444' },
              { emoji: '🌍', label: 'Translation', color: '#6C63FF' },
              { emoji: '👶', label: 'Childcare', color: '#F97316' },
              { emoji: '💪', label: 'Fitness', color: '#14B8A6' },
              { emoji: '📷', label: 'Photography', color: '#A855F7' },
              { emoji: '🐾', label: 'Pet Care', color: '#78716C' },
            ].map(cat => (
              <a
                key={cat.label}
                href={`/services?category=${cat.label.toLowerCase()}`}
                className="flex flex-col items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 hover:bg-slate-800/60 transition-all hover:-translate-y-1 group"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">{cat.emoji}</span>
                <span className="text-sm font-semibold text-slate-300 text-center">{cat.label}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* For providers */}
      <section id="providers" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-950/60 border border-emerald-700/40 rounded-full px-4 py-2 text-sm text-emerald-300 mb-6">
                💚 For Providers
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6">
                Keep every
                <span className="text-emerald-400"> euro </span>
                you earn
              </h2>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                LOKASK charges zero platform fees. Every payment goes directly to you via Stripe Connect.
                We make money when you make money — just kidding, we don't take anything.
              </p>

              <div className="space-y-4 mb-10">
                {[
                  { icon: '✅', text: 'Stripe Connect — direct payouts to your bank' },
                  { icon: '✅', text: 'Set your own prices and availability' },
                  { icon: '✅', text: 'Build reputation with verified reviews' },
                  { icon: '✅', text: 'Chat, negotiate, and manage bookings in-app' },
                  { icon: '✅', text: 'Multi-language — list in 6 languages' },
                ].map(item => (
                  <div key={item.text} className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-0.5 flex-shrink-0">{item.icon}</span>
                    <span className="text-slate-300">{item.text}</span>
                  </div>
                ))}
              </div>

              <a href="/signup?role=provider" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all hover:scale-105">
                Start earning today →
              </a>
            </div>

            {/* Mock earnings card */}
            <div className="relative">
              <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-8 shadow-2xl shadow-violet-500/20">
                <p className="text-violet-200 text-sm font-medium mb-2">Total Earnings</p>
                <p className="text-5xl font-black text-white mb-6">€1,840.00</p>
                <div className="flex gap-6 mb-8">
                  <div>
                    <p className="text-2xl font-bold text-white">€620</p>
                    <p className="text-violet-200 text-sm">This month</p>
                  </div>
                  <div className="w-px bg-white/20" />
                  <div>
                    <p className="text-2xl font-bold text-white">23</p>
                    <p className="text-violet-200 text-sm">Completed jobs</p>
                  </div>
                </div>
                {/* Mini chart bars */}
                <div className="flex items-end gap-2 h-16">
                  {[40, 65, 45, 80, 60, 90, 75].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-white/20 rounded-t-md"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <p className="text-violet-200 text-xs mt-3 text-center">Last 7 days</p>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 shadow-xl">
                <p className="text-emerald-400 font-black text-lg">0%</p>
                <p className="text-slate-400 text-xs">platform fee</p>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 shadow-xl">
                <p className="text-white font-bold">⭐ 4.9</p>
                <p className="text-slate-400 text-xs">avg rating</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Languages */}
      <section className="py-16 bg-slate-900/40 border-y border-slate-800">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-slate-400 mb-8">Available in 6 languages for our diverse community</p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { flag: '🇬🇧', name: 'English' },
              { flag: '🇬🇷', name: 'Ελληνικά' },
              { flag: '🇷🇺', name: 'Русский' },
              { flag: '🇷🇴', name: 'Română' },
              { flag: '🇦🇪', name: 'العربية' },
              { flag: '🇵🇭', name: 'Filipino' },
            ].map(lang => (
              <div key={lang.name} className="flex items-center gap-2 bg-slate-800 rounded-full px-4 py-2 text-sm text-slate-300">
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <h2 className="text-5xl md:text-6xl font-black text-white leading-tight mb-6">
            Ready to start?
          </h2>
          <p className="text-xl text-slate-400 mb-12">
            Join Cyprus's growing community of skilled workers and savvy customers. No fees, no BS.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/signup" className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-lg px-10 py-5 rounded-2xl transition-all hover:scale-105 hover:shadow-xl hover:shadow-violet-500/30">
              Create free account →
            </a>
            <a href="/services" className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-lg px-10 py-5 rounded-2xl transition-colors border border-slate-700">
              Browse services
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-base font-black">⚡</div>
              <span className="text-lg font-black tracking-widest text-white">LOKASK</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="/support" className="hover:text-white transition-colors">Support</a>
              <a href="/admin" className="hover:text-white transition-colors">Admin</a>
            </div>
            <p className="text-sm text-slate-600">© 2025 LOKASK. Built for Cyprus 🇨🇾</p>
          </div>
        </div>
      </footer>

    </main>
  );
}
