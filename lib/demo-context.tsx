'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import {
  demoAnalysis,
  demoInvention,
  type AnalysisData,
  type InventionInput,
  type InnovationOpportunity,
} from '@/lib/mock-data';

interface DemoContextValue {
  invention: InventionInput;
  setInvention: (i: InventionInput) => void;
  analysis: AnalysisData;
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

export function DemoProvider({ children }: { children: ReactNode }) {
  const [invention, setInvention] = useState<InventionInput>(demoInvention);
  const [opportunities, setOpportunities] = useState<InnovationOpportunity[]>(
    demoAnalysis.opportunities
  );
  const [acceptedClaims, setAcceptedClaims] = useState<string[]>([]);
  const [resolvedObjections, setResolvedObjections] = useState<string[]>([]);
  const [reportGenerated, setReportGenerated] = useState(false);

  const claimStrength = acceptedClaims.includes('1') ? 84 : 68;
  const patentReadiness = acceptedClaims.includes('1') ? 84 : 76;

  const analysis: AnalysisData = {
    ...demoAnalysis,
    opportunities,
  };

  const applyOpportunity = (id: string) => {
    setOpportunities((prev) =>
      prev.map((o) => (o.id === id ? { ...o, applied: true } : o))
    );
  };

  const acceptClaim = (id: string) => {
    setAcceptedClaims((prev) => [...prev, id]);
  };

  const resolveObjection = (id: string) => {
    setResolvedObjections((prev) => [...prev, id]);
  };

  const resetDemo = () => {
    setInvention(demoInvention);
    setOpportunities(demoAnalysis.opportunities);
    setAcceptedClaims([]);
    setResolvedObjections([]);
    setReportGenerated(false);
  };

  return (
    <DemoContext.Provider
      value={{
        invention,
        setInvention,
        analysis,
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
