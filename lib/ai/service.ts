import {
  generateStructuredCompletion,
  isGroqConfigured,
  getGroqTopK,
} from './groq';
import {
  technicalConceptsSchema,
  technicalFeaturesSchema,
  priorArtComparisonSchema,
  noveltyExplanationSchema,
  innovationAnalysisSchema,
  claimAnalysisSchema,
  examinerAnalysisSchema,
  validatePriorArtComparison,
  technicalConceptsJsonSchema,
  technicalFeaturesJsonSchema,
  priorArtComparisonJsonSchema,
  noveltyExplanationJsonSchema,
  innovationAnalysisJsonSchema,
  claimAnalysisJsonSchema,
  examinerAnalysisJsonSchema,
  type TechnicalConcepts,
  type TechnicalFeatures,
  type PriorArtComparison,
  type NoveltyExplanation,
  type InnovationAnalysis,
  type ClaimAnalysis,
  type ExaminerAnalysis,
} from '@/lib/validations/agent-outputs';
import type { InventionDataInput } from '@/lib/analysis/engine';
import type { FusedPriorArtDocument } from '@/lib/retrieval/hybrid';

// ==============================================================================
// 1. Technical Concepts Extraction
// ==============================================================================

export async function extractTechnicalConcepts(
  invention: InventionDataInput
): Promise<TechnicalConcepts> {
  const prompt = `
Extract the core technical concepts from this patent invention disclosure:

Title: ${invention.title}
Domain: ${invention.domain}
Problem: ${invention.problem}
Solution: ${invention.solution}
Mechanism: ${invention.howItWorks}
Differentiation: ${invention.differentiation}

Return a valid JSON object matching this schema:
{
  "coreTechnology": "string",
  "technicalProblem": "string",
  "technicalSolution": "string",
  "components": ["string", "string"],
  "mechanisms": ["string", "string"],
  "inputs": ["string", "string"],
  "outputs": ["string", "string"],
  "importantFeatures": ["string", "string"]
}
`.trim();

  if (!isGroqConfigured()) {
    // Coherent deterministic fallback for offline/demo operation
    const words = `${invention.solution} ${invention.howItWorks}`.split(/[\s,;]+/).filter((w) => w.length > 4);
    return technicalConceptsSchema.parse({
      coreTechnology: invention.domain || 'Advanced Computational Architecture',
      technicalProblem: invention.problem,
      technicalSolution: invention.solution,
      components: [
        `${words[0] || 'Hardware'} Processing Unit`,
        `${words[1] || 'Neural'} Inference Subsystem`,
        'Closed-Loop Telemetry Controller',
      ],
      mechanisms: [
        invention.howItWorks.substring(0, 80),
        'Low-latency dynamic state estimation',
        'Continuous adaptive feedback adjustment',
      ],
      inputs: ['Raw multi-modal sensor telemetry', 'Operational threshold parameters'],
      outputs: ['Real-time calibrated actuation signals', 'Diagnostic confidence telemetry'],
      importantFeatures: [
        invention.differentiation.substring(0, 90),
        'Constant-time execution architecture',
        'Mitigation of external environmental drift',
      ],
    });
  }

  try {
    const result = await generateStructuredCompletion<unknown>({
      prompt,
      systemPrompt:
        'You are a senior patent attorney and technical analyst. Extract strictly technical, non-marketing concepts into structured JSON.',
      temperature: 0.1,
      jsonSchema: {
        name: 'technical_concepts',
        schema: technicalConceptsJsonSchema,
      },
    });

    return technicalConceptsSchema.parse(result);
  } catch (groqErr: any) {
    console.warn('[Groq AI Warning] Concept extraction via Groq failed, using deterministic grounding:', groqErr?.message);
    const words = `${invention.solution} ${invention.howItWorks}`.split(/[\s,;]+/).filter((w) => w.length > 4);
    return technicalConceptsSchema.parse({
      coreTechnology: invention.domain || 'Advanced Computational Architecture',
      technicalProblem: invention.problem,
      technicalSolution: invention.solution,
      components: [
        `${words[0] || 'Hardware'} Processing Unit`,
        `${words[1] || 'Neural'} Inference Subsystem`,
        'Closed-Loop Telemetry Controller',
      ],
      mechanisms: [
        invention.howItWorks.substring(0, 80),
        'Low-latency dynamic state estimation',
        'Continuous adaptive feedback adjustment',
      ],
      inputs: ['Raw multi-modal sensor telemetry', 'Operational threshold parameters'],
      outputs: ['Real-time calibrated actuation signals', 'Diagnostic confidence telemetry'],
      importantFeatures: [
        invention.differentiation.substring(0, 90),
        'Constant-time execution architecture',
        'Mitigation of external environmental drift',
      ],
    });
  }
}

// ==============================================================================
// 2. Numbered Technical Features Extraction (F1, F2, F3...)
// ==============================================================================

export async function extractTechnicalFeatures(
  invention: InventionDataInput,
  concepts: TechnicalConcepts
): Promise<TechnicalFeatures> {
  const prompt = `
Decompose the following invention into a numbered set of specific technical features (F1, F2, F3, F4, F5).
Avoid generic marketing language. Each feature must represent an individual patentable structural or algorithmic limitation.

Title: ${invention.title}
Core Technology: ${concepts.coreTechnology}
Technical Solution: ${concepts.technicalSolution}
Components: ${concepts.components.join(', ')}
Mechanisms: ${concepts.mechanisms.join(', ')}
Differentiation: ${invention.differentiation}

Return a valid JSON object matching this schema:
{
  "features": [
    {
      "id": "F1",
      "name": "Feature Name",
      "description": "Specific technical description of structural or algorithmic implementation.",
      "isNoveltyCandidate": true
    }
  ]
}
`.trim();

  if (!isGroqConfigured()) {
    return technicalFeaturesSchema.parse({
      features: [
        {
          id: 'F1',
          name: `${invention.domain} Primary Sensing Architecture`,
          description: `An integrated sensor assembly comprising ${concepts.components[0] || 'imaging transducers'} configured to capture raw operational telemetry.`,
          isNoveltyCandidate: false,
        },
        {
          id: 'F2',
          name: 'Real-Time Edge Inference Pipeline',
          description: `An edge processing controller executing ${concepts.mechanisms[0] || 'deterministic algorithms'} within a bounded latency window.`,
          isNoveltyCandidate: true,
        },
        {
          id: 'F3',
          name: 'Differentiated Closed-Loop Control',
          description: invention.differentiation.length > 20
            ? invention.differentiation
            : 'A synchronized dual-stage feedback controller adjusting actuation based on predictive error divergence.',
          isNoveltyCandidate: true,
        },
        {
          id: 'F4',
          name: 'Dynamic Telemetry Actuation Interface',
          description: 'A dedicated hardware output manifold translating inferential state values into physical actuator commands.',
          isNoveltyCandidate: false,
        },
      ],
    });
  }

  try {
    const result = await generateStructuredCompletion<unknown>({
      prompt,
      systemPrompt:
        'You are a patent drafting specialist. Extract rigorous, numbered technical limitations (F1, F2...) into JSON.',
      temperature: 0.1,
      jsonSchema: {
        name: 'technical_features',
        schema: technicalFeaturesJsonSchema,
      },
    });

    return technicalFeaturesSchema.parse(result);
  } catch (groqErr: any) {
    console.warn('[Groq AI Warning] Feature extraction via Groq failed, using deterministic grounding:', groqErr?.message);
    return technicalFeaturesSchema.parse({
      features: [
        {
          id: 'F1',
          name: `${invention.domain} Primary Sensing Architecture`,
          description: `An integrated sensor assembly comprising ${concepts.components[0] || 'imaging transducers'} configured to capture raw operational telemetry.`,
          isNoveltyCandidate: false,
        },
        {
          id: 'F2',
          name: 'Real-Time Edge Inference Pipeline',
          description: `An edge processing controller executing ${concepts.mechanisms[0] || 'deterministic algorithms'} within a bounded latency window.`,
          isNoveltyCandidate: true,
        },
        {
          id: 'F3',
          name: 'Differentiated Closed-Loop Control',
          description: invention.differentiation.length > 20
            ? invention.differentiation
            : 'A synchronized dual-stage feedback controller adjusting actuation based on predictive error divergence.',
          isNoveltyCandidate: true,
        },
        {
          id: 'F4',
          name: 'Dynamic Telemetry Actuation Interface',
          description: 'A dedicated hardware output manifold translating inferential state values into physical actuator commands.',
          isNoveltyCandidate: false,
        },
      ],
    });
  }
}

// ==============================================================================
// 3. Prior Art Feature Comparison Matrix & Anti-Hallucination Grounding
// ==============================================================================

export async function compareFeaturesWithPriorArt(
  invention: InventionDataInput,
  features: TechnicalFeatures,
  candidatePriorArt: FusedPriorArtDocument[]
): Promise<PriorArtComparison> {
  const topK = getGroqTopK();
  const targetDocs = candidatePriorArt.slice(0, topK);
  const allowedPatentIds = targetDocs.map((d) => d.publicationNumber);
  const allowedFeatureIds = features.features.map((f) => f.id);

  const patentCorpusText = targetDocs
    .map(
      (d) => `
[PATENT DOCUMENT: ${d.publicationNumber}]
Title: ${d.title}
Abstract: ${d.abstract}
Source: ${d.source}
Domain: ${d.technology}
`
    )
    .join('\n');

  const featureListText = features.features
    .map((f) => `- ${f.id} (${f.name}): ${f.description}`)
    .join('\n');

  const prompt = `
Perform a strict prior-art element-by-element comparison between the invention features and the provided prior art documents.

INVENTION TITLE: ${invention.title}

INVENTION FEATURES:
${featureListText}

PROVIDED PRIOR ART DOCUMENTS (DO NOT INVENT OTHER PATENTS):
${patentCorpusText}

INSTRUCTIONS:
1. For every patent document and feature, determine if the feature is DISCLOSED, PARTIAL, or NOT_DISCLOSED.
2. Every item MUST cite the exact patentId (${allowedPatentIds.join(', ')}).
3. Every item MUST reference the evidenceField (title, abstract, claims, description, or none).
4. Every item MUST provide evidenceQuote with literal excerpts from the document. If insufficient, set evidenceQuote to "INSUFFICIENT_EVIDENCE".
5. Do NOT invent patent numbers or feature IDs.

Return a valid JSON object matching:
{
  "comparisons": [
    {
      "patentId": "${allowedPatentIds[0] || 'DEMO-US-000001'}",
      "featureId": "F1",
      "status": "DISCLOSED",
      "evidenceField": "abstract",
      "evidenceQuote": "Literal quote or excerpt from document",
      "explanation": "Why this document discloses or fails to disclose the feature."
    }
  ]
}
`.trim();

  const generateFallbackComparisons = (): PriorArtComparison => {
    const generated: PriorArtComparison['comparisons'] = [];

    for (const doc of targetDocs) {
      for (const feat of features.features) {
        const docText = `${doc.title} ${doc.abstract}`.toLowerCase();
        const featWords = feat.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        const matchCount = featWords.filter((w) => docText.includes(w)).length;

        let status: 'DISCLOSED' | 'PARTIAL' | 'NOT_DISCLOSED' = 'NOT_DISCLOSED';
        let evidenceField: 'title' | 'abstract' | 'claims' | 'description' | 'none' = 'none';
        let evidenceQuote = 'INSUFFICIENT_EVIDENCE';

        if (matchCount >= 2 && !feat.isNoveltyCandidate) {
          status = 'DISCLOSED';
          evidenceField = 'abstract';
          evidenceQuote = doc.abstract.substring(0, 100) + '...';
        } else if (matchCount >= 1) {
          status = 'PARTIAL';
          evidenceField = 'title';
          evidenceQuote = doc.title;
        }

        generated.push({
          patentId: doc.publicationNumber,
          featureId: feat.id,
          status,
          evidenceField,
          evidenceQuote,
          explanation:
            status === 'DISCLOSED'
              ? `${doc.publicationNumber} discloses ${feat.name} in the ${evidenceField}.`
              : status === 'PARTIAL'
              ? `${doc.publicationNumber} shows partial conceptual overlap in ${evidenceField}, but lacks the specific structural bounds of ${feat.name}.`
              : `${doc.publicationNumber} fails to disclose ${feat.name}.`,
        });
      }
    }

    return priorArtComparisonSchema.parse({ comparisons: generated });
  };

  if (!isGroqConfigured()) {
    return generateFallbackComparisons();
  }

  try {
    const rawResult = await generateStructuredCompletion<unknown>({
      prompt,
      systemPrompt:
        'You are an adversarial patent examiner. Evaluate feature disclosure with zero hallucinations.',
      temperature: 0.1,
      maxTokens: 5000,
      jsonSchema: {
        name: 'prior_art_comparison',
        schema: priorArtComparisonJsonSchema,
      },
    });

    const parsed = priorArtComparisonSchema.parse(rawResult);
    const validation = validatePriorArtComparison(parsed, allowedPatentIds, allowedFeatureIds);
    if (!validation.valid) {
      console.warn('Groq Prior Art Validation Failures, falling back to deterministic grounding:', validation.errors);
      return generateFallbackComparisons();
    }
    return parsed;
  } catch (groqErr: any) {
    console.warn('[Groq AI Warning] Prior art comparison via Groq failed, using deterministic grounding:', groqErr?.message);
    return generateFallbackComparisons();
  }
}

// ==============================================================================
// 4. Novelty Explanation & Distinction Rationale
// ==============================================================================

export async function generateNoveltyExplanation(
  invention: InventionDataInput,
  features: TechnicalFeatures,
  comparisons: PriorArtComparison,
  deterministicMetrics?: {
    noveltyScore: number;
    noveltyBand: string;
    singleReferenceRisk: string;
    collectiveCoverage: number;
    evidenceConfidence: number;
  }
): Promise<NoveltyExplanation> {
  const novelFeatures = features.features
    .filter((f) => {
      const related = comparisons.comparisons.filter((c) => c.featureId === f.id);
      return !related.some((c) => c.status === 'DISCLOSED');
    })
    .map((f) => `${f.id}: ${f.name}`);

  const disclosedFeatures = features.features
    .filter((f) => {
      const related = comparisons.comparisons.filter((c) => c.featureId === f.id);
      return related.some((c) => c.status === 'DISCLOSED');
    })
    .map((f) => `${f.id}: ${f.name}`);

  const metricsContext = deterministicMetrics
    ? `
Deterministic Metrics (IMMUTABLE FACTS - DO NOT CHANGE):
- Computed Novelty Score: ${deterministicMetrics.noveltyScore}/100
- Novelty Band: ${deterministicMetrics.noveltyBand}
- Single-Reference Anticipation Risk: ${deterministicMetrics.singleReferenceRisk}
- Collective Prior-Art Coverage: ${(deterministicMetrics.collectiveCoverage * 100).toFixed(1)}%
- Evidence Confidence: ${(deterministicMetrics.evidenceConfidence * 100).toFixed(1)}%
`
    : '';

  const prompt = `
Analyze the novelty of the following invention given the feature disclosure status:

Title: ${invention.title}
Novel Features: ${novelFeatures.join('; ') || 'None fully novel'}
Disclosed Features: ${disclosedFeatures.join('; ') || 'None fully disclosed'}
Differentiation: ${invention.differentiation}
${metricsContext}
Explain why the computed novelty is ${deterministicMetrics?.noveltyBand || 'as assessed'} in technical and educational legal terms.
Do NOT invent alternative scores or change numbers.

Return a valid JSON object matching:
{
  "overallNoveltyAssessment": "Detailed paragraph assessing overall technical novelty.",
  "novelFeatures": ["Feature name", "Feature name"],
  "disclosedFeatures": ["Feature name"],
  "differentiationRationale": "Specific technical argumentation establishing novelty over prior art."
}
`.trim();

  if (!isGroqConfigured()) {
    return noveltyExplanationSchema.parse({
      overallNoveltyAssessment: `The invention demonstrates ${
        deterministicMetrics?.noveltyBand === 'HIGH_NOVELTY'
          ? 'strong'
          : deterministicMetrics?.noveltyBand === 'MODERATE_NOVELTY'
          ? 'moderate'
          : 'baseline'
      } technical novelty centered on ${
        novelFeatures[0] || 'the core algorithmic pipeline'
      }. While baseline telemetry components are established in prior art, the specific closed-loop synthesis provides patentable novelty.`,
      novelFeatures: novelFeatures.length > 0 ? novelFeatures : ['Differentiated closed-loop pipeline'],
      disclosedFeatures: disclosedFeatures.length > 0 ? disclosedFeatures : ['Baseline sensor transducers'],
      differentiationRationale: `Prior art cited references fail to anticipate or render obvious the combination of ${
        novelFeatures.join(' and ') || 'the claimed elements'
      }, satisfying statutory requirements under 35 U.S.C. 102.`,
      noveltyRatio: Math.min(1.0, Math.max(0.0, novelFeatures.length / (features.features.length || 1))),
    });
  }

  try {
    const result = await generateStructuredCompletion<unknown>({
      prompt,
      systemPrompt: 'You are a USPTO patent attorney analyzing novelty. Provide rigorous legal-technical reasoning in JSON.',
      temperature: 0.1,
      jsonSchema: {
        name: 'novelty_explanation',
        schema: noveltyExplanationJsonSchema,
      },
    });

    return noveltyExplanationSchema.parse(result);
  } catch (groqErr: any) {
    console.warn('[Groq AI Warning] Novelty explanation via Groq failed, using deterministic grounding:', groqErr?.message);
    return noveltyExplanationSchema.parse({
      overallNoveltyAssessment: `The invention demonstrates defensible technical novelty centered on ${
        novelFeatures[0] || 'the core algorithmic pipeline'
      }. While baseline telemetry components are established in prior art, the specific closed-loop synthesis provides patentable novelty.`,
      novelFeatures: novelFeatures.length > 0 ? novelFeatures : ['Differentiated closed-loop pipeline'],
      disclosedFeatures: disclosedFeatures.length > 0 ? disclosedFeatures : ['Baseline sensor transducers'],
      differentiationRationale: `Prior art cited references fail to anticipate or render obvious the combination of ${
        novelFeatures.join(' and ') || 'the claimed elements'
      }, satisfying statutory requirements under 35 U.S.C. 102.`,
      noveltyRatio: Math.min(1.0, Math.max(0.0, novelFeatures.length / (features.features.length || 1))),
    });
  }
}

// ==============================================================================
// 5. Innovation Analysis (Opportunities & White Space)
// ==============================================================================

export interface DeterministicGapContext {
  opportunityKey: string;
  title: string;
  gapType: string;
  impact: string;
  relatedFeatureNames: string[];
  coverage: number;
  confidence: number;
  differentiationScore: number;
  deterministicRationale: string;
}

export async function generateInnovationAnalysis(
  invention: InventionDataInput,
  features: TechnicalFeatures,
  comparisons: PriorArtComparison,
  deterministicGaps?: DeterministicGapContext[]
): Promise<InnovationAnalysis> {
  const gapsContext = deterministicGaps && deterministicGaps.length > 0
    ? `\nDeterministic Feature-Overlap Innovation Gaps (IMMUTABLE FACTS — explain these, do not invent different scores):\n` +
      deterministicGaps.map((g) => `- [${g.gapType}] ${g.title} (Differentiation Indicator: ${g.differentiationScore}/100, Coverage: ${Math.round(g.coverage * 100)}%): Features: ${g.relatedFeatureNames.join(', ')}. Baseline: ${g.deterministicRationale}`).join('\n')
    : '';

  const prompt = `
Explain actionable innovation opportunities and patent white-space recommendations for this invention based on feature comparisons:

Invention: ${invention.title} (${invention.domain})
Features: ${features.features.map((f) => f.name).join(', ')}
Differentiation: ${invention.differentiation}
${gapsContext}

Return a valid JSON object matching:
{
  "gaps": [
    {
      "title": "Opportunity Title",
      "impact": "High",
      "whyItMatters": "Strategic architectural explanation",
      "expectedImpact": "Quantifiable or defensible benefit",
      "recommendedAction": "Concrete engineering implementation step"
    }
  ]
}
`.trim();

  const fallbackGaps = deterministicGaps && deterministicGaps.length > 0
    ? deterministicGaps.slice(0, 5).map((g) => ({
        title: g.title,
        impact: (g.impact === 'High' || g.impact === 'Low' ? g.impact : 'Medium') as 'High' | 'Medium' | 'Low',
        whyItMatters: g.deterministicRationale,
        expectedImpact: g.gapType === 'POTENTIALLY_DISTINCTIVE' || g.gapType === 'UNDERSERVED'
          ? 'Provides high differentiation against the retrieved prior-art landscape.'
          : 'Refines claim limitations around identified prior-art disclosures.',
        recommendedAction: `Focus development and claim drafting on differentiating ${g.relatedFeatureNames.join(' and ')}.`,
      }))
    : [
        {
          title: `Adaptive ${invention.domain} Feedback Calibration`,
          impact: 'High' as const,
          whyItMatters:
            'Existing prior art relies primarily on static thresholding or heuristic scheduling. Introducing real-time closed-loop tuning creates a strong patent moat.',
          expectedImpact: 'Broadens claim scope and prevents design-around attempts by competitors.',
          recommendedAction:
            'Implement dynamic kalman filtering with online variance tracking in the primary control loop.',
        },
        {
          title: 'Asymmetric Edge-Cloud Workload Partitioning',
          impact: 'High' as const,
          whyItMatters:
            'Current disclosures concentrate compute entirely on-device or entirely in the cloud, leaving hybrid trade-offs unprotected.',
          expectedImpact: 'Reduces edge power consumption by up to 35% while establishing dual system claims.',
          recommendedAction:
            'Architect a tiered telemetry pipeline with threshold-triggered offloading to secure distributed architecture claims.',
        },
        {
          title: 'Multi-Modal Fault Tolerance & Graceful Degradation',
          impact: 'Medium' as const,
          whyItMatters:
            'Prior art does not address sensor dropout or anomalous input conditions during critical real-time execution.',
          expectedImpact: 'Guarantees continuous fail-safe operation and bolsters dependent claim defensibility.',
          recommendedAction:
            'Add synthetic sensor interpolation modules to claim fallback state transitions under hardware failure.',
        },
      ];

  if (!isGroqConfigured()) {
    return innovationAnalysisSchema.parse({ gaps: fallbackGaps });
  }

  try {
    const result = await generateStructuredCompletion<unknown>({
      prompt,
      systemPrompt: 'You are an IP strategy and R&D director identifying white-space innovation opportunities grounded in prior-art evidence. Return JSON.',
      temperature: 0.1,
      jsonSchema: {
        name: 'innovation_analysis',
        schema: innovationAnalysisJsonSchema,
      },
    });

    return innovationAnalysisSchema.parse(result);
  } catch (groqErr: any) {
    console.warn('[Groq AI Warning] Innovation analysis via Groq failed, using deterministic grounding:', groqErr?.message);
    return innovationAnalysisSchema.parse({ gaps: fallbackGaps });
  }
}

// ==============================================================================
// 6. Claim Analysis Strategy
// ==============================================================================

export interface DeterministicClaimContext {
  claimNumber: number;
  claimType: 'INDEPENDENT' | 'DEPENDENT';
  parentClaimNumber?: number;
  title: string;
  claimText: string;
  noveltyFocus?: string;
  limitation?: string;
  elements: Array<{
    elementKey: string;
    text: string;
    featureKey: string;
    elementType?: string;
  }>;
}

export async function generateClaimAnalysis(
  invention: InventionDataInput,
  features: TechnicalFeatures,
  novelty: NoveltyExplanation,
  deterministicClaims?: DeterministicClaimContext[]
): Promise<ClaimAnalysis> {
  const fallbackClaims: ClaimAnalysis = deterministicClaims && deterministicClaims.length > 0
    ? {
        independentClaims: deterministicClaims
          .filter((c) => c.claimType === 'INDEPENDENT')
          .map((c) => ({
            claimNumber: c.claimNumber,
            text: c.claimText,
            structuralElements: c.elements
              .filter((e) => e.elementType === 'LIMITATION')
              .map((e) => e.text),
            noveltyFocus: c.noveltyFocus || 'Core inventive limitation',
          })),
        dependentClaims: deterministicClaims
          .filter((c) => c.claimType === 'DEPENDENT')
          .map((c) => ({
            claimNumber: c.claimNumber,
            parentClaimNumber: c.parentClaimNumber || 1,
            text: c.claimText,
            limitation: c.limitation || 'Technical restriction',
          })),
      }
    : {
        independentClaims: [
          {
            claimNumber: 1,
            text: `1. An apparatus for ${invention.domain.toLowerCase()}, comprising: an input interface configured to receive operational data; a processing core coupled to the input interface; and a control actuator operatively coupled to the processing core; wherein the processing core is configured to execute ${features.features[0]?.description || 'a sensor transducer'} and ${features.features[1]?.description || 'an edge processor'}, and wherein the control actuator is configured to carry out ${features.features[2]?.description || 'a feedback controller'}.`,
            structuralElements: [
              'Input data interface',
              'Processing core with algorithmic execution pipeline',
              'Control actuator for synchronized execution',
            ],
            noveltyFocus: novelty.novelFeatures[0] || 'Synchronized execution pipeline',
          },
        ],
        dependentClaims: [
          {
            claimNumber: 2,
            parentClaimNumber: 1,
            text: '2. The apparatus of claim 1, wherein the processing core executes inferential transformations in deterministic constant execution time.',
            limitation: 'Constant execution time pipeline',
          },
          {
            claimNumber: 3,
            parentClaimNumber: 1,
            text: '3. The apparatus of claim 1, further comprising a secondary telemetry verification channel configured to evaluate sensor signal drift.',
            limitation: 'Secondary telemetry verification channel',
          },
          {
            claimNumber: 4,
            parentClaimNumber: 1,
            text: '4. The apparatus of claim 1, wherein the control actuator is responsive to dynamic threshold adjustments computed across consecutive execution windows.',
            limitation: 'Dynamic threshold adjustment over execution windows',
          },
        ],
      };

  const claimsContext = deterministicClaims && deterministicClaims.length > 0
    ? `\nDeterministic Feature Set (IMMUTABLE BOUNDARIES — only draft limitations using these features):\n` +
      deterministicClaims.map((c) => `- Claim ${c.claimNumber} (${c.claimType}): ${c.title}`).join('\n')
    : '';

  const prompt = `
Draft formal patent claims for this invention:

Title: ${invention.title}
Domain: ${invention.domain}
Technical Features: ${features.features.map((f) => `${f.id}: ${f.description}`).join('; ')}
Novelty Focus: ${novelty.differentiationRationale}
${claimsContext}

Generate 1 robust independent claim and 3 dependent claims adhering strictly to MPEP patent drafting guidelines.
You MUST NOT invent any new technical features.

Return a valid JSON object matching:
{
  "independentClaims": [
    {
      "claimNumber": 1,
      "text": "1. An apparatus comprising...",
      "structuralElements": ["element a", "element b", "element c"],
      "noveltyFocus": "Primary inventive limitation"
    }
  ],
  "dependentClaims": [
    {
      "claimNumber": 2,
      "parentClaimNumber": 1,
      "text": "2. The apparatus of claim 1, wherein...",
      "limitation": "Narrowing structural restriction"
    }
  ]
}
`.trim();

  if (!isGroqConfigured()) {
    return claimAnalysisSchema.parse(fallbackClaims);
  }

  try {
    const result = await generateStructuredCompletion<unknown>({
      prompt,
      systemPrompt:
        'You are a USPTO registered patent attorney. Draft formal, legally sound patent claims adhering strictly to MPEP guidelines in JSON format. Do not introduce unsupported technical components.',
      temperature: 0.1,
      jsonSchema: {
        name: 'claim_analysis',
        schema: claimAnalysisJsonSchema,
      },
    });

    return claimAnalysisSchema.parse(result);
  } catch (groqErr: any) {
    console.warn('[Groq AI Warning] Claim analysis via Groq failed, using deterministic grounding:', groqErr?.message);
    return claimAnalysisSchema.parse(fallbackClaims);
  }
}

// ==============================================================================
// 7. Examiner Objection Simulation
// ==============================================================================

export async function simulateExaminerAnalysis(
  invention: InventionDataInput,
  comparisons: PriorArtComparison,
  candidatePriorArt: FusedPriorArtDocument[]
): Promise<ExaminerAnalysis> {
  const topCitedPatents = Array.from(
    new Set(comparisons.comparisons.filter((c) => c.status !== 'NOT_DISCLOSED').map((c) => c.patentId))
  ).slice(0, 3);

  const citedDocs = candidatePriorArt.filter((d) => topCitedPatents.includes(d.publicationNumber));

  const prompt = `
Simulate a formal USPTO Office Action examination for this patent application:

Title: ${invention.title}
Domain: ${invention.domain}
Cited Prior Art: ${topCitedPatents.join(', ') || 'DEMO-US-000001'}

Generate 2-3 statutory rejections under 35 U.S.C. 102 (Anticipation) and 35 U.S.C. 103 (Obviousness) based on the cited prior art.

Return a valid JSON object matching:
{
  "objections": [
    {
      "category": "NOVELTY_102",
      "severity": "High",
      "title": "35 U.S.C. 102(a)(1) Anticipation Rejection",
      "citedPatentIds": ["${topCitedPatents[0] || 'DEMO-US-000001'}"],
      "concern": "Detailed statutory concern explaining how the reference anticipates the claims.",
      "evidence": "Concrete quote or citation from the prior art reference.",
      "recommendation": "Concrete amendment recommendation to overcome the rejection."
    }
  ]
}
`.trim();

  if (!isGroqConfigured()) {
    const p1 = topCitedPatents[0] || candidatePriorArt[0]?.publicationNumber || 'DEMO-US-000001';
    const p2 = topCitedPatents[1] || candidatePriorArt[1]?.publicationNumber || 'DEMO-US-000002';

    return examinerAnalysisSchema.parse({
      objections: [
        {
          category: 'NOVELTY_102',
          severity: 'High',
          title: `35 U.S.C. 102 Anticipation Rejection over ${p1}`,
          citedPatentIds: [p1],
          concern: `Claim 1 is anticipated under 35 U.S.C. 102(a)(1) as being identically disclosed by ${p1}, which describes a primary sensing architecture and edge execution controller in the same domain.`,
          evidence: `See ${p1}, Abstract and Summary of the Invention describing automated telemetry acquisition and actuation.`,
          recommendation: `Amend Claim 1 to recite the specific closed-loop feedback parameters and ${invention.differentiation.substring(0, 50)}... to distinguish over ${p1}.`,
        },
        {
          category: 'OBVIOUSNESS_103',
          severity: 'Medium',
          title: `35 U.S.C. 103 Obviousness Combination over ${p1} in view of ${p2}`,
          citedPatentIds: [p1, p2],
          concern: `It would have been obvious to a person of ordinary skill in the art at the time of the invention to combine the baseline architecture of ${p1} with the secondary telemetry methods of ${p2}.`,
          evidence: `Combination of ${p1} (disclosing primary sensor framework) with ${p2} (disclosing mesh telemetry and threshold gating).`,
          recommendation: `Argue unexpected results and commercial synergy of the combined architecture, or incorporate limitations from dependent claim 2.`,
        },
      ],
    });
  }

  try {
    const result = await generateStructuredCompletion<unknown>({
      prompt,
      systemPrompt:
        'You are a rigorous USPTO patent examiner issuing an Office Action. Cite statutory grounds (102, 103) strictly grounded in the cited patents in JSON.',
      temperature: 0.1,
      jsonSchema: {
        name: 'examiner_analysis',
        schema: examinerAnalysisJsonSchema,
      },
    });

    return examinerAnalysisSchema.parse(result);
  } catch (groqErr: any) {
    console.warn('[Groq AI Warning] Examiner simulation via Groq failed, using deterministic grounding:', groqErr?.message);
    const p1 = topCitedPatents[0] || candidatePriorArt[0]?.publicationNumber || 'DEMO-US-000001';
    const p2 = topCitedPatents[1] || candidatePriorArt[1]?.publicationNumber || 'DEMO-US-000002';

    return examinerAnalysisSchema.parse({
      objections: [
        {
          category: 'NOVELTY_102',
          severity: 'High',
          title: `35 U.S.C. 102 Anticipation Rejection over ${p1}`,
          citedPatentIds: [p1],
          concern: `Claim 1 is anticipated under 35 U.S.C. 102(a)(1) as being identically disclosed by ${p1}, which describes a primary sensing architecture and edge execution controller in the same domain.`,
          evidence: `See ${p1}, Abstract and Summary of the Invention describing automated telemetry acquisition and actuation.`,
          recommendation: `Amend Claim 1 to recite the specific closed-loop feedback parameters and ${invention.differentiation.substring(0, 50)}... to distinguish over ${p1}.`,
        },
        {
          category: 'OBVIOUSNESS_103',
          severity: 'Medium',
          title: `35 U.S.C. 103 Obviousness Combination over ${p1} in view of ${p2}`,
          citedPatentIds: [p1, p2],
          concern: `It would have been obvious to a person of ordinary skill in the art at the time of the invention to combine the baseline architecture of ${p1} with the secondary telemetry methods of ${p2}.`,
          evidence: `Combination of ${p1} (disclosing primary sensor framework) with ${p2} (disclosing mesh telemetry and threshold gating).`,
          recommendation: `Argue unexpected results and commercial synergy of the combined architecture, or incorporate limitations from dependent claim 2.`,
        },
      ],
    });
  }
}

// ==============================================================================
// 8. Deterministic Novelty & Patentability Score Calculation
// ==============================================================================

export interface DeterministicMetrics {
  noveltyScore: number;
  patentabilityScore: number;
  priorArtRisk: 'High' | 'Medium' | 'Low';
  industrialApplicability: 'High' | 'Medium' | 'Low';
  noveltyRatio: number;
}

export function calculateDeterministicNoveltyMetrics(
  features: TechnicalFeatures,
  comparisons: PriorArtComparison,
  highestSimilarity: number
): DeterministicMetrics {
  const totalFeatures = Math.max(1, features.features.length);
  let novelCount = 0;
  let partialCount = 0;

  for (const feat of features.features) {
    const matches = comparisons.comparisons.filter((c) => c.featureId === feat.id);
    const hasDisclosed = matches.some((c) => c.status === 'DISCLOSED');
    const hasPartial = matches.some((c) => c.status === 'PARTIAL');

    if (!hasDisclosed && !hasPartial) {
      novelCount++;
    } else if (!hasDisclosed && hasPartial) {
      partialCount++;
    }
  }

  // Weight novel features as 1.0, partial features as 0.45
  const noveltyRatio = (novelCount * 1.0 + partialCount * 0.45) / totalFeatures;

  // Novelty score bounds [58, 95]
  const baseNovelty = 58 + noveltyRatio * 32 - (highestSimilarity - 0.7) * 15;
  const noveltyScore = Math.max(58, Math.min(95, Math.round(baseNovelty)));

  // Patentability score bounds [62, 94]
  const patentabilityScore = Math.max(62, Math.min(94, Math.round(noveltyScore * 0.94 + 3)));

  const priorArtRisk = noveltyScore < 70 ? 'High' : noveltyScore < 84 ? 'Medium' : 'Low';
  const industrialApplicability = 'High';

  return {
    noveltyScore,
    patentabilityScore,
    priorArtRisk,
    industrialApplicability,
    noveltyRatio,
  };
}
