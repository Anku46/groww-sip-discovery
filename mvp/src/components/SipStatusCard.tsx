import { AlertCircle, ArrowRight, CheckCircle2, PauseCircle } from 'lucide-react'
import { ACTION_COPY, ALERT_COPY, STATUS_CARD_COPY, STATUS_CARD_LABEL } from '@/lib/copy'
import { formatDay, formatINR } from '@/lib/schedule'
import { alertInstalment, nextDebit, sipHealth, type SipState } from '@/lib/sipState'

/**
 * "Is my SIP running?" (MVP_ImplementationPlan.md Step 7). One card at the top of the tracker:
 * calm when the SIP is running, amber with the next action when something needs doing. It also carries the
 * failure alert from Step 6, so the top of the screen says it once.
 */
export function SipStatusCard({
  sip,
  onOpenFailed,
  onReconnect,
}: {
  sip: SipState
  onOpenFailed: (n: number) => void
  onReconnect: () => void
}) {
  const health = sipHealth(sip)
  const alertN = alertInstalment(sip)
  const copy = STATUS_CARD_COPY[health]
  const body = copy.body({ amount: formatINR(sip.config.amount), nextDate: formatDay(nextDebit(sip).debitDate) })
  const amber = health !== 'running'
  const Icon = health === 'running' ? CheckCircle2 : health === 'autopay_off' ? PauseCircle : AlertCircle

  return (
    <section
      aria-label="SIP status"
      role={alertN !== null ? 'alert' : undefined}
      data-health={health}
      className={`card mb-4 p-4 ${amber ? 'border-amber/60 bg-amber/10' : ''}`}
    >
      <p className="label">{STATUS_CARD_LABEL}</p>
      <div className="mt-2 flex gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${amber ? 'text-amber-text' : 'text-green-text'}`} aria-hidden />
        <div className="flex-1">
          <h2 className="font-semibold">{copy.title}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">{body}</p>

          {health === 'autopay_off' && (
            <button type="button" className="btn-primary mt-3 w-full" onClick={onReconnect}>
              {ACTION_COPY.reconnect_mandate.label}
            </button>
          )}
          {alertN !== null && (
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-teal-text hover:underline"
              onClick={() => onOpenFailed(alertN)}
            >
              {ALERT_COPY.bannerAction}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
