import { ChevronDown } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

export interface AccordionItem {
  id: string
  title: ReactNode
  content: ReactNode
}

export function Accordion({ items, defaultOpen = [] }: { items: AccordionItem[]; defaultOpen?: string[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set(defaultOpen))
  const baseId = useId()
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  return (
    <div className="divide-y divide-line rounded-lg border border-line">
      {items.map((item) => {
        const isOpen = open.has(item.id)
        const panelId = `${baseId}-${item.id}`
        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-slate-elevated/40"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
              >
                <span className="min-w-0">{item.title}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
            </h3>
            <div id={panelId} role="region" hidden={!isOpen} className="px-4 pb-4">
              {isOpen && item.content}
            </div>
          </div>
        )
      })}
    </div>
  )
}
