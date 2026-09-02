'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Info,
  ArrowRight,
  FileText,
  Globe,
  X,
  Brain,
  AlertTriangle,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDemo } from '@/lib/demo-context';
import { toast } from 'sonner';
import type { PriorArtResult } from '@/lib/mock-data';

const overlapConfig = {
  High: { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20' },
  Medium: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
  Low: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
};

function getOverlapLevel(sim: number): 'High' | 'Medium' | 'Low' {
  if (sim >= 80) return 'High';
  if (sim >= 65) return 'Medium';
  return 'Low';
}

export default function PriorArtPage() {
  const { analysis } = useDemo();
  const [simFilter, setSimFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [techFilter, setTechFilter] = useState('all');
  const [jurisdiction, setJurisdiction] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<PriorArtResult | null>(null);

  if (!analysis || !analysis.priorArt || analysis.priorArt.length === 0) {
    return (
      <div className="mx-auto max-w-7xl py-12">
        <Card className="border-dashed border-border p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Search className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">No Prior Art Available</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Run an analysis to retrieve, score, and rank prior art documents from PostgreSQL and pgvector.
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

  let results = analysis.priorArt;
  if (simFilter !== 'all') {
    const min = simFilter === 'high' ? 80 : simFilter === 'medium' ? 65 : 0;
    results = results.filter((r) => r.similarity >= min);
  }
  if (yearFilter !== 'all') {
    results = results.filter((r) => r.year.toString() === yearFilter);
  }
  if (techFilter !== 'all') {
    results = results.filter((r) => r.technology.includes(techFilter));
  }
  if (jurisdiction !== 'all') {
    results = results.filter((r) => r.jurisdiction === jurisdiction);
  }
  if (searchQuery) {
    results = results.filter((r) =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.technology.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const highRelevance = analysis.priorArt.filter((r) => r.similarity >= 75).length;
  const conflicts = analysis.priorArt.filter((r) => r.similarity >= 80).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Semantic Prior-Art Search
        </h1>
        <p className="mt-1 text-muted-foreground">
          Find technically similar inventions based on meaning, not just keywords.
        </p>
      </motion.div>

      {/* Demo Data Banner */}
      <div className="flex items-center gap-2 rounded-xl border border-warning/20 bg-warning/5 p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 text-warning" />
        <span>
          <strong className="text-warning">Prototype / Demo Data</strong> — These
          are illustrative results generated for demonstration purposes, not live
          patent database results.
        </span>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">47</p>
              <p className="text-xs text-muted-foreground">Related documents analyzed</p>
            </div>
          </div>
        </Card>
        <Card className="border-border p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <CheckCircle2 className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{highRelevance}</p>
              <p className="text-xs text-muted-foreground">High-relevance results</p>
            </div>
          </div>
        </Card>
        <Card className="border-border p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{conflicts}</p>
              <p className="text-xs text-muted-foreground">Potential prior-art conflicts</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search + Filters */}
      <Card className="border-border p-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search technical concepts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Filters
            </div>
            <Select value={simFilter} onValueChange={setSimFilter}>
              <SelectTrigger className="w-[140px] text-xs">
                <SelectValue placeholder="Similarity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Similarity</SelectItem>
                <SelectItem value="high">High (80%+)</SelectItem>
                <SelectItem value="medium">Medium (65%+)</SelectItem>
                <SelectItem value="low">Low (50%+)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[120px] text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
                <SelectItem value="2021">2021</SelectItem>
                <SelectItem value="2020">2020</SelectItem>
                <SelectItem value="2019">2019</SelectItem>
                <SelectItem value="2018">2018</SelectItem>
              </SelectContent>
            </Select>
            <Select value={techFilter} onValueChange={setTechFilter}>
              <SelectTrigger className="w-[180px] text-xs">
                <SelectValue placeholder="Technology" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technologies</SelectItem>
                <SelectItem value="Computer Vision">Computer Vision</SelectItem>
                <SelectItem value="Robotics">Robotics</SelectItem>
                <SelectItem value="Deep Learning">Deep Learning</SelectItem>
                <SelectItem value="NIR">NIR Spectroscopy</SelectItem>
                <SelectItem value="Inductive">Inductive Sensing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={jurisdiction} onValueChange={setJurisdiction}>
              <SelectTrigger className="w-[120px] text-xs">
                <SelectValue placeholder="Jurisdiction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="US">US</SelectItem>
                <SelectItem value="EP">EP</SelectItem>
                <SelectItem value="WO">WO</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {results.length} result{results.length !== 1 ? 's' : ''} found
        </p>
        {results.length === 0 ? (
          <Card className="flex flex-col items-center justify-center border-dashed border-border py-16 text-center">
            <Search className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <h3 className="text-base font-semibold text-foreground">No relevant prior art found</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              No matching prior art documents for the active filters or query.
            </p>
          </Card>
        ) : (
          results.map((pa, i) => {
          const overlap = getOverlapLevel(pa.similarity);
          const ocfg = overlapConfig[overlap];
          return (
            <motion.div
              key={pa.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Card
                className="cursor-pointer border-border p-5 transition-all hover:border-primary/30 hover:shadow-premium"
                onClick={() => setSelected(pa)}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {/* Similarity ring */}
                  <div className="flex shrink-0 flex-col items-center">
                    <div className="relative flex h-16 w-16 items-center justify-center">
                      <svg className="-rotate-90" width="64" height="64">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(220 24% 90%)" strokeWidth="5" />
                        <motion.circle
                          cx="32"
                          cy="32"
                          r="28"
                          fill="none"
                          stroke={pa.similarity >= 80 ? 'hsl(0 84% 60%)' : pa.similarity >= 65 ? 'hsl(38 92% 50%)' : 'hsl(142 71% 45%)'}
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 28}
                          initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 28 - (pa.similarity / 100) * 2 * Math.PI * 28 }}
                          transition={{ duration: 1, delay: 0.3 + i * 0.08 }}
                        />
                      </svg>
                      <span className="absolute text-sm font-bold text-foreground">{pa.similarity}%</span>
                    </div>
                    <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Similarity
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          {pa.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {pa.source}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {pa.jurisdiction}
                          </span>
                          <span>{pa.year}</span>
                          <Badge variant="outline" className="text-[10px]">{pa.technology}</Badge>
                          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${ocfg.bg} ${ocfg.color}`}>
                            Technical Overlap: {overlap}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {pa.explanation}
                    </p>
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs font-medium text-foreground">Key Overlapping Concepts</p>
                      <div className="flex flex-wrap gap-1.5">
                        {pa.overlap.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
                      View detailed analysis
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        }))}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">
              Prior-Art Detail Analysis
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-foreground">{selected.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {selected.source}
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {selected.jurisdiction}
                  </span>
                  <span>{selected.year}</span>
                  <Badge variant="outline" className="text-[10px]">{selected.technology}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Semantic Similarity
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{selected.similarity}%</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className={`h-full rounded-full ${selected.similarity >= 80 ? 'bg-destructive' : selected.similarity >= 65 ? 'bg-warning' : 'bg-success'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${selected.similarity}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Technical Overlap
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{getOverlapLevel(selected.similarity)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selected.similarity >= 80
                      ? 'Significant overlap detected'
                      : selected.similarity >= 65
                      ? 'Moderate overlap with distinctions'
                      : 'Limited overlap'}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Key Overlapping Concepts
                </p>
                <div className="flex flex-wrap gap-2">
                  {selected.overlap.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">AI Differentiation Analysis</p>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {selected.explanation}
                </p>
                <div className="mt-3 border-t border-primary/10 pt-3">
                  <p className="text-xs font-medium text-foreground">Potential Differentiation</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Your invention&apos;s adaptive confidence scoring and multi-sensor fusion
                    architecture are not present in this prior art. Emphasize these mechanisms
                    in your claims to establish inventive step.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Link href="/app/innovation" onClick={() => setSelected(null)}>
                  <Button size="sm">
                    Analyze Innovation Gap
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Next step */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setSimFilter('all');
            setYearFilter('all');
            setTechFilter('all');
            setJurisdiction('all');
            setSearchQuery('');
            toast.success('Filters reset.');
          }}
        >
          Reset Filters
        </Button>
        <Link href="/app/innovation">
          <Button>
            Analyze Innovation Gap
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
