import type { PreferredEngine } from '@groww-sip/shared'
import { CheckCircle2, Eye, EyeOff, Loader2, X, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/api/client'
import { useAppStore } from '@/store'

const ENGINES: { value: PreferredEngine; label: string; hint: string }[] = [
  { value: 'auto', label: 'Auto', hint: 'Use the LLM when a key is set, otherwise the deterministic engine.' },
  { value: 'deterministic', label: 'Force deterministic', hint: 'Rule-based. Fast, free, no key needed.' },
  { value: 'llm', label: 'Force LLM', hint: 'Groq for Stage 3. Falls back to deterministic if it fails.' },
]

type Health = 'checking' | 'up' | 'down'

export function SettingsDrawer() {
  const open = useAppStore((s) => s.drawerOpen)
  const setOpen = useAppStore((s) => s.setDrawerOpen)
  const key = useAppStore((s) => s.groqApiKey)
  const setKey = useAppStore((s) => s.setGroqApiKey)
  const engine = useAppStore((s) => s.forceEngine)
  const setEngine = useAppStore((s) => s.setForceEngine)
  const status = useAppStore((s) => s.keyValidationStatus)
  const setStatus = useAppStore((s) => s.setKeyValidationStatus)
  const [showKey, setShowKey] = useState(false)
  const [health, setHealth] = useState<Health>('checking')
  const panelRef = useRef<HTMLDivElement>(null)

  const close = () => {
    setOpen(false)
    requestAnimationFrame(() => document.getElementById('settings-trigger')?.focus())
  }

  useEffect(() => {
    if (!open) return
    panelRef.current?.querySelector<HTMLElement>('input, button')?.focus()
    const controller = new AbortController()
    setHealth('checking')
    api.health(controller.signal).then(() => setHealth('up')).catch(() => !controller.signal.aborted && setHealth('down'))
    return () => controller.abort()
  }, [open])

  if (!open) return null

  // Keep focus inside the drawer while it's open.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return }
    if (e.key !== 'Tab' || !panelRef.current) return
    const items = [...panelRef.current.querySelectorAll<HTMLElement>('button, input, [href], [tabindex]:not([tabindex="-1"])')].filter((el) => !el.hasAttribute('disabled'))
    const first = items[0], last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
  }

  const validate = async () => {
    if (!key.trim()) return
    setStatus('checking')
    try {
      setStatus((await api.validateKey(key.trim())).valid ? 'valid' : 'invalid')
    } catch {
      setStatus('invalid')
    }
  }

  return (
    <div className="fixed inset-0 z-40" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-black/60" onClick={close} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="absolute right-0 top-0 flex h-full w-full max-w-md animate-drawer-in flex-col border-l border-line bg-slate shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="settings-title" className="text-lg font-semibold">Settings</h2>
          <button type="button" className="btn-ghost h-8 w-8 p-0" aria-label="Close settings" onClick={close}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section>
            <label htmlFor="groq-key" className="label">Groq API key</label>
            <div className="mt-2 flex gap-2">
              <div className="relative flex-1">
                <input
                  id="groq-key"
                  type={showKey ? 'text' : 'password'}
                  className="input pr-10 font-mono"
                  placeholder="gsk_…"
                  autoComplete="off"
                  spellCheck={false}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && validate()}
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-ink-muted hover:text-ink"
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                  onClick={() => setShowKey((v) => !v)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              <button type="button" className="btn-ghost" onClick={validate} disabled={!key.trim() || status === 'checking'}>
                Validate key
              </button>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm" role="status" aria-live="polite">
              {status === 'checking' && <><Loader2 className="h-4 w-4 animate-spin text-ink-muted" aria-hidden="true" /> Checking…</>}
              {status === 'valid' && <><CheckCircle2 className="h-4 w-4 text-green-text" aria-hidden="true" /> Key works.</>}
              {status === 'invalid' && <><XCircle className="h-4 w-4 text-vermilion-text" aria-hidden="true" /> Groq didn’t accept this key.</>}
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              The key stays in this browser tab’s memory only. It isn’t saved, and it’s sent only to this app’s backend,
              which passes it to Groq. Closing or reloading the tab clears it.
            </p>
          </section>

          <fieldset>
            <legend className="label">Engine</legend>
            <div className="mt-2 space-y-2">
              {ENGINES.map((o) => (
                <label key={o.value} className={`flex cursor-pointer gap-3 rounded-md border p-3 ${engine === o.value ? 'border-teal-text bg-teal/10' : 'border-line hover:bg-slate-elevated/40'}`}>
                  <input type="radio" name="engine" value={o.value} checked={engine === o.value} onChange={() => setEngine(o.value)} className="mt-1 accent-[rgb(var(--teal-text))]" />
                  <span>
                    <span className="block text-sm font-medium">{o.label}</span>
                    <span className="block text-xs text-ink-muted">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <section>
            <p className="label">Backend</p>
            <p className="mt-2 flex items-center gap-2 text-sm" role="status" aria-live="polite">
              <span className={`h-2.5 w-2.5 rounded-full ${health === 'up' ? 'bg-green-text' : health === 'down' ? 'bg-vermilion' : 'bg-amber'}`} aria-hidden="true" />
              {health === 'up' ? 'Connected' : health === 'down' ? 'Not reachable' : 'Checking…'}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
