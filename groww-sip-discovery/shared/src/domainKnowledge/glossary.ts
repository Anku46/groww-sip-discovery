import type { GlossaryEntry } from '../types/domain'

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'NPCI',
    definition:
      'National Payments Corporation of India — runs India’s retail payment rails, including UPI, UPI Autopay and NACH.',
  },
  {
    term: 'NACH',
    definition:
      'National Automated Clearing House — NPCI’s system for recurring bank debits. An e-NACH mandate lets an AMC or ' +
      'platform debit the investor’s account on each SIP date, up to the mandate’s maximum amount.',
  },
  {
    term: 'T-3 cutoff',
    definition:
      'The window of a few working days before the SIP date in which the debit request has already been presented ' +
      'to the bank; changes made inside it apply only from the next installment.',
  },
  {
    term: 'UPI Autopay',
    definition:
      'A recurring-payment mandate approved in a UPI app. It has a maximum amount and validity, and can be paused or ' +
      'revoked from the UPI app as well as from the investment platform.',
  },
  {
    term: 'NAV',
    definition:
      'Net Asset Value — the fund’s portfolio value per unit, published each business day. Each SIP installment buys ' +
      'units at the NAV that applies when the AMC receives the money.',
  },
  {
    term: 'Rupee-cost averaging',
    definition:
      'Investing a fixed amount at regular intervals, so more units are bought when NAV is low and fewer when it is ' +
      'high, smoothing the average cost per unit.',
  },
  {
    term: 'Mandate limit',
    definition:
      'The maximum amount a mandate allows per debit (commonly ₹15,000 for UPI Autopay). It is a ceiling, not the ' +
      'amount debited.',
  },
  {
    term: 'Direct vs regular plan',
    definition:
      'The same fund in two versions: a direct plan has no distributor commission and so a lower expense ratio; a ' +
      'regular plan includes the commission.',
  },
]
