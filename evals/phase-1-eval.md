# Phase 1 Eval — Research & Data Collection

> Source: [ImplementationPlan.md § Phase 1](../ImplementationPlan.md)
> Type: **Manual / data-quality eval** (no code)
> Artifact under test: raw corpus spreadsheet / CSV

---

## 1. Objective

Make sure the raw voice-of-customer corpus is **complete, traceable, and unedited** enough for Phase 2 to filter and analyze it without going back to scrape again.

---

## 2. Eval Cases

### A. Channel Coverage

| ID | Check | Method | Pass Criteria |
| :-- | :-- | :-- | :-- |
| P1-A1 | Google Play Store present | Filter `source = PlayStore` | ≥ 1 record (target: enough to show mandate/bounce/deduction complaints) |
| P1-A2 | Apple App Store present | Filter `source = AppStore` | ≥ 1 record |
| P1-A3 | Reddit present | Filter `source = Reddit` | ≥ 1 record from r/personalfinanceindia or r/IndiaInvestments |
| P1-A4 | YouTube comments present | Filter `source = YouTube` | ≥ 1 record |
| P1-A5 | FinTech forums present | Filter `source = Forum` | ≥ 1 record from TradingQ&A / ValuePickr / Quora |
| P1-A6 | No single channel dominates | Per-channel % of total | No channel > 60% of raw corpus (flag for review if so, not a hard fail) |

### B. Schema Completeness (per record)

| ID | Field | Pass Criteria |
| :-- | :-- | :-- |
| P1-B1 | `source` | 100% populated, value is one of the 5 allowed enums |
| P1-B2 | `rawText` | 100% populated, non-empty, > 10 characters |
| P1-B3 | `language` | 100% populated, one of `English` / `Hinglish` / `Hindi` |
| P1-B4 | `date` | ≥ 90% populated (approximate allowed); blanks explicitly marked `unknown` |
| P1-B5 | `url` / reference | ≥ 95% populated; reference must resolve or be a stable identifier |
| P1-B6 | Unique `id` | Every record has a unique ID (needed for Phase 2 verbatim references) |

### C. Data Integrity

| ID | Check | Method | Pass Criteria |
| :-- | :-- | :-- | :-- |
| P1-C1 | Verbatim fidelity | Spot-check 10 random records against source URL | 10/10 match source text exactly (no paraphrasing, typo-fixing, or translation) |
| P1-C2 | No duplicates | Dedupe on normalized `rawText` + `source` | Duplicate rate < 2%; any remaining duplicates are intentional (cross-posts) and flagged |
| P1-C3 | Language tag accuracy | Spot-check 15 records (at least 5 Hinglish) | ≥ 14/15 correctly tagged |
| P1-C4 | Relevance floor | Spot-check 20 records | ≥ 16/20 are about SIP / mutual funds / Groww investing (broad scrape is fine, pure noise is not) |
| P1-C5 | Hinglish present | Count `language = Hinglish` | ≥ 1 record — Phase 3 needs ≥ 12 Hinglish phrase mappings, so aim for enough variety |
| P1-C6 | Date recency | Distribution of `date` | Majority of dated records within last ~3 years (flag older-skewed sets) |

### D. Privacy & Ethics

| ID | Check | Pass Criteria |
| :-- | :-- | :-- |
| P1-D1 | Public sources only | All records come from publicly accessible pages; no private groups/DMs |
| P1-D2 | PII awareness | Records with phone numbers / account numbers / emails are flagged (column `containsPII = true`) — used later as Stage 1 test inputs |
| P1-D3 | Usernames | Reviewer handles are not stored as a separate column (raw text kept as-is) |

### E. Documentation

| ID | Check | Pass Criteria |
| :-- | :-- | :-- |
| P1-E1 | Raw total recorded | Single documented number matching the CSV row count |
| P1-E2 | Per-channel counts recorded | Table of counts per channel; sums to raw total |
| P1-E3 | Collection log | Search terms, date of scrape, and sources noted for each channel |

---

## 3. Scoring

| Severity | Cases | Rule |
| :-- | :-- | :-- |
| **Blocking** | A1–A5, B1–B3, B6, C1, E1 | Any failure → Phase 1 not done |
| **Major** | B4, B5, C2, C3, C4, D1, E2 | ≤ 1 failure allowed, with a written reason |
| **Minor** | A6, C5, C6, D2, D3, E3 | Advisory; log and carry forward |

**Phase 1 PASS** = all Blocking pass + ≤ 1 Major failure (with reason).

---

## 4. Sign-off

| Field | Value |
| :-- | :-- |
| Raw record total | ___ |
| Per-channel counts | Play: ___ · App Store: ___ · Reddit: ___ · YouTube: ___ · Forums: ___ |
| Blocking passed | ___ / 11 |
| Major passed | ___ / 7 |
| Reviewer / date | ___ |
| Result | ☐ PASS ☐ FAIL |
