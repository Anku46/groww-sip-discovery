import type { GoldenSetItem } from '@groww-sip/shared'
import { ArrowRight, CheckCircle2, CircleAlert, XCircle } from 'lucide-react'
import { useGoldenSet } from '@/api/hooks'
import type { AgreementResponse } from '@/api/client'
import { Badge } from '@/components/ui/Badge'
import { ErrorState, Loading, SectionTitle } from '@/components/ui/States'
import { CHANNEL_LABEL } from '@/lib/labels'
import { useThemeNames } from '@/lib/themeNames'

const TARGETS = { theme: 70, severity: 60 }

function Metric({ label, pct, matches, total, target }: { label: string; pct: number | null; matches: number; total: number; target: number }) {
  const meets = pct !== null && pct >= target
  return (
    <div className="card p-4">
      <p className="label">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{pct === null ? '—' : `${pct.toFixed(1)}%`}</p>
      <p className="mt-1 text-xs text-ink-muted">{matches} of {total} items agree with the PM label</p>
      {pct !== null && (
        <p className={`mt-2 text-xs font-medium ${meets ? 'text-green-text' : 'text-amber-text'}`}>
          {meets ? `Meets the ${target}% target` : `Below the ${target}% target`}
        </p>
      )}
    </div>
  )
}

function AgreementScorecard({ a }: { a: AgreementResponse }) {
  if (a.status === 'not_scored') return <p className="text-sm text-ink-muted">The engine hasn’t labelled the golden set yet.</p>
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Metric label="Theme agreement" pct={a.themeAgreementPct} matches={a.themeMatches} total={a.scoredItems} target={TARGETS.theme} />
      <Metric label={`Severity agreement (±${a.severityTolerance})`} pct={a.severityAgreementPct} matches={a.severityMatches} total={a.scoredItems} target={TARGETS.severity} />
    </div>
  )
}

const STATUS = {
  exact: { icon: CheckCircle2, cls: 'text-green-text', label: 'Exact match' },
  partial: { icon: CircleAlert, cls: 'text-amber-text', label: 'Partial match' },
  mismatch: { icon: XCircle, cls: 'text-vermilion-text', label: 'Mismatch' },
} as const

function GoldenSetTable({ items }: { items: GoldenSetItem[] }) {
  const { name } = useThemeNames()
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <caption className="sr-only">Golden set: PM ground-truth labels compared with the engine's labels.</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-muted">
            {['ID', 'Source', 'Verbatim', 'PM label (ground truth)', 'Engine label', 'Match', 'Why it differs'].map((h) => <th key={h} scope="col" className="px-3 py-3 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {items.map((g) => {
            const st = g.matchStatus ? STATUS[g.matchStatus] : null
            return (
              <tr key={g.id} className="border-b border-line align-top last:border-0">
                <td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] text-ink-muted">{g.id}</td>
                <td className="px-3 py-3"><Badge>{CHANNEL_LABEL[g.source] ?? g.source}</Badge></td>
                <td className="max-w-xs px-3 py-3"><span className="line-clamp-3" title={g.rawText}>{g.rawText.slice(0, 160)}{g.rawText.length > 160 ? '…' : ''}</span></td>
                <td className="px-3 py-3">{name(g.humanLabel.theme)}<span className="block text-xs text-ink-muted">Severity {g.humanLabel.churnSeverity}</span></td>
                <td className="px-3 py-3">
                  {g.aiLabel ? <>{name(g.aiLabel.theme)}<span className="block text-xs text-ink-muted">Severity {g.aiLabel.churnSeverity}</span></> : <span className="text-ink-muted">Not labelled</span>}
                </td>
                <td className="px-3 py-3">
                  {st ? <span className={`inline-flex items-center gap-1 whitespace-nowrap font-medium ${st.cls}`}><st.icon className="h-4 w-4" aria-hidden="true" />{st.label}</span> : '—'}
                </td>
                <td className="max-w-xs px-3 py-3 text-xs text-ink-muted">{g.rootCause ?? ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CorrectionCaseStudies() {
  const { corrections } = useGoldenSet()
  if (corrections.loading) return <Loading label="Loading correction cases" lines={4} />
  if (corrections.error) return <ErrorState message={corrections.error} onRetry={corrections.reload} />
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {corrections.data!.map((c) => (
        <article key={c.id} className="card flex flex-col gap-3 p-4">
          <header className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{c.id}</h3>
            <span className="font-mono text-[11px] text-ink-muted">{c.domainRuleApplied}</span>
          </header>
          <blockquote className="border-l-2 border-line pl-3 text-sm text-ink-muted">“{c.verbatimText.length > 220 ? `${c.verbatimText.slice(0, 220)}…` : c.verbatimText}”</blockquote>
          <dl className="space-y-2 text-sm">
            <div><dt className="label text-vermilion-text">Naive reading said</dt><dd>{c.aiOutput}</dd></div>
            <div><dt className="label">Why that’s wrong</dt><dd className="text-ink-muted">{c.rejectionReason}</dd></div>
            <div><dt className="label flex items-center gap-1 text-green-text"><ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />Correct answer</dt><dd>{c.correctAnswer}</dd></div>
          </dl>
        </article>
      ))}
    </div>
  )
}

export default function Tab4EvidenceLog() {
  const { items, agreement } = useGoldenSet()
  const labelled = agreement.data?.labelledAt ? new Date(agreement.data.labelledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null
  return (
    <div className="space-y-6">
      <section>
        <SectionTitle hint={agreement.data?.engine ? `Engine: ${agreement.data.engine}${labelled ? ` · labelled ${labelled}` : ''}` : undefined}>Agreement with PM ground truth</SectionTitle>
        {agreement.error ? <ErrorState message={agreement.error} onRetry={agreement.reload} />
          : agreement.loading ? <Loading label="Loading agreement scores" lines={2} />
          : <AgreementScorecard a={agreement.data!} />}
      </section>
      <section>
        <SectionTitle hint="✓ exact · ! partial (theme or severity) · ✕ neither">Golden set</SectionTitle>
        {items.error ? <ErrorState message={items.error} onRetry={items.reload} />
          : items.loading ? <Loading label="Loading golden set" lines={8} />
          : <GoldenSetTable items={items.data!} />}
      </section>
      <section>
        <SectionTitle hint="Where domain knowledge overrides a surface reading">PM correction cases</SectionTitle>
        <CorrectionCaseStudies />
      </section>
    </div>
  )
}
