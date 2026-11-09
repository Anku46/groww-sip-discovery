/**
 * Failure reasons, instalment states and recovery rules (MVP_Architecture.md §4).
 * Pure functions only: no React, no browser APIs, so the same rules can move to a backend later.
 */
import { addWorkingDays, CUTOFF_WORKING_DAYS, startOfDay, type Installment } from './schedule'

export type FailureReason =
  | 'insufficient_balance' // money not in the account on debit day
  | 'mandate_revoked' // autopay turned off in a UPI app
  | 'mandate_not_active' // expired or never finished registering
  | 'bank_technical' // bank / NPCI downtime or timeout
  | 'unknown' // no reason returned

export const FAILURE_REASONS: readonly FailureReason[] = [
  'insufficient_balance',
  'mandate_revoked',
  'mandate_not_active',
  'bank_technical',
  'unknown',
]

/** Reasons that switch autopay off for every later instalment until it is reconnected. */
export type MandateFailureReason = Extract<FailureReason, 'mandate_revoked' | 'mandate_not_active'>

export function isMandateFailure(reason: FailureReason): reason is MandateFailureReason {
  return reason === 'mandate_revoked' || reason === 'mandate_not_active'
}

export type MandateState = 'active' | 'revoked' | 'not_active'

export function mandateStateFor(reason: MandateFailureReason): MandateState {
  return reason === 'mandate_revoked' ? 'revoked' : 'not_active'
}

export type InstalmentState =
  | { kind: 'open' } // before the T-3 cutoff; changes apply to this instalment
  | { kind: 'locked' } // after the cutoff, before the debit
  | { kind: 'processing' } // debited, units pending
  | { kind: 'allotted' } // units in the account
  | { kind: 'failed'; reason: FailureReason; failedOn: Date }
  | { kind: 'paid_manually'; paidOn: Date; unitsBy: Date } // recovered with a one-time payment
  | { kind: 'skipped' }

export type InstalmentKind = InstalmentState['kind']

export type RecoveryAction = 'pay_now' | 'reconnect_mandate' | 'skip' | 'contact_support'

export type SipHealth = 'running' | 'needs_attention' | 'autopay_off'

/** The SIP keeps debiting only while its mandate is active. */
export function sipStillActive(mandate: MandateState): boolean {
  return mandate === 'active'
}

/** Whether the instalment amount left the investor's bank account. A failed debit never takes the instalment. */
export function moneyLeftAccount(state: InstalmentState): boolean {
  return state.kind === 'processing' || state.kind === 'allotted' || state.kind === 'paid_manually'
}

/**
 * Whether the investor's bank is likely to charge a failed-debit (bounce) fee. The fee comes from the bank,
 * not the investment app. A revoked or inactive mandate is never presented to the bank, so no fee.
 */
export function bankChargeLikely(reason: FailureReason): 'likely' | 'possible' | 'no' {
  if (reason === 'insufficient_balance') return 'likely'
  if (isMandateFailure(reason)) return 'no'
  return 'possible'
}

/**
 * Last day a missed instalment can be paid manually: 3 working days before the next instalment's cutoff, so a
 * manual payment and the next autopay debit never overlap. Prototype assumption; see open question 1.
 */
export function payNowDeadline(next: Installment): Date {
  return addWorkingDays(next.cutoff, -CUTOFF_WORKING_DAYS)
}

export function payNowOpen(today: Date, next: Installment): boolean {
  return startOfDay(today) <= payNowDeadline(next)
}

const OPTIONS: Record<FailureReason, readonly RecoveryAction[]> = {
  insufficient_balance: ['pay_now', 'skip'],
  bank_technical: ['pay_now', 'skip'],
  unknown: ['pay_now', 'contact_support'],
  mandate_revoked: ['reconnect_mandate', 'pay_now'],
  mandate_not_active: ['reconnect_mandate', 'pay_now'],
}

/**
 * Actions to offer for a failed instalment, primary first. Pay-now drops out once its deadline passes; reconnect
 * drops out once the mandate is active again.
 */
export function recoveryOptions(
  reason: FailureReason,
  today: Date,
  next: Installment,
  mandate: MandateState = isMandateFailure(reason) ? mandateStateFor(reason) : 'active',
): RecoveryAction[] {
  const canPay = payNowOpen(today, next)
  return OPTIONS[reason].filter((a) => {
    if (a === 'pay_now') return canPay
    if (a === 'reconnect_mandate') return mandate !== 'active'
    return true
  })
}
