# Groww SIP Retention — AI Discovery Engine
## Edge Cases & Corner Scenarios

> Comprehensive catalogue of every boundary condition, unusual input, failure mode, and race condition across all system layers — from raw input processing through deployment.

---

## Table of Contents

1. [Stage 1 — PII Scrubber & Hinglish Normalizer](#1-stage-1--pii-scrubber--hinglish-normalizer)
2. [Stage 2 — Domain Rule Injector](#2-stage-2--domain-rule-injector)
3. [Stage 3 — Behavioral Extractor](#3-stage-3--behavioral-extractor)
4. [Stage 4 — SEBI Constraint Check](#4-stage-4--sebi-constraint-check)
5. [Pipeline Orchestrator — Cross-Stage](#5-pipeline-orchestrator--cross-stage)
6. [Groq LLM Engine](#6-groq-llm-engine)
7. [BGE Embedding Model](#7-bge-embedding-model)
8. [Opportunity Scoring Engine](#8-opportunity-scoring-engine)
9. [Golden Set & Agreement Scoring](#9-golden-set--agreement-scoring)
10. [Frontend — Tab 1 (Live Pipeline)](#10-frontend--tab-1-live-pipeline)
11. [Frontend — Tab 2 (Opportunity Matrix)](#11-frontend--tab-2-opportunity-matrix)
12. [Frontend — Tab 3 (Dataset Explorer)](#12-frontend--tab-3-dataset-explorer)
13. [Frontend — Tab 4 (Evidence Log)](#13-frontend--tab-4-evidence-log)
14. [Settings Drawer & API Key Handling](#14-settings-drawer--api-key-handling)
15. [Network, CORS & Vercel ↔ Railway Communication](#15-network-cors--vercel--railway-communication)
16. [Data Layer & Research Stubs](#16-data-layer--research-stubs)
17. [Deployment & Infrastructure](#17-deployment--infrastructure)

---

## 1. Stage 1 — PII Scrubber & Hinglish Normalizer

### PII Masking Edge Cases

| ID | Scenario | Input Example | Expected Handling |
| :--- | :--- | :--- | :--- |
| **S1-01** | Empty input string | `""` | Return early: `{ scrubbed: "", piiEntitiesFound: [], hinglishTokensNormalized: [] }` |
| **S1-02** | Whitespace-only input | `"   \n\t  "` | Treat as empty — return trimmed empty string |
| **S1-03** | Phone number without country code | `"Call me at 9876543210"` | Mask → `"Call me at [PHONE]"` |
| **S1-04** | Phone number with +91 prefix | `"+91-98765-43210"` | Mask entire sequence including prefix → `"[PHONE]"` |
| **S1-05** | Phone number with spaces | `"98 765 432 10"` | Must still detect — regex should handle optional spaces/hyphens in 10-digit Indian mobile |
| **S1-06** | Non-phone 10-digit number | `"My folio is 1234567890"` | Ambiguous — folio numbers look like phone numbers. Accept false positive masking (safe side for PII) |
| **S1-07** | Bank account number (9 digits) | `"Account 123456789"` | Mask → `"Account [ACCOUNT]"` |
| **S1-08** | Bank account number (18 digits) | `"987654321012345678"` | Mask → `"[ACCOUNT]"` |
| **S1-09** | Random long digit string (>18 digits) | `"12345678901234567890"` | Do NOT mask — exceeds bank account range. Could be a transaction hash or reference |
| **S1-10** | UPI ID in text | `"pay to rahul.sharma@oksbi"` | Mask → `"pay to [UPI_ID]"` |
| **S1-11** | Email address | `"email me at user@gmail.com"` | Mask → `"email me at [EMAIL]"` |
| **S1-12** | UPI ID vs email ambiguity | `"user@paytm"` (UPI) vs `"user@gmail.com"` (email) | UPI IDs lack TLD extensions — classify single-token after `@` as UPI, multi-part with `.com`/`.in` as email |
| **S1-13** | Name after "my name is" | `"My name is Rahul and..."` | Mask → `"My name is [NAME] and..."` |
| **S1-14** | Name in Hinglish context | `"Mera naam Priya hai"` | Mask → `"Mera naam [NAME] hai"` |
| **S1-15** | Capitalized non-name words | `"I use Google Pay"` | Must NOT mask "Google" or "Pay" — proper noun heuristic needs contextual guard for known product names |
| **S1-16** | Multiple PII types in one input | `"I'm Rahul, 9876543210, rahul@upi"` | Mask all three: `"I'm [NAME], [PHONE], [UPI_ID]"` |
| **S1-17** | PII-free input | `"SIP bohot slow hai yaar"` | `piiEntitiesFound: []` — no masking applied |
| **S1-18** | Input is entirely PII | `"9876543210"` | Output: `"[PHONE]"` — scrubbed text is just a placeholder token |
| **S1-19** | Aadhaar number (12 digits) | `"My Aadhaar is 234567891234"` | Mask → `"My Aadhaar is [AADHAAR]"` or `[ACCOUNT]` — falls within 9–18 digit range |
| **S1-20** | PAN card number | `"ABCDE1234F"` | Specialized regex needed: 5 alpha + 4 digit + 1 alpha. Mask → `"[PAN]"` |

### Hinglish Normalization Edge Cases

| ID | Scenario | Input Example | Expected Handling |
| :--- | :--- | :--- | :--- |
| **S1-21** | Hinglish phrase embedded in English sentence | `"The bank ne 450 rs charge kat liya"` | Normalize only the Hinglish portions: `"The bank was deducted 450 rs charge"` |
| **S1-22** | Hinglish phrase with typos / misspellings | `"baunce ho gya"` (typo of "bounce ho gaya") | Must handle common misspellings — fuzzy match or variant list for each base phrase |
| **S1-23** | Hinglish phrase not in the map | `"bahut bakwas app hai"` | Leave unchanged — `hinglishTokensNormalized` should NOT include this as it's not in the dictionary |
| **S1-24** | Pure Hindi (Devanagari script) | `"बैंक ने पैसे काट लिए"` | Hinglish map is romanized — Devanagari input passes through unchanged. Log as `language: 'hindi_devanagari'` |
| **S1-25** | Mixed script input | `"मेरा SIP bounce हो गया"` | Normalize the romanized portion (`bounce ho gaya`); leave Devanagari as-is |
| **S1-26** | Same Hinglish phrase appears multiple times | `"kat liya... phir se kat liya"` | Normalize all occurrences |
| **S1-27** | Overlapping keyword matches | `"bounce charge kat liya"` | Both `"bounce"` and `"kat liya"` should normalize independently without interfering |
| **S1-28** | Case sensitivity | `"KAT LIYA"`, `"Kat Liya"`, `"kat liya"` | All three must normalize — matching should be case-insensitive |
| **S1-29** | Hinglish with English punctuation | `"kat liya!"`, `"kat liya?"` | Punctuation should not break matching |
| **S1-30** | Extremely long input (>5,000 chars) | Reddit post with multiple paragraphs | Process completely — no silent truncation. If performance concern, process first 5,000 chars and flag truncation |

---

## 2. Stage 2 — Domain Rule Injector

| ID | Scenario | Input Example | Expected Handling |
| :--- | :--- | :--- | :--- |
| **S2-01** | Zero rules triggered | `"Nice app, I love Groww"` | Return `{ activeDomainRules: [], augmentedContext: "" }` |
| **S2-02** | All 9 rules triggered simultaneously | Artificially long input mentioning every keyword | Return all 9 rules — system should not limit or cap matches |
| **S2-03** | Keyword appears in negation | `"There was NO bounce"` | Rule `RULE_NACH_BOUNCE` still triggers on keyword "bounce". Deterministic engine can't handle negation — this is a known limitation. LLM engine via Groq should handle it correctly |
| **S2-04** | Keyword is a substring of another word | `"I was bounced around customer support"` | "bounced" matches "bounce" trigger — false positive. Acceptable trade-off for recall, but document as known limitation |
| **S2-05** | Keyword in a different context | `"average" in "my grades are average"` | `RULE_RCA_UNIT_AVG` triggers on "average" — false positive. Context-free keyword matching can't distinguish. BGE embedding-based matching helps here |
| **S2-06** | Trigger keyword with special regex characters | Input containing `"-2%"` or `"₹295"` | Regex must properly escape `%`, `₹` — ensure trigger keyword patterns handle currency symbols and special chars |
| **S2-07** | Two rules with overlapping keywords | `"bounce penalty"` triggers both `RULE_NACH_BOUNCE` (bounce, penalty) — same rule twice? | Deduplicate — each unique rule appears only once in `activeDomainRules` |
| **S2-08** | Input after PII masking contains placeholder tokens | `"[PHONE] pe bounce ho gaya"` | Placeholder tokens `[PHONE]`, `[NAME]` etc. must NOT accidentally match any domain rule keyword |
| **S2-09** | Very short input | `"bad"` | No rules triggered — return empty |
| **S2-10** | Input in pure Devanagari after Stage 1 pass-through | Devanagari text that wasn't normalized | No keyword matches — return empty. The system's keyword base is romanized English/Hinglish |

---

## 3. Stage 3 — Behavioral Extractor

### Lifecycle Stage Classification

| ID | Scenario | Input Example | Expected Handling |
| :--- | :--- | :--- | :--- |
| **S3-01** | No month/time reference | `"SIP bahut confusing hai"` | `investorLifecycleStage: 'UNKNOWN'` |
| **S3-02** | Ambiguous time reference | `"Started a few months ago"` | `UNKNOWN` — can't determine bucket without a specific number |
| **S3-03** | Month mentioned as ordinal | `"my 5th SIP installment"` | Implies Month 5 → `MONTH_5_8` |
| **S3-04** | Month > 12 mentioned | `"I've been doing SIP for 18 months"` | Not a first-time investor scenario. Classify as `MONTH_9_12` (capped bucket) and flag as potential filter-miss from research Phase 2 |
| **S3-05** | Multiple conflicting months | `"Started 2 months ago but stopped at month 6"` | Use the **latest** lifecycle signal → `MONTH_5_8` |
| **S3-06** | Month 0 (just started) | `"I just started my first SIP yesterday"` | `MONTH_0_1` |
| **S3-07** | Year mentioned instead of months | `"After 1 year of SIP..."` | Convert: 1 year = 12 months → `MONTH_9_12` |
| **S3-08** | Hindi month reference | `"5 mahine ho gaye"` | Must detect Hinglish month references (post Stage 1 normalization). If Hinglish map converts `mahine` → `months`, then regex picks it up |

### User Segment Classification

| ID | Scenario | Input Example | Expected Handling |
| :--- | :--- | :--- | :--- |
| **S3-09** | No segment signals at all | `"SIP nahi chal rahi"` | `userSegment: 'UNKNOWN'` |
| **S3-10** | Multiple segments triggered | `"My parents told me to cancel, my freelance income is irregular"` | Both `FAMILY_INFLUENCED` and `FREELANCER_GIG` — pick the **stronger** signal (more keyword matches) or default to first matched |
| **S3-11** | Segment keyword in negation | `"I'm not a freelancer, I have a salaried job"` | Deterministic engine picks up both signals — should prioritize `YOUNG_SALARIED` since salary-related keywords are affirmative |
| **S3-12** | Age-related clue without segment keyword | `"I'm 24 years old"` | Age 22–28 + no other signal → infer `YOUNG_SALARIED` (probabilistic heuristic) |

### Churn Severity Scoring

| ID | Scenario | Input Example | Expected Handling |
| :--- | :--- | :--- | :--- |
| **S3-13** | Severity exceeds 5 from multiple signals | `"Cancelled SIP, deleted mandate, angry, will never invest again"` | Clamp to `churnSeverity: 5` — the maximum |
| **S3-14** | Positive sentiment (no churn) | `"Love this app, my SIP is growing well"` | `churnSeverity: 1` — minimal friction. Not really a churn signal at all |
| **S3-15** | Sarcasm / irony | `"Great app, only lost ₹5000 in 3 months 🙃"` | Deterministic engine cannot detect sarcasm — classifies as `churnSeverity: 2–3`. Groq LLM should catch sarcasm and assign higher severity |
| **S3-16** | Mixed positive and negative signals | `"App is nice but bounce penalty ruined it"` | Net severity: positive dampens but negative dominates → `churnSeverity: 3` |
| **S3-17** | Severity 0 (out of range) | Edge: nothing at all in input | Default to `churnSeverity: 1` — never return 0, as the scale is 1–5 |

### Theme & Free-Text Extraction

| ID | Scenario | Input Example | Expected Handling |
| :--- | :--- | :--- | :--- |
| **S3-18** | No friction theme matches | `"Random question about stocks"` | `primaryFrictionTheme: 'UNCLASSIFIED'` |
| **S3-19** | Theme data files are stubs (empty) | Research phase incomplete | `primaryFrictionTheme: 'UNCLASSIFIED'` for every input — graceful degradation |
| **S3-20** | `insideAppConfusion` not detectable | No app-specific references | `insideAppConfusion: "No in-app confusion detected"` or empty string |
| **S3-21** | `outsideAppWorkaround` is null | No external app mentioned | `outsideAppWorkaround: null` |
| **S3-22** | Multiple emotional signals | `"frustrated, angry, confused, disappointed"` | Return all four in `emotionalSignals[]` |
| **S3-23** | No emotional signals | `"SIP deducted on wrong date"` | `emotionalSignals: []` — factual complaint with no emotional markers |

---

## 4. Stage 4 — SEBI Constraint Check

| ID | Scenario | Input Example | Expected Handling |
| :--- | :--- | :--- | :--- |
| **S4-01** | No SEBI constraints triggered | `"Bounce penalty of ₹295 was charged"` | `constraintFlags: []`, `addressabilityWeight: 1.0` |
| **S4-02** | Multiple SEBI constraints triggered simultaneously | `"Which small-cap fund will give 30% returns? Hurry before the bull run ends!"` | Both `SEBI_NO_FUND_REC` (DOWNGRADE → 0.2) and `SEBI_NO_FOMO` (WARN) and `SEBI_NO_RETURN_PRED` (BLOCK → 0.2) triggered. Use most restrictive: `BLOCK` with `addressabilityWeight: 0.2` |
| **S4-03** | SEBI constraint triggered but theme is genuinely addressable | `"Should I switch from large-cap to mid-cap?"` | Even though the user has a real concern, SEBI constraint is non-negotiable → `DOWNGRADE`, `addressabilityWeight: 0.2` |
| **S4-04** | Subtle advisory language | `"Is Parag Parikh flexi cap good for SIP?"` | Must detect fund-specific mention → `SEBI_NO_FUND_REC` triggers. The regex pattern should catch "is [fund name] good" constructions |
| **S4-05** | FOMO language without advisory | `"Market crash aa raha hai, SIP band karo!"` | `SEBI_NO_FOMO` triggers (WARN), but no fund recommendation → no addressability override |
| **S4-06** | User asks for educational content (not advisory) | `"Can someone explain what NAV means?"` | Should NOT trigger any SEBI constraint — educational queries are allowed |
| **S4-07** | Constraint regex false positive | `"I recommend this app to my friends"` | `"recommend"` triggers `SEBI_NO_FUND_REC` — false positive. The constraint regex should check for investment-context proximity (`recommend` + `fund`/`stock`/`SIP`/`invest`) rather than bare `recommend` |
| **S4-08** | Bypass attempt (user crafts input to avoid detection) | Obfuscated: `"Wh1ch fund sh0uld I buy?"` | Deterministic regex won't catch leet-speak. Groq LLM path would catch it. Accept this as a deterministic engine limitation |
| **S4-09** | Platform-dependent theme (0.7 addressability) | External mandate revocation via PhonePe | `addressabilityWeight: 0.7` — Groww can partially address but can't control PhonePe's UPI interface |
| **S4-10** | Both SEBI-restricted and platform-dependent | `"Tell me which fund in PhonePe is better"` | SEBI override (0.2) takes precedence over platform-dependent (0.7) — most restrictive wins |

---

## 5. Pipeline Orchestrator — Cross-Stage

| ID | Scenario | Expected Handling |
| :--- | :--- | :--- |
| **PO-01** | Stage 1 fails mid-processing | Catch error at Stage 1 → return partial `PipelineOutput` with Stage 1 error flag. Do NOT proceed to Stage 2–4 (no input to work with) |
| **PO-02** | Stage 2 fails but Stage 1 succeeded | Continue to Stage 3 with empty `activeDomainRules`. Stage 3 classifies without domain context (reduced accuracy is acceptable) |
| **PO-03** | Stage 3 fails but Stages 1–2 succeeded | Emit partial result. Stage 4 receives empty `BehavioralProfile` → sets `addressabilityWeight: 1.0`, `primaryFrictionTheme: 'UNCLASSIFIED'` |
| **PO-04** | Stage 4 fails but Stages 1–3 succeeded | Return Stages 1–3 results. Mark Stage 4 as errored. SEBI enforcement still runs as a separate finally-block middleware |
| **PO-05** | User submits new input while pipeline is already running | Abort the current pipeline run (set `isRunning = false`, clear partial results) and start fresh with the new input |
| **PO-06** | Rapid-fire submissions (clicking Run 10 times quickly) | Debounce or disable the Run button while `isRunning = true`. Only the first click should trigger; subsequent clicks ignored until completion |
| **PO-07** | Pipeline timeout (deterministic engine hangs) | Deterministic should never hang (pure CPU), but set a safety timeout of 5 seconds. If exceeded, return error state |
| **PO-08** | Input contains only emojis | `"😡😡😡💸"` | Stage 1: no PII, no Hinglish. Stage 2: no rules. Stage 3: `emotionalSignals: ['angry']` (if emoji-to-emotion mapping exists), else `UNKNOWN` everything. Stage 4: no constraints. Return complete but sparse output |
| **PO-09** | Input is a URL | `"https://www.reddit.com/r/personalfinanceindia/..."` | Stage 1: no PII masking (URLs are not PII). Stage 2: `"reddit"` might trigger context but no specific rule. Return `UNCLASSIFIED` across the board |
| **PO-10** | Input in a completely unrelated language (Japanese, Arabic) | Stage 1: no Hinglish matches. Stage 2: no keyword matches. Stage 3: all `UNKNOWN`. Gracefully return empty classifications |

---

## 6. Groq LLM Engine

| ID | Scenario | Expected Handling |
| :--- | :--- | :--- |
| **LLM-01** | Groq API key is empty string `""` | Treat as "no key" → route to deterministic engine. Do NOT send an empty key to Groq |
| **LLM-02** | Groq API key has leading/trailing whitespace | Trim the key before using. `"  gsk_abc123  "` → `"gsk_abc123"` |
| **LLM-03** | Groq API key is syntactically valid but revoked/expired | Groq returns 401 → catch error, set `keyValidationStatus: 'invalid'`, fallback to deterministic, show red indicator in Settings |
| **LLM-04** | Groq rate limit exceeded (429) | Catch 429, fallback to deterministic for this request. Show amber banner: "Rate limit reached — using simulation engine" |
| **LLM-05** | Groq returns 500 / 503 (server error) | Catch, fallback to deterministic, log the error |
| **LLM-06** | Groq response is valid JSON but wrong schema | Zod validation fails → fallback to deterministic for this stage. Log the malformed response for debugging |
| **LLM-07** | Groq response is truncated (max tokens reached) | Incomplete JSON → `JSON.parse` fails → fallback to deterministic |
| **LLM-08** | Groq response contains markdown code fences | LLM wraps JSON in ` ```json ... ``` ` — parser must strip code fences before `JSON.parse` |
| **LLM-09** | Groq timeout at exactly 10,000ms boundary | `AbortController` fires → catch abort error → fallback to deterministic. Ensure the timeout fires cleanly without partial state corruption |
| **LLM-10** | Groq returns valid JSON with extra fields not in schema | Zod `.passthrough()` or `.strip()` — extra fields should be silently ignored, not cause validation failure |
| **LLM-11** | Groq returns `churnSeverity: 6` (out of range) | Zod schema clamps to `z.number().min(1).max(5)` — reject and fallback |
| **LLM-12** | Groq returns `investorLifecycleStage: "MONTH_13_24"` (invalid enum) | Zod enum validation fails → fallback |
| **LLM-13** | Network completely down during LLM call | Fetch/axios throws `ECONNREFUSED` or `ENETUNREACH` → catch, fallback to deterministic |
| **LLM-14** | Groq LLM hallucinates a domain rule that doesn't exist | Stage 2 LLM output references `RULE_IMAGINARY` → validator checks against known rule IDs → rejects unknown rules, falls back |
| **LLM-15** | LLM fails on Stage 2 but succeeded on Stage 1 | Run deterministic Stage 2 with LLM Stage 1 output. Continue LLM for Stage 3. Mixed-engine execution is allowed |
| **LLM-16** | Concurrent pipeline requests share the same Groq key | Backend must handle concurrent requests. Groq SDK supports it, but rate-limit awareness is needed. Queue or fail-fast with deterministic fallback |
| **LLM-17** | Groq model name changes or is deprecated | `llama-3.3-70b-versatile` no longer available → Groq returns model-not-found error → log clearly, fallback to deterministic, alert in server logs |

---

## 7. BGE Embedding Model

| ID | Scenario | Expected Handling |
| :--- | :--- | :--- |
| **BGE-01** | First request triggers model download/load | `@xenova/transformers` downloads the ONNX model on first call. This can take 10–30 seconds. Railway must have sufficient disk space (~100MB for bge-small). First pipeline request may be slow — subsequent calls use cached model |
| **BGE-02** | Model file corrupted on disk | `pipeline()` throws → catch error, fall back to keyword-only matching for Stage 2 (disable semantic similarity path). Log corruption error |
| **BGE-03** | Empty string input to embedding | `getEmbedding("")` → model may return zero vector or throw. Guard: if empty string, return null / skip embedding comparison |
| **BGE-04** | Very long input (>512 tokens) | BGE models have max sequence length (typically 512 tokens). Inputs beyond this are silently truncated by the tokenizer. For very long verbatims, pass only the first 512 tokens or chunk and average |
| **BGE-05** | Non-Latin script input | BGE-en model is English-optimized. Hindi Devanagari or mixed script may produce poor embeddings. Use embedding only on post-normalization (Stage 1 output), not raw input |
| **BGE-06** | Cosine similarity returns exactly 0.0 | Orthogonal vectors — indicates no semantic relationship. Valid result, not an error |
| **BGE-07** | Cosine similarity returns > 1.0 due to floating point | Clamp result to `Math.min(result, 1.0)` |
| **BGE-08** | Railway container runs out of memory loading model | BGE-small needs ~100MB RAM for model weights. Ensure Railway instance has at least 512MB RAM allocated |
| **BGE-09** | Concurrent embedding requests | The cached embedder singleton handles concurrent calls — `@xenova/transformers` pipeline is stateless per call. But if model is still loading (first request), queue subsequent requests behind the initialization promise |
| **BGE-10** | Model version mismatch between Railway deployments | Pin exact model version in code (`Xenova/bge-small-en-v1.5`). Don't use `latest` tag |

---

## 8. Opportunity Scoring Engine

| ID | Scenario | Expected Handling |
| :--- | :--- | :--- |
| **OS-01** | `totalCorpusSize` is 0 | Division by zero in `themeShare = recordCount / 0 * 100`. Guard: if `totalCorpusSize === 0`, return empty `ScoredTheme[]` |
| **OS-02** | `themes` array is empty | No themes discovered yet. Return empty `ScoredTheme[]` — UI renders "Pending Research" |
| **OS-03** | Theme with `recordCount: 0` | `themeShare = 0%` → `opportunityScore = 0.0`. Valid — rank it last |
| **OS-04** | Theme with `severityScores: []` (empty array) | `average([])` is undefined / `NaN`. Guard: if empty, default `meanSeverity = 0` |
| **OS-05** | All themes have identical scores | All scores equal → all get same rank. Use alphabetical tie-breaker or stable sort to ensure deterministic ordering |
| **OS-06** | `severityWeightMultiplier` set to 0 | All severity-dependent scores collapse to 0. Allow it (it's a valid "what-if") but show a warning: "Severity weight is 0 — scores are not meaningful" |
| **OS-07** | `severityWeightMultiplier` at extreme (2.0) | High-severity themes become disproportionately dominant. Valid behavior — just a slider exploration |
| **OS-08** | Theme is both `sebiRestricted` AND `platformDependent` | `sebiRestricted` check runs first → `addressability = 0.2`. The `platformDependent` flag (0.7) is overridden by the stricter SEBI penalty |
| **OS-09** | Single theme covers 100% of corpus | `themeShare = 100%`. Score is `100 × meanSeverity × addressability`. Valid — it just means one dominant theme |
| **OS-10** | Floating point precision in final scores | Two themes with scores `157.29999...` and `157.30000...` could swap ranks. Use `toFixed(1)` for display, but sort on raw floating point |

---

## 9. Golden Set & Agreement Scoring

| ID | Scenario | Expected Handling |
| :--- | :--- | :--- |
| **GS-01** | Golden set is empty (0 items) | Division by zero in `exactMatches / 0 * 100`. Guard: return `{ themeAgreementPct: 0, severityAgreementPct: 0, totalItems: 0 }` |
| **GS-02** | Golden set has fewer than 20 items | Valid — score based on actual count. Formula uses actual array length, not hardcoded 20 |
| **GS-03** | AI label has not been populated yet (placeholder) | `aiLabel: { theme: '', churnSeverity: 0 }` → all items will be `mismatch`. Agreement = 0%. Show "AI labels pending" indicator in UI |
| **GS-04** | Human label and AI label use different theme IDs for same concept | Spelling or casing difference: `"CASHFLOW_CRUNCH"` vs `"cashflow_crunch"` → always compare in normalized lowercase |
| **GS-05** | Severity difference is exactly 0.5 | `|human - ai| === 0.5` → counts as agreement (within ±0.5 tolerance) |
| **GS-06** | Severity difference is 0.500001 (floating point) | Use `Math.abs(human - ai) <= 0.5 + epsilon` where epsilon = 0.0001 to handle floating point |
| **GS-07** | 100% agreement on all items | All `matchStatus: 'exact'`. Valid — display with green scorecard |
| **GS-08** | 0% agreement on all items | All `matchStatus: 'mismatch'`. Valid — display with vermilion scorecard. Every row shows root cause |
| **GS-09** | `rootCause` field is empty for a mismatch row | Allowed but should display "Root cause not documented" rather than blank cell |
| **GS-10** | Correction case study references a domain rule that doesn't exist | `domainRuleApplied: 'RULE_NONEXISTENT'` — display the ID as-is but don't crash. No link to rule detail card |

---

## 10. Frontend — Tab 1 (Live Pipeline)

| ID | Scenario | Expected Handling |
| :--- | :--- | :--- |
| **T1-01** | User pastes extremely long text (>10,000 chars) | Textarea accepts it. Character counter shows warning above soft limit (1,000). Backend processes without crash (Stage 1 may truncate if performance degrades) |
| **T1-02** | User pastes text with HTML/script tags | `<script>alert('xss')</script>` — the verbatim is sent as raw text to backend. Frontend must render output using text-only elements (no `dangerouslySetInnerHTML`). XSS prevention |
| **T1-03** | User clicks Run with empty textarea | Disable Run button when `rawInput.trim() === ""`. Show "Please enter a verbatim" tooltip |
| **T1-04** | User clicks a quick-load chip, then edits the textarea | Chip remains visually selected but text is now different. Clear chip selection on textarea edit (deselect chip, treat as custom input) |
| **T1-05** | Pipeline returns partial results (Stage 1–2 succeeded, Stage 3 errored) | Render Stage 1 and Stage 2 cards. Show Stage 3 card with red error border and "Stage failed — see details" message. Stage 4 card shows "Skipped" |
| **T1-06** | User navigates away from Tab 1 mid-pipeline | Pipeline continues running in background. On return to Tab 1, display the completed/in-progress state from store |
| **T1-07** | Stage card animation interrupted by rapid tab switching | CSS transitions should handle interruption gracefully — no orphaned animation states |
| **T1-08** | Engine mode badge shows "Fallback" | User had LLM mode selected but Groq failed → badge shows amber "Fallback" with tooltip explaining the fallback reason |
| **T1-09** | Stage 2 returns 0 domain rules | Stage 2 Card renders: "No domain rules triggered for this input" in muted text. No expand chevrons |
| **T1-10** | Stage 3 JSON viewer toggle — very large JSON output | Expandable `<pre>` block with scroll. Do NOT render 500+ lines of JSON inline without containment |

---

## 11. Frontend — Tab 2 (Opportunity Matrix)

| ID | Scenario | Expected Handling |
| :--- | :--- | :--- |
| **T2-01** | No themes data (research stubs) | Table shows "⏳ Research phase in progress — theme data pending". Chart shows placeholder bars |
| **T2-02** | Only 1 theme discovered | Table shows a single row. Chart shows a single bar. Rank = #1 |
| **T2-03** | All 9 discovery question answers are empty | Each accordion panel shows "⏳ Research in progress" placeholder |
| **T2-04** | Slider moved rapidly back and forth | Debounce the backend re-scoring API call (300ms delay after last slider change). Don't fire on every pixel of slider movement |
| **T2-05** | Sorting by column that has all identical values | All rows stay in current position (stable sort). No visual jump |
| **T2-06** | Theme name is very long (>80 chars) | Truncate with ellipsis in table cell. Full name visible on hover tooltip |
| **T2-07** | Chart bar for a theme with score 0 | Render a minimal-width bar (1px or dash) — don't render nothing, as that's visually confusing |
| **T2-08** | Weight controls reset button | "Reset to Default" restores `severityMultiplier: 1.0` and `strictSEBIPenalty: true` |

---

## 12. Frontend — Tab 3 (Dataset Explorer)

| ID | Scenario | Expected Handling |
| :--- | :--- | :--- |
| **T3-01** | Verbatims array is empty (research stubs) | Full-table placeholder: "⏳ Corpus collection in progress" |
| **T3-02** | All filters applied result in 0 matches | Table body shows "No records match the current filters". Result count: "Showing 0 of 25 records" |
| **T3-03** | Search query matches no verbatims | Same as above — 0 results with a "No matches found" message |
| **T3-04** | Search for special regex characters | User types `"₹295"` or `"(bounce)"` in search. Search should use literal substring match, NOT regex. Escape special characters or use `String.includes()` |
| **T3-05** | Pagination on last page with fewer than `limit` items | Page 3 of 3 shows 5 items (when 25 total, 10 per page). "Next" button disabled |
| **T3-06** | Filter applied, then search narrows further | Filters AND search combine. Result count updates live |
| **T3-07** | Click to expand a verbatim row | Full text expands inline. Clicking the same row again collapses it. Only one row expanded at a time |
| **T3-08** | Verbatim text contains HTML entities or special chars | `&amp;`, `<`, `>` must be rendered as literal text, not interpreted as HTML |
| **T3-09** | Long verbatim text (>500 chars) in expanded view | Show full text with word-wrap. Add vertical scrollbar if exceeds 300px height |
| **T3-10** | Filter pill with very long theme name | Truncate pill label with ellipsis at 20 chars. Full name on hover |

---

## 13. Frontend — Tab 4 (Evidence Log)

| ID | Scenario | Expected Handling |
| :--- | :--- | :--- |
| **T4-01** | Golden set not yet labeled (all stubs) | Scorecard shows "⏳ Golden set labeling pending". Table shows 20 placeholder rows with "Pending" status |
| **T4-02** | Correction case studies array is empty | Section shows "No correction cases documented yet" |
| **T4-03** | Agreement score rounds to 84.999...% | Display as `85.0%` — use `toFixed(1)` rounding |
| **T4-04** | Verbatim snippet in golden set table exceeds 120 chars | Truncate at 120 chars with `...`. Full text visible on row click/expand |
| **T4-05** | All 20 items are exact match | Scorecard: 100% on both metrics. All rows show ✅. Scorecard color: teal |
| **T4-06** | Correction card references a domain rule | Rule ID should be a clickable chip that links to the domain rule detail (if a glossary modal exists) or shows a tooltip |

---

## 14. Settings Drawer & API Key Handling

| ID | Scenario | Expected Handling |
| :--- | :--- | :--- |
| **SET-01** | User enters Groq key, validates, then clears the input | `keyValidationStatus` resets to `'unchecked'`. Engine mode reverts to deterministic on next pipeline run |
| **SET-02** | User enters key and immediately clicks Run (before validation completes) | Pipeline should queue behind key validation, OR proceed with deterministic while validation is in-flight |
| **SET-03** | User closes the settings drawer mid-validation | Validation continues in background. Status indicator updates when drawer is reopened |
| **SET-04** | Key validation ping succeeds but actual pipeline call fails | Different failure modes: validation pings use a lightweight test prompt. Real pipeline prompts may exceed token limits or trigger different errors. Handle each independently |
| **SET-05** | User pastes key with newline characters | Strip `\n`, `\r` from the key string before using |
| **SET-06** | Browser auto-fill puts a saved password in the key field | The field is `type="password"` — auto-fill is possible. Ensure the field has `autocomplete="off"` |
| **SET-07** | User refreshes page — key is lost | Key is session-only (component state). After refresh, `groqApiKey: undefined`, `keyValidationStatus: 'unchecked'`. This is intentional for security |
| **SET-08** | "Force LLM" mode selected but no key provided | Show error toast: "Groq API key required for LLM mode". Do NOT run pipeline. Alternatively, auto-switch to Auto mode |

---

## 15. Network, CORS & Vercel ↔ Railway Communication

| ID | Scenario | Expected Handling |
| :--- | :--- | :--- |
| **NET-01** | Railway backend is down (503) | Frontend shows "Backend unavailable — please try again later". All tabs that depend on API calls show error state. Tab 1 cannot run pipeline |
| **NET-02** | Railway cold start delay (first request after idle) | Railway free-tier containers may sleep. First request takes 5–15 seconds. Show loading indicator with message: "Warming up backend server..." |
| **NET-03** | CORS preflight fails | Browser blocks API calls. Check that Railway CORS middleware allows the exact Vercel origin (including `https://`). Common mistake: missing protocol in `CORS_ORIGIN` |
| **NET-04** | Vercel rewrite proxy to Railway fails | `vercel.json` rewrite rule has wrong Railway URL. API calls return 404 or 502. Verify `VITE_API_BASE_URL` matches the Railway public URL exactly |
| **NET-05** | HTTPS mismatch | Vercel serves HTTPS, Railway endpoint is HTTP (shouldn't happen, but if misconfigured). Browser blocks mixed content. Ensure Railway serves HTTPS |
| **NET-06** | API response timeout (>30s) | Vercel's serverless function timeout is 10s (free tier). But since this is direct client → Railway, there's no Vercel function timeout. However, Railway itself may have request timeout. Set backend server timeout to 30s. Frontend Axios timeout to 15s |
| **NET-07** | Very large API response payload | `GET /api/corpus/verbatims` returning all records without pagination. If verbatim list grows beyond 25 (future expansion), enforce server-side pagination. Current 25 records are fine |
| **NET-08** | Malformed JSON response from Railway | Frontend Axios interceptor catches `JSON.parse` failure → shows error toast |
| **NET-09** | DNS resolution failure for Railway URL | Frontend can't resolve `*.up.railway.app`. Show "Cannot reach backend — check your internet connection" |
| **NET-10** | User opens app on a restricted network (corporate firewall blocks Railway) | Same as NET-09. No workaround possible — document that the app requires unrestricted internet access to Railway's domain |

---

## 16. Data Layer & Research Stubs

| ID | Scenario | Expected Handling |
| :--- | :--- | :--- |
| **DL-01** | `corpusSummary.ts` exports `null` | Tab 2 shows "⏳ Research phase in progress". Scoring engine receives `null` → returns empty `ScoredTheme[]` |
| **DL-02** | `frictionThemes.ts` exports empty array `[]` | Tab 2 table is empty with placeholder. Stage 3 classifies all inputs as `UNCLASSIFIED` |
| **DL-03** | `verbatims.ts` exports empty array `[]` | Tab 3 shows "⏳ Corpus collection in progress". Search and filters show 0 results |
| **DL-04** | `discoveryAnswers.ts` exports empty array `[]` | Tab 2 accordion panels all show "⏳ Research in progress" |
| **DL-05** | `goldenSet.ts` exports empty array `[]` | Tab 4 shows "⏳ Golden set labeling pending". Agreement scorecard shows 0/0 |
| **DL-06** | `quickLoadChips.ts` exports empty array `[]` | Tab 1 shows no chip buttons. User can still type in the textarea |
| **DL-07** | Data file has a TypeScript compilation error | Build fails entirely. Fix immediately — data files must always compile cleanly, even as empty stubs |
| **DL-08** | Verbatim object is missing a required field | TypeScript catches at build time if strict types are enforced. Runtime: Zod validation on backend catches missing fields |
| **DL-09** | Research data partially populated (some themes filled, some empty) | Each component handles its data independently. Tab 2 table shows the filled themes. Empty ones are simply absent |
| **DL-10** | Two data files reference the same `themeId` differently | Consistency check needed during Phase 3. A golden set item's `humanLabel.theme` must exactly match a `FrictionTheme.id` in `frictionThemes.ts` |

---

## 17. Deployment & Infrastructure

| ID | Scenario | Expected Handling |
| :--- | :--- | :--- |
| **DEP-01** | Railway runs out of free-tier hours | Backend goes offline mid-month. Monitor usage. Upgrade to paid plan for production, or implement graceful degradation (frontend shows "Backend offline" state) |
| **DEP-02** | Vercel build fails due to TypeScript error | Deployment blocked. Fix the type error. Vercel shows build logs in dashboard |
| **DEP-03** | Railway Dockerfile uses wrong Node.js version | `FROM node:18-alpine` instead of `node:20-alpine`. May cause TypeScript or dependency compatibility issues. Pin to `node:20-alpine` |
| **DEP-04** | Environment variable not set in Railway | `GROQ_API_KEY` is undefined → LLM path is simply unavailable. Not a crash — deterministic engine takes over. But `CORS_ORIGIN` missing → all frontend requests blocked |
| **DEP-05** | Railway healthcheck path wrong | Railway thinks the service is unhealthy → keeps restarting. Ensure `/api/health` matches `railway.json` config exactly |
| **DEP-06** | Multiple Railway deployments with different BGE model versions | Inconsistent embeddings across deployments. Pin model version in code (`Xenova/bge-small-en-v1.5`). Do not use unversioned model names |
| **DEP-07** | Vercel rewrites conflict with hash-based routing | Vercel rewrite `/(.*) → /index.html` catches all routes. Hash-based routes (`/#/tab-name`) never reach the server — they're client-side only. No conflict if using `HashRouter` |
| **DEP-08** | Git push triggers both Vercel and Railway builds simultaneously | Both platforms monitor the same repo. This is fine — they build independently (`frontend/` vs `backend/`). Ensure root directory settings are correct per platform |
| **DEP-09** | Railway container OOM (Out of Memory) kill | BGE model + Express + in-flight requests exceed RAM. Ensure Railway instance has ≥512MB RAM. BGE-small needs ~100MB for model weights |
| **DEP-10** | SSL certificate renewal failure on Railway | Railway manages SSL automatically. If it fails, users see browser security warning. Contact Railway support — not an application-level fix |
| **DEP-11** | Frontend deployed but backend not yet deployed | All API calls fail. Frontend shows "Backend unavailable" for all data-dependent tabs. Tab 1 pipeline doesn't work. Must deploy backend first |
| **DEP-12** | Backend deployed but CORS not configured for new Vercel domain | API calls blocked by browser CORS policy. Update `CORS_ORIGIN` in Railway env vars to include the new Vercel domain |

---

## Summary Statistics

| Category | Edge Cases |
| :--- | :---: |
| Stage 1 — PII Scrubber & Hinglish | 30 |
| Stage 2 — Domain Rule Injector | 10 |
| Stage 3 — Behavioral Extractor | 23 |
| Stage 4 — SEBI Constraint Check | 10 |
| Pipeline Orchestrator | 10 |
| Groq LLM Engine | 17 |
| BGE Embedding Model | 10 |
| Opportunity Scoring Engine | 10 |
| Golden Set & Agreement | 10 |
| Frontend — Tab 1 | 10 |
| Frontend — Tab 2 | 8 |
| Frontend — Tab 3 | 10 |
| Frontend — Tab 4 | 6 |
| Settings Drawer | 8 |
| Network & CORS | 10 |
| Data Layer & Stubs | 10 |
| Deployment & Infra | 12 |
| **Total** | **194** |

