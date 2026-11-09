import { INVESTOR_LIFECYCLE_STAGES, SOURCE_CHANNELS, USER_SEGMENTS, type Verbatim } from '@groww-sip/shared'
import { ChevronLeft, ChevronRight, ExternalLink, Search, X } from 'lucide-react'
import { Fragment, useEffect, useState } from 'react'
import { useCorpus } from '@/api/hooks'
import { Badge, severityVariant } from '@/components/ui/Badge'
import { SeverityDots } from '@/components/ui/SeverityDots'
import { EmptyState, ErrorState, Loading, SectionTitle } from '@/components/ui/States'
import { CHANNEL_LABEL, SEGMENT_LABEL, STAGE_LABEL } from '@/lib/labels'
import { useThemeNames } from '@/lib/themeNames'

type FilterKey = 'channel' | 'stage' | 'segment' | 'theme'
type Filters = Record<FilterKey, string[]>
const EMPTY: Filters = { channel: [], stage: [], segment: [], theme: [] }
const PAGE_SIZE = 10

function PillGroup({ label, options, selected, onToggle }: { label: string; options: { value: string; label: string }[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="label mb-2">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o.value)
          return (
            <button key={o.value} type="button" aria-pressed={on} onClick={() => onToggle(o.value)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${on ? 'border-teal-text bg-teal/25 text-ink' : 'border-line text-ink-muted hover:text-ink'}`}>
              {o.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function VerbatimRow({ v, open, onToggle, themeName }: { v: Verbatim; open: boolean; onToggle: () => void; themeName: string }) {
  return (
    <Fragment>
      <tr className="border-b border-line align-top last:border-0">
        <td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] text-ink-muted">{v.id}</td>
        <td className="px-3 py-3"><Badge>{CHANNEL_LABEL[v.source] ?? v.source}</Badge></td>
        <td className="max-w-md px-3 py-3">
          <button type="button" onClick={onToggle} aria-expanded={open} className="text-left hover:text-teal-text">
            <span className={open ? '' : 'line-clamp-2'}>{v.rawText}</span>
          </button>
        </td>
        <td className="px-3 py-3 text-ink-muted">{themeName}</td>
        <td className="px-3 py-3"><Badge variant="teal">{STAGE_LABEL[v.lifecycleStage]}</Badge></td>
        <td className="px-3 py-3"><SeverityDots value={v.churnSeverity} /></td>
      </tr>
      {open && (
        <tr className="border-b border-line bg-navy/60">
          <td colSpan={6} className="px-3 py-3">
            <dl className="grid gap-3 text-sm sm:grid-cols-4">
              <div><dt className="label">Segment</dt><dd>{SEGMENT_LABEL[v.userSegment]}</dd></div>
              <div><dt className="label">Language</dt><dd>{v.language}</dd></div>
              <div><dt className="label">Date</dt><dd>{v.date}</dd></div>
              <div><dt className="label">Severity</dt><dd><Badge variant={severityVariant(v.churnSeverity)}>{v.churnSeverity} / 5</Badge></dd></div>
            </dl>
            <a href={v.url} target="_blank" rel="noreferrer noopener" className="mt-3 inline-flex items-center gap-1 text-xs text-teal-text hover:underline">
              View source<ExternalLink className="h-3 w-3" aria-hidden="true" /><span className="sr-only">(opens in a new tab)</span>
            </a>
          </td>
        </tr>
      )}
    </Fragment>
  )
}

export default function Tab3DatasetExplorer() {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)
  const { themes, name } = useThemeNames()
  const { data, loading, error, reload } = useCorpus({ ...filters, search: search.trim(), page, limit: PAGE_SIZE })

  useEffect(() => { setPage(1) }, [search, filters])
  const toggle = (k: FilterKey, v: string) =>
    setFilters((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }))
  const active = search.trim() !== '' || Object.values(filters).some((x) => x.length)
  const clear = () => { setSearch(''); setFilters(EMPTY) }

  return (
    <div className="space-y-4">
      <SectionTitle hint="25 representative verbatims, tagged in Phase 2">Dataset explorer</SectionTitle>

      <div className="card space-y-4 p-4">
        <div className="relative">
          <label htmlFor="search" className="sr-only">Search verbatims</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input id="search" type="search" className="input pl-9" placeholder="Search text, e.g. mandate, loss, NAV" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <PillGroup label="Source" options={SOURCE_CHANNELS.map((c) => ({ value: c, label: CHANNEL_LABEL[c] ?? c }))} selected={filters.channel} onToggle={(v) => toggle('channel', v)} />
          <PillGroup label="Lifecycle stage" options={INVESTOR_LIFECYCLE_STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] ?? s }))} selected={filters.stage} onToggle={(v) => toggle('stage', v)} />
          <PillGroup label="Segment" options={USER_SEGMENTS.map((s) => ({ value: s, label: SEGMENT_LABEL[s] ?? s }))} selected={filters.segment} onToggle={(v) => toggle('segment', v)} />
          <PillGroup label="Theme" options={themes.map((t) => ({ value: t.id, label: t.name }))} selected={filters.theme} onToggle={(v) => toggle('theme', v)} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <p className="text-sm" role="status" aria-live="polite">
            {data ? <><span className="font-semibold tabular-nums">{data.total}</span> {data.total === 1 ? 'verbatim' : 'verbatims'} match</> : ' '}
          </p>
          {active && <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={clear}><X className="h-3.5 w-3.5" aria-hidden="true" />Clear filters</button>}
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={reload} />
        : !data ? <Loading label="Loading verbatims" lines={6} />
        : data.total === 0 ? (
          <EmptyState title="No verbatims match">
            <button type="button" className="font-medium text-teal-text hover:underline" onClick={clear}>Clear filters</button> to see all 25.
          </EmptyState>
        ) : (
          <div className={`card overflow-x-auto ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
            <table className="w-full min-w-[760px] text-sm">
              <caption className="sr-only">Verbatims. Select a verbatim's text to see its details.</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-muted">
                  {['ID', 'Source', 'Verbatim', 'Theme', 'Stage', 'Severity'].map((h) => <th key={h} scope="col" className="px-3 py-3 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.items.map((v) => (
                  <VerbatimRow key={v.id} v={v} themeName={name(v.primaryThemeId)} open={openId === v.id} onToggle={() => setOpenId(openId === v.id ? null : v.id)} />
                ))}
              </tbody>
            </table>
            <nav aria-label="Pagination" className="flex items-center justify-between border-t border-line px-3 py-2 text-sm">
              <button type="button" className="btn-ghost px-2 py-1" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />Previous
              </button>
              <span className="text-ink-muted">Page {data.page} of {data.totalPages}</span>
              <button type="button" className="btn-ghost px-2 py-1" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next<ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          </div>
        )}
    </div>
  )
}
