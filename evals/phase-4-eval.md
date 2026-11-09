# Phase 4 Eval — Backend Build on Railway

> Source: [ImplementationPlan.md § Phase 4](../ImplementationPlan.md)
> Type: **Automated API tests (supertest/vitest) + model-quality eval + manual curl**
> Code under test: `backend/src/**`

---

## 1. Objective

Make sure each backend step works on its own, the full pipeline is **correct, fast, and safe**, the LLM path **degrades gracefully**, and the engine's labels **agree with the PM golden set**.

Run locally at `http://localhost:5000` unless noted.

---

## 2. Eval Cases by Step

### 4.1 — Server Skeleton & Health

| ID | Test | Pass Criteria |
| :-- | :-- | :-- |
| P4-1.1 | `GET /api/health` | 200, body `{ status: "ok", timestamp }`, timestamp is valid ISO |
| P4-1.2 | Security headers | Response includes helmet headers (`x-content-type-options`, etc.) |
| P4-1.3 | CORS | Allowed origin gets `Access-Control-Allow-Origin`; random origin does not |
| P4-1.4 | Unknown route | `GET /api/nope` → 404 JSON, not HTML stack trace |
| P4-1.5 | Malformed JSON body | `POST` with bad JSON → 400 JSON error |
| P4-1.6 | Docker | `docker build` succeeds; container serves `/api/health`; image is multi-stage alpine |

### 4.2 — Stage 1 (PII + Hinglish)

| ID | Input contains | Pass Criteria |
| :-- | :-- | :-- |
| P4-2.1 | Indian mobile `9876543210` / `+91 98765 43210` | Masked; listed in PII entities |
| P4-2.2 | Bank account (9–18 digits) | Masked |
| P4-2.3 | UPI ID `name@okaxis` | Masked |
| P4-2.4 | Email | Masked |
| P4-2.5 | Name ("my name is Rahul") | Masked |
| P4-2.6 | False positives: "₹5000 SIP", "-2%", "5 months", "T-3" | **Not** masked |
| P4-2.7 | Hinglish ("paise kat gaye", "ho gaye") | Normalized per `hinglishMap`; mapping list returned |
| P4-2.8 | Missing `rawInput` / non-string / > max length | 400 with Zod error |

**Pass:** PII recall 100% on a 20-item PII fixture; false-positive rate ≤ 5% on 20 clean verbatims.

### 4.3 — Stage 2 (Domain Rules)

| ID | Input | Expected |
| :-- | :-- | :-- |
| P4-3.1 | NACH bounce verbatim | `RULE_NACH_BOUNCE` + `RULE_T3_LOCKOUT` |
| P4-3.2 | Text with no domain terms | Empty matched list, no error |
| P4-3.3 | Normalized Hinglish trigger | Matches same rule as English equivalent |
| P4-3.4 | All 25 verbatims | Rule hit-rate reported; each matched rule has a keyword actually present |

### 4.4 — Stage 3 (Behavioral Extractor)

| ID | Input | Expected |
| :-- | :-- | :-- |
| P4-4.1 | "5 months ho gaye portfolio abhi bhi -2%" | `MONTH_5_8`, severity 3–4 |
| P4-4.2 | "first SIP lagaya aaj" | Earliest lifecycle stage |
| P4-4.3 | "cancelling my SIP, done with this" | Severity 5 |
| P4-4.4 | 25 tagged verbatims | Lifecycle accuracy ≥ 70%; segment accuracy ≥ 70%; theme accuracy ≥ 70% |
| P4-4.5 | Output shape | Valid `BehavioralProfile`; severity integer 1–5; emotional signals array |

### 4.5 — Stage 4 (SEBI)

| ID | Input | Expected |
| :-- | :-- | :-- |
| P4-5.1 | "which small cap fund is best" | `SEBI_NO_FUND_REC`, addressability 0.2 |
| P4-5.2 | Return-prediction query | `SEBI_NO_RETURN_PRED` (BLOCK), 0.2 |
| P4-5.3 | Clean operational complaint | No flags, addressability from theme default |
| P4-5.4 | Parity | Output equals direct call to shared `enforceSEBIConstraints()` for all Phase 3 D-cases |

### 4.6 — Full Pipeline Orchestrator

| ID | Test | Pass Criteria |
| :-- | :-- | :-- |
| P4-6.1 | Each quick-load chip via `POST /api/pipeline/run` | 200; all 4 stage results present; `engineUsed`, `executionTimeMs` set |
| P4-6.2 | Schema | Response passes `PipelineResponse` Zod schema |
| P4-6.3 | Latency (deterministic) | p95 < 200ms over 100 runs (warm) |
| P4-6.4 | Determinism | Same input twice → identical stage outputs (excluding timing) |
| P4-6.5 | Stage chaining | Stage 2 input == Stage 1 output (no stage reads raw input except Stage 1 and SEBI check as designed) |
| P4-6.6 | PII never leaks downstream | Masked tokens never re-appear as raw PII in stages 2–4 or logs |

### 4.7 — Data Endpoints

| ID | Endpoint | Pass Criteria |
| :-- | :-- | :-- |
| P4-7.1 | `GET /api/corpus/summary` | Equals `shared` `corpusSummary` |
| P4-7.2 | `GET /api/corpus/verbatims` (no filters) | 25 total, paginated per `limit` |
| P4-7.3 | Each single filter (`channel`, `stage`, `segment`, `theme`) | Every result matches filter; count equals in-memory filter of data file |
| P4-7.4 | Combined filters + `search` | AND logic; search is case-insensitive substring |
| P4-7.5 | Pagination edges | `page` beyond range → empty list + correct total; `limit=0`/negative → 400 |
| P4-7.6 | `GET /api/themes` | All themes returned |
| P4-7.7 | `POST /api/themes/score` | Matches `scoreThemes()` for same params; invalid params → 400 |
| P4-7.8 | `GET /api/discovery-answers` | 9 items |
| P4-7.9 | `GET /api/golden-set`, `/agreement`, `/corrections` | 20 items; agreement object; ≥ 3 corrections |

### 4.8 — Groq LLM & BGE Embeddings

| ID | Test | Pass Criteria |
| :-- | :-- | :-- |
| P4-8.1 | Valid key | `engineUsed: "llm"`; response passes Zod validator |
| P4-8.2 | Missing key | `engineUsed: "fallback"` (or `deterministic`), 200, full result |
| P4-8.3 | Invalid key | Falls back, 200, no key echoed in response/logs |
| P4-8.4 | Timeout (mock 11s delay) | Aborts at ~10s, falls back |
| P4-8.5 | Malformed LLM JSON (mock) | Validator rejects → falls back, logged |
| P4-8.6 | LLM SEBI safety | On 10 advisory prompts, LLM output never recommends a fund or predicts returns; Stage 4 flags still applied (deterministic SEBI check runs regardless of engine) |
| P4-8.7 | LLM vs golden set | Theme agreement ≥ deterministic agreement (report both) |
| P4-8.8 | BGE load | Model loads on boot or first call; subsequent inference < 100ms |
| P4-8.9 | BGE consistency | Same pair embedded twice → identical cosine; related pair (two NACH bounce verbatims) > unrelated pair (NACH vs NAV confusion) |
| P4-8.10 | No external calls for embeddings | Network monitor shows no outbound requests during embedding after model cached |

### 4.9 — Golden Set AI Labels

| ID | Test | Pass Criteria |
| :-- | :-- | :-- |
| P4-9.1 | Population | All 20 `aiLabel`s non-null |
| P4-9.2 | Agreement endpoint | Returns real Theme % and Severity (±0.5) % |
| P4-9.3 | Manual verification | Hand-computed agreement equals endpoint values |
| P4-9.4 | **Quality targets** | Theme agreement ≥ 70%; Severity agreement ≥ 60% (deterministic) |
| P4-9.5 | No leakage | Engine logic contains no hard-coded golden-set texts or IDs |
| P4-9.6 | Error analysis | Every ❌ item has a short written reason (feeds Tab 4 + correction cases) |

---

## 3. Cross-cutting

| ID | Check | Pass Criteria |
| :-- | :-- | :-- |
| P4-X1 | Logging | pino structured logs; no raw PII or API keys in logs |
| P4-X2 | Error format | All errors return `{ error, message }` JSON with correct status |
| P4-X3 | Env | Server boots with only `PORT` set; `.env.example` lists all vars |
| P4-X4 | Load | 50 concurrent `/api/pipeline/run` requests → 0 errors, p95 < 500ms |

---

## 4. Scoring

| Severity | Cases | Rule |
| :-- | :-- | :-- |
| **Blocking** | 1.1, 1.6, 2.1–2.5, 3.1, 4.1, 5.1, 5.2, 6.1–6.3, 6.6, 7.1–7.9, 8.1–8.3, 8.6, 9.1–9.3, X1 | Any failure → Phase 4 not done |
| **Quality gate** | 9.4 | If missed, document error analysis and get PM sign-off before Phase 5 |
| **Major** | Everything else | ≤ 3 failures, with tickets |

---

## 5. Sign-off

| Field | Value |
| :-- | :-- |
| API tests | ___ passed / ___ total |
| Pipeline p95 latency | ___ ms |
| PII recall / FP rate | ___ % / ___ % |
| Theme / Severity agreement (deterministic) | ___ % / ___ % |
| Theme / Severity agreement (LLM) | ___ % / ___ % |
| Reviewer / date | ___ |
| Result | ☐ PASS ☐ FAIL |
