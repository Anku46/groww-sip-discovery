import { AlertCircle, ArrowLeft, CalendarClock, ChevronDown, Landmark, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  ACTION_COPY,
  AUTOPAY_EXPLAINER,
  FACT_COPY,
  FAILED_SCREEN_COPY as S,
  FAILURE_COPY,
  PAY_NOW_CLOSED,
  RECOVERY_COPY,
} from '@/lib/copy'
import { bankChargeLikely, isMandateFailure, recoveryOptions, type RecoveryAction } from '@/lib/outcome'
import { formatDay, formatINR } from '@/lib/schedule'
import { mandateState, nextInstalment, resolveState, type SipState } from '@/lib/sipState'

/**
 * What happened to a failed instalment, in plain language, and what the investor can do about it
 * (MVP_Architecture.md §5).
 */
export function FailedInstalment({
  sip,
  n,
  onBack,
  onAction,
}: {
  sip: SipState
  n: number
  onBack: () => void
  onAction: (action: RecoveryAction) => void
}) {
  const state = resolveState(sip, n)

  if (state.kind !== 'failed') {
    return (
      <div className="space-y-4">
        <p className="card p-4 text-sm text-ink-muted">{S.notFailed}</p>
        <BackButton onBack={onBack} />
      </div>
    )
  }

  const copy = FAILURE_COPY[state.reason]
  const mandate = mandateState(sip)
  const next = nextInstalment(sip, n)
  const nextDate = formatDay(next.debitDate)
  const options = recoveryOptions(state.reason, sip.today, next, mandate)
  const vars = { amount: formatINR(sip.config.amount), nextDate }

  return (
    <div className="space-y-4">
      <BackButton onBack={onBack} />

      <section className="card border-amber/60 p-4" aria-labelledby="failed-title">
        <p className="label">{S.heading(n)}</p>
        <div className="mt-2 flex gap-2.5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-text" aria-hidden />
          <div>
            <h2 id="failed-title" className="text-lg font-semibold">
              {copy.title(formatINR(sip.config.amount))}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{copy.whatHappened(formatDay(state.failedOn))}</p>
          </div>
        </div>
      </section>

      <section className="card p-4" aria-labelledby="facts-title">
        <h3 id="facts-title" className="label">
          {S.factsTitle}
        </h3>
        <ul className="mt-3 space-y-3">
          <Fact icon={<Wallet className="h-5 w-5" />} testId="fact-money">
            {FACT_COPY.money}
          </Fact>
          <Fact icon={<CalendarClock className="h-5 w-5" />} testId="fact-sip">
            {FACT_COPY.sip(mandate, nextDate)}
          </Fact>
          <Fact icon={<Landmark className="h-5 w-5" />} testId="fact-charge">
            {FACT_COPY.bankCharge(bankChargeLikely(state.reason))}
          </Fact>
        </ul>
      </section>

      <section className="card p-4" aria-labelledby="actions-title">
        <h3 id="actions-title" className="label">
          {RECOVERY_COPY.actionsTitle}
        </h3>
        {!options.includes('pay_now') && (
          <p className="mt-2 text-sm text-ink-muted" data-testid="pay-now-closed">
            {PAY_NOW_CLOSED(nextDate)}
          </p>
        )}
        <ul className="mt-3 space-y-3">
          {options.map((action, i) => (
            <li key={action}>
              <button
                type="button"
                className={i === 0 ? 'btn-primary w-full' : 'btn-ghost w-full'}
                onClick={() => onAction(action)}
              >
                {ACTION_COPY[action].label}
              </button>
              <p className="mt-1 text-xs text-ink-muted">{ACTION_COPY[action].hint(vars)}</p>
            </li>
          ))}
        </ul>
      </section>

      <Expander title={S.whyTitle}>{copy.why}</Expander>
      {isMandateFailure(state.reason) && <Expander title={AUTOPAY_EXPLAINER.title}>{AUTOPAY_EXPLAINER.body}</Expander>}
    </div>
  )
}

function Fact({ icon, testId, children }: { icon: ReactNode; testId: string; children: ReactNode }) {
  return (
    <li className="flex gap-3" data-testid={testId}>
      <span className="mt-0.5 shrink-0 text-teal-text" aria-hidden>
        {icon}
      </span>
      <span className="text-sm">{children}</span>
    </li>
  )
}

function Expander({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="card group p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <p className="mt-2 text-sm text-ink-muted">{children}</p>
    </details>
  )
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" className="btn-ghost px-3 py-1.5" onClick={onBack}>
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {S.back}
    </button>
  )
}
