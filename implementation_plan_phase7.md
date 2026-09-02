# Implementation Plan — Phase 7: Evidence-Based Novelty Scoring Engine

## 1. Current Architecture Findings & Audit

### A. Persisted Data Available in PostgreSQL
1. **Invention Features (`model InventionFeature`)**:
   - Table: `invention_features`
   - Fields: `id`, `analysisRunId`, `inventionId`, `featureKey` (`F1`, `F2`...), `name`, `description`, `order`, `source` (`ai_extracted` | `fallback`), `isNovelty`, `createdAt`.
   - Constraints: `@@unique([analysisRunId, featureKey])`.
2. **Prior-Art Documents (`model PriorArtDocument`)**:
   - Table: `prior_art_documents`
   - Fields: `id`, `externalId`, `publicationNumber`, `title`, `abstract`, `claimsText`, `description`, `source` (`DEMO`), `jurisdiction`, `cpcCodes`, `ipcCodes`, `metadata`, `embedding` (1536-d vector).
3. **Retrieval Scores & Rankings (`model PriorArtMatch` & `CanonicalRetrievalResult`)**:
   - Retrieval contract: `lexicalScore`, `lexicalRank`, `semanticDistance`, `semanticSimilarity`, `semanticRank`, `rrfScore`, `finalRank`, `matchedFields`, `matchedTerms`.
   - Persisted in `prior_art_matches`: `similarityScore`, `ranking`, `overlap`, `technologyDomain`, `explanation`.
4. **Feature Overlap Matrix (`model FeatureOverlapMatrixEntry`)**:
   - Table: `feature_overlap_matrix_entries`
   - Fields: `id`, `analysisRunId`, `inventionId`, `priorArtDocumentId`, `featureId` (`F1`, `F2`...), `featureRecordId` (foreign key to `InventionFeature`), `overlapStatus` (`DISCLOSED`, `PARTIAL`, `NOT_DISCLOSED`, `INSUFFICIENT_EVIDENCE`), `evidence`, `evidenceSource`, `featureName`, `featureDescription`, `explanation`.
   - Constraints: `@@unique([analysisRunId, priorArtDocumentId, featureId])`.
5. **Analysis Provenance (`model AnalysisRun`)**:
   - `analysisMode`: `'LIVE_GROQ'` | `'DETERMINISTIC_FALLBACK'`.

### B. Existing Reusable Data
- The `FeatureOverlapMatrixEntry` table contains exact cell-level evaluations for every pair of `(priorArtDocument, featureId)`.
- The `InventionFeature` table contains normalized features with importance flags (`isNovelty`).
- The `PriorArtDocument` and `PriorArtMatch` tables contain canonical rankings and citations.
- The `AnalysisRun` table links the entire workflow under a single source of truth.

### C. Missing Data
- No normalized model for overall novelty assessment results (`noveltyBand`, `evidenceConfidence`, `singleReferenceRisk`, `collectiveCoverage`, `scoringBreakdown`).
- No per-reference breakdown model (`NoveltyReferenceAssessment`) linking each candidate prior art document to its specific feature disclosure count, coverage ratio, and anticipation risk.
- No explicit separation between **Novelty** (how much is new) and **Evidence Confidence** (how thoroughly proven).

---

## 2. Proposed Scoring Model & Mathematical Formulation

### A. Status Weights
For each feature $f \in \mathcal{F}$ and prior-art reference $P \in \mathcal{P}$:
$$\omega(P, f) = \begin{cases}
1.0 & \text{if } \text{overlapStatus} = \text{DISCLOSED} \\
0.5 & \text{if } \text{overlapStatus} = \text{PARTIAL} \\
0.0 & \text{if } \text{overlapStatus} \in \{\text{NOT\_DISCLOSED}, \text{INSUFFICIENT\_EVIDENCE}\}
\end{cases}$$

### B. Feature Weighting
Features identified as novelty candidates (`isNovelty = true`) carry higher significance:
$$w(f) = \begin{cases} 1.5 & \text{if } f.\text{isNovelty} = \text{true} \\ 1.0 & \text{otherwise} \end{cases}$$

### C. Single-Reference Anticipation Analysis
For each prior-art document $P$:
$$\text{coverageRatio}(P) = \frac{\sum_{f \in \mathcal{F}} w(f) \cdot \omega(P, f)}{\sum_{f \in \mathcal{F}} w(f)}$$
- **Anticipation Risk**:
  - `CRITICAL`: $\text{coverageRatio}(P) \ge 0.90$ (all or virtually all features disclosed by a single reference).
  - `HIGH`: $0.70 \le \text{coverageRatio}(P) < 0.90$.
  - `MODERATE`: $0.40 \le \text{coverageRatio}(P) < 0.70$.
  - `LOW`: $\text{coverageRatio}(P) < 0.40$.
- Phrasing rule: Designated as *"Potential single-reference anticipation concern"* (never stating definitive legal conclusion).

### D. Collective Prior-Art Coverage (35 U.S.C. 103 Obviousness Base)
For the entire candidate corpus $\mathcal{P}$:
$$\text{collectiveDisclosure}(f) = \max_{P \in \mathcal{P}} \omega(P, f)$$
$$\text{collectiveCoverage} = \frac{\sum_{f \in \mathcal{F}} w(f) \cdot \text{collectiveDisclosure}(f)}{\sum_{f \in \mathcal{F}} w(f)}$$
*Note: Collective coverage is strictly decoupled from single-reference anticipation. 5 patents each disclosing 1 feature yields high collective coverage ($1.0$), but low single-reference anticipation ($0.20$).*

### E. Evidence Confidence
Measures the sufficiency and quality of verifiable citations:
$$\text{evidenceConfidence} = \frac{\sum \text{cells where } \text{overlapStatus} \ne \text{INSUFFICIENT\_EVIDENCE} \text{ and } \text{evidence} \ne \text{""}}{\text{totalMatrixCells}}$$
- Normalized to $[0.0, 1.0]$ or $[0, 100]\%$.
- Independent from Novelty (e.g., High Novelty + Low Confidence vs Low Novelty + High Confidence).

### F. Novelty Score Formula
Deterministic score on scale $[0, 100]$:
$$\text{maxSingleCoverage} = \max_{P \in \mathcal{P}} \text{coverageRatio}(P)$$
$$\text{penalty} = 0.60 \cdot \text{maxSingleCoverage} + 0.40 \cdot \text{collectiveCoverage}$$
$$\text{noveltyScore} = \text{round}\left(100 \cdot (1 - \text{penalty})\right)$$
- If a single reference discloses 100% ($\text{maxSingle} = 1.0, \text{collective} = 1.0$), $\text{noveltyScore} = 0$.
- If no reference discloses any feature ($\text{maxSingle} = 0, \text{collective} = 0$), $\text{noveltyScore} = 100$.
- If 3 references each disclose 1/3 of the invention ($\text{maxSingle} = 0.333, \text{collective} = 1.0$), $\text{noveltyScore} = 100 \cdot (1 - (0.20 + 0.40)) = 40$.

### G. Novelty Bands
- `HIGH_NOVELTY`: $\text{noveltyScore} \ge 75$ (and $\text{evidenceConfidence} \ge 0.40$)
- `MODERATE_NOVELTY`: $50 \le \text{noveltyScore} < 75$ (and $\text{evidenceConfidence} \ge 0.40$)
- `LOW_NOVELTY`: $\text{noveltyScore} < 50$
- `INSUFFICIENT_EVIDENCE`: $\text{evidenceConfidence} < 0.40$

### H. Patentability Risk
Evaluated separately from novelty:
- `LOW`: $\text{maxSingleCoverage} < 0.40$ and $\text{collectiveCoverage} < 0.60$.
- `MODERATE`: $\text{maxSingleCoverage} < 0.70$ and $\text{collectiveCoverage} \ge 0.60$.
- `HIGH`: $\text{maxSingleCoverage} \ge 0.70$ or $\text{collectiveCoverage} \ge 0.85$.
- `INSUFFICIENT_EVIDENCE`: $\text{evidenceConfidence} < 0.40$.

---

## 3. Database Schema Changes & Prisma Migration

### New Models in `prisma/schema.prisma`
```prisma
model NoveltyAssessment {
  id                    String                       @id @default(uuid())
  analysisRunId         String                       @unique
  noveltyScore          Int                          // 0 - 100
  noveltyBand           String                       // HIGH_NOVELTY, MODERATE_NOVELTY, LOW_NOVELTY, INSUFFICIENT_EVIDENCE
  evidenceConfidence   Float                        // 0.0 - 1.0
  singleReferenceRisk   String                       // LOW, MODERATE, HIGH, CRITICAL
  collectiveCoverage    Float                        // 0.0 - 1.0
  patentabilityRisk     RiskLevel                    @default(MEDIUM)
  scoringBreakdown      Json                         @default("{}")
  evidenceReferences    Json                         @default("[]")
  groqExplanation       String?                      @db.Text
  createdAt             DateTime                     @default(now())
  updatedAt             DateTime                     @updatedAt

  analysisRun           AnalysisRun                  @relation(fields: [analysisRunId], references: [id], onDelete: Cascade)
  referenceAssessments  NoveltyReferenceAssessment[]

  @@index([analysisRunId])
  @@index([noveltyBand])
  @@map("novelty_assessments")
}

model NoveltyReferenceAssessment {
  id                       String            @id @default(uuid())
  noveltyAssessmentId      String
  priorArtDocumentId       String
  disclosedFeatureCount    Int               @default(0)
  partialFeatureCount      Int               @default(0)
  notDisclosedFeatureCount Int               @default(0)
  insufficientEvidenceCount Int              @default(0)
  coverageRatio            Float             @default(0.0)
  evidenceConfidence       Float             @default(0.0)
  anticipationRisk         String            // LOW, MODERATE, HIGH, CRITICAL
  evidenceDetails          Json              @default("[]")
  createdAt                DateTime          @default(now())

  noveltyAssessment        NoveltyAssessment @relation(fields: [noveltyAssessmentId], references: [id], onDelete: Cascade)
  priorArtDocument         PriorArtDocument  @relation(fields: [priorArtDocumentId], references: [id], onDelete: Cascade)

  @@unique([noveltyAssessmentId, priorArtDocumentId])
  @@index([noveltyAssessmentId])
  @@index([priorArtDocumentId])
  @@map("novelty_reference_assessments")
}
```

### Migration Plan
- Create formal migration SQL: `prisma/migrations/20260903100000_phase7_novelty_engine/migration.sql`
- Apply with: `npx prisma migrate deploy`
- Verify with: `npx prisma migrate status`

---

## 4. API Changes
- **Endpoint**: `GET /api/analysis/[id]/novelty`
  - Returns complete normalized assessment: `noveltyScore`, `noveltyBand`, `evidenceConfidence`, `singleReferenceRisk`, `collectiveCoverage`, `patentabilityRisk`, `referenceBreakdowns`, `evidenceReferences`, `groqExplanation`, `analysisMode`.
- **Integrated Endpoint**: Update `GET /api/analysis/[id]` and `GET /api/analysis/latest` to include `noveltyAssessment` relation.

---

## 5. Groq AI Integration (Explanation Only)
- Groq receives strictly computed facts:
  - Numeric novelty score, band, collective coverage, single reference coverage, cited patent IDs, feature overlap counts.
- Groq prompt instructs the model to explain the deterministic results in educational legal-technical terms.
- Groq is **strictly forbidden** from inventing scores, changing numbers, citing external patents, or overriding risk levels.
- Strict Zod validation and fallback guarantees deterministic output.

---

## 6. Frontend Integration
- Display real persisted metrics in `app/app/analysis/page.tsx`:
  - Novelty Score (with Novelty Band)
  - Evidence Confidence
  - Potential Single-Reference Anticipation Risk
  - Collective Prior-Art Coverage
  - Educational Disclaimer banner: *"NovelCore AI provides AI-assisted patent intelligence and is not a substitute for professional legal advice."*

---

## 7. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Ambiguity between legal advice and intelligence | Explicit disclaimer banner added across UI and reports; use "potential single-reference anticipation concern" rather than "anticipation". |
| LLM drifting on numbers | Groq prompt provides computed numbers as immutable inputs; Zod schema rejects any conflicting scores; engine treats deterministic code as source of truth. |
| Duplicate persistence on re-runs | `AnalysisRunId` is `@unique` on `NoveltyAssessment`, and `(noveltyAssessmentId, priorArtDocumentId)` is `@unique` on `NoveltyReferenceAssessment`. Upsert semantics enforced. |
| Missing matrix cells | Default to `INSUFFICIENT_EVIDENCE` with zero disclosure weight and reduced confidence score. |

---

## 8. Verification Plan & Test Suite
1. Automated Test Suite: `scripts/test-novelty-engine.ts` covering:
   - TEST A: No overlap (high novelty, low single-reference risk)
   - TEST B: Full single-reference overlap (zero novelty, critical single-reference risk)
   - TEST C: Partial overlap
   - TEST D: Collective coverage vs single-reference separation
   - TEST E: Weak evidence / INSUFFICIENT_EVIDENCE confidence decoupling
   - TEST F: Deterministic calculation across repeated runs
   - TEST G: Invalid external evidence rejection
   - TEST H: Idempotent persistence on repeated calls
   - TEST I: Provenance tracking (`LIVE_GROQ` vs `DETERMINISTIC_FALLBACK`)
   - TEST J: All regression suites passing
2. Full build, typecheck, lint, and migration status verification.
