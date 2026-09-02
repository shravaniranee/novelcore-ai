# Implementation Plan — Phase 8: Evidence-Grounded Innovation Gap Engine

## 1. Current Architecture Audit Findings

### A. Existing Relational Data in PostgreSQL
1. **`InventionFeature` (`invention_features`)**:
   - Fields: `id`, `analysisRunId`, `inventionId`, `featureKey` (`F1`, `F2`...), `name`, `description`, `order`, `source`, `isNovelty`.
   - Guaranteed unique per `(analysisRunId, featureKey)`.
2. **`PriorArtDocument` (`prior_art_documents`)**:
   - Fields: `id`, `externalId`, `publicationNumber`, `title`, `abstract`, `claimsText`, `description`, `source` (`DEMO`).
3. **`FeatureOverlapMatrixEntry` (`feature_overlap_matrix_entries`)**:
   - Relational rows representing the authoritative feature-level disclosure evidence layer.
   - Fields: `analysisRunId`, `inventionId`, `priorArtDocumentId`, `featureId` (e.g. `F1`), `featureRecordId`, `overlapStatus` (`DISCLOSED` | `PARTIAL` | `NOT_DISCLOSED` | `INSUFFICIENT_EVIDENCE`), `evidence`, `evidenceSource`, `confidence`.
   - Unique on `(analysisRunId, priorArtDocumentId, featureId)`.
4. **`NoveltyAssessment` & `NoveltyReferenceAssessment`**:
   - Deterministic novelty baseline from Phase 7 with single-reference anticipation separated from collective coverage.
5. **Existing `AnalysisOpportunity` (`analysis_opportunities`)**:
   - Currently has fields: `id`, `inventionId`, `analysisRunId`, `title`, `impact`, `whyItMatters`, `expectedImpact`, `recommendedAction`, `applied`, `appliedAt`, `createdAt`.
   - Missing fields for Phase 8: `gapType`, `opportunityKey`, `relatedFeatureKeys`, `supportingPriorArtIds`, `coverage`, `confidence`, `differentiationScore`, `evidenceDetails`, `limitations`, `explanation`, `explanationProvenance`.

---

## 2. Controlled Innovation Gap Types & Deterministic Classification

We define 5 mutually exclusive, controlled gap categories:

| Gap Type | Semantic Meaning | Deterministic Criteria |
| :--- | :--- | :--- |
| **`CROWDED`** | Pervasive, repeated disclosure across multiple prior-art documents in the retrieved set. | Supporting references with `DISCLOSED` $\ge 3$, or $\ge 60\%$ of evaluated references disclose the feature. |
| **`MODERATELY_EXPLORED`** | Meaningful prior-art disclosure, but neither pervasive nor completely absent. | $1 \le \text{disclosedCount} \le 2$ or $0.30 \le \text{coverageRatio} < 0.60$. |
| **`PARTIALLY_EXPLORED`** | Prior art touches upon the feature or subsystem partially; disclosures are incomplete or fragmented. | $\text{partialCount} \ge 2$, or mix of `PARTIAL` with `NOT_DISCLOSED` where substantive disclosure is incomplete. |
| **`UNDERSERVED`** | Limited representation found in the retrieved prior-art set; very few or no references substantively disclose it. | $\text{disclosedCount} = 0$, $\text{partialCount} \le 1$, and coverage ratio $< 0.25$. |
| **`POTENTIALLY_DISTINCTIVE`** | A meaningful combination of features where individual components may be explored, but **no single reference** provides direct co-occurrence/support for the combination. | Combination size $\ge 2$; $\text{directCombinationCoverage} \le 0.30$ across all references, while features are technically linked. |

> [!IMPORTANT]
> **Product Phrasing & Legal Non-Conclusions:**
> Gaps describe solely the *retrieved prior-art landscape*. They do NOT constitute legal determinations of novelty, obviousness, inventive step, or patentability. Terms like "NOVEL" or "PATENTABLE" are strictly prohibited as gap types.

---

## 3. Combination Generation & Direct Combination Support

### A. Controlled Combination Generation (No Combinatorial Explosion)
Instead of generating all $2^N$ combinations, we generate targeted combinations of 2 to 4 features:
1. **Novelty Candidate Combinations**: Features where `isNovelty = true` combined with related standard features.
2. **Subsystem Combinations**: Features adjacent in ordering/function.
3. **High-Differentiation Pairs/Triplets**: Pairs of features that individually have low co-occurrence across the matrix.
Maximum combination limit: $\le 6$ high-value combinations evaluated per analysis.

### B. Direct Combination Support vs Collective Coverage
- **Direct Combination Support**: For a prior-art document $P$ and combination $C = \{f_1, \dots, f_k\}$:
  $$\text{directSupport}(P, C) = \frac{1}{|C|} \sum_{f \in C} \omega(P, f)$$
  Direct support requires that the **same document** discloses the features together.
  $$\text{directCombinationCoverage}(C) = \max_{P \in \mathcal{P}} \text{directSupport}(P, C)$$
- **Individual Feature Coverage**: The average collective coverage of each feature across separate documents:
  $$\text{individualFeatureCoverage}(C) = \frac{1}{|C|} \sum_{f \in C} \max_{P \in \mathcal{P}} \omega(P, f)$$
- If $\text{individualFeatureCoverage}(C)$ is high (e.g. 80%) but $\text{directCombinationCoverage}(C)$ is low (e.g. 20%), the combination is classified as **`POTENTIALLY_DISTINCTIVE`** ("distinctive combination within the retrieved landscape").

---

## 4. Differentiation Indicator & Confidence Models

### A. Differentiation Indicator Formula (0–100)
For an opportunity (feature or combination):
$$\text{differentiationScore} = \text{round}\left(100 \times \left(1.0 - \text{coverage}\right) \times \left(0.7 + 0.3 \times \text{confidence}\right)\right)$$
Bounded strictly to $[0, 100]$.
- High differentiation: Low prior-art coverage + high evidence confidence.
- Low differentiation: High prior-art coverage (crowded area).

### B. Confidence Model (0.0–1.0)
$$\text{confidence} = \frac{\text{conclusiveEvaluations}}{\text{totalEvaluations}} \times \min\left(1.0, \frac{\text{evalCount}}{3}\right)$$
- Penalized if many cells are `INSUFFICIENT_EVIDENCE`.
- Separated from the differentiation score.

---

## 5. Proposed Changes

### Database Schema (`prisma/schema.prisma`)
Extend `AnalysisOpportunity`:
- `gapType`: Enum `GapType` (`CROWDED`, `MODERATELY_EXPLORED`, `PARTIALLY_EXPLORED`, `UNDERSERVED`, `POTENTIALLY_DISTINCTIVE`)
- `opportunityKey`: String (e.g. `feat-F1`, `comb-F1-F2`)
- `relatedFeatureKeys`: String[] (e.g. `["F1", "F2"]`)
- `supportingPriorArtIds`: String[] (document IDs)
- `coverage`: Float
- `confidence`: Float
- `differentiationScore`: Int
- `evidenceDetails`: JSONB
- `limitations`: Text?
- `explanation`: Text?
- `explanationProvenance`: String (`LIVE_GROQ` | `DETERMINISTIC_FALLBACK`)
- Unique constraint: `@@unique([analysisRunId, opportunityKey])`
- Migration: `20260903120000_phase8_innovation_gap_engine`

### Engine & Service Files
1. **[NEW] `lib/analysis/innovation.ts`**:
   - `classifyFeatureGap(feature, entries, docs)`
   - `generateControlledCombinations(features)`
   - `classifyCombinationGap(combination, entries, docs)`
   - `calculateDifferentiationScore(coverage, confidence)`
   - `calculateGapConfidence(entries)`
   - `persistInnovationOpportunities(analysisRunId, opportunities)`
   - `validateOpportunityEvidenceProvenance(analysisRunId)`
   - `getInnovationGapsForAnalysis(analysisRunId)`
2. **`lib/ai/service.ts`**:
   - Update `generateInnovationAnalysis` to accept deterministic gaps as immutable facts and produce grounded explanatory narratives without modifying metrics.
3. **`lib/analysis/engine.ts`**:
   - Integrate `lib/analysis/innovation.ts` after Novelty Engine.
4. **`app/api/analysis/[id]/innovation/route.ts`**:
   - **[NEW]** REST API endpoint returning opportunities, metrics, evidence, and provenance.
5. **`app/app/innovation/page.tsx`**:
   - Connect UI to real `AnalysisOpportunity` data, showing gap type badges, related features, confidence, coverage, differentiation indicator, and educational disclaimer banner.

---

## 6. Verification Plan

### Automated Test Suite: `scripts/test-innovation-gap-engine.ts`
- **TEST A**: CROWDED feature detection.
- **TEST B**: UNDERSERVED feature detection.
- **TEST C**: PARTIALLY_EXPLORED feature detection.
- **TEST D**: POTENTIALLY_DISTINCTIVE combination detection.
- **TEST E**: Semantic similarity alone does not produce a gap.
- **TEST F**: INSUFFICIENT_EVIDENCE degrades confidence.
- **TEST G**: Evidence provenance validation (authentic IDs).
- **TEST H**: Cross-analysis evidence reference rejection.
- **TEST I**: Determinism on repeated runs.
- **TEST J**: Database idempotency (no duplicate rows on rerun).
- **TEST K**: Groq failure fallback (deterministic opportunities preserved).
- **TEST L**: Empty features behavior (no fabricated results).
- **TEST M**: Empty prior art behavior (insufficient evidence state).
- **TEST N**: Direct combination support vs individual feature separation.
- **TEST O**: Full regression suite (Phases 4, 6.5, 7 tests all passing).
- `npm run typecheck`, `npm run lint`, `npm run build`, `npx prisma migrate status`.
