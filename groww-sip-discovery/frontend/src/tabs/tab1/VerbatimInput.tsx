import { Loader2, Play } from 'lucide-react'
import { useQuickLoadChips } from '@/api/hooks'
import { ErrorState, LoadingShimmer } from '@/components/ui/States'
import { useAppStore } from '@/store'

export const MAX_CHARS = 2000

export function QuickLoadChips() {
  const { data, loading, error, reload } = useQuickLoadChips()
  const setRawInput = useAppStore((s) => s.setRawInput)
  const rawInput = useAppStore((s) => s.rawInput)
  if (loading) return <LoadingShimmer lines={1} />
  if (error) return <ErrorState message={`Couldn't load example verbatims. ${error}`} onRetry={reload} />
  return (
    <div>
      <p className="label mb-2">Try a real verbatim</p>
      <div className="flex flex-wrap gap-2">
        {data!.map((chip) => (
          <button
            key={chip.verbatimId}
            type="button"
            onClick={() => setRawInput(chip.text)}
            aria-pressed={rawInput === chip.text}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              rawInput === chip.text ? 'border-teal-text bg-teal/20 text-ink' : 'border-line text-ink-muted hover:border-ink-muted hover:text-ink'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function VerbatimInput({ onRun }: { onRun: () => void }) {
  const rawInput = useAppStore((s) => s.rawInput)
  const setRawInput = useAppStore((s) => s.setRawInput)
  const isRunning = useAppStore((s) => s.isRunning)
  const empty = !rawInput.trim()
  const over = rawInput.length > MAX_CHARS

  return (
    <form
      className="card space-y-4 p-4 md:p-5"
      onSubmit={(e) => { e.preventDefault(); if (!empty && !over) onRun() }}
    >
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <label htmlFor="verbatim" className="label">Investor feedback</label>
          <span className={`text-xs tabular-nums ${over ? 'text-vermilion-text' : 'text-ink-muted'}`} aria-live="polite">
            {rawInput.length} / {MAX_CHARS}
          </span>
        </div>
        <textarea
          id="verbatim"
          rows={4}
          className="input resize-y leading-relaxed"
          placeholder="Paste a review or comment, in English or Hinglish. For example: Autopay me 15000 ka payment dikha raha hai, meri SIP 500 ki hai"
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit() }}
          aria-describedby="verbatim-hint"
          aria-invalid={over}
        />
        <p id="verbatim-hint" className="mt-1 text-xs text-ink-muted">
          {over ? `Shorten this by ${rawInput.length - MAX_CHARS} characters.` : 'Personal details are masked before anything else happens. Ctrl+Enter runs it.'}
        </p>
      </div>
      <QuickLoadChips />
      <div className="flex justify-end">
        <button type="submit" className="btn-primary min-w-36" disabled={empty || over || isRunning}>
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
          {isRunning ? 'Running…' : 'Run pipeline'}
        </button>
      </div>
    </form>
  )
}
