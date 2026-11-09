import { describe, expect, it } from 'vitest'
import { buildSchedule, installmentStatus, mandateFor, toInputDate } from '@/lib/schedule'

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)
const iso = (x: Date) => toInputDate(x)

describe('buildSchedule', () => {
  // 9 Nov 2026 is a Monday.
  const today = d(2026, 11, 9)

  it('skips a SIP date that has already passed and moves weekend debits to Monday', () => {
    const [first, second, third] = buildSchedule(today, 5)
    expect(iso(first!.sipDate)).toBe('2026-12-05') // Saturday
    expect(iso(first!.debitDate)).toBe('2026-12-07')
    expect(iso(first!.cutoff)).toBe('2026-12-02')
    expect(iso(first!.unitsBy)).toBe('2026-12-09')
    expect(iso(second!.debitDate)).toBe('2027-01-05')
    expect(iso(third!.debitDate)).toBe('2027-02-05')
  })

  it('starts next month when this month’s cutoff is today', () => {
    expect(iso(buildSchedule(today, 12)[0]!.sipDate)).toBe('2026-12-12')
  })

  it('starts this month when the cutoff is still ahead', () => {
    const first = buildSchedule(today, 13)[0]!
    expect(iso(first.debitDate)).toBe('2026-11-13')
    expect(iso(first.cutoff)).toBe('2026-11-10')
  })

  it('rolls over the year', () => {
    expect(iso(buildSchedule(d(2026, 12, 20), 10)[0]!.sipDate)).toBe('2027-01-10')
  })

  it('rejects SIP days outside 1–28', () => {
    expect(() => buildSchedule(today, 29)).toThrow(RangeError)
  })
})

describe('installmentStatus', () => {
  const inst = buildSchedule(d(2026, 11, 9), 5)[0]!
  it.each([
    ['2026-12-01', 'open'],
    ['2026-12-02', 'locked'],
    ['2026-12-04', 'locked'],
    ['2026-12-07', 'processing'],
    ['2026-12-09', 'allotted'],
  ])('%s → %s', (day, status) => {
    const [y, m, dd] = day.split('-').map(Number)
    expect(installmentStatus(d(y!, m!, dd!), inst)).toBe(status)
  })
})

describe('mandateFor', () => {
  it('shows the ₹15,000 UPI ceiling for a small SIP', () => {
    expect(mandateFor(500, 'upi')).toEqual({ ok: true, limit: 15_000 })
  })
  it('blocks UPI above ₹15,000 and points to e-NACH', () => {
    const r = mandateFor(20_000, 'upi')
    expect(r.ok).toBe(false)
    expect(r.problem).toMatch(/e-NACH/)
  })
  it('uses a ₹1 lakh e-NACH limit, or more for large SIPs', () => {
    expect(mandateFor(5_000, 'enach').limit).toBe(100_000)
    expect(mandateFor(123_000, 'enach').limit).toBe(130_000)
  })
  it('rejects amounts below the minimum', () => {
    expect(mandateFor(50, 'upi').ok).toBe(false)
  })
})
