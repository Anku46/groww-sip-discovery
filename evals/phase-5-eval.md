# Phase 5 Eval — Frontend Build on Vercel

> Source: [ImplementationPlan.md § Phase 5](../ImplementationPlan.md)
> Type: **Component tests (Vitest + Testing Library) + E2E (Playwright) + manual a11y audit**
> Code under test: `frontend/src/**`, against local backend

---

## 1. Objective

Make sure every tab **shows the backend's data correctly, responds to interaction, handles loading/error states, and is accessible** before going to production.

---

## 2. Eval Cases by Step

### 5.1 — Scaffold & Design System

| ID | Test | Pass Criteria |
| :-- | :-- | :-- |
| P5-1.1 | `pnpm dev` | Starts without errors; body background computes to `#0F172A` |
| P5-1.2 | `pnpm build` | Succeeds; `tsc` clean |
| P5-1.3 | Tokens | All 5 Okabe-Ito/Navy tokens defined in `tokens.css` and used via Tailwind |
| P5-1.4 | Fonts | Inter (body) and JetBrains Mono (code/JSON) load |
| P5-1.5 | Dev proxy | `/api/health` via Vite proxy returns 200 |

### 5.2 — Shell & Tab Navigation

| ID | Test | Pass Criteria |
| :-- | :-- | :-- |
| P5-2.1 | Routes | All 4 hash routes render their tab |
| P5-2.2 | Active state | Active tab has teal underline + `aria-current="page"` |
| P5-2.3 | Deep link + refresh | Reloading on `#/tab3` keeps Tab 3 |
| P5-2.4 | ErrorBoundary | Forced throw in a tab shows fallback UI, other tabs still work |
| P5-2.5 | Gear icon | Visible, opens Settings drawer (once 5.9 exists) |

### 5.3 — UI Primitives

| ID | Component | Pass Criteria |
| :-- | :-- | :-- |
| P5-3.1 | `Badge` | All 4 variants render with correct colors |
| P5-3.2 | `SeverityDots` | Values 1–5 fill correct dots **and** show numeric text; out-of-range clamps |
| P5-3.3 | `ConstraintFlag` | BLOCK / DOWNGRADE / WARN each show distinct icon + label |
| P5-3.4 | `Accordion` | Toggle opens/closes; `aria-expanded` updates |
| P5-3.5 | `Tooltip` | Shows on hover **and** keyboard focus |
| P5-3.6 | `LoadingShimmer` | Renders; respects `prefers-reduced-motion` |

### 5.4 — API Client & Store

| ID | Test | Pass Criteria |
| :-- | :-- | :-- |
| P5-4.1 | Base URL | Axios uses `VITE_API_BASE_URL` |
| P5-4.2 | Hooks happy path (MSW mocks) | Each hook goes loading → data |
| P5-4.3 | Hooks error path | 500 / network error → error state, no crash |
| P5-4.4 | Typed responses | Response types imported from `shared/` (no duplicate type definitions) |
| P5-4.5 | Store updates | Changing `severityMultiplier` / `rawInput` re-renders subscribers only |
| P5-4.6 | Stale requests | Rapid filter changes → only latest response applied |

### 5.5 — Tab 1: Live Discovery Pipeline

| ID | Test | Pass Criteria |
| :-- | :-- | :-- |
| P5-5.1 | Each quick-load chip | Fills textarea; character counter updates |
| P5-5.2 | Run | Spinner shows; `aria-busy=true` on viewer; button disabled while running |
| P5-5.3 | Sequential animation | Stage cards appear 1 → 2 → 3 → 4 in order |
| P5-5.4 | Stage 1 card | Before/after diff, PII pills, Hinglish mapping table match API response |
| P5-5.5 | Stage 2 card | Rule cards match API; expand/collapse works |
| P5-5.6 | Stage 3 card | Lifecycle, segment, severity badges + raw JSON toggle match API |
| P5-5.7 | Stage 4 card — SEBI chip | Red banner, flag listed, addressability bar at 0.2 |
| P5-5.8 | Stage 4 card — clean chip | Green panel, no flags |
| P5-5.9 | Engine badge | Shows `deterministic` / `llm` / `fallback` per response |
| P5-5.10 | Empty input | Run disabled or shows validation message |
| P5-5.11 | Backend error | Friendly error message, can retry |

### 5.6 — Tab 2: Opportunity Matrix & Discovery Questions

| ID | Test | Pass Criteria |
| :-- | :-- | :-- |
| P5-6.1 | Corpus bar | Total + per-channel pills equal `/api/corpus/summary` |
| P5-6.2 | Table data | Rows equal `/api/themes/score` default output, in order |
| P5-6.3 | Sorting | Each column sorts asc/desc; `aria-sort` updates |
| P5-6.4 | Severity slider | Debounced backend call; table + chart re-rank to match API |
| P5-6.5 | SEBI toggle | SEBI-restricted themes drop/rise as expected |
| P5-6.6 | Chart | Bar lengths proportional to scores; color by addressability; has text labels |
| P5-6.7 | 9 accordions | All 9 questions present; each expands to show answer + supporting quotes |

### 5.7 — Tab 3: Dataset Explorer

| ID | Test | Pass Criteria |
| :-- | :-- | :-- |
| P5-7.1 | Search | Debounced (~300ms); live count matches table rows |
| P5-7.2 | Each filter group | Multi-select within group; results match API |
| P5-7.3 | Combined (search + 4 filters) | AND logic; matches `/api/corpus/verbatims` with same params |
| P5-7.4 | No results | Empty state with "clear filters" |
| P5-7.5 | Pagination | Next/prev/page count correct; resets to page 1 on filter change |
| P5-7.6 | Row expand | Detail panel shows full verbatim + all tags |

### 5.8 — Tab 4: AI Evidence Log & Golden Set

| ID | Test | Pass Criteria |
| :-- | :-- | :-- |
| P5-8.1 | Scorecard | Theme % and Severity % equal `/api/golden-set/agreement` |
| P5-8.2 | Table | 20 rows; human vs AI labels shown side by side |
| P5-8.3 | Match icons | ✅/⚠️/❌ per `MatchStatus`; icons have text alternatives |
| P5-8.4 | Correction cards | ≥ 3 cards; each shows AI said → Wrong because → Correct answer → Rule applied |

### 5.9 — Settings Drawer

| ID | Test | Pass Criteria |
| :-- | :-- | :-- |
| P5-9.1 | Key input | Masked by default; show/hide toggle |
| P5-9.2 | Validate — valid key | ✅ indicator |
| P5-9.3 | Validate — invalid key | ❌ indicator, no crash |
| P5-9.4 | Engine toggle | Auto / Force Deterministic / Force LLM → next Tab 1 run's engine badge reflects choice |
| P5-9.5 | Health indicator | Green when backend up; red when backend stopped |
| P5-9.6 | Session-only | Key not in `localStorage`; gone after tab close; notice visible |
| P5-9.7 | Focus | Drawer traps focus; Esc closes; focus returns to gear |

### 5.10 — Responsive & Accessibility

| ID | Test | Pass Criteria |
| :-- | :-- | :-- |
| P5-10.1 | 768px | All tabs usable; no horizontal scroll; tabs collapse properly |
| P5-10.2 | 375px | Usable (bonus; required for Phase 6 mobile smoke test) |
| P5-10.3 | Keyboard-only walkthrough | Every interactive element reachable; visible teal focus ring |
| P5-10.4 | axe-core scan on all 4 tabs + drawer | 0 serious/critical violations |
| P5-10.5 | Icon buttons | All have `aria-label` |
| P5-10.6 | Tables | All `<th scope="col">` |
| P5-10.7 | Color independence | Severity, SEBI status, match status readable in grayscale |
| P5-10.8 | Contrast | Text ≥ 4.5:1, large text/UI ≥ 3:1 on navy/slate |

---

## 3. Cross-cutting

| ID | Check | Pass Criteria |
| :-- | :-- | :-- |
| P5-X1 | Console | 0 errors, 0 CORS errors across full E2E run |
| P5-X2 | Data fidelity | No hard-coded research data in frontend — everything comes from API |
| P5-X3 | Loading states | Every data view shows shimmer while loading |

---

## 4. Scoring

| Severity | Cases | Rule |
| :-- | :-- | :-- |
| **Blocking** | 1.1, 1.2, 2.1, 2.2, 4.2, 4.3, 5.1–5.7, 6.1–6.4, 6.7, 7.1–7.3, 8.1–8.4, 9.2–9.4, 9.6, 10.1, 10.3, 10.4, X1, X2 | Any failure → Phase 5 not done |
| **Major** | Everything else | ≤ 3 failures, with tickets |

---

## 5. Sign-off

| Field | Value |
| :-- | :-- |
| Component tests | ___ passed / ___ total |
| Playwright E2E | ___ passed / ___ total |
| axe serious/critical | ___ |
| Console errors | ___ |
| Reviewer / date | ___ |
| Result | ☐ PASS ☐ FAIL |
