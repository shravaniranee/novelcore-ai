'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Info,
  Shield,
  Check,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScoreRing } from '@/components/score-ring';
import { useDemo } from '@/lib/demo-context';
import { toast } from 'sonner';

const riskConfig = {
  Low: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
  Medium: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
  High: { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20' },
};

const statusConfig = {
  PASS: { color: 'text-success', bg: 'bg-success/10', icon: CheckCircle2 },
  REVIEW: { color: 'text-warning', bg: 'bg-warning/10', icon: AlertTriangle },
  GOOD: { color: 'text-success', bg: 'bg-success/10', icon: CheckCircle2 },
};

export default function ExaminerPage() {
  const { analysis, resolvedObjections, resolveObjection, patentReadiness } = useDemo();
  const { examinerObjections, examinerPositives, examinerStatusChecks } = analysis;
  const allResolved = resolvedObjections.length === examinerObjections.length;
  const effectiveReadiness = allResolved ? Math.min(88, patentReadiness + 4) : patentReadiness;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            AI Patent Examiner
          </h1>
          <Badge variant="secondary" className="text-xs">Simulated Review</Badge>
        </div>
        <p className="mt-1 text-muted-foreground">
          Simulate a pre-filing review before submitting your application.
        </p>
      </motion.div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/5 p-4 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <span>
          This is an AI-generated simulation for research and preparation purposes. It is not legal advice or an actual patent examination.
        </span>
      </div>

      {/* Overall Assessment Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="border-border p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <ScoreRing value={effectiveReadiness} size={100} strokeWidth={8} color="primary" label="Patent Readiness" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Overall Assessment
                </p>
                <p className="text-2xl font-bold text-warning">Medium Risk</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {allResolved
                    ? 'All objections addressed. Ready for professional review.'
                    : 'Review recommended objections before filing.'}
                </p>
              </div>
            </div>
          </div>

          {/* Status Checks */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border/60 pt-5 sm:grid-cols-5">
            {examinerStatusChecks.map((check) => {
              const cfg = statusConfig[check.status];
              const Icon = cfg.icon;
              return (
                <div key={check.label} className="rounded-lg border border-border/60 bg-secondary/30 p-3 text-center">
                  <Icon className={`mx-auto h-4 w-4 ${cfg.color}`} />
                  <p className="mt-1.5 text-xs font-medium text-foreground">{check.label}</p>
                  <p className={`text-[10px] font-bold ${cfg.color}`}>{check.status}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Examiner Objections */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="space-y-4"
      >
        <h2 className="text-lg font-semibold text-foreground">Examiner Objections</h2>
        {examinerObjections.map((obj, i) => {
          const cfg = riskConfig[obj.severity];
          const isResolved = resolvedObjections.includes(obj.id);
          return (
            <motion.div
              key={obj.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
            >
              <Card className={`border-border p-5 transition-all ${isResolved ? 'border-success/30 bg-success/5' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Objection {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cfg.bg} ${cfg.color}`}>
                        {obj.severity}
                      </span>
                      {isResolved && (
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <Check className="h-3 w-3 text-success" />
                          Addressed
                        </Badge>
                      )}
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-foreground">{obj.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {obj.concern}
                    </p>
                    <div className="mt-3 rounded-lg border border-border/60 bg-secondary/30 p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Recommendation
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {obj.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
                {!isResolved ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 w-full sm:w-auto"
                    onClick={() => {
                      resolveObjection(obj.id);
                      toast.success('Claim strategy updated.', {
                        description: `"${obj.title}" has been addressed.`,
                      });
                    }}
                  >
                    <Zap className="mr-1.5 h-3.5 w-3.5 text-primary" />
                    Resolve
                  </Button>
                ) : (
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium text-success">
                    <Check className="h-3.5 w-3.5" />
                    Addressed
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Positive Findings */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="space-y-4"
      >
        <h2 className="text-lg font-semibold text-foreground">Examiner Positive Findings</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {examinerPositives.map((pos, i) => (
            <motion.div
              key={pos.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.06 }}
            >
              <Card className="border-success/20 bg-success/5 p-4">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <p className="mt-2 text-sm font-medium text-foreground">{pos.title}</p>
                <p className="mt-0.5 text-xs text-success">{pos.rating}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Final Patent Readiness Summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <Card className="border-border p-6">
          <h2 className="mb-5 text-lg font-semibold text-foreground">Patent Readiness</h2>
          <div className="flex flex-col items-center gap-6 lg:flex-row lg:justify-around">
            <ScoreRing value={effectiveReadiness} size={140} strokeWidth={10} color="primary" label="Patent Readiness" />
            <div className="grid w-full max-w-md grid-cols-2 gap-3">
              {[
                { label: 'Novelty', value: 82 },
                { label: 'Inventive Step', value: allResolved ? 79 : 71 },
                { label: 'Industrial Applicability', value: 91 },
                { label: 'Claim Strength', value: 84 },
                { label: 'Prior-Art Risk', value: allResolved ? 28 : 34, invert: true },
              ].map((dim) => (
                <div key={dim.label} className="rounded-lg border border-border/60 bg-secondary/30 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {dim.label}
                  </p>
                  <p className="mt-0.5 text-xl font-bold text-foreground">{dim.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* NovelCore Assessment */}
          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">NovelCore Assessment</p>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your invention demonstrates strong technical differentiation after claim optimization. The strongest opportunity lies in the adaptive multi-sensor classification mechanism.
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Next Steps Checklist */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <Card className="border-border p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Next Steps</h2>
          <div className="space-y-2.5">
            {analysis.nextStepsChecklist.map((step) => (
              <div key={step.label} className="flex items-center gap-3">
                {step.done ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-border" />
                )}
                <span className={`text-sm ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-border/60 bg-secondary/30 p-3">
            <p className="text-xs text-muted-foreground">
              Ready for professional IP review. NovelCore does not guarantee patent grant.
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/app/patent">
          <Button variant="outline" size="lg">
            <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
            Back to Patent Workspace
          </Button>
        </Link>
        <Link href="/app/report">
          <Button size="lg">
            Generate Innovation Report
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
