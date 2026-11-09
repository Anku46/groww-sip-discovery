/** Display labels for enum values. */
export const CHANNEL_LABEL: Record<string, string> = {
  PlayStore: 'Play Store', AppStore: 'App Store', YouTube: 'YouTube', Forum: 'Forum',
}
export const STAGE_LABEL: Record<string, string> = {
  PRE_START: 'Pre-start', MONTH_0_1: 'Month 0–1', MONTH_2_4: 'Month 2–4', MONTH_5_8: 'Month 5–8', MONTH_9_12: 'Month 9–12', UNKNOWN: 'Unknown',
}
export const SEGMENT_LABEL: Record<string, string> = {
  INFLUENCER_LED: 'Influencer-led', PEER_LED: 'Peer-led', SELF_DIRECTED: 'Self-directed', UNKNOWN: 'Unknown',
}
export const ENGINE_LABEL: Record<string, string> = { deterministic: 'Deterministic', llm: 'LLM', fallback: 'Fallback' }
export const FALLBACK_REASON: Record<string, string> = {
  no_api_key: 'no Groq key is set',
  invalid_api_key: 'Groq rejected the API key',
  timeout: 'Groq took longer than 10 seconds',
  invalid_response: "Groq's answer didn't pass validation",
  provider_error: 'Groq returned an error',
}
export const PII_LABEL: Record<string, string> = {
  phone: 'Phone', email: 'Email', upi: 'UPI ID', bank_account: 'Account no.', pan: 'PAN', name: 'Name',
}

export const humanize = (id: string) =>
  id.replace(/^(THEME_|RULE_|SEBI_)/, '').toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

export const fmt = (n: number, dp = 1) => (Number.isInteger(n) && dp === 0 ? String(n) : n.toFixed(dp))
