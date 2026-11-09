import { CheckCircle2 } from 'lucide-react'
import { FAILED_SCREEN_COPY, RECOVERY_COPY } from '@/lib/copy'

/** Calm confirmation shown after every recovery action. */
export function Confirmation({ message, onDone }: { message: string; onDone: () => void }) {
  return (
    <div className="space-y-4">
      <section className="card flex gap-3 p-4" role="status">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-green-text" aria-hidden />
        <div>
          <h2 className="font-semibold">{RECOVERY_COPY.doneTitle}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">{message}</p>
        </div>
      </section>
      <button type="button" className="btn-primary w-full" onClick={onDone}>
        {FAILED_SCREEN_COPY.back}
      </button>
    </div>
  )
}
