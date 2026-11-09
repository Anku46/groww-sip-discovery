import { ArrowLeft } from 'lucide-react'
import { FAILED_SCREEN_COPY, PAY_NOW_CLOSED, RECOVERY_COPY } from '@/lib/copy'
import { formatDay, formatINR } from '@/lib/schedule'
import { canPayNow, nextInstalment, type SipState } from '@/lib/sipState'

/** Simulated one-time UPI payment for a missed instalment. Future autopay debits are not touched. */
export function PayNow({
  sip,
  n,
  onPay,
  onBack,
}: {
  sip: SipState
  n: number
  onPay: () => void
  onBack: () => void
}) {
  const amount = formatINR(sip.config.amount)
  const allowed = canPayNow(sip, n)

  return (
    <div className="space-y-4">
      <button type="button" className="btn-ghost px-3 py-1.5" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {FAILED_SCREEN_COPY.back}
      </button>

      <section className="card p-4" aria-labelledby="pay-title">
        <h2 id="pay-title" className="text-lg font-semibold">
          {RECOVERY_COPY.payTitle(n)}
        </h2>
        <p className="mt-3 text-3xl font-semibold tabular-nums">{amount}</p>
        <p className="mt-2 text-sm text-ink-muted">
          {allowed ? RECOVERY_COPY.payBody : PAY_NOW_CLOSED(formatDay(nextInstalment(sip, n).debitDate))}
        </p>
      </section>

      {allowed && (
        <button type="button" className="btn-primary w-full" onClick={onPay}>
          {RECOVERY_COPY.payButton(amount)}
        </button>
      )}
    </div>
  )
}
