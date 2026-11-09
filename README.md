# SIP Discovery Engine

Why do first-time mutual fund investors in India stop their SIPs before 12 installments? This project answers that from real investor feedback, and ships it as an interactive dashboard: a live 4-stage discovery pipeline, a ranked opportunity matrix, a filterable dataset, and an evidence log that checks the engine against PM-labelled ground truth.

**Live dashboard:** https://groww-sip-discovery-rho.vercel.app
**API:** https://groww-sip-discovery-production.up.railway.app/api/health

The API runs on Railway's free plan, which puts it to sleep when idle: the first request after a quiet spell takes a few seconds while it wakes. The live API runs with BGE embeddings off to fit the free plan's memory; the deterministic and Groq engines are unaffected. To use the Groq engine on the live site, paste your own Groq key into the settings drawer (gear icon); it stays in that browser tab only.

## What's in this repo

| Path | What it is |
| :-- | :-- |
| [`problemStatement.md`](problemStatement.md), [`Architecture.md`](Architecture.md), [`ImplementationPlan.md`](ImplementationPlan.md) | The brief, the design, and the 6-phase plan |
| [`evals/`](evals/) | Acceptance criteria for each phase |
| [`research/`](research/README.md) | Phase 1 fetcher (Python) and Phase 2 analysis: corpus collection, first-time-investor filter, theme coding, golden set |
| [`groww-sip-discovery/`](groww-sip-discovery/) | The app: a pnpm monorepo with `shared/` (types, domain rules, SEBI enforcer, scoring, data), `backend/` (Express API) and `frontend/` (React dashboard) |

## How it works

```
Investor text ─► Stage 1  PII scrub + Hinglish normalizer     (always on the server; PII never reaches the LLM)
              ─► Stage 2  Indian MF domain rules              (keyword match, plus BGE semantic match on the LLM path)
              ─► Stage 3  Behavioral extraction               (deterministic rules, or Groq LLM with fallback)
              ─► Stage 4  SEBI constraint check               (always on; advice requests are penalised to 0.2×)
```

Opportunity score per friction theme = theme share % × mean churn severity × addressability (SEBI-restricted 0.2, platform-dependent 0.7, otherwise 1.0).

## Research findings in brief

- Corpus: 6,174 public records (Play Store, App Store, YouTube, TradingQ&A / ValuePickr) plus primary research (a 30-response survey and 10 in-depth interviews) → 102 first-time-investor records after rule filtering, a full manual read, and screening the survey (32 from primary research; interview files anonymized).
- 8 friction themes. Highest opportunity: autopay mandate setup & execution failures (e.g. a ₹500 SIP showing a ₹15,000 UPI Autopay limit, then a bounced debit), the gap between a bank debit and what the app shows, basic concept gaps, and a new theme from the survey: SIP debit date vs cash-flow (salary on the 7th, SIP on the 5th; freelancers and students).
- Survey (27 first-time investors): 70% were thrown by the mandate limit; 20 had an instalment fail, get skipped or paused and only 2 of them are still active, while all 7 who never had one are; 13 did nothing when something went wrong and none of those are active.
- Engine vs PM golden set (22 items, 21 PM-confirmed): deterministic 63.6% theme / 81.8% severity agreement.
- Limits: still no records from months 9–12; the survey is small, so segment differences are directions to test. See [`research/data/phase2/PHASE2_REPORT.md`](research/data/phase2/PHASE2_REPORT.md).

## Run it locally

Requires Node.js 20+ and pnpm 10.

```bash
cd groww-sip-discovery
pnpm install
cp backend/.env.example backend/.env    # optional: add GROQ_API_KEY
pnpm --filter @groww-sip/backend model:download   # optional: BGE model for semantic matching (~33 MB)
pnpm --filter @groww-sip/backend dev     # API on http://localhost:5000
pnpm --filter @groww-sip/frontend dev    # dashboard on http://localhost:5173
```

Without a Groq key everything works on the deterministic engine. With a key (in `backend/.env`, or pasted into the dashboard's settings drawer, where it stays in memory for that tab only) Stage 3 runs on Groq.

### Tests

```bash
cd groww-sip-discovery
pnpm typecheck
pnpm test                                  # shared, backend and frontend suites
RUN_EMBEDDING_TESTS=1 pnpm --filter @groww-sip/backend test   # also loads the real BGE model
```

### Re-running the research

```bash
cd research
python -m venv .venv && .venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python -m fetcher            # Phase 1 collection (see research/README.md for API keys)
.venv/Scripts/python -m analysis.build     # Phase 2 outputs → research/data/phase2/
cd ../groww-sip-discovery && pnpm generate:data   # Phase 2 → typed data files in shared/
```

## Environment variables

| Where | Variable | Purpose |
| :-- | :-- | :-- |
| Backend | `PORT` | Defaults to 5000 (Railway sets it) |
| Backend | `CORS_ORIGIN` | Comma-separated allowed origins, e.g. the Vercel URL |
| Backend | `GROQ_API_KEY` | Optional server-side key; requests can also send `x-groq-api-key` |
| Backend | `GROQ_MODEL` | Defaults to `openai/gpt-oss-120b` |
| Backend | `EMBEDDINGS_ENABLED` | `true` loads BGE for semantic rule matching |
| Frontend | `VITE_API_BASE_URL` | Backend URL in production; empty in dev (Vite proxies `/api`) |

## Deployment

- **Backend → Railway.** Service root directory `/groww-sip-discovery`; variable `RAILWAY_DOCKERFILE_PATH=backend/Dockerfile` (Railway no longer reads `railway.json` for new services). Also set: `NODE_ENV=production`, `PORT=5000`, `EMBEDDINGS_ENABLED=false` (free plan), `CORS_ORIGIN=<Vercel URL>`. Redeploys on every push to `main`.
- **Frontend → Vercel.** Built locally with the API URL baked in, then uploaded as a static site:

  ```bash
  cd groww-sip-discovery/frontend
  VITE_API_BASE_URL=https://groww-sip-discovery-production.up.railway.app pnpm build
  # copy dist/ plus a static vercel.json (SPA rewrite + headers) into .deploy/, then from .deploy/:
  vercel deploy --prod
  ```

## Data note

The corpus is public user-generated content (app-store reviews, YouTube comments, public forum posts), collected for product research. Author names and handles were not stored; phone numbers, emails, UPI IDs and similar details are flagged in the raw data and masked by the pipeline before analysis.
