import { Link } from 'react-router-dom'
import { CalendarDays, Clock, Shield, Zap, Users, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: CalendarDays,
    title: 'Any Calendar',
    desc: 'Connect Google, Outlook, Apple, or any calendar — all in one place.',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    desc: 'We only see free/busy blocks. Never event titles, locations, or notes.',
  },
  {
    icon: Zap,
    title: 'Instant Results',
    desc: 'Best meeting times surface in seconds, not after days of back-and-forth.',
  },
  {
    icon: Clock,
    title: 'Recurring Support',
    desc: 'Find a weekly slot that works across multiple weeks at once.',
  },
]

const steps = [
  { n: '1', label: 'Connect your calendar', sub: 'Google, Outlook, Apple — all supported' },
  { n: '2', label: 'Invite your team', sub: 'Share a link — they connect their calendars too' },
  { n: '3', label: 'Get instant suggestions', sub: 'Best times auto-computed from free/busy data' },
  { n: '4', label: 'Confirm & done', sub: 'Download the invite or copy the details' },
]

export function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900">
            Sched<span className="text-teal-600">Sync</span>
          </span>
        </div>
        <Link to="/auth">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white">
            Get Started <ArrowRight className="ml-1.5 w-4 h-4" />
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-full px-4 py-1.5 mb-8">
          <Shield className="w-4 h-4 text-teal-600" />
          <span className="text-sm text-teal-700 font-medium">Privacy-first scheduling</span>
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight mb-6">
          Schedule group meetings{' '}
          <span className="text-teal-600">without the chaos</span>
        </h1>

        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Connect any calendar, invite your team, and get the best meeting time instantly —
          without sharing a single event detail.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/auth">
            <Button size="lg" className="bg-teal-600 hover:bg-teal-700 text-white px-8">
              Start scheduling free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>

        {/* Social proof */}
        <p className="mt-6 text-sm text-gray-400">
          Built for MIT Sloan · No credit card required
        </p>
      </section>

      {/* Stats banner */}
      <section className="bg-teal-600 py-10">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-3 gap-6 text-center text-white">
            <div>
              <p className="text-3xl font-bold">~60 min</p>
              <p className="text-sm text-teal-100 mt-1">avg. time spent scheduling one meeting today</p>
            </div>
            <div>
              <p className="text-3xl font-bold">2–4 tools</p>
              <p className="text-sm text-teal-100 mt-1">required just to coordinate a single meeting</p>
            </div>
            <div>
              <p className="text-3xl font-bold">&lt; 2 min</p>
              <p className="text-sm text-teal-100 mt-1">to schedule with SchedSync</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Everything you need. Nothing you don't.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-2xl border border-gray-100 bg-gray-50">
              <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">How it works</h2>
          <div className="grid sm:grid-cols-4 gap-6">
            {steps.map(({ n, label, sub }) => (
              <div key={n} className="text-center">
                <div className="w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
                  {n}
                </div>
                <p className="font-semibold text-gray-900 text-sm">{label}</p>
                <p className="text-xs text-gray-500 mt-1">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Stop scheduling meetings. Start having them.
        </h2>
        <p className="text-gray-500 mb-8">
          Join your team on SchedSync and cut meeting coordination from hours to minutes.
        </p>
        <Link to="/auth">
          <Button size="lg" className="bg-teal-600 hover:bg-teal-700 text-white px-10">
            Get started — it's free
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-gray-400">
        <p>SchedSync · MIT Sloan 15.785 · Team 11</p>
        <p className="mt-1">
          <Shield className="w-3.5 h-3.5 inline mr-1" />
          We never access event details — free/busy only
        </p>
      </footer>
    </div>
  )
}
