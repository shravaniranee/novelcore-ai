'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Check,
  Download,
  Sparkles,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScoreRing } from '@/components/score-ring';
import { useDemo } from '@/lib/demo-context';
import { toast } from 'sonner';

const reportSections = [
  'Executive Summary',
  'Invention Overview',
  'Technical Classification',
  'Prior-Art Intelligence',
  'Novelty Assessment',
  'Innovation Gaps',
  'AI Recommendations',
  'Patentability Assessment',
  'Optimized Claims',
  'Examiner Simulation',
  'Next Steps',
];

export default function ReportPage() {
  const { analysis, reportGenerated, setReportGenerated, patentReadiness } = useDemo();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              NovelCore AI
            </h1>
            <p className="text-sm text-muted-foreground">Innovation Intelligence Report</p>
          </div>
        </div>
        <p className="mt-3 text-muted-foreground">
          For: <span className="font-medium text-foreground">{analysis.title}</span>
        </p>
      </motion.div>

      {/* Patent Readiness Summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="flex flex-col items-center gap-6 border-border p-8 sm:flex-row sm:justify-around">
          <ScoreRing value={patentReadiness} label="Patent Readiness" color="primary" size={140} strokeWidth={10} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Novelty</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{analysis.novelty}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Patentability</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{analysis.patentability}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Claim Strength</p>
              <p className="mt-1 text-2xl font-bold text-foreground">84</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Inventive Step</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{analysis.inventiveStep}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Industrial App</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{analysis.industrialApp}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Prior Art Risk</p>
              <p className="mt-1 text-2xl font-bold text-warning">{analysis.priorArtRiskScore}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Report Sections */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="border-border p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Report Sections</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {reportSections.map((section, i) => (
              <motion.div
                key={section}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.04 }}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-secondary/30 p-3"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-sm font-medium text-foreground">{section}</span>
                <Check className="ml-auto h-4 w-4 text-success" />
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Generate / Success */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card className="flex flex-col items-center justify-between gap-4 border-primary/20 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent p-6 sm:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {reportGenerated ? 'Report Generated' : 'Generate Innovation Report'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {reportGenerated
                  ? 'Your Innovation Intelligence Report is ready.'
                  : 'Compile all analysis into a single shareable report.'}
              </p>
            </div>
          </div>
          <AnimatePresence mode="wait">
            {!reportGenerated ? (
              <motion.div
                key="generate"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Button
                  size="lg"
                  onClick={() => {
                    setReportGenerated(true);
                    toast.success('Report generated.', {
                      description: 'Your Innovation Intelligence Report is ready.',
                    });
                  }}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Innovation Report
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="download"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <Badge variant="secondary" className="gap-1">
                  <Check className="h-3 w-3 text-success" />
                  Ready
                </Badge>
                <Button
                  variant="outline"
                  onClick={() => toast.success('Report downloaded (demo).')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Final Checklist + Next Steps */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
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
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Ready for professional IP review</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              NovelCore does not guarantee patent grant. Consult a registered patent attorney before filing.
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/app/examiner">
          <Button variant="outline" size="lg">
            <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
            Back to Examiner
          </Button>
        </Link>
        <Link href="/app">
          <Button variant="outline" size="lg">
            Back to Overview
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
