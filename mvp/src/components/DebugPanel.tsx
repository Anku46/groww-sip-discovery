import { useSyncExternalStore } from 'react'
import { FUNNEL_STAGES, getEvents, recoveryFunnel, resetEvents, subscribe } from '@/lib/track'

/** Prototype-only panel (open the app with ?debug): the recovery funnel and the raw event log. */
export function DebugPanel() {
  const events = useSyncExternalStore(subscribe, getEvents)
  const { counts, completedBy } = recoveryFunnel(events)
  const top = counts.failed

  return (
    <section className="card mt-6 space-y-4 border-dashed p-4 text-xs" aria-label="Debug panel">
      <div>
        <div className="flex items-center justify-between">
          <p className="label">Recovery funnel</p>
          <button type="button" className="text-ink-muted hover:underline" onClick={resetEvents}>
            Clear events
          </button>
        </div>
        <p className="mt-1 text-ink-faint">Distinct failed instalments reaching each stage.</p>
        <ol className="mt-3 space-y-2" aria-label="Recovery funnel">
          {FUNNEL_STAGES.map((stage) => {
            const value = counts[stage.key]
            const pct = top ? Math.round((value / top) * 100) : 0
            return (
              <li key={stage.key} data-stage={stage.key} data-count={value}>
                <div className="flex justify-between">
                  <span>{stage.label}</span>
                  <span className="tabular-nums text-ink-muted">
                    {value}
                    {top > 0 && ` · ${pct}%`}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded bg-navy">
                  <div className="h-1.5 rounded bg-teal" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ol>
        {Object.keys(completedBy).length > 0 && (
          <p className="mt-2 text-ink-muted" data-testid="completed-by">
            Completed by:{' '}
            {Object.entries(completedBy)
              .map(([action, count]) => `${action} ${count}`)
              .join(', ')}
          </p>
        )}
      </div>

      <details open>
        <summary className="label cursor-pointer">Events ({events.length})</summary>
        <ul className="mt-2 space-y-1 font-mono">
          {[...events].reverse().map((e, i) => (
            <li key={`${e.at}-${i}`}>
              {e.name} {Object.keys(e.props).length > 0 && <span className="text-ink-faint">{JSON.stringify(e.props)}</span>}
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
