'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Target,
  ArrowRight,
  Zap,
  TrendingUp,
  Check,
  Sparkles,
  X,
  Cloud,
  Cpu,
  Layers,
  Clock,
  ShieldCheck,
  Boxes,
  Eye,
  Scale,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useDemo } from '@/lib/demo-context';
import { toast } from 'sonner';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const impactConfig = {
  High: { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20' },
  Medium: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
  Low: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
};

const gapTypeConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  POTENTIALLY_DISTINCTIVE: { label: 'Potentially Distinctive', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' },
  UNDERSERVED: { label: 'Underserved Area', color: 'text-success', bg: 'bg-success/10', border: 'border-success/30' },
  PARTIALLY_EXPLORED: { label: 'Partially Explored', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' },
  MODERATELY_EXPLORED: { label: 'Moderately Explored', color: 'text-muted-foreground', bg: 'bg-secondary/60', border: 'border-border/60' },
  CROWDED: { label: 'Crowded Area', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
};

const differentiationConfig = {
  Strong: { color: 'text-success', bg: 'bg-success/10' },
  Moderate: { color: 'text-warning', bg: 'bg-warning/10' },
  Limited: { color: 'text-destructive', bg: 'bg-destructive/10' },
};

const existingIcons = [Cloud, Boxes, Eye, Clock];
const yourIcons = [Cpu, Layers, ShieldCheck, Clock];

export default function InnovationGapPage() {
  const { analysis, applyOpportunity } = useDemo();

  if (!analysis || !analysis.opportunities || analysis.opportunities.length === 0) {
    return (
      <div className="mx-auto max-w-7xl py-12">
        <Card className="border-dashed border-border p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Target className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">No Innovation Gaps Available</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Submit an invention to uncover patent white space and strategic architectural recommendations.
          </p>
          <div className="mt-6">
            <Link href="/app/new">
              <Button className="gap-2">
                <ArrowRight className="h-4 w-4" />
                Start New Analysis
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Where Can Your Invention Win?
        </h1>
        <p className="mt-1 text-muted-foreground">
          See where your invention can differentiate from existing solutions.
        </p>
      </motion.div>

      {/* Educational Disclaimer Banner */}
      <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-secondary/30 px-4 py-2.5 text-xs text-muted-foreground">
        <Scale className="h-4 w-4 shrink-0 text-primary" />
        <span>
          <strong>Educational Disclaimer:</strong> NovelCore AI provides AI-assisted patent intelligence and is not a substitute for professional legal advice. Innovation gaps describe the retrieved prior-art landscape only.
        </span>
      </div>

      {/* Comparison Layout */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch"
      >
        {/* Existing Solutions */}
        <Card className="border-border p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted-foreground/10">
              <X className="h-4 w-4 text-muted-foreground" />
            </div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Existing Solutions
            </h2>
          </div>
          <div className="space-y-3">
            {analysis.existingApproach.map((item, i) => {
              const Icon = existingIcons[i] || X;
              return (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-secondary/30 p-3"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                  <X className="ml-auto h-3.5 w-3.5 text-destructive/50" />
                </motion.div>
              );
            })}
          </div>
        </Card>

        {/* VS Divider */}
        <div className="flex items-center justify-center lg:flex-col">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-border bg-background text-sm font-bold text-muted-foreground">
            VS
          </div>
        </div>

        {/* Your Approach */}
        <Card className="border-primary/30 bg-primary/5 p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Check className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
              Your Approach
            </h2>
          </div>
          <div className="space-y-3">
            {analysis.yourApproach.map((item, i) => {
              const Icon = yourIcons[i] || Check;
              return (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                  className="flex items-center gap-3 rounded-lg border border-primary/20 bg-background p-3"
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm font-medium text-foreground">{item}</span>
                  <Check className="ml-auto h-3.5 w-3.5 text-success" />
                </motion.div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Radar Comparison Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="border-border p-6">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Capability Comparison
              </h2>
              <p className="text-sm text-muted-foreground">
                Multi-dimensional analysis across key capability areas
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
                Existing Solutions
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                Your Invention
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={analysis.radar}>
              <PolarGrid stroke="hsl(220 24% 90%)" />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fill: 'hsl(222 47% 11%)', fontWeight: 500 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} />
              <Radar name="Existing Solutions" dataKey="existing" stroke="hsl(220 9% 55%)" fill="hsl(220 9% 55%)" fillOpacity={0.12} strokeWidth={2} />
              <Radar name="Your Invention" dataKey="invention" stroke="hsl(221 83% 53%)" fill="hsl(221 83% 53%)" fillOpacity={0.22} strokeWidth={2} />
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
        </Card>
      </motion.div>

      {/* AI-Identified Innovation Gaps */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">AI-Identified Innovation Gaps</h2>
        </div>
        {(analysis.opportunities || []).length === 0 ? (
          <Card className="flex flex-col items-center justify-center border-dashed border-border py-16 text-center">
            <Target className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <h3 className="text-base font-semibold text-foreground">No innovation gaps identified</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Run an invention analysis to uncover differentiated whitespace opportunities.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(analysis.opportunities || []).map((opp, i) => {
            const cfg = impactConfig[opp.impact];
            return (
              <motion.div
                key={opp.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
              >
                <Card className={`h-full border-border p-5 transition-all hover:shadow-premium ${opp.applied ? 'border-success/30' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`flex h-6 items-center rounded-full px-2.5 text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.color}`}>
                        {opp.impact} Impact
                      </span>
                      {opp.gapType && gapTypeConfig[opp.gapType] && (
                        <span className={`flex h-6 items-center rounded-full border px-2.5 text-[10px] font-bold uppercase tracking-wider ${gapTypeConfig[opp.gapType].bg} ${gapTypeConfig[opp.gapType].color} ${gapTypeConfig[opp.gapType].border}`}>
                          {gapTypeConfig[opp.gapType].label}
                        </span>
                      )}
                    </div>
                    {opp.applied && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Check className="h-3 w-3 text-success" />
                        Added to Strategy
                      </Badge>
                    )}
                  </div>

                  {opp.relatedFeatureKeys && opp.relatedFeatureKeys.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {opp.relatedFeatureKeys.map((fk) => (
                        <span key={fk} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                          {fk}
                        </span>
                      ))}
                    </div>
                  )}

                  <h3 className="mt-3 text-base font-semibold text-foreground">
                    {opp.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {opp.whyItMatters}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Differentiation
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-foreground">
                        {opp.differentiationScore != null
                          ? `${opp.differentiationScore}/100`
                          : (opp.impact === 'High' ? 'Strong' : 'Moderate')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Prior-Art Coverage
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                        {opp.coverage != null
                          ? `${Math.round(opp.coverage * 100)}%`
                          : 'Limited'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-border/60 bg-secondary/30 p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Recommended Action
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {opp.recommendedAction}
                    </p>
                  </div>

                  {!opp.applied ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4 w-full"
                      onClick={() => {
                        applyOpportunity(opp.id);
                        toast.success('Recommendation added to invention strategy.', {
                          description: `"${opp.title}" is now part of your invention plan.`,
                        });
                      }}
                    >
                      <Zap className="mr-1.5 h-3.5 w-3.5 text-primary" />
                      Apply Recommendation
                    </Button>
                  ) : (
                    <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-success/20 bg-success/5 py-2 text-xs font-medium text-success">
                      <Check className="h-3.5 w-3.5" />
                      Added to Innovation Strategy
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
        )}
      </motion.div>

      {/* Next step */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="flex items-center justify-between"
      >
        <Link href="/app/analysis#patentability">
          <Button variant="outline" size="lg">
            Assess Patentability
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <Link href="/app/patent">
          <Button size="lg">
            Strengthen Claims
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
