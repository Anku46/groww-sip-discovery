# MVP Implementation Plan: Failed-Instalment Recovery

> This branch (`mvp`) holds only the MVP. The research and discovery engine that led to it are on [`main`](https://github.com/Anku46/groww-sip-discovery/tree/main).

## 1. What we are building and why

**Problem.** The first failed debit is where first-time SIP investors drop off. In the Phase 2 research, 20 of 27 survey respondents had an instalment fail, get skipped or get paused, and only 2 of those 20 are still active. 13 of 27 did nothing after the failure, and none of those 13 are still active. The failure itself is often small (salary arrived late, a bank glitch). What turns it into a stop is:

- no alert, or a jargon status ("Mandate Expired", "In Progress", "Paused/Pending");
- no explanation of whether money left the account or whether the SIP is still on;
- no way to pay the missed month;
- a bank bounce charge that the investor blames on the app.

**MVP goal.** When an instalment fails, the investor learns about it, understands it in plain language, and can recover in one step, so the SIP keeps running.

**Starting point.** `mvp/` already has:
- a setup flow with the mandate-limit explainer (₹15,000 is a ceiling, not a charge);
- an installment schedule with the T-3 cutoff (`src/lib/schedule.ts`);
- a tracker timeline (scheduled → sent to bank → debited → units);
- copy checked against the shared SEBI enforcer (`src/lib/copy.ts`, `src/test/copy.test.ts`);
- an in-memory event log (`src/lib/track.ts`, open with `?debug`).

This plan extends that package. It stays a frontend-only, simulated prototype: no real payments, mandates or notifications.

**Success metric (for a real rollout, not the prototype).** Of investors whose instalment fails, the share who pay that month or reconnect autopay within 7 days. Secondary: share still active at month 4, and 12-month continuation against a control group.

---

## 2. Scope

**In scope**
1. Failure states and plain-language reasons in the domain model.
2. A failed-instalment screen: what happened, whether money moved, whether the SIP is still on, what to do.
3. Recovery actions: pay this month now (simulated), reconnect autopay, or skip this month.
4. A failure alert (in-app banner plus a preview of the push/SMS text).
5. A single "Is my SIP running?" status card.
6. Events and a funnel view for the recovery flow.

**Stretch (only if steps 1–8 are done)**
- Salary-aware SIP date at setup.
- Balance reminder the day before the debit.

**Out of scope**
- Real UPI, NACH or notification integrations.
- Fund picks, return figures or anything SEBI-restricted.
- Months 9–12 behaviour (no research data yet).

---

## 3. Step-by-step plan

Each step lists the files it touches and when it counts as done. Steps run in order; each one ends with `pnpm typecheck` and `pnpm test` green in `mvp/`.

### Step 1: Model instalment outcomes

**Files:** `mvp/src/lib/schedule.ts`, `mvp/src/lib/outcome.ts` (new), `mvp/src/lib/sipState.ts` (new reducer, see [MVP_Architecture.md](MVP_Architecture.md) §4), `mvp/src/test/outcome.test.ts` and `sipState.test.ts` (new)

- Add failure reasons:
  - `insufficient_balance`: money was not in the account on debit day.
  - `mandate_revoked`: autopay was turned off in a UPI app (PhonePe, Google Pay, BHIM).
  - `mandate_not_active`: the mandate expired or never finished registering.
  - `bank_technical`: the bank or NPCI could not process it (downtime, timeout).
  - `unknown`: no reason came back.
- Add outcome states on top of the existing `open | locked | processing | allotted`:
  - `failed` (with a reason), `paid_manually`, `skipped`.
- Pure functions:
  - `sipStillActive(reason)`: false only for `mandate_revoked` and `mandate_not_active`.
  - `moneyLeftAccount(reason)`: always false for a failed debit (only a bank charge may apply).
  - `recoveryOptions(reason, today, inst, next)`: which actions to offer, and the last day "pay now" is offered (assumption for the prototype: until 3 working days before the next instalment's cutoff, so the two never overlap).
  - `bankChargeApplies(reason)`: true for `insufficient_balance`; possible for others.

**Done when:** unit tests cover every reason × action, the pay-now window, and month/year rollover.

### Step 2: Write the failure copy

**Files:** `mvp/src/lib/copy.ts`, `mvp/src/test/copy.test.ts`

For each reason, write a title, a one-line "what happened", and a "what this means" line. Rules:
- Say plainly whether money left the account ("No money was taken for this instalment").
- Say whether the SIP is still on and when the next debit is.
- Say who charges the bounce fee: the bank, not the app, with a typical range only if confirmed (see open questions).
- No jargon: "your automatic payment" rather than "mandate"; keep "mandate" only in a "what's this?" tooltip.
- No urgency, fear or guilt (SEBI no-FOMO rule): no countdowns, no "act now", no red alarm styling.

Also write the alert text (push and SMS previews, 160 characters max for SMS).

**Done when:** every new string passes the existing SEBI and urgency-word tests, and a new test checks SMS length.

**Hold:** the credit-score reassurance ("a failed SIP debit is not reported to credit bureaus") stays out of the copy until compliance confirms it (open question 2).

### Step 3: Simulate a failure in the tracker

**Files:** `mvp/src/components/Tracker.tsx`, `mvp/src/App.tsx`

- Add a prototype control next to "Pretend today is": **Simulate outcome** with options *Debit succeeds* and one per failure reason.
- When a failure is chosen and the simulated date is on or after the debit date, the timeline stops at the debit step and shows it as failed (neutral icon, amber not red).

**Done when:** each reason can be reached from the tracker, and the timeline never shows "units in your account" for a failed instalment.

### Step 4: Build the failed-instalment screen

**Files:** `mvp/src/components/FailedInstalment.tsx` (new), `mvp/src/components/Tracker.tsx`

Layout, top to bottom:
1. Title: what happened, in one line ("This month's ₹1,000 didn't go through").
2. Three facts, each with an icon:
   - Money: "No money was taken for this instalment."
   - SIP: "Your SIP is still on. Next debit: Mon, 7 Dec." (or "Autopay is off, so future instalments won't be debited.")
   - Bank charge: who may charge it, and that it isn't from the app.
3. Why it happened: the reason in plain language, with a "what's this?" expander.
4. Actions (Step 5).

**Done when:** the screen renders correctly for all five reasons at 375px width, and a component test checks the facts shown for each.

### Step 5: Add recovery actions

**Files:** `mvp/src/components/FailedInstalment.tsx`, `mvp/src/components/PayNow.tsx` (new), `mvp/src/components/SetupFlow.tsx` (reuse the mandate review)

| Reason | Primary action | Secondary |
| :-- | :-- | :-- |
| `insufficient_balance` | Pay this month now | Skip this month |
| `bank_technical` | Pay this month now | Skip this month |
| `unknown` | Pay this month now | Contact support |
| `mandate_revoked` | Turn autopay back on | Pay this month now |
| `mandate_not_active` | Set up autopay again | Pay this month now |

- **Pay this month now:** a one-time payment for this instalment only (simulated UPI confirm). Copy states it does not change future autopay debits. On success the instalment becomes `paid_manually` and the timeline continues to "units by …".
- **Turn autopay back on:** reuses the mandate review step from setup (limit vs monthly amount, valid until you cancel).
- **Skip this month:** marks the instalment `skipped`; the SIP stays on. No guilt copy.
- Offer pay-now only inside the window from Step 1; after it closes, show "This month can no longer be paid. Your next instalment is on …".

**Done when:** each path ends in a clear confirmation, status updates in the timeline, and component tests cover pay-now, reconnect and skip.

### Step 6: Add the failure alert

**Files:** `mvp/src/components/AlertBanner.tsx` (new), `mvp/src/components/NotificationPreview.tsx` (new), `mvp/src/App.tsx`

- In-app banner at the top of the tracker when the current instalment has failed, linking to the failed-instalment screen.
- A preview panel showing the push and SMS text that would be sent on the day of failure (prototype only, labelled as a preview).

**Done when:** the banner appears when the latest due instalment has failed and disappears once it is paid or skipped, or once a later instalment debits successfully.

**As built:** the banner is about the latest due instalment only, so it never stacks. Reconnecting autopay doesn't clear it on its own: the missed month is still unpaid, so the banner stays until that month is paid or skipped (matches `sipHealth`). When the banner covers the selected instalment, the tracker hides its own "See what happened" button so the action appears once.

### Step 7: Add a "Is my SIP running?" status card

**Files:** `mvp/src/components/SipStatusCard.tsx` (new), `mvp/src/App.tsx`

One card at the top of the app with one of three states, worked out from the outcome model:
- **Running:** next debit date and amount.
- **Needs attention:** last instalment failed; link to the failed-instalment screen.
- **Autopay off:** future instalments won't be debited; link to turn it back on.

This targets the 5 of 30 survey respondents who were "not sure if it's running".

**Done when:** the card agrees with the tracker in every simulated scenario (tested).

**As built:** the card also carries the Step 6 failure alert, so the top of the tracker says it once instead of a banner and a card repeating each other. *Needs attention* links to the failed instalment; *Autopay off* has "Turn automatic payments back on" (straight to the mandate review) plus the failure link. The separate `AlertBanner` component was removed; the push/SMS preview stays.

### Step 8: Instrument the recovery funnel

**Files:** `mvp/src/lib/track.ts`, `mvp/src/App.tsx`

New events:
- `instalment_failed` (reason)
- `failure_alert_viewed`
- `failure_screen_viewed` (reason)
- `recovery_started` (action: pay_now, reconnect, skip)
- `recovery_completed` (action)
- `status_card_viewed` (state)

Extend the `?debug` panel with a simple funnel: failed → screen viewed → recovery started → recovery completed.

**Done when:** a component test walks a failure through to recovery and checks the event sequence.

### Step 9: Verify, document and deploy

- Run `pnpm typecheck` and `pnpm test` from `mvp/`.
- Click through every reason × action at phone width in the browser; check there are no console errors.
- Update `README.md`: what it does, simplifications, how to run it.
- Deploy `mvp/` as a static site on Vercel, the same way as the engine's dashboard (build locally, upload `dist/`).

**Done when:** all tests pass, the walkthrough is clean, and there is a live URL.

### Step 10 (stretch): Prevent the failure

Only after Steps 1–9.
- **Salary-aware date:** at setup, ask "Which day does your salary usually arrive?" and suggest a SIP date 2–3 working days later. Warn gently if the chosen date is before it.
- **Balance reminder:** a preview of a reminder the day before the debit ("₹1,000 SIP debit tomorrow. Keep it in your account to avoid a bank charge."), checked against the urgency-word test.

---

## 4. Validation after the build

- **Usability test:** 5 first-time investors from the survey pool who had a failed instalment. Task: "Your SIP failed this month; what do you do?" Measure whether they can say if money left, whether the SIP is on, and complete a recovery without help.
- **Copy test:** check that the plain-language reasons are understood by Hinglish speakers (they were over-represented in mandate confusion).
- **Readout:** a short write-up with what worked, what confused people and the go/no-go for a real build.

---

## 5. Open questions (resolve before any real build)

1. **Retry rules:** what NPCI and banks allow for re-presenting a failed UPI Autopay or NACH debit, and whether a one-time UPI payment for a missed month is allowed alongside an active mandate.
2. **Credit score claim:** confirm with compliance that a failed SIP debit is not reported to credit bureaus before using it in copy.
3. **Bank charges:** the typical bounce charge range to show (research saw ₹295–450), or whether to avoid a number.
4. **Failure reasons:** which reason codes the payment gateway actually returns, and how often it is `unknown`.
5. **Revoked mandates:** whether the platform is told when a mandate is revoked in a UPI app, and how fast.
6. **Data reconciliation:** the Phase 2 report cites a 27-response survey; `Google_Forms_Raw_Responses.csv` has 30. Settle which set the plan's numbers come from.

---

## 6. Order and rough effort

| Step | Effort | Depends on |
| :-- | :-- | :-- |
| 1. Outcome model | 0.5 day | – |
| 2. Failure copy | 0.5 day | 1 |
| 3. Simulate failure | 0.5 day | 1 |
| 4. Failed-instalment screen | 1 day | 2, 3 |
| 5. Recovery actions | 1 day | 4 |
| 6. Failure alert | 0.5 day | 4 |
| 7. Status card | 0.5 day | 1 |
| 8. Events and funnel | 0.5 day | 5, 6, 7 |
| 9. Verify, document, deploy | 0.5 day | all |
| 10. Stretch: prevention | 1 day | 9 |

About 5.5 days for Steps 1–9.
