'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Brain,
  Tag,
  Layers,
  ArrowRight,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Shield,
  Scale,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScoreRing } from '@/components/score-ring';
import { useDemo } from '@/lib/demo-context';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const riskConfig = {
  Low: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
  Medium: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
  High: { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20' },
};

function getHeatColor(value: number, isOwn: boolean): string {
  if (isOwn) return 'bg-primary';
  if (value >= 75) return 'bg-destructive/70';
  if (value >= 55) return 'bg-warning/60';
  if (value >= 35) return 'bg-primary/30';
  return 'bg-success/30';
}

export default function AnalysisResultsPage() {
  const { analysis, claimStrength } = useDemo();
  const risk = riskConfig[analysis.priorArtRisk];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 text-xs">
            <CheckCircle2 className="h-3 w-3 text-success" />
            Analysis Complete
          </Badge>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Invention Intelligence
        </h1>
        <p className="mt-1 text-lg text-muted-foreground">{analysis.title}</p>
      </motion.div>

      {/* Top Metric Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <Card className="border-border p-5 transition-all hover:shadow-premium">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Novelty
            </p>
            <TrendingUp className="h-3.5 w-3.5 text-success" />
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {analysis.novelty}
            <span className="text-base font-normal text-muted-foreground">/100</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Strong novelty potential</p>
        </Card>
        <Card className="border-border p-5 transition-all hover:shadow-premium">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Patentability
            </p>
            <Shield className="h-3.5 w-3.5 text-accent" />
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {analysis.patentability}
            <span className="text-base font-normal text-muted-foreground">/100</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Above filing threshold</p>
        </Card>
        <Card className="border-border p-5 transition-all hover:shadow-premium">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Prior Art Risk
            </p>
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          </div>
          <p className={`mt-2 text-2xl font-bold ${risk.color}`}>{analysis.priorArtRisk}</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <motion.div
              className={`h-full rounded-full ${risk.color.replace('text-', 'bg-')}`}
              initial={{ width: 0 }}
              animate={{ width: `${analysis.priorArtRiskScore}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
        </Card>
        <Card className="border-border p-5 transition-all hover:shadow-premium">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Innovation Opportunities
            </p>
            <Target className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">{analysis.opportunities.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Differentiation areas found</p>
        </Card>
      </motion.div>

      {/* Novelty Score Visualization + Breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="flex h-full flex-col items-center justify-center border-border p-8">
            <ScoreRing
              value={analysis.novelty}
              max={100}
              size={160}
              strokeWidth={12}
              color="primary"
              delay={0.3}
            />
            <p className="mt-4 text-sm font-semibold text-foreground">Novelty Score</p>
            <p className="mt-1 text-xs text-success">Strong novelty potential</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="h-full border-border p-6">
            <h2 className="mb-5 text-lg font-semibold text-foreground">Novelty Breakdown</h2>
            <div className="space-y-5">
              {analysis.noveltyBreakdown.map((item, i) => (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="font-semibold text-foreground">{item.value}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 1, delay: 0.4 + i * 0.15 }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-lg border border-border/60 bg-secondary/30 p-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Technical novelty is strong due to the multi-sensor fusion architecture.
                Prior-art differentiation is moderate — the adaptive confidence scoring
                mechanism is the key inventive distinction.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* AI Understanding + Technical Concepts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="border-border p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                How NovelCore Understands Your Invention
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {analysis.understanding}
            </p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="border-border p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <Tag className="h-4 w-4 text-accent" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Extracted Concepts</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.concepts.map((concept) => (
                <Badge key={concept} variant="secondary" className="text-xs">
                  {concept}
                </Badge>
              ))}
            </div>
            <div className="mt-5 border-t border-border/60 pt-4 space-y-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Technology Domain
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">{analysis.technologyDomain}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  IPC Classification
                </p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {analysis.ipcLabels.map((code) => (
                    <Badge key={code} variant="outline" className="font-mono text-xs">
                      {code}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Novelty Heatmap Grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Card className="border-border p-6">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Novelty Heatmap</h2>
          </div>

          {/* Grid */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground">
                    Dimension
                  </th>
                  <th className="pb-3 text-center text-xs font-medium text-primary">
                    Your Invention
                  </th>
                  <th className="pb-3 text-center text-xs font-medium text-muted-foreground">
                    Cluster A
                  </th>
                  <th className="pb-3 text-center text-xs font-medium text-muted-foreground">
                    Cluster B
                  </th>
                  <th className="pb-3 text-center text-xs font-medium text-muted-foreground">
                    Cluster C
                  </th>
                </tr>
              </thead>
              <tbody>
                {analysis.heatmapGrid.map((row, i) => (
                  <tr key={row.dimension} className="border-t border-border/40">
                    <td className="py-2.5 text-xs font-medium text-foreground">
                      {row.dimension}
                    </td>
                    {[row.invention, row.clusterA, row.clusterB, row.clusterC].map((val, j) => (
                      <td key={j} className="py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <motion.div
                            className={`h-7 w-16 rounded-md ${getHeatColor(val, j === 0)}`}
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: `${Math.max(20, val * 0.6)}px`, opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.5 + i * 0.08 }}
                          />
                          <span className="text-xs font-medium text-foreground">{val}</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border/60 pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-success/30" />
              Low Overlap
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-primary/30" />
              Moderate Overlap
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-warning/60" />
              High Overlap
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-destructive/70" />
              Very High Overlap
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-primary" />
              Potential Differentiator
            </span>
          </div>

          <p className="mt-4 text-sm font-medium text-foreground">
            NovelCore identified {analysis.opportunities.length} areas with potential differentiation.
          </p>
        </Card>
      </motion.div>

      {/* Patentability Intelligence Section */}
      <motion.div
        id="patentability"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="scroll-mt-20"
      >
        <Card className="border-border p-6">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <Scale className="h-4 w-4 text-accent" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Patentability Intelligence</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Overall score */}
            <div className="flex flex-col items-center justify-center">
              <ScoreRing
                value={analysis.patentability}
                size={120}
                strokeWidth={10}
                color="accent"
                label="Overall"
                delay={0.4}
              />
            </div>

            {/* Radar chart */}
            <div className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={analysis.radar}>
                  <PolarGrid stroke="hsl(220 24% 90%)" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: 'hsl(220 9% 46%)' }} />
                  <Radar name="Score" dataKey="invention" stroke="hsl(262 83% 58%)" fill="hsl(262 83% 58%)" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: '1px solid hsl(220 24% 90%)',
                      background: 'hsl(0 0% 100%)',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Breakdown bars */}
            <div className="space-y-3 lg:col-span-2">
              {[
                { label: 'Novelty', value: analysis.novelty },
                { label: 'Inventive Step', value: analysis.inventiveStep },
                { label: 'Industrial Application', value: analysis.industrialApp },
                { label: 'Claim Strength', value: claimStrength },
                { label: 'Prior Art Risk', value: analysis.priorArtRiskScore, invert: true },
              ].map((dim, i) => (
                <div key={dim.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{dim.label}</span>
                    <span className="font-semibold text-foreground">{dim.value}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className={`h-full rounded-full ${
                        dim.label === 'Prior Art Risk'
                          ? 'bg-gradient-to-r from-success to-warning'
                          : 'bg-gradient-to-r from-primary to-accent'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${dim.value}%` }}
                      transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Assessment */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">AI Assessment</p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {analysis.aiAssessment}
              </p>
            </div>
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
              <div className="mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-accent" />
                <p className="text-sm font-semibold text-foreground">Recommended Next Step</p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {analysis.recommendedNextStep}
              </p>
              <Link href="/app/patent" className="mt-3 inline-block">
                <Button size="sm" variant="outline">
                  Strengthen Claims
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Innovation Opportunities Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <Card className="flex flex-col items-start justify-between gap-4 border-primary/20 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent p-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {analysis.opportunities.length} potential innovation opportunities identified
              </h3>
              <p className="text-sm text-muted-foreground">
                NovelCore found areas where your invention can differentiate from prior art.
              </p>
            </div>
          </div>
          <Link href="/app/innovation">
            <Button size="lg">
              View Innovation Gaps
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </Card>
      </motion.div>

      {/* Quick Nav */}
      <div className="flex flex-wrap gap-3">
        <Link href="/app/prior-art">
          <Button variant="outline" size="sm">
            <Layers className="mr-1.5 h-3.5 w-3.5" />
            View Prior Art
          </Button>
        </Link>
        <Link href="/app/innovation">
          <Button variant="outline" size="sm">
            <Target className="mr-1.5 h-3.5 w-3.5" />
            View Innovation Gaps
          </Button>
        </Link>
        <Link href="/app/patent">
          <Button variant="outline" size="sm">
            <Scale className="mr-1.5 h-3.5 w-3.5" />
            Strengthen Claims
          </Button>
        </Link>
        <Link href="/app/examiner">
          <Button variant="outline" size="sm">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
            Examiner Review
          </Button>
        </Link>
      </div>
    </div>
  );
}
