import type { ReactNode } from 'react'

export type BadgeVariant = 'teal' | 'amber' | 'vermilion' | 'slate' | 'amber-outline'

const STYLES: Record<BadgeVariant, string> = {
  teal: 'bg-teal/20 text-teal-text border-teal/50',
  amber: 'bg-amber/15 text-amber-text border-amber/50',
  'amber-outline': 'bg-transparent text-amber-text border-amber/60',
  vermilion: 'bg-vermilion/20 text-vermilion-text border-vermilion/60',
  slate: 'bg-slate-elevated/60 text-ink border-line',
}

export function Badge({ variant = 'slate', children, icon, title }: { variant?: BadgeVariant; children: ReactNode; icon?: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-4 ${STYLES[variant]}`}>
      {icon}
      {children}
    </span>
  )
}

/** Severity colour: 1–2 amber outline, 3 amber, 4–5 vermilion (Architecture.md §16). */
export const severityVariant = (s: number): BadgeVariant => (s >= 4 ? 'vermilion' : s === 3 ? 'amber' : 'amber-outline')
