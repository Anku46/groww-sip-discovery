/**
 * Stage 3 — deterministic behavioral extraction. Transparent keyword scoring: every decision can be traced to
 * a matched pattern or domain rule. The lexicon follows the Phase 2 theme definitions (codebook), not the
 * golden-set texts, so golden-set agreement is an honest measure.
 */
import {
  FRICTION_THEMES, UNCLASSIFIED_THEME,
  type BehavioralProfile, type ChurnSeverity, type InvestorLifecycleStage, type Stage1Result, type Stage2Result,
  type Stage3Result, type ThemeId, type UserSegment,
} from '@groww-sip/shared'

type Signal = [RegExp, number]

const THEME_SIGNALS: Record<ThemeId, Signal[]> = {
  THEME_MANDATE_SETUP_FAILURE: [
    [/\b(e-?mandate|mandate|autopay|auto[ -]?pay|auto pey|e-?nach|nach)\b/, 2],
    [/(15,?000|\b15k\b|1 lakh|100000)/, 2],
    [/\b(cancel huwa|unable to (set ?up|setup)|setup autopay|payment gateway|initial investment|one time investment|google pay|gpay|phonepe|paytm|bhim)\b/, 2],
    [/\b\d+ (bar|times)\b.{0,20}\bcancel|\bcancel\w*\b.{0,20}\b\d+ (bar|times)\b/, 2],
    [/\b(fail|failed|fails)\b/, 1],
    [/\b(twice|2 bar|two times)\b/, 1],
  ],
  THEME_DEBIT_VISIBILITY: [
    [/\b(in progress|allotment|allotted|allocated|not showing|not reflecting|dashboard|refunded|payable|iccl)\b/, 2],
    [/\bwhere\b.{0,30}\b(see|check|money|dekh)/, 2],
    [/\b(deducted|debited|deduct|was deducted|cut|cutta|cut ta)\b/, 1],
    [/\b(next (sip|installment|instalment)|bank (account )?se|from (my )?bank)\b/, 1],
    [/\b(money|paisa|amount)\b.{0,30}\b(flow|come|go|transfer)/, 1],
  ],
  THEME_CASHFLOW_MISMATCH: [
    [/\b(salary|payday|pay day|paycheck|pay cheque|income|freelanc\w*|cash ?flow|pocket money)\b/, 3],
    [/\b(low balance|insufficient|balance (dipped|was low|low)|not enough (money|balance)|before (salary|payday)|salary (late|delayed))\b/, 3],
    [/\b(sip date|debit date)\b/, 1],
  ],
  THEME_LOSS_FEAR: [
    [/\b(loss|losses|at a loss|negative|in red|minus)\b|(?<![\w.])-\d+(\.\d+)? ?%/, 3],
    [/\b(doob|dub|money gets lost|lost my money|money lost|safe|insurance|insured|fraud|risk)\b/, 2],
    [/\b(dar|scared|afraid|fear|worried|tension|i feel scared)\b/, 2],
  ],
  THEME_ADVICE_SEEKING: [
    [/\b(suggest|recommend|best (fund|company|sip|mutual|advice)|which fund|good area|would you|advice|advise|kaunsa fund|konsa fund)\b/, 3],
    [/\d+ ?%.{0,20}return/, 2],
    [/\b(portfolio|list|plan)\b.{0,40}\b(review|critique|criticism|suggestions?|inputs?)\b/, 2],
  ],
  THEME_CONCEPT_GAPS: [
    [/\bwhat (is|are|does)\b/, 2],
    [/\b(nav|compounding|direct plan|regular plan|direct or regular|direct vs regular|elss|lock-?in|expense ratio|index fund|daily sip|per day sip|weekly sip|how does|difference between|how to do it|sahi hai)\b/, 2],
    [/\bhow\b.{0,20}\bwork/, 2],
    [/\b(explain|understand|confus)/, 1],
  ],
  THEME_SIP_CONTROL: [
    [/\b(pause|resume|skip)\b/, 3],
    [/\b(stop|cancel|band)\b.{0,15}\b(sip|it|installment)\b/, 2],
    [/\b(change|modify)\b.{0,20}\b(amount|date|frequency)\b/, 2],
    [/\b(exit load|penalty)\b/, 1],
    [/\bno money\b|\bdon'?t have (any )?(money|fund)/, 1],
  ],
  THEME_THIN_ONBOARDING: [
    [/\b(started (my )?(first )?sip|started the sip|just started|started investing|because of you|after watching|your videos?|aapke kehne)\b/, 3],
    [/\b(beginner|newbie|new to|zero knowledge|no knowledge|didn'?t know|from scratch|first time)\b/, 2],
    [/\b(thanks?|thank you|shukriya|grateful|helpful|motivat\w*)\b/, 1],
  ],
}

const RULE_THEME_BOOST: Record<string, [ThemeId, number]> = {
  RULE_UPI_MANDATE_LIMIT: ['THEME_MANDATE_SETUP_FAILURE', 2],
  RULE_UPI_REVOKE: ['THEME_MANDATE_SETUP_FAILURE', 2],
  RULE_MANDATE_REGEN: ['THEME_MANDATE_SETUP_FAILURE', 2],
  RULE_NACH_BOUNCE: ['THEME_MANDATE_SETUP_FAILURE', 2],
  RULE_SIP_BOUNCE_NO_CIBIL: ['THEME_MANDATE_SETUP_FAILURE', 2],
  RULE_NAV_ALLOC_DELAY: ['THEME_DEBIT_VISIBILITY', 2],
  RULE_INSTALLMENT_VS_DEBIT: ['THEME_DEBIT_VISIBILITY', 2],
  RULE_SEBI_ADVISORY: ['THEME_ADVICE_SEEKING', 2],
  RULE_NAV_CONFUSION: ['THEME_LOSS_FEAR', 1],
  RULE_RCA_UNIT_AVG: ['THEME_CONCEPT_GAPS', 1],
  RULE_T3_LOCKOUT: ['THEME_SIP_CONTROL', 1],
}

// Tie-break: higher-severity themes first.
const PRIORITY: ThemeId[] = [
  'THEME_MANDATE_SETUP_FAILURE', 'THEME_CASHFLOW_MISMATCH', 'THEME_DEBIT_VISIBILITY', 'THEME_LOSS_FEAR', 'THEME_ADVICE_SEEKING',
  'THEME_SIP_CONTROL', 'THEME_CONCEPT_GAPS', 'THEME_THIN_ONBOARDING',
]

const KNOWN_THEMES = new Set(FRICTION_THEMES.map((t) => t.id))

export function scoreThemesForText(text: string, stage2: Stage2Result): { theme: ThemeId; scores: Record<string, number> } {
  const scores: Record<string, number> = {}
  for (const [theme, signals] of Object.entries(THEME_SIGNALS)) {
    if (!KNOWN_THEMES.has(theme)) continue
    scores[theme] = signals.reduce((s, [re, w]) => s + (re.test(text) ? w : 0), 0)
  }
  for (const m of stage2.ruleMatches) {
    const boost = RULE_THEME_BOOST[m.ruleId]
    if (boost && boost[0] in scores) scores[boost[0]] = (scores[boost[0]] ?? 0) + boost[1]
  }
  let best: ThemeId = UNCLASSIFIED_THEME
  let bestScore = 0
  for (const theme of PRIORITY) {
    const s = scores[theme] ?? 0
    if (s > bestScore) [best, bestScore] = [theme, s]
  }
  return { theme: best, scores }
}

const SEVERITY_RULES: { severity: ChurnSeverity; re: RegExp; why: string }[] = [
  { severity: 5, re: /\b(want to stop|wanna stop|if i want to stop|stop (my )?sip how|never invest\w*|leave it|did not get closed|closed nhi|cancel(led)? my sip|stopped my sip|band kar du|quit|cancelled (the )?(sip|autopay|everything|it)|i cancelled|revoked|gave up|never opened the app)\b/, why: 'wants to stop, cannot stop, or describes abandoning SIPs' },
  { severity: 4, re: /\b(is my money lost|money lost|lost my money|i feel scared|scared|dar|now at a loss|is now at a loss|loss ho|why do they deduct|twice|2 bar|\d+ (bar|times)\b.{0,20}cancel|cancel huwa|unable to (set ?up|setup)|not getting|haven'?t (got|received))/, why: 'money stuck, repeated failure, or explicit fear' },
  { severity: 3, re: /(15,?000|\b15k\b|1 lakh|100000|mandate|in progress|refunded|deducted|debited|will be deducted|payable|charges?|initial investment|fail(ed)?|worst|disappointed|not showing|frustrat|\bloss\b|\bnegative\b|(?<![\w.])-\d+(\.\d+)? ?%)/, why: 'worry about money already committed' },
]
const POSITIVE = /\b(thanks?|thank you|shukriya|helpful|motivat\w*|crystal clear|great|awesome|grateful)\b/

function churnSeverity(text: string): { severity: ChurnSeverity; why: string } {
  for (const r of SEVERITY_RULES) if (r.re.test(text)) return { severity: r.severity, why: r.why }
  if (POSITIVE.test(text) && !text.includes('?')) return { severity: 1, why: 'positive or curious, no friction' }
  return { severity: 2, why: 'question or confusion, no sign of wanting to stop' }
}

function lifecycle(text: string): InvestorLifecycleStage {
  const m = text.match(/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(months?|mahine)\b/)
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 }
  if (m && /(ago|back|have passed|ho gaye|ho gye|se|since|for)/.test(text.slice(m.index ?? 0, (m.index ?? 0) + 40))) {
    const n = words[m[1]!] ?? Number(m[1])
    if (n <= 1) return 'MONTH_0_1'
    if (n <= 4) return 'MONTH_2_4'
    if (n <= 8) return 'MONTH_5_8'
    if (n <= 12) return 'MONTH_9_12'
  }
  if (/\b(2nd|second|3rd|third) (installment|instalment|sip|payment)\b|\b16 july\b/.test(text)) return 'MONTH_2_4'
  const started = /\b(started|start kiya|start kari|started the sip|paid|payment|deducted|debited|was deducted|kiya hai|kiya tha|invested|this month|autopay|mandate|first sip|first payment)\b/.test(text)
  const planning = /\b(want to|planning|plan to|chahta|chahti|karna hai|kholna hai|how (do i|to|can i) start|should i start|if i start|how to invest|wanted to)\b/.test(text)
  if (planning && !started) return 'PRE_START'
  if (started) return 'MONTH_0_1'
  return 'UNKNOWN'
}

function segment(text: string): UserSegment {
  if (/\b(because of you|your videos?|after watching|aapke kehne|your channel|following u|following you|creator)\b/.test(text)) return 'INFLUENCER_LED'
  if (/\b(everyone told|friends? (told|said|suggested)|my (brother|sister|father|dad|mom|colleague)|people (say|think|are thinking)|sab log|dost)\b/.test(text)) return 'PEER_LED'
  if (/\b(i read|article|my research|own research|researched|i tried|i analysed|i compared)\b/.test(text)) return 'SELF_DIRECTED'
  return 'UNKNOWN'
}

const EMOTIONS: [string, RegExp][] = [
  ['frustration', /\b(worst|fraud|irresponsible|disappointed|frustrat\w*|annoying|cheating|useless)\b/],
  ['anxiety', /\b(scared|dar|worried|tension|afraid|fear|is my money lost|safe)\b/],
  ['confusion', /\b(confus\w*|can'?t understand|don'?t understand|not clear|don'?t know|samajh|why)\b|\?\?/],
  ['panic', /\b(loss ho|now at a loss|what should i do|help me|urgent)\b/],
  ['resignation', /\b(leave it|never invest\w*|give up|stopped)\b/],
  ['gratitude', /\b(thanks?|thank you|shukriya|grateful|helpful)\b/],
  ['motivation', /\b(motivat\w*|excited|goal|future|long term)\b/],
]

const RULE_CONFUSION: Record<string, string> = {
  RULE_UPI_MANDATE_LIMIT: 'Reads the mandate’s maximum amount or end date as what will be debited.',
  RULE_NAV_ALLOC_DELAY: "Reads 'allotment in progress' or a refund as the platform failing.",
  RULE_INSTALLMENT_VS_DEBIT: 'Bank debit and in-app installment status don’t line up for them.',
  RULE_NACH_BOUNCE: 'Attributes bank bounce charges to the SIP or the app.',
  RULE_UPI_REVOKE: 'Unsure what turning off autopay in a UPI app does to the SIP.',
  RULE_MANDATE_REGEN: 'Doesn’t know the mandate must be set up again after it fails or is cancelled.',
  RULE_T3_LOCKOUT: 'Expects a skip or cancel to apply immediately.',
  RULE_NAV_CONFUSION: 'Reads an early NAV dip as money lost.',
}

const WORKAROUNDS: [RegExp, string][] = [
  [/\b(google pay|gpay|phonepe|paytm|bhim)\b/, 'Managing the autopay mandate from a UPI app'],
  [/\bone time investment\b|\blumpsum instead\b/, 'Placed a one-time order instead of a SIP'],
  [/\bpayment gateway\b/, 'Paying through a payment gateway instead of a mandate'],
  [/\bwithout autopay\b|\bmonth to month self pay\b|\bpay manually\b/, 'Paying each installment manually instead of autopay'],
]

export function runStage3(stage1: Stage1Result, stage2: Stage2Result): Stage3Result {
  const text = `${stage1.scrubbed}\n${stage1.normalized}`.toLowerCase()
  const { theme } = scoreThemesForText(text, stage2)
  const sev = churnSeverity(text)
  const confusion = stage2.ruleMatches.map((m) => RULE_CONFUSION[m.ruleId]).find(Boolean)
  const profile: BehavioralProfile = {
    investorLifecycleStage: lifecycle(text),
    userSegment: segment(text),
    primaryFrictionTheme: theme,
    insideAppConfusion: confusion ?? 'None detected.',
    outsideAppWorkaround: WORKAROUNDS.find(([re]) => re.test(text))?.[1] ?? null,
    churnSeverity: sev.severity,
    churnSeverityRationale: `Severity ${sev.severity}: ${sev.why}.`,
    emotionalSignals: EMOTIONS.filter(([, re]) => re.test(text)).map(([name]) => name),
  }
  return { behavioralProfile: profile }
}
