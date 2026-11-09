/**
 * Indian MF / NPCI domain rules (Architecture.md §13). Stage 2 matches `triggerKeywords` against
 * normalized text (lowercase substring match). Phase 2 correction cases reference these IDs.
 *
 * Exact limits, cutoffs and charges vary by bank, AMC and platform, so the explanations describe the
 * mechanism and say "typically" where a number is common but not universal.
 */
import type { DomainRule } from '../types/domain'

export const DOMAIN_RULES: DomainRule[] = [
  {
    id: 'RULE_T3_LOCKOUT',
    name: 'T-3 mandate presentation lock-in cutoff',
    category: 'PAYMENT_PLUMBING',
    summary: "Skip, pause or cancel requests inside the cutoff window before the SIP date can't stop that month's debit.",
    detailedExplanation:
      'The debit request for an installment is sent to the bank a few working days before the SIP date. Once it ' +
      'has been presented, a skip, pause or cancellation made in the app only applies from the next installment, ' +
      "so the investor sees money 'deducted after' they cancelled. The exact cutoff depends on the platform and " +
      'the mandate type.',
    triggerKeywords: ['pause', 'skip', 'cancel', 'cancelled', 'yesterday', 'deducted after', 'still deducted', 'still debited', 'band kar'],
    sebiRelevance: false,
  },
  {
    id: 'RULE_NACH_BOUNCE',
    name: 'NACH / ECS bounce penalty (bank-levied)',
    category: 'PAYMENT_PLUMBING',
    summary: 'When the balance is short on the debit date, the bank — not the platform — charges a mandate-return fee.',
    detailedExplanation:
      'If an NACH or UPI Autopay debit fails for insufficient funds, the investor’s bank levies a return charge ' +
      '(set by the bank, typically a few hundred rupees plus GST). The SIP installment is marked failed. After ' +
      'repeated consecutive failures the AMC or platform may cancel the SIP. Investors often blame the investment ' +
      'app for these charges.',
    triggerKeywords: ['bounce', 'bounced', 'penalty', 'charge', 'charges', '295', '590', 'insufficient', 'extra amount', 'extra amout', 'paise nahi the'],
    sebiRelevance: false,
  },
  {
    id: 'RULE_UPI_REVOKE',
    name: 'UPI Autopay external revocation via third-party app',
    category: 'PAYMENT_PLUMBING',
    summary: 'A UPI Autopay mandate can be paused or revoked from the UPI app, silently stopping the SIP’s debits.',
    detailedExplanation:
      'UPI Autopay mandates are visible in, and can be paused or revoked from, the UPI app used to approve them ' +
      '(PhonePe, Google Pay, Paytm, BHIM). Doing so stops future debits without any action in the investment ' +
      'app, so installments start failing — a churn path the platform does not see as a cancellation.',
    triggerKeywords: ['phonepe', 'gpay', 'google pay', 'paytm', 'bhim', 'autopay delete', 'revoke', 'deactivate', 'upi app'],
    sebiRelevance: false,
  },
  {
    id: 'RULE_UPI_MANDATE_LIMIT',
    name: 'Mandate maximum amount ≠ installment amount',
    category: 'UX_CONFUSION',
    summary: 'The mandate is registered for a maximum amount and long validity; only the SIP amount is debited.',
    detailedExplanation:
      'At setup the mandate is approved for a ceiling, not the SIP amount — commonly ₹15,000 for UPI Autopay and ' +
      'often ₹1 lakh or more for e-NACH — with an end date decades away, so the same mandate can serve future ' +
      'SIPs and step-ups. Each installment debits only the SIP amount. First-time investors read the ceiling as ' +
      'the charge and fear a large debit.',
    triggerKeywords: ['15000', '15,000', '15k', '1 lakh', '100000', 'maximum', 'mandate amount', 'autopay amount', '2064', 'end date'],
    sebiRelevance: false,
  },
  {
    id: 'RULE_NAV_CONFUSION',
    name: 'NAV movement ≠ stock price movement',
    category: 'NAV_MECHANICS',
    summary: 'NAV reflects the fund’s portfolio value per unit; an early dip is normal and not a realised loss.',
    detailedExplanation:
      'A fund’s NAV is its portfolio value per unit and moves with the underlying holdings. A high or low NAV ' +
      'does not make a fund expensive or cheap, and an equity SIP showing a small negative return in its first ' +
      'months is ordinary volatility, not money lost unless units are redeemed.',
    triggerKeywords: ['loss', '-2%', 'negative', 'fd better', 'red', 'nav', 'doob', 'dub', 'ghata', 'at a loss', 'money gets lost'],
    sebiRelevance: false,
  },
  {
    id: 'RULE_RCA_UNIT_AVG',
    name: 'Rupee-cost averaging — more units at lower NAV',
    category: 'NAV_MECHANICS',
    summary: 'A fixed SIP amount buys more units when NAV falls, lowering the average cost per unit.',
    detailedExplanation:
      'Because each installment is a fixed rupee amount, it buys more units when the NAV is low and fewer when it ' +
      'is high. Stopping a SIP during a dip gives up the installments that would buy units at the lowest prices.',
    triggerKeywords: ['units', 'more units', 'dip', 'average', 'market down', 'crash', 'market fall'],
    sebiRelevance: false,
  },
  {
    id: 'RULE_NAV_ALLOC_DELAY',
    name: 'Unit allotment takes T+1 or more after debit',
    category: 'NAV_MECHANICS',
    summary: "Units are allotted after the money reaches the AMC, so 'in progress' for a few days is normal.",
    detailedExplanation:
      'After the bank debit, money moves through the clearing corporation to the AMC; units are allotted at the ' +
      'NAV applicable when the AMC receives the funds, and appear in the app one or more working days later. ' +
      "Until then the order shows 'in progress'. If a payment fails along the way the money is refunded, which " +
      'investors can mistake for the platform taking and returning money arbitrarily.',
    triggerKeywords: ['in progress', 'allotment', 'not allotted', 'not allocated', 'units not', 'processing', 'pending', 'not showing', 'not reflecting', 'refunded', 'iccl'],
    sebiRelevance: false,
  },
  {
    id: 'RULE_SEBI_ADVISORY',
    name: 'SEBI IA regulation — advisory boundary',
    category: 'REGULATORY',
    summary: 'A platform that is not a SEBI-registered Investment Adviser cannot recommend funds or predict returns.',
    detailedExplanation:
      'Personalised advice — which fund to buy, whether to switch, what return to expect — requires SEBI ' +
      'Investment Adviser registration. A distribution or execution platform can educate (how SIPs, NAV and ' +
      'risk work) but not recommend. Needs expressed as advice requests are real but only partly addressable.',
    triggerKeywords: ['which fund', 'best fund', 'should i switch', 'recommend', 'suggest', 'kaunsa fund', 'konsa fund', 'best company', 'good area to invest', 'return milega', 'how much will i get'],
    sebiRelevance: true,
    relatedConstraintId: 'SEBI_NO_FUND_REC',
  },
  {
    id: 'RULE_MANDATE_REGEN',
    name: 'Mandate must be recreated after cancellation or failure',
    category: 'PAYMENT_PLUMBING',
    summary: 'If the mandate is cancelled, rejected or never completed, installments fail until a new one is set up.',
    detailedExplanation:
      'A SIP needs an active mandate. When the mandate is cancelled (by the investor, the bank, or after repeated ' +
      'bounces) or the setup step was never finished, every installment fails or the SIP is cancelled. The fix is ' +
      'a new mandate registration, which first-time investors rarely know to do.',
    triggerKeywords: ['mandate cancelled', 'new mandate', 'mandate again', 'sip cancelled', 'cancel huwa', 'autopay fail', 'unable to setup autopay', 'complete mandate', 'mandate procedure', 'closed nhi'],
    sebiRelevance: false,
  },
  {
    id: 'RULE_INSTALLMENT_VS_DEBIT',
    name: 'Installment status ≠ bank debit confirmation',
    category: 'UX_CONFUSION',
    summary: "An installment's status in the app and the bank's debit are separate events on different timelines.",
    detailedExplanation:
      'The first installment is often paid up front at setup, and later ones are debited through the mandate on ' +
      'the SIP date. The bank SMS, the installment status and the unit allotment arrive at different times, so ' +
      'investors see a debit with nothing in the app, think they were charged twice, or don’t know whether the ' +
      'next installment is automatic.',
    triggerKeywords: ['deducted', 'debited', 'was deducted', 'will be deducted', 'twice', '2 bar', 'first payment', 'next sip', 'payable', 'dashboard', 'auto-deducted', 'pay manually'],
    sebiRelevance: false,
  },
]

export const DOMAIN_RULES_BY_ID: Record<string, DomainRule> = Object.fromEntries(DOMAIN_RULES.map((r) => [r.id, r]))
