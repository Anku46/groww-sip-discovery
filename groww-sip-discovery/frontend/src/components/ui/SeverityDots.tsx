/** Five dots plus the number, so severity never depends on colour alone. */
export function SeverityDots({ value, max = 5, showNumber = true }: { value: number; max?: number; showNumber?: boolean }) {
  const v = Math.max(0, Math.min(max, value))
  const filled = Math.round(v)
  const color = v >= 4 ? 'bg-vermilion' : v >= 3 ? 'bg-amber' : 'bg-amber/60'
  return (
    <span className="inline-flex items-center gap-1.5" role="img" aria-label={`Severity ${Number.isInteger(v) ? v : v.toFixed(1)} of ${max}`}>
      <span className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={`h-2 w-2 rounded-full ${i < filled ? color : 'bg-slate-elevated'}`} />
        ))}
      </span>
      {showNumber && <span className="text-xs tabular-nums text-ink-muted" aria-hidden="true">{Number.isInteger(v) ? v : v.toFixed(1)}</span>}
    </span>
  )
}
