/**
 * Investor-facing copy that explains rather than persuades. Kept in one place so a test can run all of it through
 * the shared SEBI enforcer and an urgency-word check (no fund picks, no return claims, no fear or FOMO).
 */
import type { FailureReason, MandateState, RecoveryAction, SipHealth } from './outcome'
import type { InstallmentStatus } from './schedule'

export const COPY = {
  mandateHeadline: 'This is a limit, not a charge',
  mandateBody:
    'Your bank or UPI app will show a bigger number than your SIP. That number is the most that can ever be taken in ' +
    'one debit. Each month, only your SIP amount is debited.',
  validityTitle: 'Valid until you cancel',
  validityBody:
    'The end date on the mandate may be decades away. It only means the SIP does not stop on its own. You can pause or ' +
    'cancel it whenever you like, without a charge from us.',
  cutoffTitle: 'Changes need 3 working days',
  cutoffBody:
    'About 3 working days before each debit, the request is sent to your bank. A skip, pause or amount change made ' +
    'after that applies from the next instalment.',
  holidayNote: 'Bank holidays can move these dates by a day or two.',
  bounceNote:
    'If the money is not in your account on the debit day, your bank may charge a fee for the failed debit. That fee ' +
    'comes from your bank, not from us.',
  upiOption: 'UPI Autopay',
  upiOptionHint: 'Approve in your UPI app. Up to ₹15,000 per debit.',
  enachOption: 'Bank mandate (e-NACH)',
  enachOptionHint: 'Approve with net banking or debit card. Takes a few days to register.',
  upiRevokeNote:
    'This mandate also shows up in your UPI app. Cancelling it there stops your SIP debits too.',
  doneTitle: 'Your SIP is set up',
  doneBody: 'Nothing is debited today. Your first instalment follows the schedule below.',
} as const

export const STATUS_COPY: Record<InstallmentStatus, { title: string; body: string }> = {
  open: {
    title: 'Scheduled',
    body: 'Nothing has left your account yet. You can still skip or change this instalment.',
  },
  locked: {
    title: 'Request sent to your bank',
    body:
      'Your bank has the debit request. Changes you make now apply from the next instalment; this one will be ' +
      'debited as planned.',
  },
  processing: {
    title: 'Debited, units on the way',
    body:
      'The money has left your bank and is on its way to the fund. The app can show this as "in progress" until ' +
      'units are allotted. Your money is not lost.',
  },
  allotted: {
    title: 'Units in your account',
    body: 'Units for this instalment are allotted. They show in your holdings at that day’s NAV.',
  },
}

export function changeEffectCopy(applies: 'this' | 'next', nextDate: string): string {
  return applies === 'this'
    ? 'This change applies to this instalment.'
    : `This instalment is already with your bank, so this change applies from the next one on ${nextDate}.`
}

/*
 * ── Failed-instalment copy (MVP_ImplementationPlan.md Step 2) ──────────────────────────────────────────────
 * Rules: say plainly whether money left the account and whether the SIP is still on; say the bounce fee comes
 * from the bank; no jargon ("automatic payments", not "mandate"; never NACH / NPCI); no urgency, fear or guilt.
 * Amounts and dates arrive already formatted (formatINR, formatDay).
 */

export interface FailureCopy {
  /** e.g. "This month's ₹1,000 didn't go through" */
  title: (amount: string) => string
  /** What happened, in one or two sentences. */
  whatHappened: (date: string) => string
  /** Why it usually happens; shown under "Why did this happen?". */
  why: string
}

export const FAILURE_COPY: Record<FailureReason, FailureCopy> = {
  insufficient_balance: {
    title: (amount) => `This month's ${amount} didn't go through`,
    whatHappened: (date) =>
      `There wasn't enough money in your bank account on ${date}, so your bank couldn't complete the debit.`,
    why: 'This usually happens when the SIP date comes before your salary arrives, or the balance dips just before payday.',
  },
  mandate_revoked: {
    title: (amount) => `This month's ${amount} wasn't taken`,
    whatHappened: (date) =>
      `Automatic payments for this SIP were turned off in a UPI app such as PhonePe, Google Pay or BHIM, so the debit on ${date} wasn't sent to your bank.`,
    why: 'Turning off automatic payments in a UPI app also stops your SIP debits, even though the SIP still shows here.',
  },
  mandate_not_active: {
    title: (amount) => `This month's ${amount} wasn't taken`,
    whatHappened: (date) =>
      `Your automatic payments aren't set up right now, so the debit on ${date} wasn't sent to your bank.`,
    why: 'This happens when the approval in your UPI app or bank wasn’t completed, or the setup has ended.',
  },
  bank_technical: {
    title: (amount) => `This month's ${amount} didn't go through`,
    whatHappened: (date) => `Your bank couldn't process the debit on ${date} because of a problem on its side.`,
    why: 'Bank maintenance or a network timeout can stop a debit. Nothing you did caused it.',
  },
  unknown: {
    title: (amount) => `This month's ${amount} didn't go through`,
    whatHappened: (date) => `The debit on ${date} didn't go through, and your bank didn't share a reason.`,
    why: 'Banks don’t always send a reason. Support can look it up with your bank for you.',
  },
}

/** The three facts at the top of the failed-instalment screen. */
export const FACT_COPY = {
  money: 'No money was taken for this instalment.',
  sip: (mandate: MandateState, nextDate: string): string =>
    mandate === 'active'
      ? `Your SIP is still on. Next debit: ${nextDate}.`
      : 'Automatic payments are off, so future instalments won’t be taken until you turn them back on.',
  bankCharge: (likely: 'likely' | 'possible' | 'no'): string =>
    likely === 'likely'
      ? 'Your bank may charge a fee for a failed debit. That fee comes from your bank, not from us.'
      : likely === 'possible'
        ? 'Some banks charge a fee when a debit fails. If yours does, it comes from your bank, not from us.'
        : 'This debit never reached your bank, so there is no bank charge for it.',
}

/** "What's this?" expander for the one term we can't avoid. */
export const AUTOPAY_EXPLAINER = {
  title: 'What are automatic payments?',
  body:
    'Your permission for this SIP to be debited each month, up to a limit. Banks and UPI apps call it a mandate. ' +
    'The limit is a ceiling, not the amount taken.',
}

export interface ActionCopy {
  label: string
  hint: (v: { amount: string; nextDate: string }) => string
}

export const ACTION_COPY: Record<RecoveryAction, ActionCopy> = {
  pay_now: {
    label: 'Pay this month now',
    hint: ({ amount }) => `A one-time payment of ${amount} for this instalment only. Your automatic payments stay as they are.`,
  },
  reconnect_mandate: {
    label: 'Turn automatic payments back on',
    hint: () => 'Approve it again in your UPI app or bank. Future instalments are then taken as usual.',
  },
  skip: {
    label: 'Skip this month',
    hint: ({ nextDate }) => `Nothing is taken for this month. Your SIP carries on from ${nextDate}.`,
  },
  contact_support: {
    label: 'Ask support what happened',
    hint: () => 'Support can check the reason with your bank.',
  },
}

export const PAY_NOW_CLOSED = (nextDate: string): string =>
  `This month can no longer be paid. Your next instalment is on ${nextDate}.`

export const CONFIRMATION_COPY = {
  paid: (unitsBy: string): string => `Payment received. Units for this instalment usually show by ${unitsBy}.`,
  skipped: (nextDate: string): string => `This month is skipped. Your next instalment is on ${nextDate}.`,
  reconnected: (nextDate: string): string => `Automatic payments are back on. Your next instalment is on ${nextDate}.`,
}

/** Alerts sent on the day of a failure. SMS must stay within 160 characters. */
export const ALERT_COPY = {
  banner: (amount: string): string => `Your ${amount} SIP instalment didn't go through. No money was taken.`,
  bannerAction: 'See what happened',
  pushTitle: 'SIP instalment not completed',
  pushBody: (amount: string, date: string): string =>
    `Your ${amount} instalment on ${date} didn't go through. No money was taken. Tap to see why and your options.`,
  sms: (amount: string, date: string): string =>
    `Your ${amount} SIP instalment on ${date} didn't go through. No money was taken. Open the app to see why and what you can do.`,
}

export const SMS_MAX_LENGTH = 160

export const STATUS_CARD_COPY: Record<SipHealth, { title: string; body: (v: { amount: string; nextDate: string }) => string }> = {
  running: {
    title: 'Your SIP is running',
    body: ({ amount, nextDate }) => `Next debit: ${amount} on ${nextDate}.`,
  },
  needs_attention: {
    title: 'Your last instalment didn’t go through',
    body: () => 'No money was taken. See what happened and your options.',
  },
  autopay_off: {
    title: 'Automatic payments are off',
    body: () => 'Future instalments won’t be taken until you turn them back on.',
  },
}

/**
 * Copy waiting on compliance (MVP_ImplementationPlan.md open question 2). Not rendered while the flag is false.
 */
export const SHOW_PENDING_COMPLIANCE = false
export const PENDING_COMPLIANCE_COPY = {
  creditScore:
    'A failed SIP debit isn’t a missed loan payment, so it isn’t reported to credit bureaus and doesn’t affect your credit score.',
}

/** Tracker timeline step titles and notes (MVP_ImplementationPlan.md Step 3). */
export const TIMELINE_COPY = {
  scheduled: 'Scheduled',
  scheduledNote: (cutoff: string): string => `Changes possible until ${cutoff}`,
  sent: 'Request sent to your bank',
  sentNote: 'Changes now apply from the next instalment',
  notSent: 'Not sent to your bank',
  notSentNote: 'Automatic payments were off',
  debited: (amount: string): string => `${amount} debited`,
  debitedNote: 'Money leaves your bank',
  notTaken: (amount: string): string => `${amount} not taken`,
  notTakenNote: 'No money was taken',
  paid: (amount: string): string => `${amount} paid by you`,
  paidNote: 'One-time payment for this instalment',
  skipped: 'Skipped',
  skippedNote: 'Nothing taken this month',
  units: 'Units in your account',
  unitsNote: 'Usually by this day',
}

/** Status headline for states the date-based STATUS_COPY doesn't cover. */
export const OUTCOME_STATUS_COPY = {
  paid: { title: 'Paid, units on the way' },
  skipped: { title: 'Skipped this month' },
}

/** Labels on the failed-instalment screen (MVP_ImplementationPlan.md Step 4). */
export const FAILED_SCREEN_COPY = {
  heading: (n: number): string => `Instalment #${n}`,
  factsTitle: 'What this means',
  whyTitle: 'Why did this happen?',
  back: 'Back to tracker',
  open: 'See what happened',
  notFailed: 'This instalment has no problem to sort out.',
}

/** Recovery screens (MVP_ImplementationPlan.md Step 5). */
export const RECOVERY_COPY = {
  actionsTitle: 'What you can do',
  payTitle: (n: number): string => `Pay instalment #${n}`,
  payBody: 'This is a one-time payment for this month only. Nothing changes for your future instalments.',
  payButton: (amount: string): string => `Pay ${amount} with UPI (simulated)`,
  reconnectTitle: 'Turn automatic payments back on',
  doneTitle: 'Done',
  supportSent: 'Your request has gone to support. They’ll reply in the app with what your bank says.',
}

/** Eyebrow on the status card (MVP_ImplementationPlan.md Step 7). */
export const STATUS_CARD_LABEL = 'Is my SIP running?'
