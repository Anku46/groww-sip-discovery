# First SIP: Failed-Instalment Recovery (MVP)

An investor-facing prototype that helps first-time SIP investors recover when a monthly instalment fails, so the SIP keeps running instead of quietly lapsing.

> **This is the `mvp` branch.** It holds only the MVP and has its own history.
> The research and the **SIP Discovery Engine** that found this problem live on the [`main` branch](https://github.com/Anku46/groww-sip-discovery/tree/main).

## Why this problem

The discovery engine's research found the first failed debit is where first-time investors drop off: 20 of 27 survey respondents had an instalment fail, get skipped or get paused, and only 2 of those 20 are still active. 13 did nothing after the failure, and none of those 13 are still active. What turns a small failure into a stop is no alert, jargon statuses, no way to pay the missed month, and a bank charge blamed on the app. Details: [PHASE2_REPORT.md on main](https://github.com/Anku46/groww-sip-discovery/blob/main/research/data/phase2/PHASE2_REPORT.md).

## What the prototype does

- **Setup with a clear mandate review:** the monthly debit next to the autopay limit (₹500 vs ₹15,000), explaining the limit is a ceiling, not a charge.
- **Instalment tracker:** scheduled → request sent to bank → debited → units, with "where your money is" in plain language.
- **Failed-instalment screen:** what happened, whether money left the account (it didn't), whether the SIP is still on, and who charges any bank fee.
- **Recovery:** pay this month now (one-time, simulated), turn automatic payments back on, skip this month, or ask support. Each ends on a calm confirmation.
- **Guardrails:** every line of text is tested against the SEBI checker (no fund picks, no return claims, no urgency or fear) and a payment-jargon ban.
- **Prototype controls:** pick an instalment, move "today", and simulate any of five failure reasons.

Everything is simulated in the browser: no real payments, mandates or notifications.

## Docs

| File | What it is |
| :-- | :-- |
| [MVP_ImplementationPlan.md](MVP_ImplementationPlan.md) | Step-by-step plan, scope, open questions |
| [MVP_Architecture.md](MVP_Architecture.md) | Domain model, instalment lifecycle, screens, compliance, path to a real build |

**Progress:** Steps 1–5 of the plan are done (outcome model, failure copy, simulation, failed-instalment screen, recovery actions). Next: failure alert, status card, event funnel, deploy.

## Run it

Requires Node.js 20+ and pnpm 10.

```bash
cd mvp
pnpm install
pnpm dev          # http://localhost:5174 (add ?debug for the event log)
pnpm test
pnpm typecheck
pnpm build
```

## Link to the discovery engine

The MVP does not depend on the engine's code. Its one shared piece, the SEBI constraint checker, is copied into [`mvp/src/lib/sebi.ts`](mvp/src/lib/sebi.ts) with the source commit noted at the top; [`mvp/src/test/sebi.test.ts`](mvp/src/test/sebi.test.ts) guards the copy. If the engine's checker changes on `main`, copy it across.
