'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  demoInvention,
  type AnalysisData,
  type InventionInput,
  type InnovationOpportunity,
} from '@/lib/mock-data';

interface DemoContextValue {
  hasAnalysis: boolean;
  invention: InventionInput;
  setInvention: (i: InventionInput) => void;
  analysis: AnalysisData | null;
  setAnalysis: (a: AnalysisData | null) => void;
  applyOpportunity: (id: string) => void;
  acceptClaim: (id: string) => void;
  acceptedClaims: string[];
  resolvedObjections: string[];
  resolveObjection: (id: string) => void;
  claimStrength: number;
  patentReadiness: number;
  reportGenerated: boolean;
  setReportGenerated: (v: boolean) => void;
  resetDemo: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

const STORAGE_KEY_ANALYSIS = 'novelcore_demo_analysis';
const STORAGE_KEY_INVENTION = 'novelcore_demo_invention';

export function DemoProvider({ children }: { children: ReactNode }) {
  const [invention, setInventionState] = useState<InventionInput>(demoInvention);
  // Default to null: Never fabricate completed analysis state if database has none (Part M)
  const [activeAnalysis, setActiveAnalysisState] = useState<AnalysisData | null>(null);
  const [opportunities, setOpportunities] = useState<InnovationOpportunity[]>([]);
  const [acceptedClaims, setAcceptedClaims] = useState<string[]>([]);
  const [resolvedObjections, setResolvedObjections] = useState<string[]>([]);
  const [reportGenerated, setReportGenerated] = useState(false);

  // Sync from PostgreSQL database as primary source of truth
  useEffect(() => {
    let isMounted = true;

    async function syncFromDatabase() {
      try {
        const res = await fetch('/api/analysis/latest');
        if (res.ok) {
          const data = await res.json();
          if (data.found && data.analysis && isMounted) {
            setInventionState(data.invention);
            setActiveAnalysisState(data.analysis);
            if (data.analysis.opportunities) {
              setOpportunities(data.analysis.opportunities);
            }
            try {
              localStorage.setItem(STORAGE_KEY_INVENTION, JSON.stringify(data.invention));
              localStorage.setItem(STORAGE_KEY_ANALYSIS, JSON.stringify(data.analysis));
            } catch {}
            return;
          } else if (isMounted) {
            // Database contains NO completed analysis: clear state and remove stale localStorage
            setActiveAnalysisState(null);
            setOpportunities([]);
            try {
              localStorage.removeItem(STORAGE_KEY_ANALYSIS);
            } catch {}
            return;
          }
        }
      } catch {
        // Fall back to localStorage only if network error occurred
      }

      try {
        const savedInvention = localStorage.getItem(STORAGE_KEY_INVENTION);
        if (savedInvention && isMounted) {
          setInventionState(JSON.parse(savedInvention));
        }
        const savedAnalysis = localStorage.getItem(STORAGE_KEY_ANALYSIS);
        if (savedAnalysis && isMounted) {
          const parsed = JSON.parse(savedAnalysis);
          // Only restore if valid persisted data with a title
          if (parsed && parsed.title) {
            setActiveAnalysisState(parsed);
            if (parsed.opportunities) {
              setOpportunities(parsed.opportunities);
            }
          }
        }
      } catch {}
    }

    syncFromDatabase();

    return () => {
      isMounted = false;
    };
  }, []);

  const setInvention = (i: InventionInput) => {
    setInventionState(i);
    try {
      localStorage.setItem(STORAGE_KEY_INVENTION, JSON.stringify(i));
    } catch {}
  };

  const setAnalysis = (a: AnalysisData | null) => {
    setActiveAnalysisState(a);
    if (a?.opportunities) {
      setOpportunities(a.opportunities);
    } else {
      setOpportunities([]);
    }
    try {
      if (a) {
        localStorage.setItem(STORAGE_KEY_ANALYSIS, JSON.stringify(a));
      } else {
        localStorage.removeItem(STORAGE_KEY_ANALYSIS);
      }
    } catch {}
  };

  const hasAnalysis = Boolean(activeAnalysis && activeAnalysis.title);

  const claimStrength =
    activeAnalysis && acceptedClaims.length > 0
      ? Math.min(96, (activeAnalysis.claimStrength || 72) + 12)
      : activeAnalysis?.claimStrength || 0;

  const patentReadiness =
    activeAnalysis && acceptedClaims.length > 0
      ? Math.min(98, (activeAnalysis.patentReadiness || 76) + 8)
      : activeAnalysis?.patentReadiness || 0;

  const analysis: AnalysisData | null = activeAnalysis
    ? {
        ...activeAnalysis,
        opportunities,
      }
    : null;

  const applyOpportunity = (id: string) => {
    setOpportunities((prev) => {
      const updated = prev.map((o) => (o.id === id ? { ...o, applied: true } : o));
      if (activeAnalysis) {
        try {
          const full = { ...activeAnalysis, opportunities: updated };
          localStorage.setItem(STORAGE_KEY_ANALYSIS, JSON.stringify(full));
        } catch {}
      }
      return updated;
    });
  };

  const acceptClaim = (id: string) => {
    setAcceptedClaims((prev) => [...prev, id]);
  };

  const resolveObjection = (id: string) => {
    setResolvedObjections((prev) => [...prev, id]);
  };

  const resetDemo = () => {
    setInventionState(demoInvention);
    setActiveAnalysisState(null);
    setOpportunities([]);
    setAcceptedClaims([]);
    setResolvedObjections([]);
    setReportGenerated(false);
    try {
      localStorage.removeItem(STORAGE_KEY_INVENTION);
      localStorage.removeItem(STORAGE_KEY_ANALYSIS);
    } catch {}
  };

  return (
    <DemoContext.Provider
      value={{
        hasAnalysis,
        invention,
        setInvention,
        analysis,
        setAnalysis,
        applyOpportunity,
        acceptClaim,
        acceptedClaims,
        resolvedObjections,
        resolveObjection,
        claimStrength,
        patentReadiness,
        reportGenerated,
        setReportGenerated,
        resetDemo,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
}
