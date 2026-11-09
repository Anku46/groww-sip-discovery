/**
 * Step 4.9 — run every golden-set verbatim through the pipeline and store the AI labels.
 *   pnpm --filter @groww-sip/backend golden:label                 deterministic → src/data/goldenAiLabels.json (served)
 *   pnpm --filter @groww-sip/backend golden:label -- --engine llm  Groq + BGE    → src/data/goldenAiLabels.llm.json
 * GET /api/golden-set/agreement reads goldenAiLabels.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { computeAgreementScore, FRICTION_THEMES, GOLDEN_SET, matchStatusFor } from '@groww-sip/shared'
import { loadConfig } from '../src/config'
import { GOLDEN_AI_LABELS_PATH, type GoldenAiLabelsFile } from '../src/controllers/goldenSetController'
import { createBgeEmbedder } from '../src/engine/embedding/bgeEmbedder'
import { createGroqProvider } from '../src/engine/llm/groqProvider'
import { runPipeline } from '../src/engine/orchestrator'
import { createLogger } from '../src/logger'

const engine = process.argv.includes('llm') ? 'llm' : 'deterministic'
const config = loadConfig({ ...process.env, EMBEDDINGS_ENABLED: engine === 'llm' ? 'true' : 'false' })
const logger = createLogger('silent')
const themeName = (id: string) => FRICTION_THEMES.find((t) => t.id === id)?.name ?? id

if (engine === 'llm' && !config.GROQ_API_KEY) {
  console.error('GROQ_API_KEY is not set (backend/.env).')
  process.exit(1)
}
const embedder = engine === 'llm' ? createBgeEmbedder(config.EMBEDDING_MODEL, logger) : null
await embedder?.warmUp()
const deps = { config, logger, embedder, llmFactory: (key: string) => createGroqProvider(key, config.GROQ_MODEL) }

const labels: GoldenAiLabelsFile['labels'] = {}
const fallbacks: string[] = []
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
for (const g of GOLDEN_SET) {
  // Groq's free tier rate-limits bursts; pace LLM calls and retry provider errors with backoff.
  let out = await runPipeline({ rawInput: g.rawText, preferredEngine: engine }, undefined, deps)
  for (let attempt = 1; engine === 'llm' && out.fallbackReason === 'provider_error' && attempt <= 4; attempt++) {
    await sleep(15_000 * attempt)
    out = await runPipeline({ rawInput: g.rawText, preferredEngine: engine }, undefined, deps)
  }
  if (engine === 'llm') await sleep(2_000)
  if (out.engineUsed !== engine) fallbacks.push(`${g.id} (${out.fallbackReason})`)
  const p = out.stages.stage3.behavioralProfile
  const ai = { theme: p.primaryFrictionTheme, churnSeverity: p.churnSeverity }
  const status = matchStatusFor({ humanLabel: g.humanLabel, aiLabel: ai })
  const rules = out.stages.stage2.ruleMatches.map((m) => m.ruleId).join(', ') || 'none'
  const rootCause = status === 'exact' ? undefined : [
    ai.theme !== g.humanLabel.theme ? `Theme: engine chose "${themeName(ai.theme)}", PM says "${themeName(g.humanLabel.theme)}".` : '',
    ai.churnSeverity !== g.humanLabel.churnSeverity ? `Severity: engine ${ai.churnSeverity} (${p.churnSeverityRationale.replace(/^Severity \d: /, '').replace(/\.$/, '')}), PM ${g.humanLabel.churnSeverity}.` : '',
    `Rules matched: ${rules}.`,
  ].filter(Boolean).join(' ')
  labels[g.id] = { ...ai, ...(rootCause ? { rootCause } : {}) }
  console.log(`${g.id}  ${status?.padEnd(8)}  AI ${ai.theme.replace('THEME_', '').padEnd(22)} ${ai.churnSeverity}  |  PM ${g.humanLabel.theme.replace('THEME_', '').padEnd(22)} ${g.humanLabel.churnSeverity}${out.engineUsed !== engine ? '  [fallback]' : ''}`)
}

const path = engine === 'llm' ? GOLDEN_AI_LABELS_PATH.replace(/\.json$/, '.llm.json') : GOLDEN_AI_LABELS_PATH
const file: GoldenAiLabelsFile = { generatedAt: new Date().toISOString(), engine: engine === 'llm' ? `llm:${config.GROQ_MODEL}` : 'deterministic', labels }
mkdirSync(dirname(path), { recursive: true })
writeFileSync(path, JSON.stringify(file, null, 2) + '\n')

const score = computeAgreementScore(GOLDEN_SET.map((g) => ({ ...g, aiLabel: labels[g.id]! })))
console.log(`\n[${file.engine}] Theme agreement ${score.themeAgreementPct}% (${score.themeMatches}/${score.scoredItems}), ` +
  `severity agreement ${score.severityAgreementPct}% (${score.severityMatches}/${score.scoredItems})`)
if (fallbacks.length) console.log(`Fell back to deterministic on: ${fallbacks.join(', ')}`)
console.log(`Wrote ${path}`)
