/**
 * SIP installment dates, the T-3 cutoff and mandate limits.
 *
 * Simplifications for the prototype: weekends are the only non-working days (bank holidays are ignored and the
 * UI says so), and "units usually show by" is debit day + 2 working days.
 */

export type PaymentMethod = 'upi' | 'enach'

/** UPI Autopay's per-debit ceiling for mutual fund SIP mandates. */
export const UPI_AUTOPAY_MAX = 15_000
/** Typical default limit a bank e-mandate is registered for. */
export const ENACH_DEFAULT_LIMIT = 100_000
export const MIN_SIP_AMOUNT = 100
export const CUTOFF_WORKING_DAYS = 3
export const ALLOTMENT_WORKING_DAYS = 2

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

export function isWorkingDay(d: Date): boolean {
  const day = d.getDay()
  return day !== 0 && day !== 6
}

export function nextWorkingDay(d: Date): Date {
  let r = startOfDay(d)
  while (!isWorkingDay(r)) r = addDays(r, 1)
  return r
}

/** Moves n working days forward (n > 0) or back (n < 0). */
export function addWorkingDays(d: Date, n: number): Date {
  let r = startOfDay(d)
  let left = Math.abs(n)
  const step = n < 0 ? -1 : 1
  while (left > 0) {
    r = addDays(r, step)
    if (isWorkingDay(r)) left--
  }
  return r
}

export interface Installment {
  number: number
  /** The SIP date the investor picked, in this month. */
  sipDate: Date
  /** Debit day: the SIP date, or the next working day if it falls on a weekend. */
  debitDate: Date
  /** From this day on, the debit request is already with the bank; changes apply from the next installment. */
  cutoff: Date
  /** Units usually appear in the account by this day. */
  unitsBy: Date
}

export function installmentFor(year: number, month: number, sipDay: number, number: number): Installment {
  const sipDate = new Date(year, month, sipDay)
  const debitDate = nextWorkingDay(sipDate)
  return {
    number,
    sipDate,
    debitDate,
    cutoff: addWorkingDays(debitDate, -CUTOFF_WORKING_DAYS),
    unitsBy: addWorkingDays(debitDate, ALLOTMENT_WORKING_DAYS),
  }
}

/**
 * The next `count` installments for a SIP set up on `setupDay`. The first one is the earliest SIP date whose
 * cutoff is still ahead, so the request can reach the bank in time.
 */
export function buildSchedule(setupDay: Date, sipDay: number, count = 3): Installment[] {
  if (!Number.isInteger(sipDay) || sipDay < 1 || sipDay > 28) throw new RangeError('SIP day must be 1–28')
  const today = startOfDay(setupDay)
  let year = today.getFullYear()
  let month = today.getMonth()
  let first = installmentFor(year, month, sipDay, 1)
  while (first.cutoff <= today) {
    month++
    first = installmentFor(year, month, sipDay, 1)
  }
  year = first.sipDate.getFullYear()
  month = first.sipDate.getMonth()
  return Array.from({ length: count }, (_, i) => installmentFor(year, month + i, sipDay, i + 1))
}

export type InstallmentStatus = 'open' | 'locked' | 'processing' | 'allotted'

export function installmentStatus(today: Date, inst: Installment): InstallmentStatus {
  const t = startOfDay(today)
  if (t < inst.cutoff) return 'open'
  if (t < inst.debitDate) return 'locked'
  if (t < inst.unitsBy) return 'processing'
  return 'allotted'
}

export interface MandateCheck {
  ok: boolean
  /** The ceiling the investor is approving. */
  limit: number
  /** Why the setup cannot go ahead, when ok is false. */
  problem?: string
}

export function mandateFor(amount: number, method: PaymentMethod): MandateCheck {
  if (!Number.isFinite(amount) || amount < MIN_SIP_AMOUNT) {
    return { ok: false, limit: 0, problem: `The smallest SIP here is ${formatINR(MIN_SIP_AMOUNT)}.` }
  }
  if (method === 'upi') {
    if (amount > UPI_AUTOPAY_MAX) {
      return {
        ok: false,
        limit: UPI_AUTOPAY_MAX,
        problem: `UPI Autopay allows up to ${formatINR(UPI_AUTOPAY_MAX)} per debit. Choose a bank mandate (e-NACH) for this amount.`,
      }
    }
    return { ok: true, limit: UPI_AUTOPAY_MAX }
  }
  return { ok: true, limit: Math.max(ENACH_DEFAULT_LIMIT, Math.ceil(amount / 10_000) * 10_000) }
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export function formatINR(n: number): string {
  return inr.format(n)
}

export function formatDay(d: Date): string {
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!)
}

/** Parses an <input type="date"> value as a local date. */
export function parseLocalDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export function toInputDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
