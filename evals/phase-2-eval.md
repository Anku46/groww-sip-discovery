# Phase 2 Eval — Analysis & Theme Discovery

> Source: [ImplementationPlan.md § Phase 2](../ImplementationPlan.md)
> Type: **Manual / research-quality eval** (no code)
> Artifacts under test: filtered corpus, `FrictionTheme[]`, 9 `DiscoveryAnswer`s, 25 `Verbatim`s, 20 `GoldenSetItem`s, `CorrectionCaseStudy[]`

---

## 1. Objective

Make sure the research content the app will show is **accurate, grounded in the corpus, internally consistent, and complete** before it's turned into code in Phase 3.

---

## 2. Eval Cases

### A. First-Time Investor Filter (2.1)

| ID | Check | Method | Pass Criteria |
| :-- | :-- | :-- | :-- |
| P2-A1 | Inclusion precision | Randomly sample 20 included records; second reviewer (or blind re-read after 24h) judges "first-time investor?" | ≥ 18/20 agree |
| P2-A2 | Exclusion recall | Randomly sample 20 excluded records | ≤ 2/20 should have been included |
| P2-A3 | Exclusion rules applied | Search filtered corpus for "rebalancing", "tax harvesting", "LTCG", "10 years SIP" | 0 experienced-investor records remain (or each is justified) |
| P2-A4 | Counts documented | Filtered total + per-channel breakdown | Per-channel counts sum to filtered total; filtered ≤ raw per channel |
| P2-A5 | Reason captured | Each included record has `inclusionReason` (explicit mention vs behavioral marker) | 100% populated |

### B. Theme Clustering (2.2)

| ID | Check | Pass Criteria |
| :-- | :-- | :-- |
| P2-B1 | Themes emerged from data | Each theme has ≥ 3 supporting records (no single-anecdote themes) |
| P2-B2 | Mutually exclusive primary assignment | Every filtered record has exactly one `primaryThemeId` (or an explicit `Other/Unclassified`) |
| P2-B3 | Count consistency | Σ `recordCount` across themes = filtered total (incl. Other) |
| P2-B4 | Severity completeness | `severityScores[].length == recordCount` for every theme; all values integers 1–5 |
| P2-B5 | Severity calibration | Re-score 10 random records blind; mean absolute diff ≤ 0.5 vs original |
| P2-B6 | SEBI flag correctness | Every theme with `sebiRestricted = true` involves fund recs / return predictions / advisory content; reviewer confirms each |
| P2-B7 | Platform-dependency flag | Every `platformDependent = true` theme cites an outside dependency (UPI app, bank, NPCI, BSE StarMF) |
| P2-B8 | Naming clarity | Theme names are distinct, descriptive, and non-overlapping (reviewer can assign 10 random records to the correct theme from name + summary alone, ≥ 8/10) |
| P2-B9 | "Other" bucket size | Unclassified ≤ 15% of filtered corpus |

### C. Discovery Answers (2.3)

| ID | Check | Pass Criteria |
| :-- | :-- | :-- |
| P2-C1 | Coverage | All 9 questions answered; `questionText` matches the plan verbatim |
| P2-C2 | Evidence | Each answer has 2–3 `supportingVerbatimIds`, all of which exist in the filtered corpus |
| P2-C3 | Grounding | For each answer, every factual claim is traceable to at least one cited verbatim (reviewer check) — 0 unsupported claims |
| P2-C4 | Theme links | Each answer has ≥ 1 `relatedThemeIds`, all valid theme IDs |
| P2-C5 | No advisory language | No answer recommends a fund, predicts returns, or uses FOMO framing (SEBI hygiene) |
| P2-C6 | Q7 & Q8 specificity | Continuer-vs-dropoff and segment answers name concrete differentiators, not generic statements |

### D. 25 Representative Verbatims (2.4)

| ID | Check | Pass Criteria |
| :-- | :-- | :-- |
| P2-D1 | Count | Exactly 25 |
| P2-D2 | Channel coverage | All 5 channels represented |
| P2-D3 | Theme coverage | Every discovered theme represented by ≥ 1 verbatim |
| P2-D4 | Lifecycle coverage | ≥ 3 distinct lifecycle stages |
| P2-D5 | Segment coverage | ≥ 2 distinct user segments |
| P2-D6 | Language mix | ≥ 1 English and ≥ 1 Hinglish (target ≥ 5 Hinglish) |
| P2-D7 | Tag completeness | All 5 tags (`source`, `lifecycleStage`, `userSegment`, `primaryThemeId`, `churnSeverity`) populated, valid enum values |
| P2-D8 | Tag consistency | Tags match the record's tags in the filtered corpus |

### E. Golden Set (2.5)

| ID | Check | Pass Criteria |
| :-- | :-- | :-- |
| P2-E1 | Count | Exactly 20 items |
| P2-E2 | Human labels | `humanLabel.theme` and `humanLabel.churnSeverity` filled for all 20 |
| P2-E3 | AI labels empty | `aiLabel` is null/placeholder for all 20 (no leakage) |
| P2-E4 | Theme balance | Every theme appears ≥ 1×; no theme > 40% of the set |
| P2-E5 | Severity spread | ≥ 3 distinct severity values across the set |
| P2-E6 | Difficulty mix | ≥ 3 items are "tricky" (Hinglish, sarcasm, misplaced blame, or SEBI-adjacent) |
| P2-E7 | Label stability | PM re-labels 5 items blind after ≥ 24h: theme agreement 5/5, severity within ±1 on 5/5 |

### F. PM Correction Cases (2.6)

| ID | Check | Pass Criteria |
| :-- | :-- | :-- |
| P2-F1 | Count | ≥ 3 case studies |
| P2-F2 | Fields | `aiOutput`, `rejectionReason`, `correctAnswer`, `domainRuleApplied` all populated |
| P2-F3 | Real domain rule | Each `domainRuleApplied` is a concrete rule (e.g. T-3 cutoff, NACH bounce, SEBI no-fund-rec) that will exist in Phase 3 `domainRules.ts` |
| P2-F4 | Plausible naive reading | `aiOutput` is a believable surface-level misread, not a straw man |
| P2-F5 | Variety | ≥ 2 different domain rule categories across the cases |

### G. Hand-off Readiness

| ID | Check | Pass Criteria |
| :-- | :-- | :-- |
| P2-G1 | Structured format | All outputs in spreadsheet/JSON with field names matching the Phase 3 type names |
| P2-G2 | Referential integrity | All cross-references (verbatim IDs, theme IDs) resolve |
| P2-G3 | Hinglish phrase list | ≥ 12 Hinglish phrases + English meanings captured for `hinglishMap.ts` |
| P2-G4 | Quick-load chips | 5–6 verbatims shortlisted for Tab 1, including ≥ 1 SEBI-restricted and ≥ 1 NACH/mandate case |

---

## 3. Scoring

| Severity | Cases | Rule |
| :-- | :-- | :-- |
| **Blocking** | A1, A4, B2, B3, B4, C1, C2, C3, D1, D2, D3, E1, E2, E3, F1, F2, G2 | Any failure → Phase 2 not done |
| **Major** | A2, A3, B1, B5, B6, B8, C4, C5, D7, E4, E7, F3, G1, G3 | ≤ 2 failures, each with a fix plan |
| **Minor** | Everything else | Advisory |

**Phase 2 PASS** = all Blocking pass + ≤ 2 Major failures.

---

## 4. Sign-off

| Field | Value |
| :-- | :-- |
| Filtered total / raw total | ___ / ___ |
| Themes discovered | ___ |
| Filter precision (A1) | ___ / 20 |
| Severity re-score MAE (B5) | ___ |
| Blocking passed | ___ / 17 |
| Major passed | ___ / 14 |
| Reviewer / date | ___ |
| Result | ☐ PASS ☐ FAIL |
