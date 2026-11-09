import { AlertCircle, RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'

export function LoadingShimmer({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="h-4 animate-shimmer rounded bg-[length:800px_100%]"
          style={{ width: `${100 - i * 12}%`, backgroundImage: 'linear-gradient(90deg, rgb(var(--slate-elevated)/0.4) 0%, rgb(var(--slate-elevated)/0.9) 50%, rgb(var(--slate-elevated)/0.4) 100%)' }}
        />
      ))}
    </div>
  )
}

export function Loading({ label, lines }: { label: string; lines?: number }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <LoadingShimmer lines={lines} />
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-md border border-vermilion/60 bg-vermilion/10 p-3 text-sm">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-vermilion-text" aria-hidden="true" />
      <p className="flex-1 text-ink">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost px-2 py-1 text-xs">
          <RotateCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-line p-6 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-2 text-sm text-ink-muted">{children}</div>}
    </div>
  )
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-lg font-semibold">{children}</h2>
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}
