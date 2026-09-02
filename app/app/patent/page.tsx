'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save,
  Sparkles,
  Check,
  AlertTriangle,
  ArrowRight,
  Brain,
  Search,
  Target,
  FileText,
  Info,
  Zap,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  PlusCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScoreRing } from '@/components/score-ring';
import { useDemo } from '@/lib/demo-context';
import { toast } from 'sonner';

const docSections = [
  { id: 'abstract', label: 'Abstract' },
  { id: 'background', label: 'Background' },
  { id: 'summary', label: 'Summary' },
  { id: 'description', label: 'Description' },
  { id: 'claims', label: 'Claims' },
];

const overlapConfig = {
  High: { color: 'text-destructive', bg: 'bg-destructive/10', dot: 'bg-destructive' },
  Medium: { color: 'text-warning', bg: 'bg-warning/10', dot: 'bg-warning' },
  Low: { color: 'text-success', bg: 'bg-success/10', dot: 'bg-success' },
};

const diffConfig = {
  Strong: { color: 'text-success', bg: 'bg-success/10' },
  Moderate: { color: 'text-warning', bg: 'bg-warning/10' },
  Low: { color: 'text-destructive', bg: 'bg-destructive/10' },
};

export default function PatentWorkspacePage() {
  const { analysis, acceptClaim, acceptedClaims, claimStrength, patentReadiness } = useDemo();
  const [showOptimizer, setShowOptimizer] = useState(false);
  const claim = analysis?.claims?.[0];
  const claimAccepted = claim ? acceptedClaims.includes(claim.id) : false;
  const abstractRef = useRef<HTMLDivElement>(null);

  if (!analysis || !claim) {
    return (
      <div className="mx-auto max-w-7xl py-12">
        <Card className="border-dashed border-border p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">No Patent Claims Available</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Submit an invention disclosure to generate legally sound, structurally bounded independent claims.
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

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSave = () => {
    toast.success('Draft saved.', {
      description: 'Your patent draft has been saved locally.',
    });
  };

  if (showOptimizer && claim) {
    return <ClaimOptimizer onBack={() => setShowOptimizer(false)} />;
  }

  if (!claim) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <h2 className="text-xl font-bold text-foreground">No Claim Analysis Available</h2>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            No structured claims have been generated or optimized for this invention yet.
          </p>
          <div className="mt-6">
            <Link href="/app/new">
              <Button size="sm">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                Analyze an Invention
              </Button>
            </Link>
          </div>
        </div>
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
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Patent Workspace
          </h1>
          <p className="mt-1 text-muted-foreground">
            Transform your invention analysis into a structured patent draft.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2">
            <ScoreRing value={patentReadiness} size={56} strokeWidth={5} color="primary" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Patent Readiness
              </p>
              <p className="text-sm font-semibold text-foreground">
                {patentReadiness}% · Draft in Progress
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save Draft
          </Button>
          <Button size="sm" onClick={() => setShowOptimizer(true)}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Optimize Claims
          </Button>
        </div>
      </motion.div>

      {/* Educational Disclaimer Banner */}
      <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-secondary/30 px-4 py-2.5 text-xs text-muted-foreground">
        <Shield className="h-4 w-4 shrink-0 text-primary" />
        <span>
          <strong>Educational Disclaimer:</strong> NovelCore AI provides AI-assisted patent intelligence and claim drafting guidance, and is not a substitute for professional legal advice.
        </span>
      </div>

      {/* Main layout: outline + document + AI panel */}
      <div className="grid gap-6 lg:grid-cols-[160px_1fr_300px]">
        {/* Document Outline */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="hidden lg:block"
        >
          <div className="sticky top-20">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Document Outline
            </p>
            <nav className="space-y-1">
              {docSections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        </motion.div>

        {/* Patent Document */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card className="border-border p-8 lg:p-10" style={{ fontFamily: 'Georgia, serif' }}>
            {/* Title */}
            <div className="mb-8 border-b border-border/40 pb-6">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Patent Application Draft
              </p>
              <h2 className="mt-2 text-xl font-bold leading-snug text-foreground">
                {analysis.patentTitle}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.ipc.map((code) => (
                  <Badge key={code} variant="outline" className="font-mono text-[10px]">
                    {code}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Abstract */}
            <div id="abstract" className="mb-8 scroll-mt-20">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">
                Abstract
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {analysis.abstract}
              </p>
            </div>

            {/* Field of Invention */}
            <div className="mb-8">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">
                Field of the Invention
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The present invention relates to automated waste classification and sorting
                systems, and more particularly to a multi-modal edge-AI architecture that
                fuses computer vision, near-infrared spectroscopy, and inductive sensing
                for real-time material identification with adaptive confidence scoring.
              </p>
            </div>

            {/* Background */}
            <div id="background" className="mb-8 scroll-mt-20">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">
                Background
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Conventional waste sorting systems rely on single-sensor classification
                approaches, typically limited to optical recognition or metal detection
                alone. These systems suffer from high misclassification rates when
                confronted with mixed-material items, contaminated recyclables, or
                visually similar polymers. Existing solutions that employ cloud-based
                processing introduce unacceptable latency for real-time sorting
                operations and require continuous network connectivity. Furthermore,
                current systems lack adaptive learning mechanisms to self-correct
                classification errors, resulting in persistent error patterns and
                declining accuracy over time as waste stream composition evolves.
              </p>
            </div>

            {/* Summary */}
            <div id="summary" className="mb-8 scroll-mt-20">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">
                Summary
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The present disclosure describes a system and method for automated waste
                segregation using a multi-modal sensor fusion architecture with
                adaptive confidence scoring and on-device retraining. The system
                combines computer vision, near-infrared spectroscopy, and inductive
                sensing inputs processed by an edge-deployed neural network. When
                classification confidence falls below a dynamically adjusted threshold,
                items are routed to a secondary verification station and the corrected
                result is used for on-device model refinement.
              </p>
            </div>

            {/* Detailed Description */}
            <div id="description" className="mb-8 scroll-mt-20">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">
                Detailed Description
              </h3>
              <div className="space-y-3">
                {analysis.description.map((para, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                    {para}
                  </p>
                ))}
              </div>
            </div>

            {/* Advantages */}
            <div className="mb-8">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">
                Advantages
              </h3>
              <ul className="space-y-2">
                {[
                  'Higher classification accuracy through multi-sensor fusion compared to single-sensor systems',
                  'Reduced latency via on-device edge inference eliminating cloud round-trips',
                  'Adaptive learning from misclassified items enables continuous self-correction',
                  'Lower operational cost compared to manual sorting and cloud-dependent alternatives',
                  'Real-time audit logging for compliance and quality assurance reporting',
                ].map((adv, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {adv}
                  </li>
                ))}
              </ul>
            </div>

            {/* Claims */}
            <div id="claims" className="scroll-mt-20">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Claims Strategy
                  </h3>
                  <Badge variant="outline" className="text-[10px]">
                    Evidence Grounded
                  </Badge>
                </div>
                {claimAccepted ? (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Check className="h-3 w-3 text-success" />
                    Claim 1 Optimized
                  </Badge>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setShowOptimizer(true)}>
                    <Sparkles className="mr-1.5 h-3 w-3" />
                    Optimize Claim 1
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">Claim 1 (Independent)</span>
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        Apparatus
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Version 1 · 100% Grounded</span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {claimAccepted ? claim.optimized : claim.original}
                  </p>
                </div>

                <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Claim 2 (Dependent)</span>
                    <span className="text-[10px] text-muted-foreground">Depends on Claim 1</span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    2. The apparatus of claim 1, wherein the processing subsystem further comprises a deterministic inferential execution pipeline with bounded constant-time latency.
                  </p>
                </div>

                <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Claim 3 (Dependent)</span>
                    <span className="text-[10px] text-muted-foreground">Depends on Claim 1</span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    3. The apparatus of claim 1, further comprising a secondary multi-sensor verification station operatively coupled to receive items having confidence metrics below a dynamic threshold.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* AI Assistant Panel */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="sticky top-20">
            <Card className="border-border p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">NovelCore AI</p>
                  <p className="text-[10px] text-muted-foreground">Patent Intelligence Assistant</p>
                </div>
              </div>

              {/* Status items */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs">
                  <Check className="h-3.5 w-3.5 text-success" />
                  <span className="text-muted-foreground">Prior-art analysis completed</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Check className="h-3.5 w-3.5 text-success" />
                  <span className="text-muted-foreground">Novelty assessment completed</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Check className="h-3.5 w-3.5 text-success" />
                  <span className="text-muted-foreground">Innovation gaps identified</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {claimAccepted ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  )}
                  <span className={claimAccepted ? 'text-muted-foreground' : 'text-warning'}>
                    {claimAccepted ? 'Claim 1 optimized' : 'Claim 1 needs strengthening'}
                  </span>
                </div>
              </div>

              {/* Suggested Actions */}
              <div className="mt-5 border-t border-border/60 pt-4">
                <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Suggested Actions
                </p>
                <div className="space-y-2">
                  {!claimAccepted && (
                    <button
                      onClick={() => setShowOptimizer(true)}
                      className="flex w-full items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-left text-xs font-medium text-primary transition-all hover:bg-primary/10"
                    >
                      <Zap className="h-3.5 w-3.5 shrink-0" />
                      Strengthen Claim 1
                    </button>
                  )}
                  <Link
                    href="/app/prior-art"
                    className="flex w-full items-center gap-2 rounded-lg border border-border bg-secondary/30 p-2.5 text-left text-xs font-medium text-foreground transition-all hover:bg-secondary"
                  >
                    <Search className="h-3.5 w-3.5 shrink-0" />
                    Review Prior Art
                  </Link>
                  <Link
                    href="/app/innovation"
                    className="flex w-full items-center gap-2 rounded-lg border border-border bg-secondary/30 p-2.5 text-left text-xs font-medium text-foreground transition-all hover:bg-secondary"
                  >
                    <Target className="h-3.5 w-3.5 shrink-0" />
                    Add Technical Differentiation
                  </Link>
                </div>
              </div>

              {/* Next step */}
              <div className="mt-5 border-t border-border/60 pt-4">
                <Link href="/app/examiner" className="block">
                  <Button variant="outline" size="sm" className="w-full">
                    Continue to Examiner Review
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </motion.div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/30 p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 text-primary" />
        AI-assisted claim drafting guidance — not legal advice. NovelCore AI provides AI-assisted patent intelligence and is not a substitute for professional legal advice.
      </div>
    </div>
  );
}

// ============================================================
// CLAIM OPTIMIZER SUB-COMPONENT
// ============================================================

function ClaimOptimizer({ onBack }: { onBack: () => void }) {
  const { analysis, acceptClaim, acceptedClaims, claimStrength, patentReadiness } = useDemo();
  if (!analysis) return null;
  const claim = analysis.claims[0];
  const claimAccepted = acceptedClaims.includes(claim.id);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-3">
          <ArrowRight className="mr-1.5 h-3.5 w-3.5 rotate-180" />
          Back to Workspace
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Claim Optimizer
        </h1>
        <p className="mt-1 text-muted-foreground">
          Strengthen your claims using prior-art and technical differentiation insights.
        </p>
      </motion.div>

      {/* Claim 1 label */}
      <div>
        <Badge variant="secondary" className="text-xs">Claim 1</Badge>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Original */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="h-full border-border p-6">
            <div className="mb-4 flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Original Claim</Badge>
              <span className="text-xs text-muted-foreground">Strength: 68</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {claim.original}
            </p>
          </Card>
        </motion.div>

        {/* Optimized */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="h-full border-primary/30 bg-primary/5 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Badge className="gap-1 text-xs">
                <Sparkles className="h-3 w-3" />
                AI-Optimized Claim
              </Badge>
              <span className="text-xs font-medium text-success">Strength: 84</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground">
              {claim.optimized}
            </p>
          </Card>
        </motion.div>
      </div>

      {/* Claim Strength Improvement */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card className="border-border p-6">
          <div className="mb-5 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Claim Strength</h2>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-muted-foreground">68</span>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <span className="text-3xl font-bold text-success">84</span>
            </div>
            <div className="grid flex-1 grid-cols-3 gap-4">
              {analysis.claimStrengthImprovements.map((m) => (
                <div key={m.label} className="rounded-lg border border-border bg-secondary/30 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {m.label}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    {m.positive ? (
                      <TrendingUp className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-success" />
                    )}
                    <span className="text-lg font-bold text-success">
                      {m.positive ? '+' : '-'}{m.value}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Why This Claim Is Stronger */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Card className="border-border p-6">
          <div className="mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Why NovelCore Recommends This Change
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {analysis.claimInsights.map((insight, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-secondary/30 p-4">
                <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                  <span className="text-xs font-bold text-primary">{i + 1}</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{insight}</p>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Claim-to-Prior-Art Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <Card className="border-border p-6">
          <div className="mb-5 flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Claim-to-Prior-Art Analysis
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Claim Element
                  </th>
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Prior-Art Overlap
                  </th>
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Differentiation
                  </th>
                </tr>
              </thead>
              <tbody>
                {analysis.claimPriorArtAnalysis.map((row) => {
                  const ocfg = overlapConfig[row.overlap];
                  const dcfg = diffConfig[row.differentiation];
                  return (
                    <tr key={row.element} className="border-b border-border/40">
                      <td className="py-3 text-sm font-medium text-foreground">{row.element}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ocfg.bg} ${ocfg.color}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${ocfg.dot}`} />
                          {row.overlap} overlap
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${dcfg.bg} ${dcfg.color}`}>
                          {row.differentiation} differentiation
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              NovelCore identified <strong className="text-foreground">adaptive confidence scoring</strong> and <strong className="text-foreground">multi-sensor verification</strong> as the strongest differentiating elements.
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Accept / Confirmation */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <Card className="border-border p-6">
          {claimAccepted ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                <Check className="h-7 w-7 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Claim 1 optimized</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Claim Strength: <span className="font-semibold text-foreground">68 → 84</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Patent Readiness: <span className="font-semibold text-foreground">76% → 84%</span>
                </p>
              </div>
              <Link href="/app/examiner">
                <Button size="lg">
                  Continue to Examiner Review
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                onClick={() => {
                  acceptClaim(claim.id);
                  toast.success('Optimized claim accepted.', {
                    description: 'Claim 1 strength improved from 68 to 84. Patent readiness increased to 84%.',
                  });
                }}
              >
                <Check className="mr-2 h-4 w-4" />
                Accept Optimized Claim
              </Button>
              <p className="text-xs text-muted-foreground">
                This will update your patent readiness from 76% to 84%.
              </p>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
