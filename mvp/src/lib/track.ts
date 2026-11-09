/**
 * Product events for measuring the experiment. The prototype keeps them in memory (visible with ?debug); a real
 * build would send them to the analytics pipeline.
 *
 * Success metric: share of first installments debited successfully, and 12-month continuation, for investors who
 * saw the mandate explainer vs. a control group.
 */
export type EventName =
  | 'setup_started'
  | 'mandate_explainer_viewed'
  | 'mandate_approved'
  | 'setup_completed'
  | 'tracker_viewed'
  | 'change_requested'

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
