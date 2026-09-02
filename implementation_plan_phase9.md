# Phase 9 Implementation Plan — AI-Assisted Claim Strategy & Optimization Engine

## 1. Executive Summary & Objective
Phase 9 introduces an evidence-grounded AI-assisted Claim Strategy and Claim Optimization Engine for NovelCore AI. The engine formulates defensible independent and dependent patent claims whose substantive elements are strictly grounded in existing `InventionFeature` records from the current `AnalysisRun`.

Every claim is mathematically profiled against the prior-art evidence matrix (from Phase 6/6.5), novelty scoring (from Phase 7), and innovation gaps (from Phase 8). Vulnerability indicators and differentiation indicators are calculated deterministically. Claim optimization creates immutable, versioned `ClaimVersion` records without overwriting historical versions.

---

## 2. Current Architecture & Audit Findings
- **Database**:
  - `Claim` model currently has `id`, `inventionId`, `claimNumber`, `claimType`, `parentClaimNumber`, `title`, `status`. It lacks `analysisRunId`.
  - `ClaimVersion` model currently has `id`, `claimId`, `versionNumber`, `claimText`, `isOriginal`, `isOptimized`, `riskReduction`, `differentiationNotes`, `elementOverlapAnalysis`. It lacks normalized element decomposition, numerical metrics, and provenance.
  - No `ClaimElement` model exists to map text phrases to `InventionFeature` records.
- **Engine**:
  - `lib/analysis/engine.ts` currently persists only Claim 1 using heuristic string concatenation. Dependent claims are ignored.
- **AI Service**:
  - `generateClaimAnalysis` in `lib/ai/service.ts` prompts Groq without strict feature-grounding constraints or deterministic validation.
- **Frontend**:
  - `app/app/patent/page.tsx` relies heavily on `mock-data.ts` in demo mode rather than dynamic claims persistence.

---

## 3. Required Schema Changes & Migration Plan
1. **Extend `Claim`**:
   - Add `analysisRunId String?` with relation `analysisRun AnalysisRun? @relation(fields: [analysisRunId], references: [id], onDelete: SetNull)`.
   - Add index: `@@index([analysisRunId])`.
2. **Extend `ClaimVersion`**:
   - Add `analysisRunId String?`.
   - Add `source String @default("AI_ASSISTED")`.
   - Add `model String?`.
   - Add `optimizationReason String?`.
   - Add `groundedFeatureRatio Float @default(1.0)`.
   - Add `featureCount Int @default(0)`.
   - Add `groundedFeatureCount Int @default(0)`.
   - Add `singleReferenceCoverage Float @default(0.0)`.
   - Add `collectivePriorArtCoverage Float @default(0.0)`.
   - Add `evidenceConfidence Float @default(0.0)`.
   - Add `differentiationScore Int @default(50)`.
   - Add `vulnerabilityIndicator String @default("LOW")`.
   - Add `vulnerabilityScore Int @default(0)`.
   - Add `vulnerabilityDetails Json?`.
   - Add `priorArtVulnerabilities Json?`.
   - Add `limitations String?`.
   - Add relation `analysisRun AnalysisRun? @relation(fields: [analysisRunId], references: [id], onDelete: SetNull)`.
   - Add index: `@@index([analysisRunId])`.
3. **New Model `ClaimElement`**:
   ```prisma
   model ClaimElement {
     id                 String    @id @default(uuid())
     claimVersionId     String
     inventionFeatureId String?
     featureKey         String
     elementKey         String
     text               String    @db.Text
     order              Int
     elementType        String    @default("LIMITATION")
     createdAt          DateTime  @default(now())

     claimVersion     ClaimVersion      @relation(fields: [claimVersionId], references: [id], onDelete: Cascade)
     inventionFeature InventionFeature? @relation(fields: [inventionFeatureId], references: [id], onDelete: SetNull)

     @@unique([claimVersionId, elementKey])
     @@index([claimVersionId])
     @@index([inventionFeatureId])
     @@index([featureKey])
     @@map("claim_elements")
   }
   ```
4. **Migration**:
   - Create migration: `prisma/migrations/20260903140000_phase9_claim_strategy_engine/migration.sql`.
   - Execute `npx prisma migrate deploy` and `npx prisma generate`.

---

## 4. Claim Generation Architecture & Feature Grounding
1. **Deterministic Feature Roles**:
   - `CORE`: Novelty candidates and features forming `POTENTIALLY_DISTINCTIVE` combinations.
   - `SUPPORTING`: Structural framing and common elements necessary for an operable apparatus/system.
   - `NARROWING`: Additional limitations for dependent claims (e.g. from `UNDERSERVED` or `PARTIALLY_EXPLORED` features).
2. **Feature Traceability**:
   - Every substantive element in an independent or dependent claim MUST correspond to an active `InventionFeature` from the `AnalysisRun`.
   - Post-generation validation rejects any output containing unknown feature keys.
3. **Independent Claim Strategy**:
   - Selects the core feature combination (typically 3–4 features including at least one high-differentiation/novelty feature).
   - Prompts Groq to compose formal apparatus/method claim language: Preamble, Transitional phrase ("comprising"), and Body limitations linked to specific feature keys.
4. **Dependent Claim Strategy**:
   - Generates 3–6 controlled dependent claims.
   - Each dependent claim references parent claim ("The apparatus of claim 1, wherein...") and introduces an existing unused feature or narrows an existing feature.

---

## 5. Evidence Grounding & Deterministic Metrics
For each generated claim:
1. **`groundedFeatureRatio`**: $\frac{\text{validInventionFeaturesCount}}{\text{totalElementsCount}} = 1.0$ (strictly enforced).
2. **`singleReferenceCoverage`**: $\max_{P} \left( \frac{1}{|C|} \sum_{f \in C} \omega(P, f) \right)$.
3. **`collectivePriorArtCoverage`**: $\frac{1}{|C|} \sum_{f \in C} \max_P \omega(P, f)$.
4. **`vulnerabilityIndicator`**:
   - `CRITICAL`: Single-reference coverage $\ge 0.80$ (potential anticipation vulnerability).
   - `HIGH`: Single-reference coverage $\ge 0.60$ or collective coverage $\ge 0.90$.
   - `MEDIUM`: Single-reference coverage $\ge 0.35$ or collective coverage $\ge 0.60$.
   - `LOW`: Low single-reference and collective coverage.
5. **`differentiationScore`**: Computed based on presence of underserved and distinctive combinations.
6. **Prior-Art Vulnerabilities**: Maps each candidate prior-art patent to its disclosed claim elements.

---

## 6. Claim Optimization Strategy & Immutable Versioning
1. **Optimization Request**:
   - Identifies vulnerable elements in ClaimVersion $V_1$.
   - Recommends adding an existing `UNDERSERVED` feature or moving an existing feature combination into the independent claim.
2. **Immutable Versioning**:
   - Optimization creates ClaimVersion $V_2$ with incremented `versionNumber`, referencing the parent claim.
   - $V_1$ remains completely untouched in the database.
   - Version history is preserved.

---

## 7. Groq Role & Deterministic Validation
- **Model**: `openai/gpt-oss-20b` (or active fallback).
- **Prompt**: Supplies invention metadata, selected `InventionFeatures` with descriptions, and instructions.
- **Constraints**: Strict JSON schema. LLM is explicitly barred from adding external technical components.
- **Validation**: Post-LLM verification confirms all elements reference valid `featureKey`s in the `AnalysisRun`. If invalid, falls back to deterministic rule-based assembly.

---

## 8. API Endpoints
- `GET /api/analysis/[id]/claims`: Returns all claims, active versions, elements, and metrics for the run.
- `POST /api/analysis/[id]/claims/generate`: Idempotently generates and persists the initial claim set.
- `POST /api/analysis/[id]/claims/[claimId]/optimize`: Optimizes a specific claim, producing a new `ClaimVersion`.
- `GET /api/claims/[claimId]/versions`: Returns historical versions for a claim.

---

## 9. Frontend Integration & Legal Disclaimer
- Update `app/app/patent/page.tsx`:
  - Fetch real claims from `GET /api/analysis/[id]/claims`.
  - Display claim numbers, claim types, claim text, element tags, and feature traceability tags.
  - Display vulnerability indicators and differentiation indicators.
  - Provide "Optimize Claim" action triggering `/api/analysis/[id]/claims/[claimId]/optimize`.
  - Educational Disclaimer banner:
    > *"Educational Disclaimer: NovelCore AI provides AI-assisted patent intelligence and is not a substitute for professional legal advice. Claim suggestions provide drafting guidance only."*

---

## 10. Verification & Test Plan
- Create `scripts/test-claim-strategy.ts` covering Tests A through Q (35+ assertions).
- Run full regression suite (`test-innovation-gap-engine`, `test-novelty-engine`, `test-phase6-5-hardening`, `test-demo-mode`, `test-hybrid-retrieval`, `test-overlap-matrix`, `audit-pipeline`).
- Run `npm run typecheck`, `npm run lint`, `npm run build`, and `npx prisma migrate status`.
