'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Check,
  Sparkles,
  ArrowRight,
  Shield,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScoreRing } from '@/components/score-ring';
import { useDemo } from '@/lib/demo-context';
import { toast } from 'sonner';

const reportSectionLabels = [
  'Executive Summary',
  'Invention Overview',
  'Technical Features',
  'Prior-Art Landscape',
  'Prior-Art Ranking',
  'Feature Overlap Matrix',
  'Novelty Assessment',
  'Innovation Gap Analysis',
  'Differentiation Analysis',
  'Claim Strategy',
  'Claim Vulnerability',
  'Examiner Simulation',
  'Evidence & Traceability',
  'Risks and Limitations',
  'Final Recommendation',
  'Educational / Legal Disclaimer',
];

function SectionCard({
  title,
  children,
  delay,
}: {
  title: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card className="border-border p-6">
        <h2 className="mb-3 text-lg font-semibold text-foreground">{title}</h2>
        {children}
      </Card>
    </motion.div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function OverviewBlock({ overview }: { overview: any }) {
  if (!overview) return <EmptyNote text="Insufficient evidence" />;
  return (
    <div className="space-y-2 text-sm">
      <p>
        <span className="font-medium">Title:</span> {overview.title}
      </p>
      <p>
        <span className="font-medium">Domain:</span> {overview.domain} · {overview.industry}
      </p>
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">Problem:</span> {overview.problem}
      </p>
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">Solution:</span> {overview.solution}
      </p>
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">How it works:</span> {overview.howItWorks}
      </p>
    </div>
  );
}

export default function ReportPage() {
  const { analysis, patentReadiness } = useDemo();
  const [liveReport, setLiveReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const analysisId = analysis?.id;
  const reportReady = !!liveReport?.report && liveReport.report.status === 'COMPLETED';

  const loadReport = useCallback(async () => {
    if (!analysisId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/analysis/${analysisId}/report`);
      if (res.status === 404) {
        setLiveReport(null);
        setLoadError('Unified report has not been generated yet.');
        return;
      }
      if (!res.ok) throw new Error('Failed to load unified report.');
      const data = await res.json();
      if (data?.success && data.report) {
        setLiveReport(data);
        setLoadError(null);
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Error loading unified report');
    } finally {
      setIsLoading(false);
    }
  }, [analysisId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleGenerate = async () => {
    if (!analysisId || isGenerating) return;
    setIsGenerating(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/analysis/${analysisId}/report`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Report generation failed.');
      setLiveReport(data);
      toast.success('Report generated.', {
        description: 'Your Unified Patent Intelligence Report is ready.',
      });
    } catch (err: any) {
      setLoadError(err?.message || 'Report generation failed.');
      toast.error('Report generation failed.', {
        description: err?.message || 'Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!analysis || !analysis.title) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <h2 className="text-xl font-bold text-foreground">No Report Available</h2>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            Complete an invention analysis to generate and export an Innovation Intelligence Report.
          </p>
          <div className="mt-6">
            <Link href="/app/new">
              <Button size="sm">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Start Analysis
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sections = liveReport?.report?.sections;
  const structured = sections?.executiveSummary?.structured;
  const noveltyScore =
    structured?.noveltyScore ??
    (sections?.noveltyAssessment?.available ? sections.noveltyAssessment.noveltyScore : null) ??
    analysis.novelty;
  const readiness =
    typeof noveltyScore === 'number'
      ? Math.min(94, Math.round(noveltyScore * 0.95))
      : patentReadiness;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">NovelCore AI</h1>
            <p className="text-sm text-muted-foreground">Innovation Intelligence Report</p>
          </div>
        </div>
        <p className="mt-3 text-muted-foreground">
          For: <span className="font-medium text-foreground">{analysis.title}</span>
        </p>
        {liveReport?.report?.id && (
          <p className="mt-1 text-xs text-muted-foreground">
            AnalysisRun: {liveReport.analysisRunId} · Report v{liveReport.report.reportVersion} ·{' '}
            {liveReport.report.provenance}
          </p>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <Card className="flex flex-col items-center gap-6 border-border p-8 sm:flex-row sm:justify-around">
          <ScoreRing value={readiness} label="Patent Readiness" color="primary" size={140} strokeWidth={10} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Novelty</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{structured?.noveltyScore ?? analysis.novelty ?? '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Patentability</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{analysis.patentability ?? '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Claim Strength</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{analysis.claimStrength ?? '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Inventive Step</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{analysis.inventiveStep ?? '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Industrial App</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{analysis.industrialApp ?? '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Prior Art Risk</p>
              <p className="mt-1 text-2xl font-bold text-warning">{structured?.examinerOverallRisk ?? analysis.priorArtRiskScore ?? '—'}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <Card className="border-border p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Report Sections</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {reportSectionLabels.map((section, i) => (
              <motion.div
                key={section}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.03 }}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-secondary/30 p-3"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-sm font-medium text-foreground">{section}</span>
                {liveReport?.report ? (
                  <Check className="ml-auto h-4 w-4 text-success" />
                ) : (
                  <span className="ml-auto text-[10px] text-muted-foreground">Pending</span>
                )}
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
        <Card className="flex flex-col items-center justify-between gap-4 border-primary/20 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent p-6 sm:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {isGenerating
                  ? 'Generating Report…'
                  : reportReady
                    ? 'Report Generated'
                    : 'Generate Innovation Report'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isGenerating
                  ? 'Aggregating persisted analysis evidence into a unified report.'
                  : reportReady
                    ? 'Your Unified Patent Intelligence Report is ready.'
                    : loadError || 'Unified report has not been generated yet.'}
              </p>
            </div>
          </div>
          <AnimatePresence mode="wait">
            {isLoading || isGenerating ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button size="lg" disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isGenerating ? 'Generating…' : 'Loading…'}
                </Button>
              </motion.div>
            ) : !reportReady ? (
              <motion.div key="generate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button size="lg" onClick={handleGenerate}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Report
                </Button>
              </motion.div>
            ) : (
              <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Check className="h-3 w-3 text-success" />
                  Ready
                </Badge>
                <Button variant="outline" onClick={handleGenerate} disabled={isGenerating}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {sections && (
        <>
          <SectionCard title="1. Executive Summary" delay={0.35}>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {sections.executiveSummary?.text || 'Insufficient evidence'}
            </p>
          </SectionCard>

          <SectionCard title="2. Invention Overview" delay={0.36}>
            <OverviewBlock overview={sections.inventionOverview} />
          </SectionCard>

          <SectionCard title="3. Technical Features" delay={0.37}>
            {(sections.technicalFeatures || []).length === 0 ? (
              <EmptyNote text="Insufficient evidence" />
            ) : (
              <div className="space-y-2">
                {sections.technicalFeatures.map((f: any) => (
                  <div key={f.id} className="rounded-lg border border-border/60 bg-secondary/20 p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{f.featureKey}</Badge>
                      <span className="text-sm font-medium text-foreground">{f.name}</span>
                      {f.isNovelty && <Badge className="bg-primary/10 text-primary">Novelty</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{f.description}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="4–5. Prior-Art Landscape & Ranking" delay={0.38}>
            {(sections.priorArtLandscape || []).length === 0 ? (
              <EmptyNote text="Insufficient evidence" />
            ) : (
              <div className="space-y-2">
                {sections.priorArtLandscape.map((p: any) => (
                  <div key={p.priorArtDocumentId} className="rounded-lg border border-border/60 bg-secondary/20 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">Rank {p.finalRank}</Badge>
                      <span className="text-sm font-medium text-foreground">{p.publicationNumber}</span>
                      <span className="text-xs text-muted-foreground">{p.title}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.abstract}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                      <span>Source: {p.source}</span>
                      <span>· Jurisdiction: {p.jurisdiction}</span>
                      <span>· Presentation similarity: {p.presentationSimilarityPercent}%</span>
                      {p.rrfScore != null && (
                        <span>· RRF ranking score: {p.rrfScore} (not a similarity score)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="6. Feature Overlap Matrix" delay={0.39}>
            {(sections.featureOverlapMatrix || []).length === 0 ? (
              <EmptyNote text="Insufficient evidence" />
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {sections.featureOverlapMatrix.slice(0, 40).map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between gap-2 rounded border border-border/40 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">{o.publicationNumber} × {o.featureId}</span>
                    <Badge variant="secondary">{o.overlapStatus}</Badge>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="7. Novelty Assessment" delay={0.4}>
            {!sections.noveltyAssessment?.available ? (
              <EmptyNote text={sections.noveltyAssessment?.message || 'Novelty assessment unavailable.'} />
            ) : (
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Novelty indicator:</span> {sections.noveltyAssessment.noveltyScore} ({sections.noveltyAssessment.noveltyBand})</p>
                <p><span className="font-medium">Evidence confidence:</span> {sections.noveltyAssessment.evidenceConfidence}</p>
                <p><span className="font-medium">Max single coverage:</span> {sections.noveltyAssessment.maxSingleCoverage ?? 'Insufficient evidence'}</p>
                <p><span className="font-medium">Collective coverage:</span> {sections.noveltyAssessment.collectiveCoverage}</p>
                <p className="text-xs text-muted-foreground">{sections.noveltyAssessment.limitations}</p>
              </div>
            )}
          </SectionCard>

          <SectionCard title="8–9. Innovation Gaps & Differentiation" delay={0.41}>
            {!sections.innovationGapAnalysis?.available ? (
              <EmptyNote text={sections.differentiationAnalysis?.message || sections.innovationGapAnalysis?.message || 'No material innovation opportunity identified from available evidence.'} />
            ) : (
              <div className="space-y-2">
                {sections.innovationGapAnalysis.opportunities.map((o: any) => (
                  <div key={o.id} className="rounded-lg border border-border/60 bg-secondary/20 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{o.gapType}</Badge>
                      <span className="text-sm font-medium text-foreground">{o.title}</span>
                      <span className="text-xs text-muted-foreground">Diff {o.differentiationScore}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{o.explanation || o.whyItMatters}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="10–11. Claim Strategy & Vulnerability" delay={0.42}>
            {!sections.claimStrategy?.available ? (
              <EmptyNote text={sections.claimStrategy?.message || 'No claims generated for this analysis.'} />
            ) : (
              <div className="space-y-3">
                {sections.claimStrategy.claims.map((c: any) => (
                  <div key={c.claimId} className="rounded-lg border border-border/60 bg-secondary/20 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">Claim {c.claimNumber}</Badge>
                      <Badge variant="secondary">{c.claimType}</Badge>
                      {c.latestClaimVersion && <Badge>v{c.latestClaimVersion.versionNumber}</Badge>}
                      {c.latestClaimVersion?.vulnerabilityIndicator && (
                        <Badge className="bg-warning/10 text-warning">{c.latestClaimVersion.vulnerabilityIndicator}</Badge>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-foreground">{c.latestClaimVersion?.claimText}</p>
                    {(c.latestClaimVersion?.elements || []).map((e: any) => (
                      <p key={e.id} className="mt-1 text-[10px] text-muted-foreground">{e.elementKey} → {e.featureKey}: {e.text}</p>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="12. Examiner Simulation" delay={0.43}>
            {!sections.examinerSimulation?.available ? (
              <EmptyNote text={sections.examinerSimulation?.message || 'Examiner simulation has not been run.'} />
            ) : (
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Overall risk:</span> {sections.examinerSimulation.overallRisk} · Confidence: {sections.examinerSimulation.confidence}</p>
                {(sections.examinerSimulation.findings || []).slice(0, 8).map((f: any) => (
                  <div key={f.id} className="rounded-lg border border-border/60 bg-secondary/20 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{f.findingType}</Badge>
                      <Badge variant="secondary">{f.severity}</Badge>
                      <span className="text-xs font-medium">{f.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{f.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="13. Evidence & Traceability" delay={0.44}>
            <p className="mb-2 text-xs text-muted-foreground">{sections.evidenceTraceability?.note}</p>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {(sections.evidenceTraceability?.sources || []).slice(0, 30).map((s: any, idx: number) => (
                <div key={`${s.sourceType}-${s.sourceId}-${idx}`} className="flex items-center justify-between gap-2 rounded border border-border/40 px-3 py-1.5 text-[10px]">
                  <span className="text-muted-foreground">{s.sourceType} · {String(s.sourceId).slice(0, 8)}…</span>
                  <span className="text-foreground">{s.featureKey || s.publicationNumber || s.elementKey || s.title || ''}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="14. Risks and Limitations" delay={0.45}>
            <ul className="space-y-1.5">
              {(sections.risksAndLimitations?.items || []).map((item: string) => (
                <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                  {item}
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="15. Final Recommendation" delay={0.46}>
            <Badge className="mb-2">{sections.finalRecommendation?.code}</Badge>
            <p className="text-sm leading-relaxed text-muted-foreground">{sections.finalRecommendation?.narrative}</p>
          </SectionCard>

          <SectionCard title="16. Educational / Legal Disclaimer" delay={0.47}>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Educational notice</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {sections.educationalLegalDisclaimer || liveReport.report.disclaimer}
              </p>
            </div>
          </SectionCard>
        </>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.48 }}>
        <Card className="border-border p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Next Steps</h2>
          <div className="space-y-2.5">
            {(analysis.nextStepsChecklist || []).map((step) => (
              <div key={step.label} className="flex items-center gap-3">
                {step.done || (step.label.toLowerCase().includes('report') && reportReady) ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-border" />
                )}
                <span className={`text-sm ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
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
