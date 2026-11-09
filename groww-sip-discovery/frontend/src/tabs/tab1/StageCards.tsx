import type { PipelineResponse, Stage1Result } from '@groww-sip/shared'
import { CheckCircle2, ChevronDown, ShieldAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Badge, severityVariant } from '@/components/ui/Badge'
import { ConstraintFlag } from '@/components/ui/ConstraintFlag'
import { SeverityDots } from '@/components/ui/SeverityDots'
import { PII_LABEL, SEGMENT_LABEL, STAGE_LABEL } from '@/lib/labels'
import { useThemeNames } from '@/lib/themeNames'

type Stages = PipelineResponse['stages']

function StageCard({ n, title, subtitle, children, tone = 'default' }: { n: number; title: string; subtitle: string; children: ReactNode; tone?: 'default' | 'danger' | 'ok' }) {
  const border = tone === 'danger' ? 'border-vermilion/70' : tone === 'ok' ? 'border-teal/60' : 'border-line'
  return (
    <section aria-labelledby={`stage-${n}-title`} className={`card animate-slide-in border ${border} p-4 md:p-5`}>
      <header className="mb-4 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal/20 text-xs font-bold text-teal-text" aria-hidden="true">{n}</span>
        <div>
          <h3 id={`stage-${n}-title`} className="font-semibold">Stage {n} · {title}</h3>
          <p className="text-xs text-ink-muted">{subtitle}</p>
        </div>
      </header>
      {children}
    </section>
  )
}

/** Highlights [PHONE]-style tokens in the scrubbed text. */
function MaskedText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[A-Z_]+\])/g).map((part, i) =>
        /^\[[A-Z_]+\]$/.test(part)
          ? <mark key={i} className="rounded bg-amber/20 px-1 font-mono text-[12px] text-amber-text">{part}</mark>
          : <span key={i}>{part}</span>)}
    </>
  )
}

export function Stage1Card({ s }: { s: Stage1Result }) {
  return (
    <StageCard n={1} title="PII scrubber & Hinglish normalizer" subtitle="Masks personal details, then translates Hinglish phrases into English intent.">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="label mb-1">Before</p>
          <p className="rounded-md border border-line bg-navy p-3 text-sm leading-relaxed">{s.original}</p>
        </div>
        <div>
          <p className="label mb-1">After</p>
          <p className="rounded-md border border-line bg-navy p-3 text-sm leading-relaxed"><MaskedText text={s.normalized} /></p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="label">PII masked</span>
        {s.piiEntitiesFound.length
          ? s.piiEntitiesFound.map((e, i) => <Badge key={i} variant="amber">{PII_LABEL[e.type] ?? e.type} → {e.replacement}</Badge>)
          : <span className="text-sm text-ink-muted">None found</span>}
      </div>
      {s.hinglishTokensNormalized.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="label mb-1 text-left">Hinglish normalized</caption>
            <thead><tr className="text-left text-xs text-ink-muted"><th scope="col" className="py-1 pr-4 font-medium">Phrase</th><th scope="col" className="py-1 font-medium">English intent</th></tr></thead>
            <tbody>
              {s.hinglishTokensNormalized.map((h) => (
                <tr key={h.phrase} className="border-t border-line"><td className="py-1.5 pr-4 font-mono text-[13px]">{h.phrase}</td><td className="py-1.5">{h.english}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </StageCard>
  )
}

export function Stage2Card({ s }: { s: Stages['stage2'] }) {
  const [open, setOpen] = useState<string | null>(null)
  const matchFor = (id: string) => s.ruleMatches.find((m) => m.ruleId === id)
  return (
    <StageCard n={2} title="Indian MF domain rules" subtitle="Which NPCI / mandate / NAV / SEBI mechanics explain what the investor is seeing.">
      {s.activeDomainRules.length === 0 ? (
        <p className="text-sm text-ink-muted">No domain rule applies to this text.</p>
      ) : (
        <ul className="space-y-2">
          {s.activeDomainRules.map((r) => {
            const m = matchFor(r.id)
            const isOpen = open === r.id
            return (
              <li key={r.id} className="rounded-md border border-line bg-navy">
                <button type="button" className="flex w-full items-start gap-3 p-3 text-left" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.id)}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{r.name}</span>
                      <Badge>{r.category.replace('_', ' ').toLowerCase()}</Badge>
                      {r.sebiRelevance && <Badge variant="vermilion">SEBI</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">{r.summary}</p>
                    {m && (
                      <p className="mt-1 text-xs text-ink-faint">
                        {m.matchedBy === 'keyword' ? `Matched on: ${m.keywords?.join(', ')}` : `Semantic match (similarity ${m.similarity?.toFixed(2)})`}
                      </p>
                    )}
                  </div>
                  <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-ink-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                  <span className="sr-only">{isOpen ? 'Hide details' : 'Show details'}</span>
                </button>
                {isOpen && <p className="border-t border-line px-3 py-3 text-sm leading-relaxed">{r.detailedExplanation}</p>}
              </li>
            )
          })}
        </ul>
      )}
    </StageCard>
  )
}

export function Stage3Card({ s }: { s: Stages['stage3'] }) {
  const [showJson, setShowJson] = useState(false)
  const { name } = useThemeNames()
  const p = s.behavioralProfile
  const rows: [string, ReactNode][] = [
    ['In-app confusion', p.insideAppConfusion],
    ['Outside-app workaround', p.outsideAppWorkaround ?? 'None mentioned'],
    ['Why this severity', p.churnSeverityRationale],
    ['Emotional signals', p.emotionalSignals.length ? p.emotionalSignals.join(', ') : 'None detected'],
  ]
  return (
    <StageCard n={3} title="Behavioral extraction" subtitle="Lifecycle stage, segment, friction theme and churn severity.">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="teal">{STAGE_LABEL[p.investorLifecycleStage] ?? p.investorLifecycleStage}</Badge>
        <Badge>{SEGMENT_LABEL[p.userSegment] ?? p.userSegment}</Badge>
        <Badge variant={severityVariant(p.churnSeverity)}>Severity {p.churnSeverity} / 5</Badge>
        <SeverityDots value={p.churnSeverity} showNumber={false} />
      </div>
      <p className="mt-3 text-sm"><span className="text-ink-muted">Primary friction theme: </span><span className="font-semibold">{name(p.primaryFrictionTheme)}</span></p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="rounded-md border border-line bg-navy p-3">
            <dt className="label">{k}</dt>
            <dd className="mt-1 text-sm">{v}</dd>
          </div>
        ))}
      </dl>
      <button type="button" className="mt-3 text-xs font-medium text-teal-text hover:underline" aria-expanded={showJson} onClick={() => setShowJson((v) => !v)}>
        {showJson ? 'Hide raw JSON' : 'Show raw JSON'}
      </button>
      {showJson && <pre className="mt-2 max-h-72 overflow-auto rounded-md border border-line bg-navy p-3 font-mono text-[12px] leading-relaxed">{JSON.stringify(p, null, 2)}</pre>}
    </StageCard>
  )
}

export function Stage4Card({ s }: { s: Stages['stage4'] }) {
  const restricted = s.constraintFlags.some((f) => f.penaltyType !== 'WARN')
  const blocked = s.constraintFlags.some((f) => f.penaltyType === 'BLOCK')
  const pct = Math.round(s.addressabilityWeight * 100)
  return (
    <StageCard n={4} title="SEBI constraint check" subtitle="Can Groww act on this need without giving regulated advice?" tone={restricted ? 'danger' : 'ok'}>
      {restricted ? (
        <div role="alert" className="mb-3 flex items-center gap-2 rounded-md bg-vermilion/20 px-3 py-2 text-sm font-semibold text-vermilion-text">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" /> SEBI-restricted: the need is real, but only education is allowed
        </div>
      ) : (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-teal/15 px-3 py-2 text-sm font-semibold text-teal-text">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> No SEBI constraint: Groww can act on this directly
        </div>
      )}
      {s.constraintFlags.length > 0 && <div className="space-y-2">{s.constraintFlags.map((f) => <ConstraintFlag key={f.constraintId} flag={f} />)}</div>}
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-sm">
          <span id="addr-label" className="text-ink-muted">Addressability</span>
          <span className="font-semibold tabular-nums">{s.addressabilityWeight.toFixed(1)}×</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-navy" role="meter" aria-labelledby="addr-label" aria-valuemin={0} aria-valuemax={1} aria-valuenow={s.addressabilityWeight}>
          <div className={`h-full rounded-full ${s.addressabilityWeight >= 1 ? 'bg-teal' : s.addressabilityWeight >= 0.5 ? 'bg-amber' : 'bg-vermilion'}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Contribution to the theme’s opportunity score: severity {s.opportunityContribution.churnSeverity} × {s.addressabilityWeight.toFixed(1)} ={' '}
          <span className="font-semibold text-ink">{s.opportunityContribution.weightedContribution}</span>
          {blocked && ' (zeroed because a return-prediction request is blocked)'}
        </p>
      </div>
    </StageCard>
  )
}
