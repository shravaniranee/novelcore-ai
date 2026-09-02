import { z } from 'zod';

// ==============================================================================
// 1. Technical Concepts Extraction Schema
// ==============================================================================

export const technicalConceptsSchema = z.object({
  coreTechnology: z.string().min(3, 'Core technology is required'),
  technicalProblem: z.string().min(5, 'Technical problem statement is required'),
  technicalSolution: z.string().min(5, 'Technical solution statement is required'),
  components: z.array(z.string()).min(1, 'At least 1 technical component is required'),
  mechanisms: z.array(z.string()).min(1, 'At least 1 operating mechanism is required'),
  inputs: z.array(z.string()).min(1, 'At least 1 system input is required'),
  outputs: z.array(z.string()).min(1, 'At least 1 system output is required'),
  importantFeatures: z.array(z.string()).min(1, 'At least 1 important feature is required'),
});

export type TechnicalConcepts = z.infer<typeof technicalConceptsSchema>;

// ==============================================================================
// 2. Numbered Technical Features Schema (F1, F2, F3...)
// ==============================================================================

export const technicalFeatureItemSchema = z.object({
  id: z.string().regex(/^F\d+$/, 'Feature ID must follow format F1, F2, F3...'),
  name: z.string().min(3, 'Feature name is required'),
  description: z.string().min(5, 'Specific technical description is required'),
  isNoveltyCandidate: z.boolean().default(true),
});

export const technicalFeaturesSchema = z.object({
  features: z.array(technicalFeatureItemSchema).min(2, 'At least 2 technical features required'),
});

export type TechnicalFeatureItem = z.infer<typeof technicalFeatureItemSchema>;
export type TechnicalFeatures = z.infer<typeof technicalFeaturesSchema>;

// ==============================================================================
// 3. Prior Art Feature Comparison Schema & Anti-Hallucination Grounding
// ==============================================================================

export const disclosureStatusEnum = z.enum(['DISCLOSED', 'PARTIAL', 'NOT_DISCLOSED']);
export type DisclosureStatus = z.infer<typeof disclosureStatusEnum>;

export const evidenceFieldEnum = z.enum(['title', 'abstract', 'claims', 'description', 'none']);
export type EvidenceField = z.infer<typeof evidenceFieldEnum>;

export const priorArtComparisonItemSchema = z.object({
  patentId: z.string().min(1, 'Patent publication number or ID is required'),
  featureId: z.string().regex(/^F\d+$/, 'Feature ID must follow format F1, F2...'),
  status: disclosureStatusEnum,
  evidenceField: evidenceFieldEnum,
  evidenceQuote: z.string().min(1, 'Evidence reference text or INSUFFICIENT_EVIDENCE is required'),
  explanation: z.string().min(5, 'Comparison explanation is required'),
});

export const priorArtComparisonSchema = z.object({
  comparisons: z.array(priorArtComparisonItemSchema).min(1, 'At least 1 feature comparison required'),
});

export type PriorArtComparisonItem = z.infer<typeof priorArtComparisonItemSchema>;
export type PriorArtComparison = z.infer<typeof priorArtComparisonSchema>;

/**
 * Validates prior art comparisons against actual PostgreSQL documents and extracted features.
 * Strictly prevents model from inventing/hallucinating non-existent patent IDs or feature IDs.
 */
export function validatePriorArtComparison(
  data: PriorArtComparison,
  allowedPatentIds: string[],
  allowedFeatureIds: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const patentSet = new Set(allowedPatentIds.map((id) => id.toUpperCase()));
  const featureSet = new Set(allowedFeatureIds);

  for (let i = 0; i < data.comparisons.length; i++) {
    const item = data.comparisons[i];

    // Check patent ID existence
    if (!patentSet.has(item.patentId.toUpperCase())) {
      errors.push(
        `Comparison #${i + 1}: Hallucinated patent ID "${item.patentId}". Must be one of: ${allowedPatentIds.join(', ')}`
      );
    }

    // Check feature ID existence
    if (!featureSet.has(item.featureId)) {
      errors.push(
        `Comparison #${i + 1}: Invalid feature ID "${item.featureId}". Must be one of: ${allowedFeatureIds.join(', ')}`
      );
    }

    // Grounding & Evidence Check
    if (item.status === 'DISCLOSED' || item.status === 'PARTIAL') {
      if (item.evidenceField === 'none') {
        errors.push(
          `Comparison #${i + 1} (${item.patentId} vs ${item.featureId}): Status is ${item.status} but evidenceField is "none"`
        );
      }
      if (!item.evidenceQuote || item.evidenceQuote.trim() === '') {
        errors.push(
          `Comparison #${i + 1} (${item.patentId} vs ${item.featureId}): Missing evidence citation or quotation.`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ==============================================================================
// 4. Novelty Explanation Schema
// ==============================================================================

export const noveltyExplanationSchema = z.object({
  overallNoveltyAssessment: z.string().min(10, 'Novelty assessment is required'),
  novelFeatures: z.array(z.string()).min(1, 'At least 1 novel feature required'),
  disclosedFeatures: z.array(z.string()).default([]),
  differentiationRationale: z.string().min(10, 'Technical differentiation rationale is required'),
  noveltyRatio: z.number().min(0).max(1).optional(),
});

export type NoveltyExplanation = z.infer<typeof noveltyExplanationSchema>;

// ==============================================================================
// 5. Innovation Analysis Schema (Gaps & Opportunities)
// ==============================================================================

export const innovationOpportunityItemSchema = z.object({
  title: z.string().min(3, 'Opportunity title is required'),
  impact: z.enum(['High', 'Medium', 'Low']).default('Medium'),
  whyItMatters: z.string().min(10, 'Strategic justification is required'),
  expectedImpact: z.string().min(5, 'Expected architectural impact is required'),
  recommendedAction: z.string().min(10, 'Concrete engineering/patent recommendation is required'),
});

export const innovationAnalysisSchema = z.object({
  gaps: z.array(innovationOpportunityItemSchema).min(1, 'At least 1 innovation gap is required'),
});

export type InnovationAnalysis = z.infer<typeof innovationAnalysisSchema>;

// ==============================================================================
// 6. Claim Analysis Schema (Independent and Dependent Claims)
// ==============================================================================

export const independentClaimSchema = z.object({
  claimNumber: z.number().int().positive(),
  text: z.string().min(20, 'Independent claim text must be formal patent claim language'),
  structuralElements: z.array(z.string()).min(1, 'At least 1 structural element required'),
  noveltyFocus: z.string().min(5, 'Novelty focus must be articulated'),
});

export const dependentClaimSchema = z.object({
  claimNumber: z.number().int().positive(),
  parentClaimNumber: z.number().int().positive(),
  text: z.string().min(15, 'Dependent claim text must reference parent claim'),
  limitation: z.string().min(5, 'Narrowing technical limitation is required'),
});

export const claimAnalysisSchema = z.object({
  independentClaims: z.array(independentClaimSchema).min(1, 'At least 1 independent claim required'),
  dependentClaims: z.array(dependentClaimSchema).default([]),
});

export type ClaimAnalysis = z.infer<typeof claimAnalysisSchema>;

// ==============================================================================
// 7. Examiner Analysis Schema (Statutory 102/103 Objections)
// ==============================================================================

export const objectionCategoryEnum = z.enum([
  'NOVELTY_102',
  'OBVIOUSNESS_103',
  'ENABLEMENT_112',
  'DEFINITENESS_112',
]);

export const examinerObjectionItemSchema = z.object({
  category: objectionCategoryEnum,
  severity: z.enum(['High', 'Medium', 'Low']).default('Medium'),
  title: z.string().min(5, 'Objection title is required'),
  citedPatentIds: z.array(z.string()).default([]),
  concern: z.string().min(10, 'Statutory concern must be clearly articulated'),
  evidence: z.string().min(5, 'Grounded reference to prior art evidence required'),
  recommendation: z.string().min(10, 'Actionable response/amendment recommendation required'),
});

export const examinerAnalysisSchema = z.object({
  objections: z.array(examinerObjectionItemSchema).min(1, 'At least 1 examiner review required'),
});

export type ExaminerAnalysis = z.infer<typeof examinerAnalysisSchema>;

// ==============================================================================
// Legacy Compatibility: Idea Decomposition Schema
// ==============================================================================

export const ideaDecompositionSchema = z.preprocess((val: any) => {
  if (!val || typeof val !== 'object') return val;

  let target = val;
  if (target.decomposition && typeof target.decomposition === 'object') {
    target = target.decomposition;
  } else if (target.output && typeof target.output === 'object') {
    target = target.output;
  } else if (target.invention && typeof target.invention === 'object') {
    target = target.invention;
  }

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

// ==============================================================================
// 8. Strict JSON Schemas for Groq Structured Outputs (Part F)
// All properties required, additionalProperties: false, nullable optional values
// ==============================================================================

export const technicalConceptsJsonSchema = {
  type: 'object',
  properties: {
    coreTechnology: { type: 'string' },
    technicalProblem: { type: 'string' },
    technicalSolution: { type: 'string' },
    components: { type: 'array', items: { type: 'string' } },
    mechanisms: { type: 'array', items: { type: 'string' } },
    inputs: { type: 'array', items: { type: 'string' } },
    outputs: { type: 'array', items: { type: 'string' } },
    importantFeatures: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'coreTechnology',
    'technicalProblem',
    'technicalSolution',
    'components',
    'mechanisms',
    'inputs',
    'outputs',
    'importantFeatures',
  ],
  additionalProperties: false,
};

export const technicalFeaturesJsonSchema = {
  type: 'object',
  properties: {
    features: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          isNoveltyCandidate: { type: 'boolean' },
        },
        required: ['id', 'name', 'description', 'isNoveltyCandidate'],
        additionalProperties: false,
      },
    },
  },
  required: ['features'],
  additionalProperties: false,
};

export const priorArtComparisonJsonSchema = {
  type: 'object',
  properties: {
    comparisons: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          patentId: { type: 'string' },
          featureId: { type: 'string' },
          status: { type: 'string', enum: ['DISCLOSED', 'PARTIAL', 'NOT_DISCLOSED'] },
          evidenceField: { type: 'string', enum: ['title', 'abstract', 'claims', 'description', 'none'] },
          evidenceQuote: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['patentId', 'featureId', 'status', 'evidenceField', 'evidenceQuote', 'explanation'],
        additionalProperties: false,
      },
    },
  },
  required: ['comparisons'],
  additionalProperties: false,
};

export const noveltyExplanationJsonSchema = {
  type: 'object',
  properties: {
    overallNoveltyAssessment: { type: 'string' },
    novelFeatures: { type: 'array', items: { type: 'string' } },
    disclosedFeatures: { type: 'array', items: { type: 'string' } },
    differentiationRationale: { type: 'string' },
    noveltyRatio: { type: ['number', 'null'] },
  },
  required: [
    'overallNoveltyAssessment',
    'novelFeatures',
    'disclosedFeatures',
    'differentiationRationale',
    'noveltyRatio',
  ],
  additionalProperties: false,
};

export const innovationAnalysisJsonSchema = {
  type: 'object',
  properties: {
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          impact: { type: 'string', enum: ['High', 'Medium', 'Low'] },
          whyItMatters: { type: 'string' },
          expectedImpact: { type: 'string' },
          recommendedAction: { type: 'string' },
        },
        required: ['title', 'impact', 'whyItMatters', 'expectedImpact', 'recommendedAction'],
        additionalProperties: false,
      },
    },
  },
  required: ['gaps'],
  additionalProperties: false,
};

export const claimAnalysisJsonSchema = {
  type: 'object',
  properties: {
    independentClaims: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          claimNumber: { type: 'integer' },
          text: { type: 'string' },
          structuralElements: { type: 'array', items: { type: 'string' } },
          noveltyFocus: { type: 'string' },
        },
        required: ['claimNumber', 'text', 'structuralElements', 'noveltyFocus'],
        additionalProperties: false,
      },
    },
    dependentClaims: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          claimNumber: { type: 'integer' },
          parentClaimNumber: { type: 'integer' },
          text: { type: 'string' },
          limitation: { type: 'string' },
        },
        required: ['claimNumber', 'parentClaimNumber', 'text', 'limitation'],
        additionalProperties: false,
      },
    },
  },
  required: ['independentClaims', 'dependentClaims'],
  additionalProperties: false,
};

export const examinerAnalysisJsonSchema = {
  type: 'object',
  properties: {
    objections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['NOVELTY_102', 'OBVIOUSNESS_103', 'ENABLEMENT_112', 'DEFINITENESS_112'],
          },
          severity: { type: 'string', enum: ['High', 'Medium', 'Low'] },
          title: { type: 'string' },
          citedPatentIds: { type: 'array', items: { type: 'string' } },
          concern: { type: 'string' },
          evidence: { type: 'string' },
          recommendation: { type: 'string' },
        },
        required: ['category', 'severity', 'title', 'citedPatentIds', 'concern', 'evidence', 'recommendation'],
        additionalProperties: false,
      },
    },
  },
  required: ['objections'],
  additionalProperties: false,
};

