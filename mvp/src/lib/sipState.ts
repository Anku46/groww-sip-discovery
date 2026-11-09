/**
 * State for one SIP and its instalments (MVP_Architecture.md §4.1, §4.4). A pure reducer: the UI dispatches
 * actions, and every displayed status comes from resolveState / mandateState / sipHealth below.
 */
import {
  isMandateFailure,
  mandateStateFor,
  payNowOpen,
  type FailureReason,
  type InstalmentState,
  type MandateFailureReason,
  type MandateState,
  type SipHealth,
} from './outcome'
import {
  addWorkingDays,
  ALLOTMENT_WORKING_DAYS,
  buildSchedule,
  installmentStatus,
  mandateFor,
  startOfDay,
  type Installment,
  type PaymentMethod,
} from './schedule'

/** Twelve instalments: the retention goal is a SIP still running at month 12. */
export const SCHEDULE_LENGTH = 12

export interface SipConfig {
  amount: number
  sipDay: number
  method: PaymentMethod
}

/** Simulated debit result for an instalment that does not depend on the mandate. */
export type DebitOutcome = 'success' | Exclude<FailureReason, MandateFailureReason>

export interface SipState {
  config: SipConfig
  setupDay: Date
  /** Simulated clock. */
  today: Date
  limit: number
  instalments: Installment[]
  /** Results the investor caused: paid manually, skipped, or a failure frozen when autopay was reconnected. */
  overrides: Record<number, InstalmentState>
  /** Simulated debit results, by instalment number. Missing means success. */
  simulatedOutcome: Record<number, DebitOutcome>
  /** Autopay off from this debit date on, until reconnected. */
  mandateInactive: { reason: MandateFailureReason; from: Date } | null
}

export type SipAction =
  | { type: 'SET_TODAY'; today: Date }
  | { type: 'SIMULATE_OUTCOME'; n: number; outcome: 'success' | FailureReason }
  | { type: 'PAY_NOW'; n: number }
  | { type: 'SKIP'; n: number }
  | { type: 'RECONNECT_MANDATE' }

export function createSipState(config: SipConfig, setupDay: Date): SipState {
  const day = startOfDay(setupDay)
  return {
    config,
    setupDay: day,
    today: day,
    limit: mandateFor(config.amount, config.method).limit,
    instalments: buildSchedule(day, config.sipDay, SCHEDULE_LENGTH),
    overrides: {},
    simulatedOutcome: {},
    mandateInactive: null,
  }
}

export function getInstalment(sip: SipState, n: number): Installment | undefined {
  return sip.instalments[n - 1]
}

/** The instalment after n. The schedule is a fixed 12, so the last one gets a computed follow-on. */
export function nextInstalment(sip: SipState, n: number): Installment {
  return sip.instalments[n] ?? buildSchedule(addWorkingDays(sip.instalments[n - 1]!.debitDate, 1), sip.config.sipDay, 1)[0]!
}

/** The next instalment whose debit is still ahead of today. */
export function upcomingInstalment(sip: SipState): Installment {
  const found = sip.instalments.find((i) => i.debitDate > sip.today)
  return found ?? nextInstalment(sip, sip.instalments.length)
}

export function mandateState(sip: SipState): MandateState {
  if (!sip.mandateInactive || sip.today < sip.mandateInactive.from) return 'active'
  return mandateStateFor(sip.mandateInactive.reason)
}

/** What instalment n shows today: investor overrides, then simulated failures, then the date-based status. */
export function resolveState(sip: SipState, n: number): InstalmentState {
  const inst = getInstalment(sip, n)
  if (!inst) throw new RangeError(`No instalment #${n}`)

  const override = sip.overrides[n]
  if (override) {
    if (override.kind === 'paid_manually' && sip.today >= override.unitsBy) return { kind: 'allotted' }
    return override
  }

  const dateStatus = installmentStatus(sip.today, inst)
  if (sip.today < inst.debitDate) return { kind: dateStatus }

  const mi = sip.mandateInactive
  if (mi && inst.debitDate >= mi.from) return { kind: 'failed', reason: mi.reason, failedOn: inst.debitDate }

  const outcome = sip.simulatedOutcome[n] ?? 'success'
  if (outcome !== 'success') return { kind: 'failed', reason: outcome, failedOn: inst.debitDate }

  return { kind: dateStatus }
}

/** The latest instalment whose debit date has arrived, if any. */
export function latestDue(sip: SipState): Installment | undefined {
  return [...sip.instalments].reverse().find((i) => i.debitDate <= sip.today)
}

export function sipHealth(sip: SipState): SipHealth {
  if (mandateState(sip) !== 'active') return 'autopay_off'
  const due = latestDue(sip)
  if (due && resolveState(sip, due.number).kind === 'failed') return 'needs_attention'
  return 'running'
}

export function canPayNow(sip: SipState, n: number): boolean {
  return resolveState(sip, n).kind === 'failed' && payNowOpen(sip.today, nextInstalment(sip, n))
}

export function canSkip(sip: SipState, n: number): boolean {
  const kind = resolveState(sip, n).kind
  return kind === 'open' || kind === 'failed'
}

export function sipReducer(sip: SipState, action: SipAction): SipState {
  switch (action.type) {
    case 'SET_TODAY':
      return { ...sip, today: startOfDay(action.today) }

    case 'SIMULATE_OUTCOME': {
      const inst = getInstalment(sip, action.n)
      if (!inst) return sip
      const { outcome } = action
      if (outcome !== 'success' && isMandateFailure(outcome)) {
        // Autopay goes off from this instalment on; later instalments fail too until it is reconnected.
        const simulatedOutcome = { ...sip.simulatedOutcome }
        delete simulatedOutcome[action.n]
        return { ...sip, simulatedOutcome, mandateInactive: { reason: outcome, from: inst.debitDate } }
      }
      const clearsMandate = sip.mandateInactive && sip.mandateInactive.from.getTime() === inst.debitDate.getTime()
      return {
        ...sip,
        simulatedOutcome: { ...sip.simulatedOutcome, [action.n]: outcome },
        mandateInactive: clearsMandate ? null : sip.mandateInactive,
      }
    }

    case 'PAY_NOW': {
      if (!canPayNow(sip, action.n)) return sip
      const paidOn = sip.today
      return {
        ...sip,
        overrides: {
          ...sip.overrides,
          [action.n]: { kind: 'paid_manually', paidOn, unitsBy: addWorkingDays(paidOn, ALLOTMENT_WORKING_DAYS) },
        },
      }
    }

    case 'SKIP':
      if (!canSkip(sip, action.n)) return sip
      return { ...sip, overrides: { ...sip.overrides, [action.n]: { kind: 'skipped' } } }

    case 'RECONNECT_MANDATE': {
      if (mandateState(sip) === 'active') return sip
      // Instalments that already failed while autopay was off stay failed; later ones debit normally.
      const overrides = { ...sip.overrides }
      for (const inst of sip.instalments) {
        if (inst.debitDate > sip.today || overrides[inst.number]) continue
        const state = resolveState(sip, inst.number)
        if (state.kind === 'failed' && isMandateFailure(state.reason)) overrides[inst.number] = state
      }
      return { ...sip, overrides, mandateInactive: null }
    }
  }
}

/** App-level actions: setup creates the SIP, reset clears it. Everything else goes to sipReducer. */
export type AppAction = SipAction | { type: 'SETUP_COMPLETED'; config: SipConfig; setupDay: Date } | { type: 'RESET' }

export function appReducer(sip: SipState | null, action: AppAction): SipState | null {
  if (action.type === 'SETUP_COMPLETED') return createSipState(action.config, action.setupDay)
  if (action.type === 'RESET') return null
  return sip ? sipReducer(sip, action) : sip
}
