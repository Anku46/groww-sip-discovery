# Phase 1 — Document Fetcher

Collects the raw voice-of-customer corpus for [Phase 1 of the implementation plan](../ImplementationPlan.md) from the 5 source channels and writes one CSV for Phase 2 to work from.

| Channel | How it's fetched | Needs |
| :-- | :-- | :-- |
| Google Play Store | `google-play-scraper`, Groww Android app, 1–3 stars, SIP-related reviews only | nothing |
| Apple App Store | Apple's public customer-reviews RSS feed (max 500 most recent), 1–3 stars | nothing |
| Reddit | r/personalfinanceindia + r/IndiaInvestments search, plus comments from the most-discussed SIP threads | nothing (public `.json` endpoints, no OAuth; Reddit may return 403 from some networks) |
| YouTube | Data API v3: search SIP tutorial/review videos, then pull their comments + replies | `YOUTUBE_API_KEY` |
| FinTech forums | Discourse JSON API on TradingQ&A and ValuePickr | nothing |
| Quora | No public API, so add records by hand in `data/manual/` | — |

## Setup

```bash
cd research
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
cp .env.example .env
```

Then fill in `.env`:

- **YouTube key:** Google Cloud Console → enable *YouTube Data API v3* → Credentials → API key.
- **Reddit:** no key needed. If it returns 403 on your network, add posts by hand in `data/manual/`.

Keys are read only from `.env` or the environment, and are never written to the output or logs.

## Run

```bash
.venv/Scripts/python -m fetcher                       # all channels
.venv/Scripts/python -m fetcher --channels reddit,youtube
.venv/Scripts/python -m fetcher --merge-only          # rebuild CSV from cache + manual files, no network
.venv/Scripts/python -m fetcher --quick               # small limits, writes to data_quick/ (smoke test)
```

Each channel caches its own results in `data/raw/channels/<channel>.jsonl`, so you can re-run one channel without re-fetching the others. If a channel fails, its previous cache is kept.

Change queries, subreddits, star filters and limits in [fetcher/config.py](fetcher/config.py).

## Output (`data/raw/`)

| File | What it is |
| :-- | :-- |
| `raw_corpus.csv` | The Phase 1 corpus (UTF-8 with BOM so Excel shows Hindi correctly) |
| `corpus_summary.json` | Total raw count, per-channel / per-language counts, PII-flagged, duplicates removed |
| `collection_log.md` | Per-channel run time, search terms, limits, and notes/errors (the record of how the corpus was collected) |

CSV columns:

| Column | Notes |
| :-- | :-- |
| `id` | Stable unique ID, e.g. `RD-3f9a1c2b7e` (channel prefix + hash) |
| `source` | `PlayStore` / `AppStore` / `Reddit` / `YouTube` / `Forum` |
| `subSource` | Subreddit, forum name, video ID, app ID |
| `recordType` | `review` / `post` / `comment` / `reply` / `forum_post` / `manual` |
| `rawText` | Verbatim text. Where the platform has a title (Reddit post, App Store review, forum topic), it is prepended. |
| `language` | `English` / `Hinglish` / `Hindi`. A heuristic: spot-check it (eval P1-C3). |
| `date` | `YYYY-MM-DD` or `unknown` |
| `url` | Link back to the record |
| `rating` | Store star rating (store reviews only) |
| `containsPII` / `piiTypes` | Phone / email / UPI / bank account / PAN detected. Kept as-is; useful as Stage 1 test inputs later. |
| `matchedKeywords` | SIP / mutual-fund terms found. Empty means probably off-topic; Phase 2 filters further. |
| `searchTerm` | Query that surfaced the record |
| `fetchedAt` | When it was fetched (UTC) |

Usernames and author handles are never stored.

Cleaning applied: texts of 10 characters or fewer are dropped, and duplicates (same channel, same text ignoring case and punctuation) are removed.

## Manual records (Quora etc.)

Copy `data/manual/_template.csv` to a new file (any name not starting with `_`), paste one record per row, then run `--merge-only`. `source` must be one of the 5 channel names (use `Forum` with `subSource=Quora`). Keep `rawText` exactly as written.

## Tests

```bash
.venv/Scripts/python -m unittest discover -s tests -v
```

## Checking against the eval

Use [evals/phase-1-eval.md](../evals/phase-1-eval.md). `corpus_summary.json` and `collection_log.md` give you the numbers for A1–A6, B1–B6, D2 and E1–E3. Verbatim fidelity (C1), language accuracy (C3) and relevance (C4) still need a manual spot-check.
