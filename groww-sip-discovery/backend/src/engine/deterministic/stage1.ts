/**
 * Stage 1 — PII scrubber & Hinglish normalizer. Runs before anything else, in every engine mode, so no
 * personal data ever reaches the LLM provider or the logs.
 */
import { normalizeHinglish, type PIIEntity, type PIIEntityType, type Stage1Result } from '@groww-sip/shared'

// Common capitalised words that follow "I am" / "I'm" but are not names.
const NOT_NAMES = new Set(
  ('New From Not A An The Very Also Willing Interested Beginner Planning Unable Using Investing Here Just Looking Sure ' +
    'Confused Happy Sir Ji Bro Bhai Team Doing Going Trying Getting Still Facing From Currently Really So Totally Completely ' +
    'Investor Student Teacher Girl Boy Salaried Working Waiting Subscriber Senior Junior Grateful Thankful India Indian')
    .split(' '),
)

type Masker = { type: PIIEntityType; token: string; re: RegExp; group?: number }

const MASKERS: Masker[] = [
  { type: 'email', token: '[EMAIL]', re: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  { type: 'upi', token: '[UPI_ID]', re: /\b[\w.-]{2,}@[a-z][a-z0-9]{1,15}\b/gi },
  { type: 'phone', token: '[PHONE]', re: /(?<![\d\w])(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g },
  { type: 'bank_account', token: '[ACCOUNT]', re: /(?<![\d.,₹])\d{9,18}(?![\d.,])/g },
  { type: 'pan', token: '[PAN]', re: /\b[A-Z]{5}\d{4}[A-Z]\b/g },
  { type: 'name', token: '[HANDLE]', re: /(?<![\w.])@[A-Za-z][\w.]{2,30}/g },
]

const NAME_RE = /\b(my name is|i am|i'm|im|this is|mera naam|mai|main)\s+([A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?)/g

export function runStage1(rawInput: string): Stage1Result {
  const found: PIIEntity[] = []
  let scrubbed = rawInput

  for (const m of MASKERS) {
    scrubbed = scrubbed.replace(m.re, () => {
      found.push({ type: m.type, replacement: m.token })
      return m.token
    })
  }

  scrubbed = scrubbed.replace(NAME_RE, (whole, lead: string, name: string) => {
    const first = name.split(' ')[0]!
    if (NOT_NAMES.has(first)) return whole
    found.push({ type: 'name', replacement: '[NAME]' })
    return `${lead} [NAME]`
  })

  const { normalized, applied } = normalizeHinglish(scrubbed)
  return { original: rawInput, scrubbed, normalized, piiEntitiesFound: found, hinglishTokensNormalized: applied }
}
