import { Settings } from 'lucide-react'
import { useAppStore } from '@/store'
import { ENGINE_LABEL } from '@/lib/labels'
import { TabNav } from './TabNav'

export function Header() {
  const setDrawerOpen = useAppStore((s) => s.setDrawerOpen)
  const forceEngine = useAppStore((s) => s.forceEngine)
  // In Auto the server decides: it uses the LLM if this tab or the server has a Groq key.
  const mode = forceEngine === 'auto' ? 'Auto' : ENGINE_LABEL[forceEngine]

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-navy/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 pt-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
            <rect width="32" height="32" rx="6" fill="rgb(var(--slate))" />
            <path d="M7 22l6-7 5 4 7-9" stroke="rgb(var(--teal-text))" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold leading-tight md:text-lg">SIP Discovery Engine</h1>
            <p className="truncate text-xs text-ink-muted">Why first-time SIP investors drop off before 12 installments</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-ink-muted sm:inline">Engine: <span className="text-ink">{mode}</span></span>
          <button
            id="settings-trigger"
            type="button"
            className="btn-ghost h-9 w-9 p-0"
            aria-label="Open settings"
            onClick={() => setDrawerOpen(true)}
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-2 md:px-4">
        <TabNav />
      </div>
    </header>
  )
}
