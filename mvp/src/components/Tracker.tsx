import { AlertCircle, ArrowRight, Check, Minus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { changeEffectCopy, COPY, FAILED_SCREEN_COPY } from '@/lib/copy'
import { FAILURE_REASONS, type FailureReason } from '@/lib/outcome'
import { formatDay, parseLocalDate, toInputDate } from '@/lib/schedule'
import { alertInstalment, getInstalment, nextInstalment, resolveState, type SipAction, type SipState } from '@/lib/sipState'
import { statusSummary, timelineSteps, type StepStatus } from '@/lib/timeline'
import { track } from '@/lib/track'

/** Prototype-only labels for the simulation control (not investor-facing copy). */
const OUTCOME_LABELS: Record<'success' | FailureReason, string> = {
  success: 'Debit succeeds',
  insufficient_balance: 'Fails: low balance',
  mandate_revoked: 'Fails: autopay turned off in UPI app',
  mandate_not_active: 'Fails: autopay not set up',
  bank_technical: 'Fails: bank glitch',
  unknown: 'Fails: no reason given',
}

export interface TrackerProps {
  sip: SipState
  dispatch: (a: SipAction) => void
  /** Selected instalment number; kept in App so it survives opening the failed-instalment screen. */
  n: number
  onSelect: (n: number) => void
  onOpenFailed: (n: number) => void
}

export function Tracker({ sip, dispatch, n, onSelect, onOpenFailed }: TrackerProps) {
  const [change, setChange] = useState<string | null>(null)

  useEffect(() => track('tracker_viewed', { sipDay: sip.config.sipDay }), [sip.config.sipDay])

  const inst = getInstalment(sip, n)!
  const state = resolveState(sip, n)
  const steps = timelineSteps(sip, n)
  const summary = statusSummary(sip, n)
  const next = formatDay(nextInstalment(sip, n).debitDate)

  const mi = sip.mandateInactive
  const simulated: 'success' | FailureReason =
    mi && mi.from.getTime() === inst.debitDate.getTime() ? mi.reason : (sip.simulatedOutcome[n] ?? 'success')

  const setToday = (today: Date) => {
    dispatch({ type: 'SET_TODAY', today })
    setChange(null)
  }

  const requestChange = (kind: string) => {
    const applies = state.kind === 'open' ? 'this' : 'next'
    track('change_requested', { kind, status: state.kind, applies })
    if (kind === 'Skip' && applies === 'this') {
      dispatch({ type: 'SKIP', n })
      setChange(null)
      return
    }
    setChange(changeEffectCopy(applies, next))
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-3 border-dashed p-4" aria-label="Prototype controls">
        <p className="label">Prototype controls</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="inst" className="text-xs text-ink-muted">
              Instalment
            </label>
            <select
              id="inst"
              className="input mt-1"
              value={n}
              onChange={(e) => {
                onSelect(Number(e.target.value))
                setChange(null)
              }}
            >
              {sip.instalments.map((s) => (
                <option key={s.number} value={s.number}>
                  #{s.number} · {s.debitDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="simToday" className="text-xs text-ink-muted">
              Pretend today is
            </label>
            <input
              id="simToday"
              type="date"
              className="input mt-1"
              value={toInputDate(sip.today)}
              onChange={(e) => {
                const d = parseLocalDate(e.target.value)
                if (d) setToday(d)
              }}
            />
          </div>
        </div>
        <div>
          <label htmlFor="outcome" className="text-xs text-ink-muted">
            Simulate this debit
          </label>
          <select
            id="outcome"
            className="input mt-1"
            value={simulated}
            onChange={(e) => dispatch({ type: 'SIMULATE_OUTCOME', n, outcome: e.target.value as 'success' | FailureReason })}
          >
            {(['success', ...FAILURE_REASONS] as const).map((o) => (
              <option key={o} value={o}>
                {OUTCOME_LABELS[o]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setToday(inst.cutoff)}>
            Go to cutoff
          </button>
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setToday(inst.debitDate)}>
            Go to debit day
          </button>
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setToday(inst.unitsBy)}>
            Go to units day
          </button>
        </div>
      </section>

      <section className="card p-4" aria-live="polite">
        <p className="label">Where your money is</p>
        <h2 className={`mt-1 text-lg font-semibold ${summary.kind === 'failed' ? 'text-amber-text' : ''}`}>{summary.title}</h2>
        <p className="mt-0.5 text-sm text-ink-muted">{summary.body}</p>
        {/* The status card already links to the latest failure; don't repeat its button here. */}
        {state.kind === 'failed' && alertInstalment(sip) !== n && (
          <button type="button" className="btn-primary mt-3 w-full" onClick={() => onOpenFailed(n)}>
            {FAILED_SCREEN_COPY.open}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        )}

        <ol className="mt-4" aria-label="Instalment timeline">
          {steps.map((s, i) => (
            <li
              key={s.key}
              data-step={s.key}
              data-status={s.status}
              className="relative flex gap-3 pb-4 last:pb-0"
              aria-current={s.status === 'current' ? 'step' : undefined}
            >
              {i < steps.length - 1 && (
                <span
                  className={`absolute left-[11px] top-6 h-full w-0.5 ${s.status === 'done' ? 'bg-teal' : 'bg-line'}`}
                  aria-hidden
                />
              )}
              <StepIcon status={s.status} />
              <div className={s.status === 'upcoming' ? 'text-ink-faint' : ''}>
                <p className={`font-medium ${s.status === 'failed' ? 'text-amber-text' : ''}`}>
                  {s.title}
                  {s.date && <span className="font-normal text-ink-muted"> · {formatDay(s.date)}</span>}
                </p>
                <p className="text-xs text-ink-muted">{s.note}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {(state.kind === 'open' || state.kind === 'locked') && (
        <section className="card p-4">
          <p className="label">Need to change this one?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {['Skip', 'Pause', 'Change amount'].map((k) => (
              <button key={k} type="button" className="btn-ghost" onClick={() => requestChange(k)}>
                {k}
              </button>
            ))}
          </div>
          {change && (
            <p role="status" className="mt-3 text-sm text-ink">
              {change}
            </p>
          )}
          <p className="mt-3 text-xs text-ink-faint">{COPY.bounceNote}</p>
        </section>
      )}
    </div>
  )
}

function StepIcon({ status }: { status: StepStatus }) {
  const base = 'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2'
  switch (status) {
    case 'done':
      return (
        <span className={`${base} border-teal bg-teal`}>
          <Check className="h-3.5 w-3.5 text-white" aria-hidden />
        </span>
      )
    case 'failed':
      return (
        <span className={`${base} border-amber bg-navy`}>
          <AlertCircle className="h-3.5 w-3.5 text-amber-text" aria-hidden />
        </span>
      )
    case 'skipped':
      return (
        <span className={`${base} border-line bg-navy`}>
          <Minus className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
        </span>
      )
    case 'current':
      return <span className={`${base} border-teal-text bg-navy`} />
    default:
      return <span className={`${base} border-line bg-navy`} />
  }
}
