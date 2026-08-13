'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Search,
  Brain,
  Shield,
  ArrowRight,
  Check,
  Layers,
  Target,
  Zap,
  FileText,
  Scale,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  Tooltip,
} from 'recharts';

const workflow = [
  { num: '01', title: 'Idea Input', desc: 'Describe your invention in plain language.' },
  { num: '02', title: 'AI Understanding', desc: 'NovelCore extracts technical concepts.' },
  { num: '03', title: 'Prior-Art Search', desc: 'Semantic search across patent literature.' },
  { num: '04', title: 'Novelty Analysis', desc: 'Score your invention against prior art.' },
  { num: '05', title: 'Innovation Gaps', desc: 'Identify where you can differentiate.' },
  { num: '06', title: 'Patent Readiness', desc: 'Draft, optimize, and review before filing.' },
];

const valueCards = [
  {
    icon: Search,
    tag: 'DISCOVER',
    title: 'Semantic Prior-Art Discovery',
    desc: 'Find technically similar inventions based on meaning, not just keywords. NovelCore understands what your invention does, not just what it says.',
  },
  {
    icon: Brain,
    tag: 'UNDERSTAND',
    title: 'Novelty & Patentability Intelligence',
    desc: 'AI-powered analysis scores your invention across novelty, inventive step, and industrial applicability — with explainable reasoning.',
  },
  {
    icon: Shield,
    tag: 'STRENGTHEN',
    title: 'Recommendations, Claims & Examiner Feedback',
    desc: 'Close innovation gaps, optimize claims, and run a simulated examiner review before you spend a dollar on filing.',
  },
];

const chartData = [
  { x: 'PA-1', similarity: 87 },
  { x: 'PA-2', similarity: 79 },
  { x: 'PA-3', similarity: 72 },
  { x: 'PA-4', similarity: 64 },
  { x: 'PA-5', similarity: 58 },
  { x: 'You', similarity: 82 },
];

const miniPriorArt = [
  { title: 'Automated Waste Classification Using Computer Vision', sim: 87, year: 2021 },
  { title: 'Intelligent Robotic Waste Sorting System', sim: 79, year: 2020 },
  { title: 'Deep Learning Based Recycling Classification', sim: 72, year: 2022 },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">
              NovelCore<span className="text-primary"> AI</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#product" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Product
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              How It Works
            </a>
            <a href="#solutions" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Solutions
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/app">
              <Button variant="ghost" size="sm" className="text-sm font-medium">
                Sign In
              </Button>
            </Link>
            <Link href="/app/new">
              <Button size="sm" className="text-sm font-medium">
                Get Started
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute left-1/2 top-0 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/10 via-accent/5 to-transparent blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 lg:px-8 lg:pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left: Copy */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-start"
            >
              <Badge variant="secondary" className="mb-6 gap-1.5 border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" />
                AI-Powered Innovation Intelligence
              </Badge>
              <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Turn Ideas Into
                <br />
                <span className="gradient-text">Stronger, Patent-Ready</span>
                <br />
                Inventions.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                NovelCore AI acts as your AI Co-Inventor — discovering prior art,
                analyzing novelty, identifying innovation gaps, and helping you
                build stronger patent claims.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/app/new">
                  <Button size="lg" className="w-full sm:w-auto">
                    Analyze My Idea
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/app">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Explore Demo
                  </Button>
                </Link>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                For inventors • researchers • startups • universities • R&D teams
              </p>
            </motion.div>

            {/* Right: Product Preview */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              <div className="rounded-2xl border border-border bg-card p-1 shadow-premium-lg">
                <div className="rounded-xl border border-border/60 bg-gradient-to-br from-secondary/50 to-background p-5">
                  {/* Mini dashboard header */}
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Invention Intelligence
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">
                        AI-Powered Smart Waste Segregation
                      </p>
                    </div>
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />
                      Demo
                    </Badge>
                  </div>

                  {/* Metric cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard label="Novelty" value="82" suffix="/100" color="text-primary" />
                    <MetricCard label="Patentability" value="76" suffix="/100" color="text-accent" />
                    <MetricCard label="Prior Art Risk" value="Medium" color="text-warning" isText />
                    <MetricCard label="Opportunities" value="4" color="text-success" />
                  </div>

                  {/* Mini chart */}
                  <div className="mt-4 rounded-lg border border-border/60 bg-card p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Semantic Similarity
                    </p>
                    <ResponsiveContainer width="100%" height={100}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(221 83% 53%)" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="hsl(221 83% 53%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="similarity"
                          stroke="hsl(221 83% 53%)"
                          strokeWidth={2}
                          fill="url(#heroGrad)"
                        />
                        <XAxis dataKey="x" tick={{ fontSize: 9, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            fontSize: 11,
                            borderRadius: 8,
                            border: '1px solid hsl(220 24% 90%)',
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Prior art cards */}
                  <div className="mt-3 space-y-2">
                    {miniPriorArt.map((pa) => (
                      <div
                        key={pa.title}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground">
                            {pa.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{pa.year}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className="ml-2 shrink-0 text-[10px] font-semibold"
                        >
                          {pa.sim}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <Badge variant="secondary" className="mb-3 text-xs font-medium uppercase tracking-wider">
              How It Works
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              From idea to patent in six steps
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {workflow.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group relative"
              >
                <div className="rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-premium">
                  <span className="text-2xl font-bold text-primary/20 transition-colors group-hover:text-primary/40">
                    {step.num}
                  </span>
                  <h3 className="mt-2 text-sm font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
                {i < workflow.length - 1 && (
                  <ArrowRight className="absolute -right-2 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-border lg:block" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Value */}
      <section id="product" className="border-t border-border/60 bg-secondary/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Patent search tells you what exists.
              <br />
              <span className="gradient-text">NovelCore helps you understand what to build next.</span>
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {valueCards.map((card, i) => (
              <motion.div
                key={card.tag}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-premium"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <card.icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {card.tag}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-foreground">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {card.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions / Feature grid */}
      <section id="solutions" className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <Badge variant="secondary" className="mb-3 text-xs font-medium uppercase tracking-wider">
              Built for every innovator
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              One platform for the entire invention lifecycle
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Target, title: 'Inventors & Startups', desc: 'Validate novelty before investing in a patent filing.' },
              { icon: Layers, title: 'R&D Teams', desc: 'Map your innovation landscape and find white-space opportunities.' },
              { icon: FileText, title: 'IP Professionals', desc: 'Draft stronger claims with AI-assisted optimization.' },
              { icon: Brain, title: 'Researchers', desc: 'Understand how your work differs from existing literature.' },
              { icon: Zap, title: 'Universities', desc: 'Accelerate tech-transfer with patentability scoring.' },
              { icon: Scale, title: 'MSMEs', desc: 'Enterprise-grade IP intelligence without the enterprise cost.' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/20"
              >
                <item.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border/60 bg-secondary/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <Badge variant="secondary" className="mb-3 text-xs font-medium uppercase tracking-wider">
              Pricing
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Start free. Scale when you are ready.
            </h2>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              { name: 'Starter', price: 'Free', desc: 'For individual inventors exploring an idea.', features: ['3 analyses / month', 'Semantic prior-art search', 'Novelty scoring', 'Innovation gap summary'], cta: 'Get Started' },
              { name: 'Pro', price: '$49', desc: 'For startups and researchers.', features: ['Unlimited analyses', 'Patent workspace & claims', 'Claim optimizer', 'Examiner simulation', 'Innovation reports'], cta: 'Start Pro Trial', popular: true },
              { name: 'Enterprise', price: 'Custom', desc: 'For R&D teams and universities.', features: ['Everything in Pro', 'Team collaboration', 'API access', 'Custom IPC taxonomies', 'Dedicated support'], cta: 'Contact Sales' },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border bg-card p-6 ${
                  plan.popular ? 'border-primary shadow-premium' : 'border-border'
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <h3 className="text-sm font-semibold text-foreground">{plan.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{plan.desc}</p>
                <p className="mt-4 text-3xl font-bold text-foreground">
                  {plan.price}
                  {plan.price !== 'Custom' && plan.price !== 'Free' && (
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  )}
                </p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/app/new" className="mt-6 block">
                  <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-accent/5 to-transparent p-12">
            <div className="absolute inset-0 bg-dots opacity-30" />
            <div className="relative">
              <TrendingUp className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Stop searching. Start inventing.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Join the inventors and researchers using NovelCore AI to build
                stronger, patent-ready inventions.
              </p>
              <Link href="/app/new" className="mt-8 inline-block">
                <Button size="lg">
                  Analyze My Idea
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                NovelCore<span className="text-primary"> AI</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              From Idea to Patent. Prototype / Demo — not a live product.
            </p>
            <div className="flex gap-6 text-xs text-muted-foreground">
              <a href="#" className="hover:text-foreground">Privacy</a>
              <a href="#" className="hover:text-foreground">Terms</a>
              <a href="#" className="hover:text-foreground">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  color,
  isText,
}: {
  label: string;
  value: string;
  suffix?: string;
  color: string;
  isText?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 ${isText ? 'text-base' : 'text-2xl'} font-bold ${color}`}>
        {value}
        {suffix && <span className="text-xs font-normal text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  );
}
