import { describe, expect, it } from 'vitest'
import { FAILURE_REASONS } from '@/lib/outcome'
import { createSipState, sipReducer, type SipAction, type SipState } from '@/lib/sipState'
import { statusSummary, timelineSteps } from '@/lib/timeline'

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)
// #1 debits Mon 7 Dec 2026 (cutoff Wed 2 Dec, units by Wed 9 Dec).
const fresh = () => createSipState({ amount: 1000, sipDay: 5, method: 'upi' }, d(2026, 11, 9))
const run = (sip: SipState, ...actions: SipAction[]) => actions.reduce(sipReducer, sip)
const on = (y: number, m: number, day: number): SipAction => ({ type: 'SET_TODAY', today: d(y, m, day) })
const statuses = (sip: SipState, n = 1) => Object.fromEntries(timelineSteps(sip, n).map((s) => [s.key, s.status]))

describe('timelineSteps', () => {
  it('moves the current step along the dates', () => {
    expect(statuses(fresh())).toEqual({ scheduled: 'done', sent: 'current', debit: 'upcoming', units: 'upcoming' })
    expect(statuses(run(fresh(), on(2026, 12, 2)))).toEqual({ scheduled: 'done', sent: 'done', debit: 'current', units: 'upcoming' })
    expect(statuses(run(fresh(), on(2026, 12, 7)))).toEqual({ scheduled: 'done', sent: 'done', debit: 'done', units: 'current' })
    expect(statuses(run(fresh(), on(2026, 12, 9)))).toEqual({ scheduled: 'done', sent: 'done', debit: 'done', units: 'done' })
  })

  it.each(FAILURE_REASONS)('never marks units done for a %s failure, even later', (reason) => {
    for (const day of [7, 9, 20]) {
      const sip = run(fresh(), { type: 'SIMULATE_OUTCOME', n: 1, outcome: reason }, on(2026, 12, day))
      const s = statuses(sip)
      expect(s.debit).toBe('failed')
      expect(s.units).toBe('upcoming')
    }
  })

  it('marks the bank request as not sent when autopay was off', () => {
    const sip = run(fresh(), { type: 'SIMULATE_OUTCOME', n: 1, outcome: 'mandate_revoked' }, on(2026, 12, 7))
    const sent = timelineSteps(sip, 1).find((s) => s.key === 'sent')!
    expect(sent).toMatchObject({ status: 'failed', title: 'Not sent to your bank' })
  })

  it('shows a manual payment, then units, and keeps it visible after allotment', () => {
    const failed = run(fresh(), { type: 'SIMULATE_OUTCOME', n: 1, outcome: 'insufficient_balance' }, on(2026, 12, 8))
    const paid = run(failed, { type: 'PAY_NOW', n: 1 })
    expect(statuses(paid)).toEqual({ scheduled: 'done', debit: 'failed', paid: 'done', units: 'current' })
    expect(statuses(run(paid, on(2026, 12, 10)))).toEqual({ scheduled: 'done', debit: 'failed', paid: 'done', units: 'done' })
  })

  it('shows a skip with no units step', () => {
    const sip = run(fresh(), { type: 'SKIP', n: 1 })
    expect(statuses(sip)).toEqual({ scheduled: 'done', skipped: 'skipped' })
  })
})

describe('statusSummary', () => {
  it('uses the failure copy and says no money was taken', () => {
    const sip = run(fresh(), { type: 'SIMULATE_OUTCOME', n: 1, outcome: 'bank_technical' }, on(2026, 12, 7))
    const s = statusSummary(sip, 1)
    expect(s.title).toBe("This month's ₹1,000 didn't go through")
    expect(s.body).toMatch(/problem on its side.*No money was taken/)
  })

  it('covers paid, skipped and plain date states', () => {
    const paid = run(fresh(), { type: 'SIMULATE_OUTCOME', n: 1, outcome: 'unknown' }, on(2026, 12, 8), { type: 'PAY_NOW', n: 1 })
    expect(statusSummary(paid, 1).title).toBe('Paid, units on the way')
    expect(statusSummary(run(paid, on(2026, 12, 10)), 1).title).toBe('Units in your account')
    expect(statusSummary(run(fresh(), { type: 'SKIP', n: 1 }), 1).title).toBe('Skipped this month')
    expect(statusSummary(fresh(), 1).title).toBe('Scheduled')
  })
})
