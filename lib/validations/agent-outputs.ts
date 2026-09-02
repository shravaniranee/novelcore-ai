import { z } from 'zod';

export const ideaDecompositionSchema = z.preprocess((val: any) => {
  if (!val || typeof val !== 'object') return val;

  // 1. Unwrap nested keys if model returns { "decomposition": { ... } } or similar
  let target = val;
  if (target.decomposition && typeof target.decomposition === 'object') {
    target = target.decomposition;
  } else if (target.output && typeof target.output === 'object') {
    target = target.output;
  } else if (target.invention && typeof target.invention === 'object') {
    target = target.invention;
  }

  // 2. Normalize key aliases (snake_case, PascalCase, or abbreviated keys)
  const normalized: Record<string, any> = {};

  for (const rawKey of Object.keys(target)) {
    const camelKey = rawKey
      .replace(/_([a-z])/g, (_, l) => l.toUpperCase())
      .replace(/^[A-Z]/, (l) => l.toLowerCase());

    const value = target[rawKey];

    if (camelKey === 'essence' || camelKey === 'technicalSummary' || camelKey === 'summary') {
      normalized['technicalEssence'] = value;
    } else if (camelKey === 'concepts' || camelKey === 'coreConcept') {
      normalized['coreConcepts'] = Array.isArray(value) ? value : [value];
    } else if (camelKey === 'features' || camelKey === 'technicalFeature') {
      normalized['technicalFeatures'] = Array.isArray(value) ? value : [value];
    } else if (camelKey === 'differentiators' || camelKey === 'differentiatingFeature') {
      normalized['differentiatingFeatures'] = Array.isArray(value) ? value : [value];
    } else if (camelKey === 'keywords' || camelKey === 'technicalKeyword') {
      normalized['technicalKeywords'] = Array.isArray(value) ? value : [value];
    } else if (camelKey === 'ipc' || camelKey === 'ipcCode' || camelKey === 'cpcCodes') {
      normalized['ipcCodes'] = Array.isArray(value) ? value : [value];
    } else {
      normalized[camelKey] = value;
    }
  }

  // Ensure default array for constraints if omitted
  if (!normalized['constraints']) {
    normalized['constraints'] = [];
  }

  return normalized;
}, z.object({
  technicalEssence: z.string().min(5, 'Technical essence must be a formal technical summary.'),
  coreConcepts: z.array(z.string()).min(1, 'At least 1 core concept required.'),
  technicalFeatures: z.array(z.string()).min(1, 'At least 1 technical feature required.'),
  constraints: z.array(z.string()).default([]),
  differentiatingFeatures: z.array(z.string()).min(1, 'At least 1 differentiating feature required.'),
  technicalKeywords: z.array(z.string()).min(1, 'At least 1 technical keyword required.'),
  ipcCodes: z.array(z.string()).min(1, 'At least 1 IPC/CPC code required.'),
}));

export type IdeaDecompositionOutput = z.infer<typeof ideaDecompositionSchema>;
