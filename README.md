# SIP Discovery Engine

Why do first-time mutual fund investors in India stop their SIPs before 12 installments? This project answers that from real investor feedback, and ships it as an interactive dashboard: a live 4-stage discovery pipeline, a ranked opportunity matrix, a filterable dataset, and an evidence log that checks the engine against PM-labelled ground truth.

**Live:** _added after deployment_

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

- Corpus: 6,174 public records (Play Store, App Store, YouTube, TradingQ&A / ValuePickr) → 70 first-time-investor records after rule filtering and a full manual read.
- 7 friction themes. Highest opportunity: autopay mandate setup & execution failures (e.g. a ₹500 SIP showing a ₹15,000 UPI Autopay limit), basic concept gaps, and the gap between a bank debit and what the app shows.
- Engine vs PM golden set (21 items): deterministic 61.9% theme / 81.0% severity agreement; Groq `gpt-oss-120b` 66.7% / 71.4%.
- Limits: few records past month 1, and onboarding segment unknown for about half the records. See [`research/data/phase2/PHASE2_REPORT.md`](research/data/phase2/PHASE2_REPORT.md).

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

- **Backend → Railway.** Builds `groww-sip-discovery/backend/Dockerfile` with the monorepo as context (`groww-sip-discovery/railway.json`). The BGE model is baked into the image. Health check: `/api/health`.
- **Frontend → Vercel.** Project root `groww-sip-discovery/frontend` (`vercel.json`), build `pnpm build`, output `dist`.

## Data note

The corpus is public user-generated content (app-store reviews, YouTube comments, public forum posts), collected for product research. Author names and handles were not stored; phone numbers, emails, UPI IDs and similar details are flagged in the raw data and masked by the pipeline before analysis.
