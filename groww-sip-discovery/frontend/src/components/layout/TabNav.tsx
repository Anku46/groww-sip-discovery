import { BarChart3, ClipboardCheck, Table2, Workflow } from 'lucide-react'
import { NavLink } from 'react-router-dom'

export const TABS = [
  { to: '/', label: 'Live discovery pipeline', short: 'Pipeline', icon: Workflow },
  { to: '/opportunity-matrix', label: 'Opportunity matrix', short: 'Matrix', icon: BarChart3 },
  { to: '/dataset-explorer', label: 'Dataset explorer', short: 'Explorer', icon: Table2 },
  { to: '/evidence-log', label: 'AI evidence log', short: 'Evidence', icon: ClipboardCheck },
] as const

export function TabNav() {
  return (
    <nav aria-label="Main sections" className="-mb-px flex overflow-x-auto">
      {TABS.map(({ to, label, short, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors md:px-4 ${
              isActive ? 'border-teal-text text-ink' : 'border-transparent text-ink-muted hover:text-ink'
            }`
          }
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span className="md:hidden">{short}</span>
          <span className="hidden md:inline">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
