import { describe, expect, it } from 'vitest'
import {
  bankChargeLikely,
  FAILURE_REASONS,
  moneyLeftAccount,
  payNowDeadline,
  recoveryOptions,
  sipStillActive,
  type InstalmentState,
} from '@/lib/outcome'
import { buildSchedule, installmentFor, toInputDate } from '@/lib/schedule'

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)
const iso = toInputDate

// Mon 9 Nov 2026, SIP on the 5th: #1 debits Mon 7 Dec; #2 debits Tue 5 Jan 2027 with cutoff Thu 31 Dec.
const [, second] = buildSchedule(d(2026, 11, 9), 5)
const next = second!

describe('moneyLeftAccount', () => {
  const cases: [InstalmentState, boolean][] = [
    [{ kind: 'open' }, false],
    [{ kind: 'locked' }, false],
    [{ kind: 'processing' }, true],
    [{ kind: 'allotted' }, true],
    [{ kind: 'failed', reason: 'insufficient_balance', failedOn: d(2026, 12, 7) }, false],
    [{ kind: 'paid_manually', paidOn: d(2026, 12, 8), unitsBy: d(2026, 12, 10) }, true],
    [{ kind: 'skipped' }, false],
  ]
  it.each(cases)('%o → %s', (state, expected) => {
    expect(moneyLeftAccount(state)).toBe(expected)
  })
})

describe('bankChargeLikely', () => {
  it('is likely only for a low balance, and never for mandate problems', () => {
    expect(bankChargeLikely('insufficient_balance')).toBe('likely')
    expect(bankChargeLikely('bank_technical')).toBe('possible')
    expect(bankChargeLikely('unknown')).toBe('possible')
    expect(bankChargeLikely('mandate_revoked')).toBe('no')
    expect(bankChargeLikely('mandate_not_active')).toBe('no')
  })
})

describe('sipStillActive', () => {
  it('is true only while the mandate is active', () => {
    expect(sipStillActive('active')).toBe(true)
    expect(sipStillActive('revoked')).toBe(false)
    expect(sipStillActive('not_active')).toBe(false)
  })
})

describe('payNowDeadline', () => {
  it('is 3 working days before the next instalment’s cutoff', () => {
    expect(iso(next.cutoff)).toBe('2026-12-31')
    expect(iso(payNowDeadline(next))).toBe('2026-12-28')
  })

  it('skips weekends and rolls back across the year', () => {
    const jan = installmentFor(2027, 0, 4, 2) // Mon 4 Jan 2027, cutoff Wed 30 Dec
    expect(iso(jan.cutoff)).toBe('2026-12-30')
    expect(iso(payNowDeadline(jan))).toBe('2026-12-25')
  })
})

describe('recoveryOptions', () => {
  const inWindow = d(2026, 12, 8)
  const afterWindow = d(2026, 12, 29)

  it.each([
    ['insufficient_balance', ['pay_now', 'skip']],
    ['bank_technical', ['pay_now', 'skip']],
    ['unknown', ['pay_now', 'contact_support']],
    ['mandate_revoked', ['reconnect_mandate', 'pay_now']],
    ['mandate_not_active', ['reconnect_mandate', 'pay_now']],
  ] as const)('inside the pay-now window, %s → %o', (reason, expected) => {
    expect(recoveryOptions(reason, inWindow, next)).toEqual(expected)
  })

  it('keeps pay-now open on the deadline day itself', () => {
    expect(recoveryOptions('insufficient_balance', d(2026, 12, 28), next)).toContain('pay_now')
  })

  it.each([
    ['insufficient_balance', ['skip']],
    ['bank_technical', ['skip']],
    ['unknown', ['contact_support']],
    ['mandate_revoked', ['reconnect_mandate']],
    ['mandate_not_active', ['reconnect_mandate']],
  ] as const)('after the window, %s → %o', (reason, expected) => {
    expect(recoveryOptions(reason, afterWindow, next)).toEqual(expected)
  })

  it('drops reconnect once autopay is active again', () => {
    expect(recoveryOptions('mandate_revoked', inWindow, next, 'active')).toEqual(['pay_now'])
  })

  it('always offers at least one action', () => {
    for (const reason of FAILURE_REASONS) {
      expect(recoveryOptions(reason, afterWindow, next).length).toBeGreaterThan(0)
    }
  })
})
