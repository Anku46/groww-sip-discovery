import type { ScoredTheme } from '@groww-sip/shared'
import { ArrowDown, ArrowUp, ArrowUpDown, ShieldAlert } from 'lucide-react'
import { useMemo } from 'react'
import { useCorpusSummary, useDiscoveryAnswers, useScoredThemes } from '@/api/hooks'
import { Accordion } from '@/components/ui/Accordion'
import { Badge } from '@/components/ui/Badge'
import { SeverityDots } from '@/components/ui/SeverityDots'
import { ErrorState, Loading, SectionTitle } from '@/components/ui/States'
import { CHANNEL_LABEL } from '@/lib/labels'
import { useThemeNames } from '@/lib/themeNames'
import { useAppStore, type SortKey } from '@/store'

function CorpusSummaryBar() {
  const { data, loading, error, reload } = useCorpusSummary()
  if (loading) return <Loading label="Loading corpus summary" lines={1} />
  if (error) return <ErrorState message={error} onRetry={reload} />
  const s = data!
  return (
    <div className="card flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
      <div>
        <p className="text-2xl font-bold tabular-nums">{s.totalFiltered}</p>
        <p className="text-xs text-ink-muted">first-time investor records, from {s.totalRaw.toLocaleString('en-IN')} collected</p>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label="Records per channel">
        {Object.entries(s.filteredPerChannel).map(([ch, n]) => (
          <li key={ch}><Badge>{CHANNEL_LABEL[ch] ?? ch} · {n}</Badge></li>
        ))}
      </ul>
    </div>
  )
}

function addressabilityBadge(t: ScoredTheme) {
  if (t.sebiRestricted) return <Badge variant="vermilion" icon={<ShieldAlert className="h-3 w-3" aria-hidden="true" />}>SEBI · {t.addressabilityWeight}×</Badge>
  if (t.platformDependent) return <Badge variant="amber">Platform-dependent · {t.addressabilityWeight}×</Badge>
  return <Badge variant="teal">Addressable · {t.addressabilityWeight}×</Badge>
}

const COLUMNS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'name', label: 'Theme' },
  { key: 'share', label: 'Share', align: 'right' },
  { key: 'severity', label: 'Mean severity' },
  { key: 'addressability', label: 'Addressability' },
  { key: 'score', label: 'Score', align: 'right' },
]

const sortValue = (t: ScoredTheme, k: SortKey) =>
  k === 'name' ? t.name : k === 'share' ? t.themeSharePercent : k === 'severity' ? t.meanSeverity : k === 'addressability' ? t.addressabilityWeight : t.opportunityScore

function OpportunityTable({ themes }: { themes: ScoredTheme[] }) {
  const sortBy = useAppStore((s) => s.sortBy)
  const sortOrder = useAppStore((s) => s.sortOrder)
  const setSort = useAppStore((s) => s.setSort)
  const rows = useMemo(() => {
    const dir = sortOrder === 'asc' ? 1 : -1
    return [...themes].sort((a, b) => {
      const va = sortValue(a, sortBy), vb = sortValue(b, sortBy)
      return (typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)) * dir || a.rank - b.rank
    })
  }, [themes, sortBy, sortOrder])

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">Friction themes ranked by opportunity score. Column headers sort the table.</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-muted">
            <th scope="col" className="px-4 py-3 font-medium">Rank</th>
            {COLUMNS.map((c) => {
              const active = sortBy === c.key
              const Icon = !active ? ArrowUpDown : sortOrder === 'asc' ? ArrowUp : ArrowDown
              return (
                <th key={c.key} scope="col" aria-sort={active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'} className={`px-4 py-3 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>
                  <button type="button" onClick={() => setSort(c.key)} className={`inline-flex items-center gap-1 hover:text-ink ${active ? 'text-ink' : ''}`}>
                    {c.label}<Icon className="h-3 w-3" aria-hidden="true" />
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3 tabular-nums text-ink-muted">#{t.rank}</td>
              <th scope="row" className="px-4 py-3 text-left font-medium">{t.name}<span className="block text-xs font-normal text-ink-muted">{t.recordCount} records</span></th>
              <td className="px-4 py-3 text-right tabular-nums">
                {t.themeSharePercent.toFixed(1)}%
                <span className="mt-1 block h-1 rounded-full bg-navy" aria-hidden="true"><span className="block h-1 rounded-full bg-teal" style={{ width: `${Math.min(100, t.themeSharePercent * 3)}%` }} /></span>
              </td>
              <td className="px-4 py-3"><SeverityDots value={t.meanSeverity} /></td>
              <td className="px-4 py-3">{addressabilityBadge(t)}</td>
              <td className="px-4 py-3 text-right text-base font-bold tabular-nums">{t.opportunityScore.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OpportunityChart({ themes }: { themes: ScoredTheme[] }) {
  const ranked = [...themes].sort((a, b) => a.rank - b.rank)
  const max = Math.max(...ranked.map((t) => t.opportunityScore), 1)
  const color = (t: ScoredTheme) => (t.sebiRestricted ? 'bg-vermilion' : t.platformDependent ? 'bg-amber' : 'bg-teal')
  return (
    <figure className="card p-4">
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">Opportunity score</span>
        <span className="flex flex-wrap gap-3 text-xs text-ink-muted">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-teal" aria-hidden="true" />Addressable</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber" aria-hidden="true" />Platform-dependent</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-vermilion" aria-hidden="true" />SEBI-restricted</span>
        </span>
      </figcaption>
      <ul className="space-y-2.5">
        {ranked.map((t) => (
          <li key={t.id} className="grid grid-cols-[minmax(0,11rem)_1fr_3rem] items-center gap-3 text-sm">
            <span className="truncate text-ink-muted" title={t.name}>{t.name}</span>
            <span className="h-4 rounded bg-navy" aria-hidden="true">
              <span className={`block h-4 rounded transition-[width] duration-300 ${color(t)}`} style={{ width: `${(t.opportunityScore / max) * 100}%` }} />
            </span>
            <span className="text-right font-semibold tabular-nums">{t.opportunityScore.toFixed(1)}</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

function WeightingControls() {
  const m = useAppStore((s) => s.severityMultiplier)
  const setM = useAppStore((s) => s.setSeverityMultiplier)
  const strict = useAppStore((s) => s.strictSEBIPenalty)
  const setStrict = useAppStore((s) => s.setStrictSEBIPenalty)
  return (
    <div className="card grid gap-4 p-4 sm:grid-cols-2">
      <div>
        <div className="mb-1 flex justify-between">
          <label htmlFor="sev-mult" className="label">Severity weight</label>
          <span className="text-sm font-semibold tabular-nums">{m.toFixed(1)}×</span>
        </div>
        <input id="sev-mult" type="range" min={0.5} max={2} step={0.1} value={m} onChange={(e) => setM(Number(e.target.value))} className="w-full accent-[rgb(var(--teal-text))]" aria-valuetext={`${m.toFixed(1)} times`} />
        <p className="mt-1 text-xs text-ink-muted">Scales every theme's severity. Scores change; ranking only changes with the SEBI penalty.</p>
      </div>
      <div>
        <p className="label mb-2" id="sebi-label">SEBI penalty</p>
        <button type="button" role="switch" aria-checked={strict} aria-labelledby="sebi-label" onClick={() => setStrict(!strict)} className="flex items-center gap-3 text-sm">
          <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${strict ? 'bg-vermilion' : 'bg-slate-elevated'}`} aria-hidden="true">
            <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${strict ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </span>
          {strict ? 'Strict: 0.2× for SEBI-restricted themes' : 'Relaxed: 0.5× for SEBI-restricted themes'}
        </button>
        <p className="mt-1 text-xs text-ink-muted">What-if only: the regulation itself doesn’t change.</p>
      </div>
    </div>
  )
}

function DiscoveryQuestionsAccordion() {
  const { data, loading, error, reload } = useDiscoveryAnswers()
  const { name } = useThemeNames()
  if (loading) return <Loading label="Loading discovery answers" lines={5} />
  if (error) return <ErrorState message={error} onRetry={reload} />
  return (
    <Accordion
      items={data!.map((a) => ({
        id: a.id,
        title: <><span className="mr-2 font-mono text-xs text-teal-text">{a.id}</span>{a.questionText}</>,
        content: (
          <div className="space-y-3 text-sm">
            <p className="leading-relaxed">{a.answer}</p>
            <ul className="space-y-2">
              {a.supportingQuotes.map((q) => (
                <li key={q.id}>
                  <blockquote className="border-l-2 border-teal pl-3 text-ink-muted">
                    “{q.text.length > 280 ? `${q.text.slice(0, 280)}…` : q.text}”
                    <footer className="mt-1 text-xs text-ink-faint">{CHANNEL_LABEL[q.source] ?? q.source} · <span className="font-mono">{q.id}</span></footer>
                  </blockquote>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">{a.relatedThemeIds.map((t) => <Badge key={t}>{name(t)}</Badge>)}</div>
          </div>
        ),
      }))}
    />
  )
}

export default function Tab2OpportunityMatrix() {
  const { data, loading, error, reload } = useScoredThemes()
  return (
    <div className="space-y-6">
      <section>
        <SectionTitle hint="Score = theme share % × mean severity × addressability">Opportunity matrix</SectionTitle>
        <div className="space-y-4">
          <CorpusSummaryBar />
          <WeightingControls />
          {error ? <ErrorState message={error} onRetry={reload} />
            : !data ? <Loading label="Scoring themes" lines={6} />
            : (
              <div className={`grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
                <OpportunityTable themes={data} />
                <OpportunityChart themes={data} />
              </div>
            )}
        </div>
      </section>
      <section>
        <SectionTitle hint="From the Phase 2 analysis of the corpus">9 discovery questions</SectionTitle>
        <DiscoveryQuestionsAccordion />
      </section>
    </div>
  )
}
