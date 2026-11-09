import { CheckCircle2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { COPY } from '@/lib/copy'
import { buildSchedule, formatINR, mandateFor, ordinal, type PaymentMethod } from '@/lib/schedule'
import type { SipConfig } from '@/lib/sipState'
import { track } from '@/lib/track'
import { MandateReview } from './MandateReview'
import { ScheduleList } from './ScheduleList'

export type { SipConfig }

type Step = 'details' | 'mandate' | 'done'

export function SetupFlow({ today, onComplete }: { today: Date; onComplete: (cfg: SipConfig) => void }) {
  const [step, setStep] = useState<Step>('details')
  const [amountText, setAmountText] = useState('500')
  const [sipDay, setSipDay] = useState(5)
  const [method, setMethod] = useState<PaymentMethod>('upi')

  const amount = Number(amountText)
  const check = mandateFor(amount, method)
  const schedule = useMemo(() => buildSchedule(today, sipDay), [today, sipDay])

  useEffect(() => track('setup_started'), [])
  useEffect(() => {
    if (step === 'mandate') track('mandate_explainer_viewed', { amount, method, limit: check.limit })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  if (step === 'details') {
    return (
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (check.ok) setStep('mandate')
        }}
      >
        <div>
          <label htmlFor="amount" className="label">
            Monthly amount (₹)
          </label>
          <input
            id="amount"
            className="input mt-1.5 text-lg"
            inputMode="numeric"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value.replace(/[^\d]/g, ''))}
            aria-describedby={check.problem ? 'amount-problem' : undefined}
          />
          {check.problem && amountText !== '' && (
            <p id="amount-problem" role="alert" className="mt-1.5 text-sm text-amber-text">
              {check.problem}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="sipDay" className="label">
            SIP date each month
          </label>
          <select id="sipDay" className="input mt-1.5" value={sipDay} onChange={(e) => setSipDay(Number(e.target.value))}>
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {ordinal(d)}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-ink-faint">Tip: a few days after your salary usually arrives.</p>
        </div>

        <fieldset>
          <legend className="label">Pay with</legend>
          <div className="mt-1.5 space-y-2">
            {(
              [
                ['upi', COPY.upiOption, COPY.upiOptionHint],
                ['enach', COPY.enachOption, COPY.enachOptionHint],
              ] as const
            ).map(([value, title, hint]) => (
              <label
                key={value}
                className={`flex cursor-pointer gap-3 rounded-md border p-3 ${method === value ? 'border-teal-text bg-teal/10' : 'border-line'}`}
              >
                <input type="radio" name="method" value={value} checked={method === value} onChange={() => setMethod(value)} className="mt-1" />
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="block text-xs text-ink-muted">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" className="btn-primary w-full" disabled={!check.ok}>
          Continue
        </button>
      </form>
    )
  }

  if (step === 'mandate') {
    return (
      <MandateReview
        amount={amount}
        limit={check.limit}
        method={method}
        onBack={() => setStep('details')}
        onApprove={() => {
          track('mandate_approved', { amount, method, limit: check.limit, sipDay })
          track('setup_completed', { amount, method, sipDay })
          setStep('done')
        }}
      >
        <div className="card p-4">
          <p className="label">Your first instalments</p>
          <ScheduleList schedule={schedule} amount={amount} />
          <p className="mt-1 text-xs text-ink-faint">{COPY.holidayNote}</p>
        </div>
      </MandateReview>
    )
  }

  return (
    <div className="space-y-4">
      <div className="card flex gap-3 p-4">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-green-text" aria-hidden />
        <div>
          <h2 className="font-semibold">{COPY.doneTitle}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">{COPY.doneBody}</p>
        </div>
      </div>
      <div className="card p-4">
        <ScheduleList schedule={schedule} amount={amount} />
      </div>
      <button type="button" className="btn-primary w-full" onClick={() => onComplete({ amount, sipDay, method })}>
        Track my first instalment
      </button>
    </div>
  )
}
