/**
 * Product events for measuring the experiment. The prototype keeps them in memory (visible with ?debug); a real
 * build sends them to the analytics pipeline from this one place (MVP_Architecture.md §7).
 *
 * Success metric: of investors whose instalment fails, the share who pay that month or reconnect autopay within
 * 7 days. Secondary: share still active at month 4, and 12-month continuation against a control group.
 */
export type EventName =
  // Setup and tracker
  | 'setup_started'
  | 'mandate_explainer_viewed'
  | 'mandate_approved'
  | 'setup_completed'
  | 'tracker_viewed'
  | 'change_requested'
  // Failed-instalment recovery (Step 8)
  | 'instalment_failed' // n, reason: an instalment resolves to failed
  | 'failure_alert_viewed' // n, reason: the status card shows the failure alert
  | 'failure_screen_viewed' // n, reason: the failed-instalment screen opens
  | 'recovery_started' // n, action, source: an action button is pressed
  | 'recovery_completed' // n, action: pay-now, reconnect, skip or support request finishes
  | 'status_card_viewed' // state: the status card renders a state

export interface TrackedEvent {
  name: EventName
  at: string
  props: Record<string, string | number | boolean>
}

let events: readonly TrackedEvent[] = []
const listeners = new Set<() => void>()

export function track(name: EventName, props: TrackedEvent['props'] = {}): void {
  events = [...events, { name, at: new Date().toISOString(), props }]
  listeners.forEach((l) => l())
}

export function getEvents(): readonly TrackedEvent[] {
  return events
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function resetEvents(): void {
  events = []
  listeners.forEach((l) => l())
}

export const FUNNEL_STAGES = [
  { key: 'failed', event: 'instalment_failed', label: 'Instalment failed' },
  { key: 'alerted', event: 'failure_alert_viewed', label: 'Saw the alert' },
  { key: 'viewed', event: 'failure_screen_viewed', label: 'Opened "What happened"' },
  { key: 'started', event: 'recovery_started', label: 'Started a recovery' },
  { key: 'completed', event: 'recovery_completed', label: 'Completed a recovery' },
] as const satisfies readonly { key: string; event: EventName; label: string }[]

export type FunnelStage = (typeof FUNNEL_STAGES)[number]['key']

export interface RecoveryFunnel {
  /** Distinct failed instalments that reached each stage. Repeat views of the same instalment count once. */
  counts: Record<FunnelStage, number>
  /** Completed recoveries by action (distinct instalments per action). */
  completedBy: Record<string, number>
}

/**
 * Recovery funnel over distinct failed instalments: failed → alert seen → screen viewed → recovery started →
 * recovery completed. Only instalments that actually failed count at later stages.
 */
export function recoveryFunnel(log: readonly TrackedEvent[]): RecoveryFunnel {
  const failed = new Set(log.filter((e) => e.name === 'instalment_failed').map((e) => e.props.n))
  const reached = (event: EventName) =>
    new Set(log.filter((e) => e.name === event && failed.has(e.props.n)).map((e) => e.props.n))

  const counts = Object.fromEntries(FUNNEL_STAGES.map((s) => [s.key, reached(s.event).size])) as Record<FunnelStage, number>

  const completedBy: Record<string, number> = {}
  const seen = new Set<string>()
  for (const e of log) {
    if (e.name !== 'recovery_completed' || !failed.has(e.props.n)) continue
    const key = `${e.props.n}:${e.props.action}`
    if (seen.has(key)) continue
    seen.add(key)
    const action = String(e.props.action)
    completedBy[action] = (completedBy[action] ?? 0) + 1
  }
  return { counts, completedBy }
}
