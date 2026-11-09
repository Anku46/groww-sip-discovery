/**
 * Hinglish colloquials -> structured English intent. Built from Architecture.md §5 and the phrases found in the
 * Phase 2 corpus (research/data/phase2/hinglish_phrases.json). Phrases are lowercase; matching is
 * case-insensitive on word boundaries, longest phrase first.
 */
import type { HinglishNormalization } from '../types/pipeline'
import type { HinglishMapping } from '../types/domain'

export const HINGLISH_MAP: HinglishMapping[] = [
  { phrases: ['apne aap kat jayega', 'apne aap kat jaayega', 'apne aap bank se kat jayega'], english: 'will be auto-deducted' },
  { phrases: ['phonepe se delete kar diya'], english: 'UPI Autopay mandate revoked via PhonePe' },
  { phrases: ['kat liya', 'kat gaya', 'kat gaye', 'kat gya', 'kt gye', 'kat gye', 'kaat liya'], english: 'was deducted' },
  { phrases: ['katega', 'ktega', 'kat jayega', 'katenge', 'kaatega'], english: 'will be deducted' },
  { phrases: ['kyu kaat te h', 'kyu kaat te hai', 'kyu kaatte hai', 'kyu kaatte h'], english: 'why do they deduct' },
  { phrases: ['bounce ho gaya', 'bounce ho gya', 'bounce hua'], english: 'NACH debit failed / bounced' },
  { phrases: ['band kar diya', 'band kar dete', 'band kar di', 'band kar du'], english: 'cancelled / stopped' },
  { phrases: ['closed nhi hui', 'closed nahi hui', 'band nahi hui', 'band nhi hui'], english: 'did not get closed' },
  { phrases: ['ruk to nahin jayegi', 'ruk to nahi jayegi', 'ruk jayegi'], english: 'will it stop' },
  { phrases: ['ghata ho raha hai', 'ghata ho gaya'], english: 'portfolio is at a loss' },
  { phrases: ['loss ho gya', 'loss ho gaya', 'loss ho raha hai'], english: 'is now at a loss' },
  { phrases: ['paisa doob jata', 'paisa doob jayega', 'paisa dub jata', 'paise doob gaye'], english: 'the money gets lost' },
  { phrases: ['fd better hai'], english: 'Fixed Deposit seems preferable' },
  { phrases: ['paise nahi the', 'paise nhi the', 'paisa nahi tha'], english: 'insufficient funds / cashflow crunch' },
  { phrases: ['khud dalna hoga', 'khud dalna padega'], english: 'will have to pay manually' },
  { phrases: ['kya kre', 'kya kare', 'kya karu', 'kya karein', 'kyakre'], english: 'what should I do' },
  { phrases: ['dar lagta h', 'dar lagta hai'], english: 'I feel scared' },
  { phrases: ['kaise kare', 'kaise karein', 'kaise karte hai'], english: 'how to do it' },
  { phrases: ['kitna milega', 'kitna return milega'], english: 'how much will I get' },
  { phrases: ['samjh nhi pa raha', 'samajh nahi aa raha', 'samajh nahi pa raha'], english: "I can't understand" },
  { phrases: ['dikha raha hai', 'dikha rha h', 'dikha raha h', 'dikha rha hai'], english: 'is showing' },
  { phrases: ['sip chalu ki', 'sip start kiya', 'sip start kari'], english: 'started the SIP' },
  { phrases: ['pata nhi', 'pata nahi'], english: "I don't know" },
  { phrases: ['months ho gaye', 'months ho gye', 'mahine ho gaye'], english: 'months have passed' },
  { phrases: ['abhi bhi'], english: 'still' },
]

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Flatten to (phrase, english) pairs, longest phrase first so specific phrases win over their substrings.
const PAIRS = HINGLISH_MAP.flatMap((m) => m.phrases.map((phrase) => ({ phrase, english: m.english }))).sort(
  (a, b) => b.phrase.length - a.phrase.length,
)

/** Replace known Hinglish phrases with their English intent. Pure function. */
export function normalizeHinglish(text: string): { normalized: string; applied: HinglishNormalization[] } {
  let normalized = text
  const applied: HinglishNormalization[] = []
  for (const { phrase, english } of PAIRS) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escape(phrase)}(?![\\p{L}\\p{N}])`, 'giu')
    if (re.test(normalized)) {
      normalized = normalized.replace(re, english)
      applied.push({ phrase, english })
    }
  }
  return { normalized, applied }
}
