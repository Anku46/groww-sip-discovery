/**
 * What the tracker shows for one instalment: the timeline steps and the "where your money is" summary.
 * Pure, so every state (including failures and recoveries) is unit-tested without rendering.
 */
import {
  CONFIRMATION_COPY,
  FACT_COPY,
  FAILURE_COPY,
  OUTCOME_STATUS_COPY,
  STATUS_COPY,
  TIMELINE_COPY as T,
} from './copy'
import { isMandateFailure, type InstalmentState } from './outcome'
import { formatDay, formatINR } from './schedule'
import { getInstalment, nextInstalment, resolveState, type SipState } from './sipState'

export type StepStatus = 'done' | 'current' | 'upcoming' | 'failed' | 'skipped'

export interface TimelineStep {
  key: 'scheduled' | 'sent' | 'debit' | 'paid' | 'skipped' | 'units'
  title: string
  date?: Date
  note: string
  status: StepStatus
}

export function timelineSteps(sip: SipState, n: number): TimelineStep[] {
  const inst = getInstalment(sip, n)
  if (!inst) throw new RangeError(`No instalment #${n}`)
  const amount = formatINR(sip.config.amount)
  const state = resolveState(sip, n)
  const override = sip.overrides[n]

  const scheduled = (status: StepStatus): TimelineStep => ({
    key: 'scheduled',
    title: T.scheduled,
    note: T.scheduledNote(formatDay(inst.cutoff)),
    status,
  })
  const sent = (status: StepStatus): TimelineStep => ({ key: 'sent', title: T.sent, date: inst.cutoff, note: T.sentNote, status })
  const debited = (status: StepStatus): TimelineStep => ({
    key: 'debit',
    title: T.debited(amount),
    date: inst.debitDate,
    note: T.debitedNote,
    status,
  })
  const notTaken: TimelineStep = { key: 'debit', title: T.notTaken(amount), date: inst.debitDate, note: T.notTakenNote, status: 'failed' }
  const units = (status: StepStatus, date: Date = inst.unitsBy): TimelineStep => ({ key: 'units', title: T.units, date, note: T.unitsNote, status })

  // Paid manually stays visible as such even after units arrive (resolveState then reports "allotted").
  if (override?.kind === 'paid_manually') {
    return [
      scheduled('done'),
      notTaken,
      { key: 'paid', title: T.paid(amount), date: override.paidOn, note: T.paidNote, status: 'done' },
      units(state.kind === 'allotted' ? 'done' : 'current', override.unitsBy),
    ]
  }

  switch (state.kind) {
    case 'open':
      return [scheduled('done'), sent('current'), debited('upcoming'), units('upcoming')]
    case 'locked':
      return [scheduled('done'), sent('done'), debited('current'), units('upcoming')]
    case 'processing':
      return [scheduled('done'), sent('done'), debited('done'), units('current')]
    case 'allotted':
      return [scheduled('done'), sent('done'), debited('done'), units('done')]
    case 'skipped':
      return [scheduled('done'), { key: 'skipped', title: T.skipped, date: inst.debitDate, note: T.skippedNote, status: 'skipped' }]
    case 'failed':
      return isMandateFailure(state.reason)
        ? [
            scheduled('done'),
            { key: 'sent', title: T.notSent, date: inst.cutoff, note: T.notSentNote, status: 'failed' },
            notTaken,
            units('upcoming'),
          ]
        : [scheduled('done'), sent('done'), notTaken, units('upcoming')]
    case 'paid_manually':
      // Handled above via the override; kept for exhaustiveness.
      return [scheduled('done'), notTaken, units('current', state.unitsBy)]
  }
}

export interface StatusSummary {
  kind: InstalmentState['kind']
  title: string
  body: string
}

/** The "Where your money is" headline and explanation. */
export function statusSummary(sip: SipState, n: number): StatusSummary {
  const state = resolveState(sip, n)
  const override = sip.overrides[n]
  const next = formatDay(nextInstalment(sip, n).debitDate)

  if (override?.kind === 'paid_manually' && state.kind !== 'allotted') {
    return { kind: 'paid_manually', title: OUTCOME_STATUS_COPY.paid.title, body: CONFIRMATION_COPY.paid(formatDay(override.unitsBy)) }
  }
  switch (state.kind) {
    case 'failed': {
      const copy = FAILURE_COPY[state.reason]
      return {
        kind: 'failed',
        title: copy.title(formatINR(sip.config.amount)),
        body: `${copy.whatHappened(formatDay(state.failedOn))} ${FACT_COPY.money}`,
      }
    }
    case 'skipped':
      return { kind: 'skipped', title: OUTCOME_STATUS_COPY.skipped.title, body: CONFIRMATION_COPY.skipped(next) }
    case 'paid_manually':
      return { kind: 'paid_manually', title: OUTCOME_STATUS_COPY.paid.title, body: CONFIRMATION_COPY.paid(formatDay(state.unitsBy)) }
    default:
      return { kind: state.kind, ...STATUS_COPY[state.kind] }
  }
}
