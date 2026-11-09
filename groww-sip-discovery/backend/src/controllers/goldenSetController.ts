/**
 * Golden set endpoints. PM labels come from shared/ (Phase 2); AI labels come from
 * src/data/goldenAiLabels.json, written by `pnpm golden:label` (Step 4.9).
 */
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { computeAgreementScore, CORRECTION_CASE_STUDIES, GOLDEN_SET, matchStatusFor, type GoldenSetItem, type Label } from '@groww-sip/shared'
import { Router } from 'express'

export const GOLDEN_AI_LABELS_PATH = fileURLToPath(new URL('../data/goldenAiLabels.json', import.meta.url))

export interface GoldenAiLabelsFile {
  generatedAt: string
  engine: string
  labels: Record<string, Label & { rootCause?: string }>
}

export function loadGoldenAiLabels(path = GOLDEN_AI_LABELS_PATH): GoldenAiLabelsFile | null {
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8')) as GoldenAiLabelsFile
}

export function goldenWithAiLabels(file: GoldenAiLabelsFile | null): GoldenSetItem[] {
  return GOLDEN_SET.map((g) => {
    const ai = file?.labels[g.id]
    if (!ai) return { ...g }
    const aiLabel = { theme: ai.theme, churnSeverity: ai.churnSeverity }
    const matchStatus = matchStatusFor({ humanLabel: g.humanLabel, aiLabel })!
    return { ...g, aiLabel, matchStatus, ...(matchStatus !== 'exact' && ai.rootCause ? { rootCause: ai.rootCause } : {}) }
  })
}

export function goldenSetRouter(labelsFile: GoldenAiLabelsFile | null = loadGoldenAiLabels()) {
  const r = Router()
  const items = goldenWithAiLabels(labelsFile)
  r.get('/golden-set', (_req, res) => res.json(items))
  r.get('/golden-set/agreement', (_req, res) =>
    res.json({ ...computeAgreementScore(items), engine: labelsFile?.engine ?? null, labelledAt: labelsFile?.generatedAt ?? null }))
  r.get('/golden-set/corrections', (_req, res) => res.json(CORRECTION_CASE_STUDIES))
  return r
}
