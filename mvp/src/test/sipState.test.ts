import { describe, expect, it } from 'vitest'
import {
  canPayNow,
  canSkip,
  createSipState,
  mandateState,
  nextInstalment,
  resolveState,
  SCHEDULE_LENGTH,
  sipHealth,
  sipReducer,
  type SipAction,
  type SipState,
} from '@/lib/sipState'
import { toInputDate } from '@/lib/schedule'

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)
const iso = toInputDate

// Mon 9 Nov 2026, ₹1,000 on the 5th via UPI.
// #1 debits Mon 7 Dec (cutoff Wed 2 Dec, units by Wed 9 Dec); #2 Tue 5 Jan 2027 (pay-now for #1 open until
// Mon 28 Dec); #3 Fri 5 Feb 2027.
const fresh = () => createSipState({ amount: 1000, sipDay: 5, method: 'upi' }, d(2026, 11, 9))

const run = (sip: SipState, ...actions: SipAction[]) => actions.reduce(sipReducer, sip)
const on = (y: number, m: number, day: number): SipAction => ({ type: 'SET_TODAY', today: d(y, m, day) })

describe('createSipState', () => {
  it('builds 12 instalments with the UPI limit and starts healthy', () => {
    const sip = fresh()
    expect(sip.instalments).toHaveLength(SCHEDULE_LENGTH)
    expect(iso(sip.instalments[0]!.debitDate)).toBe('2026-12-07')
    expect(sip.limit).toBe(15_000)
    expect(mandateState(sip)).toBe('active')
    expect(sipHealth(sip)).toBe('running')
    expect(resolveState(sip, 1)).toEqual({ kind: 'open' })
  })

  it('follows the dates when nothing goes wrong', () => {
    const sip = fresh()
    expect(resolveState(run(sip, on(2026, 12, 2)), 1).kind).toBe('locked')
    expect(resolveState(run(sip, on(2026, 12, 7)), 1).kind).toBe('processing')
    expect(resolveState(run(sip, on(2026, 12, 9)), 1).kind).toBe('allotted')
  })

  it('gives the last instalment a computed follow-on', () => {
    const sip = fresh()
    expect(nextInstalment(sip, 12).debitDate > sip.instalments[11]!.debitDate).toBe(true)
  })
})

describe('a low-balance failure', () => {
  const failed = (today: SipAction) =>
    run(fresh(), { type: 'SIMULATE_OUTCOME', n: 1, outcome: 'insufficient_balance' }, today)

  it('only shows as failed from the debit date', () => {
    expect(resolveState(failed(on(2026, 12, 4)), 1).kind).toBe('locked')
    expect(resolveState(failed(on(2026, 12, 7)), 1)).toEqual({
      kind: 'failed',
      reason: 'insufficient_balance',
      failedOn: d(2026, 12, 7),
    })
  })

  it('needs attention but keeps autopay on', () => {
    const sip = failed(on(2026, 12, 7))
    expect(sipHealth(sip)).toBe('needs_attention')
    expect(mandateState(sip)).toBe('active')
  })

  it('can be paid now; units follow 2 working days later', () => {
    const sip = run(failed(on(2026, 12, 8)), { type: 'PAY_NOW', n: 1 })
    expect(resolveState(sip, 1)).toMatchObject({ kind: 'paid_manually', paidOn: d(2026, 12, 8), unitsBy: d(2026, 12, 10) })
    expect(sipHealth(sip)).toBe('running')
    expect(resolveState(run(sip, on(2026, 12, 10)), 1).kind).toBe('allotted')
  })

  it('can be paid on the deadline but not after', () => {
    expect(canPayNow(failed(on(2026, 12, 28)), 1)).toBe(true)
    const late = failed(on(2026, 12, 29))
    expect(canPayNow(late, 1)).toBe(false)
    expect(run(late, { type: 'PAY_NOW', n: 1 })).toBe(late)
  })

  it('can be skipped, which keeps the SIP running', () => {
    const sip = run(failed(on(2026, 12, 8)), { type: 'SKIP', n: 1 })
    expect(resolveState(sip, 1).kind).toBe('skipped')
    expect(sipHealth(sip)).toBe('running')
  })

  it('does not affect the next instalment', () => {
    expect(resolveState(failed(on(2027, 1, 5)), 2).kind).toBe('processing')
  })
})

describe('skip and pay-now guards', () => {
  it('allows skipping before the cutoff but not after', () => {
    expect(canSkip(run(fresh(), on(2026, 12, 1)), 1)).toBe(true)
    const locked = run(fresh(), on(2026, 12, 2))
    expect(canSkip(locked, 1)).toBe(false)
    expect(run(locked, { type: 'SKIP', n: 1 })).toBe(locked)
  })

  it('rejects pay-now when nothing failed', () => {
    const sip = run(fresh(), on(2026, 12, 8))
    expect(run(sip, { type: 'PAY_NOW', n: 1 })).toBe(sip)
  })

  it('ignores unknown instalment numbers', () => {
    const sip = fresh()
    expect(run(sip, { type: 'SIMULATE_OUTCOME', n: 99, outcome: 'unknown' })).toBe(sip)
    expect(() => resolveState(sip, 99)).toThrow(RangeError)
  })
})

describe('autopay revoked in a UPI app', () => {
  const revoked = (today: SipAction) =>
    run(fresh(), { type: 'SIMULATE_OUTCOME', n: 1, outcome: 'mandate_revoked' }, today)

  it('stays active until that instalment’s debit date', () => {
    expect(mandateState(revoked(on(2026, 12, 4)))).toBe('active')
    expect(sipHealth(revoked(on(2026, 12, 4)))).toBe('running')
  })

  it('fails that instalment and every later one, and turns autopay off', () => {
    const sip = revoked(on(2027, 1, 5))
    expect(resolveState(sip, 1)).toMatchObject({ kind: 'failed', reason: 'mandate_revoked' })
    expect(resolveState(sip, 2)).toMatchObject({ kind: 'failed', reason: 'mandate_revoked' })
    expect(mandateState(sip)).toBe('revoked')
    expect(sipHealth(sip)).toBe('autopay_off')
  })

  it('after reconnecting, past failures stay failed and later instalments debit', () => {
    const sip = run(revoked(on(2027, 1, 6)), { type: 'RECONNECT_MANDATE' })
    expect(mandateState(sip)).toBe('active')
    expect(resolveState(sip, 1)).toMatchObject({ kind: 'failed', reason: 'mandate_revoked' })
    expect(resolveState(sip, 2)).toMatchObject({ kind: 'failed', reason: 'mandate_revoked' })
    expect(sipHealth(sip)).toBe('needs_attention')
    expect(resolveState(run(sip, on(2027, 2, 9)), 3).kind).toBe('allotted')
  })

  it('lets the latest missed month be paid after reconnecting', () => {
    const sip = run(revoked(on(2027, 1, 6)), { type: 'RECONNECT_MANDATE' }, { type: 'PAY_NOW', n: 2 })
    expect(resolveState(sip, 2).kind).toBe('paid_manually')
    expect(sipHealth(sip)).toBe('running')
  })

  it('ignores reconnect while autopay is still active', () => {
    const sip = revoked(on(2026, 12, 4))
    expect(run(sip, { type: 'RECONNECT_MANDATE' })).toBe(sip)
  })

  it('is undone by simulating success for the same instalment', () => {
    const sip = run(revoked(on(2026, 12, 8)), { type: 'SIMULATE_OUTCOME', n: 1, outcome: 'success' })
    expect(mandateState(sip)).toBe('active')
    expect(resolveState(sip, 1).kind).toBe('processing')
  })

  it('marks a not-active mandate as not_active', () => {
    const sip = run(fresh(), { type: 'SIMULATE_OUTCOME', n: 1, outcome: 'mandate_not_active' }, on(2026, 12, 7))
    expect(mandateState(sip)).toBe('not_active')
  })
})

describe('appReducer', () => {
  it('creates the SIP on setup, passes other actions through, and resets', async () => {
    const { appReducer } = await import('@/lib/sipState')
    const created = appReducer(null, {
      type: 'SETUP_COMPLETED',
      config: { amount: 1000, sipDay: 5, method: 'upi' },
      setupDay: d(2026, 11, 9),
    })
    expect(created?.instalments).toHaveLength(SCHEDULE_LENGTH)
    expect(appReducer(created, on(2026, 12, 2))?.today).toEqual(d(2026, 12, 2))
    expect(appReducer(null, on(2026, 12, 2))).toBeNull()
    expect(appReducer(created, { type: 'RESET' })).toBeNull()
  })
})
