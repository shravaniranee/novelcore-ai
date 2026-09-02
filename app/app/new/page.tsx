'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Loader2,
  Check,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Lock,
  Brain,
  Search,
  Target,
  Scale,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDemo } from '@/lib/demo-context';
import { loadingSteps, demoInvention } from '@/lib/mock-data';

const steps = [
  { num: 1, label: 'Invention' },
  { num: 2, label: 'Technical Approach' },
  { num: 3, label: 'Differentiation' },
  { num: 4, label: 'Context' },
];

const previewItems = [
  { label: 'Novelty Analysis', icon: Brain },
  { label: 'Prior-Art Search', icon: Search },
  { label: 'Innovation Gap Detection', icon: Target },
  { label: 'Patentability Assessment', icon: Scale },
];

export default function NewAnalysisPage() {
  const router = useRouter();
  const { setInvention } = useDemo();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState({
    title: demoInvention.title,
    problem: demoInvention.problem,
    solution: demoInvention.solution,
    howItWorks: demoInvention.howItWorks,
    advantages: demoInvention.advantages,
    differentiation: demoInvention.differentiation,
    domain: demoInvention.domain,
    industry: demoInvention.industry,
  });

  const canProceed = () => {
    if (step === 1) return form.title.trim() && form.problem.trim();
    if (step === 2) return form.solution.trim() && form.howItWorks.trim();
    if (step === 3) return form.advantages.trim() && form.differentiation.trim();
    if (step === 4) return form.domain && form.industry;
    return false;
  };

  const handleAnalyze = async () => {
    setInvention(form);
    setLoading(true);
    setCurrentStep(0);

    try {
      // Save invention payload to PostgreSQL database via API
      const res = await fetch('/api/inventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.warn('API save notice:', errorData.error);
      }
    } catch (err: any) {
      console.warn('Backend save notice:', err.message);
    }

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= loadingSteps.length - 1) {
          clearInterval(stepInterval);
          setTimeout(() => router.push('/app/analysis'), 500);
          return prev;
        }
        return prev + 1;
      });
    }, 380);
  };

  const loadDemo = () => {
    setForm({
      title: demoInvention.title,
      problem: demoInvention.problem,
      solution: demoInvention.solution,
      howItWorks: demoInvention.howItWorks,
      advantages: demoInvention.advantages,
      differentiation: demoInvention.differentiation,
      domain: demoInvention.domain,
      industry: demoInvention.industry,
    });
    setStep(1);
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-4xl flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full"
        >
          <div className="mb-8 flex flex-col items-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-2 rounded-full border-2 border-accent/20 border-t-accent"
              />
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mt-6 text-xl font-semibold text-foreground">
              Analyzing your invention
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              NovelCore AI is processing your submission
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Pipeline */}
            <div className="lg:col-span-2">
              <div className="space-y-2">
                {loadingSteps.map((s, i) => {
                  const done = i < currentStep;
                  const active = i === currentStep;
                  return (
                    <motion.div
                      key={s}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`flex items-center gap-3 rounded-xl border p-3.5 transition-all ${
                        done
                          ? 'border-success/20 bg-success/5'
                          : active
                          ? 'border-primary/30 bg-primary/5 shadow-glow'
                          : 'border-border bg-secondary/30'
                      }`}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full">
                        {done ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-success text-white"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </motion.div>
                        ) : active ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <div className="h-2 w-2 rounded-full border border-muted-foreground/30" />
                        )}
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          done
                            ? 'text-success'
                            : active
                            ? 'text-foreground'
                            : 'text-muted-foreground/50'
                        }`}
                      >
                        {s}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Live status panel */}
            <div>
              <Card className="border-border p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Technical Concepts
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['Computer Vision', 'Edge AI', 'Sensor Fusion', 'Automated Sorting'].map(
                    (c, i) => (
                      <motion.div
                        key={c}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + i * 0.15 }}
                      >
                        <Badge variant="secondary" className="text-[10px]">
                          {c}
                        </Badge>
                      </motion.div>
                    )
                  )}
                </div>
                <div className="mt-4 border-t border-border/60 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    IPC Classification
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {['G06V', 'B09B'].map((c, i) => (
                      <motion.div
                        key={c}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1 + i * 0.15 }}
                      >
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {c}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 border-t border-border/60 pt-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Progress
                  </p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      animate={{ width: `${((currentStep + 1) / loadingSteps.length) * 100}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    {Math.round(((currentStep + 1) / loadingSteps.length) * 100)}% complete
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Analyze a New Invention
          </h1>
          <p className="mt-1 text-muted-foreground">
            Tell NovelCore what you are building.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadDemo}>
          <Lightbulb className="mr-1.5 h-3.5 w-3.5" />
          Load Demo Invention
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="lg:col-span-2">
          {/* Progress indicator */}
          <div className="mb-6 flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.num} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                    step > s.num
                      ? 'border-success bg-success text-white'
                      : step === s.num
                      ? 'border-primary bg-primary text-white'
                      : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  {step > s.num ? <Check className="h-4 w-4" /> : s.num}
                </div>
                <div className="hidden min-w-0 flex-1 sm:block">
                  <p
                    className={`text-xs font-medium ${
                      step >= s.num ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {s.label}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 rounded-full transition-colors ${
                      step > s.num ? 'bg-success' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <Card className="border-border p-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Invention */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <div>
                    <Badge variant="secondary" className="mb-4 text-xs">
                      Step 1 — Invention
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">
                      Invention Title
                    </Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. AI-Powered Smart Waste Segregation System"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="problem" className="text-sm font-medium">
                      Problem Statement
                    </Label>
                    <Textarea
                      id="problem"
                      value={form.problem}
                      onChange={(e) => setForm({ ...form, problem: e.target.value })}
                      placeholder="What problem does your invention solve?"
                      rows={4}
                      className="text-sm"
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 2: Technical Approach */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <div>
                    <Badge variant="secondary" className="mb-4 text-xs">
                      Step 2 — Technical Approach
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="solution" className="text-sm font-medium">
                      Proposed Solution
                    </Label>
                    <Textarea
                      id="solution"
                      value={form.solution}
                      onChange={(e) => setForm({ ...form, solution: e.target.value })}
                      placeholder="How does your invention solve the problem?"
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="howItWorks" className="text-sm font-medium">
                      How It Works
                    </Label>
                    <Textarea
                      id="howItWorks"
                      value={form.howItWorks}
                      onChange={(e) => setForm({ ...form, howItWorks: e.target.value })}
                      placeholder="Describe the technical mechanism in detail."
                      rows={5}
                      className="text-sm"
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 3: Differentiation */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <div>
                    <Badge variant="secondary" className="mb-4 text-xs">
                      Step 3 — Differentiation
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="advantages" className="text-sm font-medium">
                      Key Advantages
                    </Label>
                    <Textarea
                      id="advantages"
                      value={form.advantages}
                      onChange={(e) => setForm({ ...form, advantages: e.target.value })}
                      placeholder="What are the key advantages over existing solutions?"
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="differentiation" className="text-sm font-medium">
                      What makes this approach different?
                    </Label>
                    <Textarea
                      id="differentiation"
                      value={form.differentiation}
                      onChange={(e) => setForm({ ...form, differentiation: e.target.value })}
                      placeholder="Describe the technical distinction from prior art."
                      rows={4}
                      className="text-sm"
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 4: Context */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <div>
                    <Badge variant="secondary" className="mb-4 text-xs">
                      Step 4 — Context
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Technology Domain</Label>
                    <Select value={form.domain} onValueChange={(v) => setForm({ ...form, domain: v })}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select a domain" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Computer Vision & Environmental Engineering">
                          Computer Vision & Environmental Engineering
                        </SelectItem>
                        <SelectItem value="IoT & Sensors">IoT & Sensors</SelectItem>
                        <SelectItem value="Energy & Power Systems">Energy & Power Systems</SelectItem>
                        <SelectItem value="Medical Devices">Medical Devices</SelectItem>
                        <SelectItem value="Blockchain & Distributed Systems">
                          Blockchain & Distributed Systems
                        </SelectItem>
                        <SelectItem value="Robotics & Automation">Robotics & Automation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Target Industry</Label>
                    <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select an industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Waste Management & Recycling">
                          Waste Management & Recycling
                        </SelectItem>
                        <SelectItem value="Healthcare & Medical">Healthcare & Medical</SelectItem>
                        <SelectItem value="Energy & Utilities">Energy & Utilities</SelectItem>
                        <SelectItem value="Manufacturing & Industrial">Manufacturing & Industrial</SelectItem>
                        <SelectItem value="Agriculture & Food">Agriculture & Food</SelectItem>
                        <SelectItem value="Transportation & Logistics">Transportation & Logistics</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back
              </Button>
              {step < 4 ? (
                <Button
                  size="sm"
                  onClick={() => setStep((s) => Math.min(4, s + 1))}
                  disabled={!canProceed()}
                >
                  Continue
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <Button size="sm" onClick={handleAnalyze} disabled={!canProceed()}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze Invention
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* AI Analysis Preview Panel */}
        <div>
          <Card className="sticky top-20 border-border p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">AI Analysis Preview</p>
                <p className="text-[10px] text-muted-foreground">What NovelCore will do</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {previewItems.map((item, i) => {
                const unlocked = step > i + 1 || (step === 4 && i < 4);
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                      unlocked
                        ? 'border-primary/20 bg-primary/5'
                        : 'border-border bg-secondary/30'
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-md ${
                        unlocked ? 'bg-primary/10' : 'bg-secondary'
                      }`}
                    >
                      {unlocked ? (
                        <item.icon className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Lock className="h-3 w-3 text-muted-foreground/50" />
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        unlocked ? 'text-foreground' : 'text-muted-foreground/60'
                      }`}
                    >
                      {item.label}
                    </span>
                    {unlocked && (
                      <Check className="ml-auto h-3.5 w-3.5 text-success" />
                    )}
                  </motion.div>
                );
              })}
            </div>
            <div className="mt-4 rounded-lg border border-border/60 bg-secondary/30 p-3">
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                NovelCore will analyze semantic similarity, extract technical concepts,
                and assess patentability across multiple dimensions.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/30 p-3 text-xs text-muted-foreground">
        <Badge variant="secondary" className="text-[10px]">Demo</Badge>
        Prefilled with a realistic example. Click "Load Demo Invention" to reset.
      </div>
    </div>
  );
}
