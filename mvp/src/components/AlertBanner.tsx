import { AlertCircle, ArrowRight } from 'lucide-react'
import { ALERT_COPY } from '@/lib/copy'
import { formatINR } from '@/lib/schedule'
import { latestDue, resolveState, type SipState } from '@/lib/sipState'

/** The instalment the alert is about: the latest one due, if it failed and hasn't been sorted out. */
export function alertInstalment(sip: SipState): number | null {
  const due = latestDue(sip)
  if (!due) return null
  return resolveState(sip, due.number).kind === 'failed' ? due.number : null
}

/** In-app alert on the day an instalment fails (MVP_ImplementationPlan.md Step 6). Amber, never red. */
export function AlertBanner({ sip, onOpen }: { sip: SipState; onOpen: (n: number) => void }) {
  const n = alertInstalment(sip)
  if (n === null) return null

  return (
    <section role="alert" aria-label="Instalment alert" className="card mb-4 flex gap-3 border-amber/60 bg-amber/10 p-4">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-text" aria-hidden />
      <div className="flex-1">
        <p className="text-sm font-medium">{ALERT_COPY.banner(formatINR(sip.config.amount))}</p>
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-teal-text hover:underline"
          onClick={() => onOpen(n)}
        >
          {ALERT_COPY.bannerAction}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </section>
  )
}
