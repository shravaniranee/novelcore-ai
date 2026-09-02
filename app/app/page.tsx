'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  PlusCircle,
  Lightbulb,
  Target,
  FileText,
  Scale,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useDemo } from '@/lib/demo-context';

const statusColors: Record<string, string> = {
  'Patent-Ready': 'bg-success/10 text-success border-success/20',
  'In Progress': 'bg-primary/10 text-primary border-primary/20',
  'Needs Work': 'bg-warning/10 text-warning border-warning/20',
};

interface DashboardStat {
  label: string;
  value: string;
  change: string;
}

interface RecentAnalysisItem {
  id: string;
  inventionId: string;
  title: string;
  domain: string;
  date: string;
  novelty: number;
  patentability: number;
  status: string;
}

interface ChartItem {
  month: string;
  analyses: number;
  patents: number;
}

export default function DashboardOverview() {
  const { analysis } = useDemo();
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [recent, setRecent] = useState<RecentAnalysisItem[]>([]);
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardMetrics() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success) {
            setStats(data.stats || []);
            setRecent(data.recentAnalyses || []);
            setChartData(data.intelligenceChart || []);
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics from API', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboardMetrics();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Good afternoon, Innovator.
            </h1>
            <p className="mt-1 text-muted-foreground">
              Turn your next idea into a stronger invention.
            </p>
          </div>
          <Link href="/app/new">
            <Button size="lg">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Analysis
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {isLoading
          ? [1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-border p-5">
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                <div className="mt-3 h-8 w-16 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-12 animate-pulse rounded bg-muted" />
              </Card>
            ))
          : stats.map((stat) => (
              <Card key={stat.label} className="border-border p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="mt-1 text-xs text-success">{stat.change}</p>
              </Card>
            ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Analyses */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="border-border p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Recent Analyses</h2>
              <Link href="/app/analysis">
                <Button variant="ghost" size="sm" className="text-xs text-primary">
                  View all
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-xl border border-border/60 bg-secondary/30 p-4"
                  />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Lightbulb className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">No analyses yet</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Submit your first invention to generate comprehensive patent intelligence and prior art analysis.
                </p>
                <Link href="/app/new" className="mt-4">
                  <Button size="sm" variant="outline">
                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                    Analyze First Invention
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recent.map((item, i) => (
                  <Link key={item.id} href="/app/analysis">
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="group flex items-center justify-between rounded-xl border border-border/60 bg-secondary/30 p-4 transition-all hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
                          <p className="truncate text-sm font-medium text-foreground">
                            {item.title}
                          </p>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{item.domain}</span>
                          <span>•</span>
                          <span>{item.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="hidden text-right sm:block">
                          <p className="text-xs text-muted-foreground">Novelty</p>
                          <p className="text-sm font-semibold text-foreground">{item.novelty}%</p>
                        </div>
                        <div className="hidden text-right sm:block">
                          <p className="text-xs text-muted-foreground">Patentability</p>
                          <p className="text-sm font-semibold text-foreground">{item.patentability}%</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={statusColors[item.status] || ''}
                        >
                          {item.status}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Innovation Intelligence Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="border-border p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Intelligence Trend</h2>
                <p className="text-xs text-muted-foreground">Analyses & Prior Art Growth</p>
              </div>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="novGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(221 83% 53%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(221 83% 53%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="patGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(262 83% 58%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(262 83% 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 24% 90%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid hsl(220 24% 90%)',
                    background: 'hsl(0 0% 100%)',
                  }}
                />
                <Area type="monotone" dataKey="analyses" name="Analyses" stroke="hsl(221 83% 53%)" strokeWidth={2} fill="url(#novGrad)" />
                <Area type="monotone" dataKey="patents" name="Prior Art" stroke="hsl(262 83% 58%)" strokeWidth={2} fill="url(#patGrad)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-3 flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Analyses
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent" />
                Prior Art Documents
              </span>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Demo Journey Quick Access */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Demo Journey</h2>
            <Badge variant="secondary" className="ml-1 text-xs">Active Invention</Badge>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Follow the complete invention lifecycle: {analysis?.title || 'Submit an invention to begin'}
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { href: '/app/new', label: 'New Analysis', icon: PlusCircle },
              { href: '/app/analysis', label: 'Analysis Results', icon: Zap },
              { href: '/app/prior-art', label: 'Prior Art', icon: Target },
              { href: '/app/innovation', label: 'Innovation Gaps', icon: Target },
              { href: '/app/patent', label: 'Patent Workspace', icon: FileText },
              { href: '/app/examiner', label: 'Examiner Review', icon: Scale },
              { href: '/app/report', label: 'Innovation Report', icon: FileText },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant="outline" size="sm" className="text-xs">
                  <item.icon className="mr-1.5 h-3.5 w-3.5" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
