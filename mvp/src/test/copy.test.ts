import { describe, expect, it } from 'vitest'
import {
  ACTION_COPY,
  ALERT_COPY,
  AUTOPAY_EXPLAINER,
  changeEffectCopy,
  CONFIRMATION_COPY,
  COPY,
  FACT_COPY,
  FAILED_SCREEN_COPY,
  FAILURE_COPY,
  OUTCOME_STATUS_COPY,
  PAY_NOW_CLOSED,
  PENDING_COMPLIANCE_COPY,
  RECOVERY_COPY,
  SHOW_PENDING_COMPLIANCE,
  SMS_MAX_LENGTH,
  STATUS_CARD_COPY,
  STATUS_COPY,
  TIMELINE_COPY,
} from '@/lib/copy'
import { bankChargeLikely, FAILURE_REASONS } from '@/lib/outcome'
import { enforceSEBIConstraints } from '@/lib/sebi'

// Realistic extremes: the smallest and a very large SIP, and a long weekday/date string.
const AMOUNTS = ['₹100', '₹1,000', '₹10,00,000']
const DATE = 'Wed, 30 Dec'
const vars = { amount: '₹1,000', nextDate: DATE }

const setupCopy = [
  ...Object.values(COPY),
  ...Object.values(STATUS_COPY).flatMap((s) => [s.title, s.body]),
  changeEffectCopy('this', DATE),
  changeEffectCopy('next', DATE),
]

const failureFlowCopy = [
  ...FAILURE_REASONS.flatMap((r) => [
    ...AMOUNTS.map((a) => FAILURE_COPY[r].title(a)),
    FAILURE_COPY[r].whatHappened(DATE),
    FAILURE_COPY[r].why,
  ]),
  FACT_COPY.money,
  FACT_COPY.sip('active', DATE),
  FACT_COPY.sip('revoked', DATE),
  FACT_COPY.sip('not_active', DATE),
  FACT_COPY.bankCharge('likely'),
  FACT_COPY.bankCharge('possible'),
  FACT_COPY.bankCharge('no'),
  AUTOPAY_EXPLAINER.title,
  ...Object.values(ACTION_COPY).flatMap((a) => [a.label, a.hint(vars)]),
  PAY_NOW_CLOSED(DATE),
  CONFIRMATION_COPY.paid(DATE),
  CONFIRMATION_COPY.skipped(DATE),
  CONFIRMATION_COPY.reconnected(DATE),
  ...AMOUNTS.flatMap((a) => [ALERT_COPY.banner(a), ALERT_COPY.pushBody(a, DATE), ALERT_COPY.sms(a, DATE)]),
  ALERT_COPY.bannerAction,
  ALERT_COPY.pushTitle,
  ...Object.values(STATUS_CARD_COPY).flatMap((s) => [s.title, s.body(vars)]),
  ...Object.values(TIMELINE_COPY).map((v) => (typeof v === 'function' ? v(DATE) : v)),
  ...Object.values(OUTCOME_STATUS_COPY).map((v) => v.title),
  ...Object.values(FAILED_SCREEN_COPY).map((v) => (typeof v === 'function' ? v(1) : v)),
  ...Object.values(RECOVERY_COPY).map((v) => (typeof v === 'function' ? v(1 as never) : v)),
  RECOVERY_COPY.payButton('₹10,00,000'),
]

// The explainer is the one place allowed to name the term "mandate".
const all = [...setupCopy, ...failureFlowCopy, AUTOPAY_EXPLAINER.body, PENDING_COMPLIANCE_COPY.creditScore]

describe('investor-facing copy', () => {
  it.each(all)('passes the SEBI enforcer: %s', (text) => {
    expect(enforceSEBIConstraints(text).flags).toEqual([])
  })

  it.each(all)('has no urgency or fear words: %s', (text) => {
    expect(text).not.toMatch(
      /\b(hurry|now or never|last chance|don'?t miss|act fast|limited time|lose out|before it'?s too late|immediately|urgent|warning|penalty|penalties|default(ed)?)\b/i,
    )
    expect(text).not.toMatch(/!/)
  })
})

describe('failed-instalment copy', () => {
  it.each(failureFlowCopy)('avoids payment jargon: %s', (text) => {
    expect(text).not.toMatch(/\b(mandate|NACH|e-NACH|NPCI|ECS|T-3|bounce[ds]?)\b/i)
  })

  it.each(AMOUNTS)('keeps the SMS within 160 characters for %s', (amount) => {
    expect(ALERT_COPY.sms(amount, DATE).length).toBeLessThanOrEqual(SMS_MAX_LENGTH)
  })

  it('has copy for every failure reason', () => {
    for (const r of FAILURE_REASONS) {
      expect(FAILURE_COPY[r].title('₹1,000')).toContain('₹1,000')
      expect(FAILURE_COPY[r].whatHappened(DATE)).toContain(DATE)
      expect(FAILURE_COPY[r].why.length).toBeGreaterThan(0)
    }
  })

  it('says the money stayed put and who charges any fee, for every reason', () => {
    expect(FACT_COPY.money).toMatch(/no money was taken/i)
    for (const r of FAILURE_REASONS) {
      expect(FACT_COPY.bankCharge(bankChargeLikely(r))).toMatch(/bank/i)
    }
  })

  it('every alert says no money was taken', () => {
    expect(ALERT_COPY.banner('₹1,000')).toMatch(/no money was taken/i)
    expect(ALERT_COPY.pushBody('₹1,000', DATE)).toMatch(/no money was taken/i)
    expect(ALERT_COPY.sms('₹1,000', DATE)).toMatch(/no money was taken/i)
  })

  it('keeps the credit-score line switched off until compliance confirms it', () => {
    expect(SHOW_PENDING_COMPLIANCE).toBe(false)
  })
})
