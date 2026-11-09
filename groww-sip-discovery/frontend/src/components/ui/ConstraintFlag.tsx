import type { ConstraintFlag as Flag } from '@groww-sip/shared'
import { Ban, Info, TriangleAlert } from 'lucide-react'

const STYLE = {
  BLOCK: { icon: Ban, cls: 'border-vermilion/60 bg-vermilion/15 text-vermilion-text', label: 'Blocked' },
  DOWNGRADE: { icon: TriangleAlert, cls: 'border-amber/60 bg-amber/10 text-amber-text', label: 'Downgraded' },
  WARN: { icon: Info, cls: 'border-teal/50 bg-teal/10 text-teal-text', label: 'Note' },
} as const

const NAMES: Record<string, string> = {
  SEBI_NO_FUND_REC: 'No fund recommendation',
  SEBI_NO_FOMO: 'No fear / FOMO nudge',
  SEBI_NO_RETURN_PRED: 'No return prediction',
  SEBI_RIA_BOUNDARY: 'RIA licence boundary',
}

export function ConstraintFlag({ flag }: { flag: Flag }) {
  const s = STYLE[flag.penaltyType]
  const Icon = s.icon
  return (
    <div className={`flex gap-3 rounded-md border p-3 ${s.cls}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 text-sm">
        <p className="font-semibold">
          {s.label}: {NAMES[flag.constraintId] ?? flag.constraintId}
          <span className="ml-2 font-mono text-[11px] font-normal text-ink-muted">{flag.constraintId}</span>
        </p>
        <p className="mt-0.5 text-ink">{flag.message}</p>
        {flag.evidence && <p className="mt-1 text-xs text-ink-muted">Matched: “{flag.evidence}”</p>}
        {flag.triggeredBy === 'behavioral_profile' && <p className="mt-1 text-xs text-ink-muted">Triggered by the classified theme.</p>}
      </div>
    </div>
  )
}
