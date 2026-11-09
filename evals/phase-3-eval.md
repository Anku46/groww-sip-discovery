# Phase 3 Eval — Foundation Layer (Types, Rules & Logic)

> Source: [ImplementationPlan.md § Phase 3](../ImplementationPlan.md)
> Type: **Automated unit tests + static checks**
> Code under test: `shared/src/**`

---

## 1. Objective

Make sure the shared logic layer **compiles, faithfully encodes the Phase 2 research, and computes scores and constraints correctly** — so Phases 4 and 5 can build on it without re-checking.

Suggested runner: `vitest` in `shared/`, run with `pnpm --filter shared test`.

---

## 2. Eval Cases

### A. Scaffold & Static Checks

| ID | Check | Command / Method | Pass Criteria |
| :-- | :-- | :-- | :-- |
| P3-A1 | Type check | `pnpm --filter shared exec tsc --noEmit` | Exit 0, zero errors |
| P3-A2 | Strict mode | Inspect `shared/tsconfig.json` | `"strict": true` |
| P3-A3 | No `any` leaks | `grep -rn ": any" shared/src` | 0 hits (or each justified) |
| P3-A4 | Layer isolation | `frontend/` and `backend/` dirs | Empty; no `express`/`react` in `shared/package.json` |
| P3-A5 | Folder layout | Compare against plan § 3.1 | All listed files exist |

### B. Type Contracts

| ID | Check | Pass Criteria |
| :-- | :-- | :-- |
| P3-B1 | Pipeline types | `Stage1Result`–`Stage4Result`, `PipelineRunRequest`, `PipelineResponse`, `BehavioralProfile` exported |
| P3-B2 | Enums | `InvestorLifecycleStage` (incl. `MONTH_5_8`), `UserSegment`, `EngineMode` (`deterministic` / `llm` / `fallback`) exported |
| P3-B3 | Domain types | `DomainRule`, `DomainRuleCategory`, `SEBIConstraint`, `SEBIPenaltyType` (`BLOCK`/`DOWNGRADE`/`WARN`), `ConstraintFlag` exported |
| P3-B4 | Corpus types | `Verbatim`, `SourceChannel` (5 values), `FrictionTheme`, `ScoredTheme`, `CorpusSummary`, `DiscoveryAnswer` exported |
| P3-B5 | Golden types | `GoldenSetItem` (with nullable `aiLabel`), `MatchStatus`, `AgreementScore`, `CorrectionCaseStudy` exported |
| P3-B6 | Type-level tests | `expectTypeOf` / `// @ts-expect-error` tests reject invalid enum values and missing required fields |

### C. Domain Knowledge Base

| ID | Check | Pass Criteria |
| :-- | :-- | :-- |
| P3-C1 | Rule schema | Every `DOMAIN_RULES` entry has `id`, `name`, `category`, `summary`, `detailedExplanation`, non-empty `triggerKeywords[]`, `sebiRelevance` |
| P3-C2 | Required rules exist | `RULE_NACH_BOUNCE`, `RULE_T3_LOCKOUT` present (used by Phase 4.3 test) |
| P3-C3 | Unique IDs | No duplicate rule IDs |
| P3-C4 | Correction-case rules | Every `domainRuleApplied` in `correctionCaseStudies.ts` maps to a rule ID in `DOMAIN_RULES` |
| P3-C5 | Keyword hygiene | Trigger keywords lowercase, trimmed, no duplicates within a rule |
| P3-C6 | Hinglish map size | `hinglishMap` has ≥ 12 entries |
| P3-C7 | Hinglish round-trip | For each map key, normalizing a sentence containing it yields the mapped English (table-driven test) |
| P3-C8 | Glossary | Entries for NPCI, NACH, T-3 cutoff, UPI Autopay, NAV, Rupee-Cost Averaging all present and non-empty |

### D. SEBI Constraint Enforcer

Golden test table for `enforceSEBIConstraints(rawInput, profile)`:

| ID | Input | Expected Flags | Expected Addressability |
| :-- | :-- | :-- | :-- |
| P3-D1 | "which small cap fund is best" | `SEBI_NO_FUND_REC` (DOWNGRADE) | 0.2 |
| P3-D2 | "will I get 15% returns in 1 year?" | `SEBI_NO_RETURN_PRED` (BLOCK) | 0.2 |
| P3-D3 | "everyone is buying this fund, should I hurry?" | `SEBI_NO_FOMO` (WARN) | unchanged (no override) |
| P3-D4 | "should I move my whole savings into equity, advise me" | `SEBI_RIA_BOUNDARY` (DOWNGRADE) | 0.2 |
| P3-D5 | "my SIP amount got deducted twice" | none | unchanged |
| P3-D6 | "NACH bounce ho gaya, penalty laga" | none | unchanged |
| P3-D7 | Hinglish advisory: "kaunsa fund best hai bhai" | `SEBI_NO_FUND_REC` | 0.2 |
| P3-D8 | Multiple triggers ("best fund that gives 20% guaranteed") | both `NO_FUND_REC` + `NO_RETURN_PRED` | 0.2 (not 0.04 — penalty does not compound unless designed to) |
| P3-D9 | Empty string | none, no throw | unchanged |

**Pass:** 9/9. Also report precision/recall over all golden-set + verbatim texts whose theme is `sebiRestricted` (target: recall = 100%, precision ≥ 90%).

### E. Opportunity Scoring

`Score = Theme Share (%) × Mean Severity × Addressability`

| ID | Case | Pass Criteria |
| :-- | :-- | :-- |
| P3-E1 | Hand-computed fixture (3 themes, known counts/severities) | Scores match to 2 decimals |
| P3-E2 | Ranking | Output sorted desc by score; ties broken deterministically (e.g. by name) |
| P3-E3 | `severityMultiplier = 1` | Identical to default output |
| P3-E4 | `severityMultiplier = 2` | Every score doubles; ranking unchanged |
| P3-E5 | `strictSEBIPenalty = true` | SEBI-restricted themes use addressability 0.2; others unchanged |
| P3-E6 | `strictSEBIPenalty = false` | SEBI-restricted themes not penalized |
| P3-E7 | Zero-record theme | Score 0, no NaN / divide-by-zero |
| P3-E8 | Real data | `scoreThemes(FRICTION_THEMES)` returns one entry per theme; shares sum to 100% ± 0.1 |
| P3-E9 | Purity | Calling twice with same input → deep-equal results; input not mutated |

### F. Agreement Scoring

| ID | Case | Pass Criteria |
| :-- | :-- | :-- |
| P3-F1 | All match | Theme 100%, Severity 100% |
| P3-F2 | None match | Theme 0%, Severity 0% |
| P3-F3 | Severity boundary | Diff exactly 0.5 → counts as agree; 0.51 → disagree |
| P3-F4 | Mixed fixture (e.g. 15/20 theme, 12/20 severity) | 75% / 60% exactly |
| P3-F5 | Placeholder AI labels | `computeAgreementScore(GOLDEN_SET)` with null `aiLabel`s returns a defined "not yet scored" state, no throw |
| P3-F6 | `MatchStatus` | Each item gets ✅ (both agree) / ⚠️ (one agrees) / ❌ (neither) correctly |

### G. Research Data Files

| ID | Check | Pass Criteria |
| :-- | :-- | :-- |
| P3-G1 | All 7 data files exist | `corpusSummary`, `verbatims`, `frictionThemes`, `discoveryAnswers`, `goldenSet`, `correctionCaseStudies`, `quickLoadChips` |
| P3-G2 | Counts | 25 verbatims, 9 answers, 20 golden items, ≥ 3 corrections, 5–6 chips |
| P3-G3 | Fidelity to Phase 2 | Script diff vs Phase 2 spreadsheet/JSON export → 0 mismatches |
| P3-G4 | Referential integrity | All `primaryThemeId`, `supportingVerbatimIds`, `relatedThemeIds` resolve |
| P3-G5 | Corpus summary math | Per-channel counts sum to filtered total |
| P3-G6 | Chip coverage | ≥ 1 chip triggers a SEBI flag (via enforcer), ≥ 1 is Hinglish, ≥ 1 is NACH/mandate |

---

## 3. Scoring

| Severity | Cases | Rule |
| :-- | :-- | :-- |
| **Blocking** | A1, A4, B1–B5, C1, C2, C4, D1–D9, E1, E2, E5, F1–F4, G1–G4 | Any failure → Phase 3 not done |
| **Major** | A2, A3, B6, C3, C6, C7, C8, E3, E4, E6–E9, F5, F6, G5, G6 | ≤ 2 failures, with tickets |
| **Minor** | A5, C5 | Advisory |

**Phase 3 PASS** = `tsc` clean + all Blocking tests green + ≤ 2 Major failures. Target line coverage on `constraints/` and `scoring/` ≥ 90%.

---

## 4. Sign-off

| Field | Value |
| :-- | :-- |
| `tsc --noEmit` | ☐ clean |
| Unit tests | ___ passed / ___ total |
| Coverage (constraints + scoring) | ___ % |
| SEBI recall / precision | ___ % / ___ % |
| Reviewer / date | ___ |
| Result | ☐ PASS ☐ FAIL |
