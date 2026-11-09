import type {
  AgreementScore, CorpusSummary, CorrectionCaseStudy, DiscoveryAnswer, FrictionTheme, GlossaryEntry, GoldenSetItem,
  PipelineResponse, PreferredEngine, QuickLoadChip, ScoredTheme, Verbatim,
} from '@groww-sip/shared'
import axios, { AxiosError } from 'axios'

/** Empty in dev (Vite proxies /api); the Railway URL in production. */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export const http = axios.create({ baseURL: `${API_BASE_URL}/api`, timeout: 20_000 })

const KEY_HEADER = 'x-groq-api-key'
const withKey = (key?: string) => (key ? { headers: { [KEY_HEADER]: key } } : {})

export interface VerbatimQuery {
  channel?: string[]
  stage?: string[]
  segment?: string[]
  theme?: string[]
  search?: string
  page?: number
  limit?: number
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type AgreementResponse = AgreementScore & { engine: string | null; labelledAt: string | null }

const csv = (v?: string[]) => (v && v.length ? v.join(',') : undefined)

export const api = {
  health: (signal?: AbortSignal) => http.get<{ status: string; timestamp: string; embeddings: string }>('/health', { signal, timeout: 5000 }).then((r) => r.data),
  runPipeline: (rawInput: string, preferredEngine: PreferredEngine, apiKey?: string, signal?: AbortSignal) =>
    http.post<PipelineResponse>('/pipeline/run', { rawInput, preferredEngine }, { ...withKey(apiKey), signal }).then((r) => r.data),
  validateKey: (apiKey: string) =>
    http.post<{ valid: boolean; error?: string }>('/llm/validate-key', {}, withKey(apiKey)).then((r) => r.data),
  quickLoadChips: (signal?: AbortSignal) => http.get<QuickLoadChip[]>('/quick-load-chips', { signal }).then((r) => r.data),
  corpusSummary: (signal?: AbortSignal) => http.get<CorpusSummary>('/corpus/summary', { signal }).then((r) => r.data),
  verbatims: (q: VerbatimQuery, signal?: AbortSignal) =>
    http.get<Page<Verbatim>>('/corpus/verbatims', {
      signal,
      params: { channel: csv(q.channel), stage: csv(q.stage), segment: csv(q.segment), theme: csv(q.theme), search: q.search || undefined, page: q.page, limit: q.limit },
    }).then((r) => r.data),
  themes: (signal?: AbortSignal) => http.get<FrictionTheme[]>('/themes', { signal }).then((r) => r.data),
  scoreThemes: (severityMultiplier: number, strictSEBIPenalty: boolean, signal?: AbortSignal) =>
    http.post<ScoredTheme[]>('/themes/score', { severityMultiplier, strictSEBIPenalty }, { signal }).then((r) => r.data),
  discoveryAnswers: (signal?: AbortSignal) => http.get<DiscoveryAnswer[]>('/discovery-answers', { signal }).then((r) => r.data),
  goldenSet: (signal?: AbortSignal) => http.get<GoldenSetItem[]>('/golden-set', { signal }).then((r) => r.data),
  agreement: (signal?: AbortSignal) => http.get<AgreementResponse>('/golden-set/agreement', { signal }).then((r) => r.data),
  corrections: (signal?: AbortSignal) => http.get<CorrectionCaseStudy[]>('/golden-set/corrections', { signal }).then((r) => r.data),
  glossary: (signal?: AbortSignal) => http.get<GlossaryEntry[]>('/glossary', { signal }).then((r) => r.data),
}

/** A sentence to show the user; never the raw exception. */
export function errorMessage(err: unknown): string {
  if (axios.isCancel(err)) return 'Request cancelled.'
  const e = err as AxiosError<{ message?: string }>
  if (e.response?.data?.message) return e.response.data.message
  if (e.code === 'ECONNABORTED') return 'The server took too long to respond. Try again.'
  if (e.request && !e.response) return "Couldn't reach the server. Check that the backend is running."
  return 'Something went wrong. Try again.'
}
