import { useId, useState, type ReactElement, type ReactNode } from 'react'

/** Shows on hover and on keyboard focus; the trigger must be focusable (button, link, or tabIndex=0). */
export function Tooltip({ content, children }: { content: ReactNode; children: ReactElement }) {
  const [show, setShow] = useState(false)
  const id = useId()
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      onKeyDown={(e) => e.key === 'Escape' && setShow(false)}
      aria-describedby={show ? id : undefined}
    >
      {children}
      {show && (
        <span id={id} role="tooltip" className="absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-xs -translate-x-1/2 rounded-md border border-line bg-slate-elevated px-2.5 py-1.5 text-xs text-ink shadow-lg">
          {content}
        </span>
      )}
    </span>
  )
}
