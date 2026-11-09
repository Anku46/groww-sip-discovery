# Phase 6 Eval — Integration, Testing & Deployment

> Source: [ImplementationPlan.md § Phase 6](../ImplementationPlan.md)
> Type: **Production smoke tests + performance audit + ops checks**
> Systems under test: live Vercel frontend ↔ live Railway backend

---

## 1. Objective

Make sure the deployed system **works end to end in production**, matches local behavior, is fast and accessible, and can be set up again from the docs.

Placeholders: `FE = https://groww-sip-discovery.vercel.app`, `BE = https://<app>.up.railway.app`.

---

## 2. Eval Cases

### A. Railway Deployment (6.1)

| ID | Test | Pass Criteria |
| :-- | :-- | :-- |
| P6-A1 | Healthcheck | `curl BE/api/health` → 200 `{status:"ok"}` |
| P6-A2 | Env vars | `NODE_ENV=production`, `PORT`, `CORS_ORIGIN` set; `GROQ_API_KEY` optional |
| P6-A3 | CORS lockdown | Request with `Origin: FE` allowed; `Origin: https://evil.example` rejected |
| P6-A4 | HTTPS | Railway URL serves valid TLS |
| P6-A5 | Cold start | First request after idle returns within 10s; BGE model loads without OOM |
| P6-A6 | Restart resilience | Redeploy → healthcheck green again without manual steps |
| P6-A7 | No secrets in repo | `git grep -i "gsk_\|GROQ_API_KEY="` shows only `.env.example` placeholders |

### B. Vercel Deployment (6.2)

| ID | Test | Pass Criteria |
| :-- | :-- | :-- |
| P6-B1 | Build | Vercel build succeeds with `pnpm build` → `dist` |
| P6-B2 | Env | `VITE_API_BASE_URL` points to `BE` (verify in network tab) |
| P6-B3 | HTTPS | `FE` valid TLS, HTTP redirects to HTTPS |
| P6-B4 | SPA routing | Direct load of each tab hash route works |
| P6-B5 | Preview vs prod | Prod domain is the one listed in `CORS_ORIGIN` |

### C. End-to-End Smoke Tests (6.3)

Run as a Playwright suite against `FE` (plus a manual pass).

| ID | Test | Expected Result |
| :-- | :-- | :-- |
| P6-C1 | Open `FE` cold | Dashboard interactive in < 3s |
| P6-C2 | Each quick-load chip (Tab 1) | 4 stage cards render; data equals a direct `BE/api/pipeline/run` call |
| P6-C3 | SEBI-restricted chip | Red constraint banner, addressability = 0.2 |
| P6-C4 | Sort opportunity table (Tab 2) | Ranks reorder correctly |
| P6-C5 | Weight sliders (Tab 2) | Network shows `POST /api/themes/score`; table re-ranks |
| P6-C6 | Search + filter (Tab 3) | Results narrow; count matches API |
| P6-C7 | Golden set (Tab 4) | Agreement % equals manual calculation from the 20 rows shown |
| P6-C8 | Valid Groq key | Engine badge "LLM"; output passes schema |
| P6-C9 | Invalid Groq key | Fallback to deterministic, amber banner |
| P6-C10 | No key at all | Deterministic engine, everything works |
| P6-C11 | Mobile (375px) & tablet (768px) | All tabs usable, no horizontal scroll |
| P6-C12 | Railway logs during full run | 0 unhandled errors; no PII or API keys logged |
| P6-C13 | Browser console during full run | 0 errors, 0 CORS errors |

### D. Prod Parity & Regression

| ID | Test | Pass Criteria |
| :-- | :-- | :-- |
| P6-D1 | Golden set agreement | Prod `/api/golden-set/agreement` equals Phase 4 local values |
| P6-D2 | Pipeline determinism | 5 chips: prod deterministic output deep-equals local output |
| P6-D3 | Re-run Phase 3 + 4 test suites in CI | All green on the deployed commit |
| P6-D4 | Prod latency | Deterministic `/api/pipeline/run` p95 < 500ms measured from client (network included) |

### E. Final Polish (6.4)

| ID | Test | Pass Criteria |
| :-- | :-- | :-- |
| P6-E1 | Bundle size | Main chunk < 500KB gzipped (`vite build` report / `rollup-plugin-visualizer`) |
| P6-E2 | Lighthouse Performance (mobile, `FE`) | > 90 |
| P6-E3 | Lighthouse Accessibility | > 90 |
| P6-E4 | Lighthouse Best Practices | ≥ 90 (advisory) |
| P6-E5 | README | Covers: overview, architecture diagram/link, local setup, env vars, deploy steps, how to run tests |
| P6-E6 | README reproducibility | A fresh clone following only the README runs FE + BE locally in < 15 min |
| P6-E7 | `.env.example` | Present in `frontend/` and `backend/`, all vars listed, no real values |

### F. Safety & Compliance (production)

| ID | Test | Pass Criteria |
| :-- | :-- | :-- |
| P6-F1 | SEBI in LLM mode | 10 advisory prompts in prod LLM mode → no fund recommendations or return predictions shown; flags applied |
| P6-F2 | PII in prod | Submitting a verbatim with phone/UPI/email → masked in UI and not present in Railway logs |
| P6-F3 | Key handling | Groq key entered in UI not stored in `localStorage`, not in URL, not logged server-side |
| P6-F4 | Rate abuse | 100 rapid pipeline requests → server stays healthy (rate limit or graceful slowdown, no crash) |

---

## 3. Scoring

| Severity | Cases | Rule |
| :-- | :-- | :-- |
| **Blocking** | A1, A3, A7, B1–B4, C1–C10, C12, C13, D1, E2, E3, E5, F1–F3 | Any failure → not shippable |
| **Major** | A2, A4–A6, B5, C11, D2–D4, E1, E6, E7, F4 | ≤ 2 failures, with tickets and owner |
| **Minor** | E4 | Advisory |

**Phase 6 PASS (ship)** = all Blocking pass + ≤ 2 Major failures.

---

## 4. Sign-off

| Field | Value |
| :-- | :-- |
| FE URL / BE URL | ___ / ___ |
| Deployed commit SHA | ___ |
| Smoke tests | ___ / 13 passed |
| Lighthouse Perf / A11y / BP | ___ / ___ / ___ |
| Main bundle (gzip) | ___ KB |
| Prod agreement (Theme / Severity) | ___ % / ___ % |
| Reviewer / date | ___ |
| Result | ☐ SHIP ☐ HOLD |
