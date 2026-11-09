import { CalendarClock, Infinity as InfinityIcon, Info, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { COPY } from '@/lib/copy'
import { formatINR, type PaymentMethod } from '@/lib/schedule'

/**
 * "What you are approving": the monthly debit next to the mandate limit, plus the validity, cutoff and UPI-app
 * explainers. Used at setup and when turning automatic payments back on after a failure.
 */
export function MandateReview({
  amount,
  limit,
  method,
  onApprove,
  onBack,
  children,
}: {
  amount: number
  limit: number
  method: PaymentMethod
  onApprove: () => void
  onBack: () => void
  /** Extra content between the explainers and the buttons, e.g. the upcoming schedule. */
  children?: ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="label">What you are approving</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-md bg-navy p-3">
            <p className="text-xs text-ink-muted">Debited each month</p>
            <p className="text-2xl font-semibold text-green-text tabular-nums">{formatINR(amount)}</p>
          </div>
          <div className="rounded-md bg-navy p-3">
            <p className="text-xs text-ink-muted">Mandate limit</p>
            <p className="text-2xl font-semibold tabular-nums">{formatINR(limit)}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2.5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-text" aria-hidden />
          <div>
            <h2 className="font-semibold">{COPY.mandateHeadline}</h2>
            <p className="mt-0.5 text-sm text-ink-muted">{COPY.mandateBody}</p>
          </div>
        </div>
      </div>

      <Explainer icon={<InfinityIcon className="h-5 w-5" />} title={COPY.validityTitle} body={COPY.validityBody} />
      <Explainer icon={<CalendarClock className="h-5 w-5" />} title={COPY.cutoffTitle} body={COPY.cutoffBody} />
      {method === 'upi' && <Explainer icon={<Info className="h-5 w-5" />} title="Also in your UPI app" body={COPY.upiRevokeNote} />}

      {children}

      <div className="flex gap-2">
        <button type="button" className="btn-ghost" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn-primary flex-1" onClick={onApprove}>
          Approve {formatINR(limit)} limit (simulated)
        </button>
      </div>
    </div>
  )
}

function Explainer({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-2.5 px-1">
      <span className="mt-0.5 shrink-0 text-ink-muted" aria-hidden>
        {icon}
      </span>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-0.5 text-sm text-ink-muted">{body}</p>
      </div>
    </div>
  )
}
