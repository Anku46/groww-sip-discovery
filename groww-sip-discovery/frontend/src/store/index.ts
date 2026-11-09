/**
 * One Zustand store, three slices (Architecture.md §11). Nothing is persisted: the Groq key lives in memory
 * for this tab only and is gone when the tab closes.
 */
import type { EngineMode, PipelineResponse, PreferredEngine, ScoredTheme } from '@groww-sip/shared'
import { create } from 'zustand'

export type SortKey = 'score' | 'share' | 'severity' | 'addressability' | 'name'

interface PipelineSlice {
  rawInput: string
  isRunning: boolean
  /** 0 = idle; 1–4 = how many stage cards are revealed. */
  currentStage: 0 | 1 | 2 | 3 | 4
  result: PipelineResponse | null
  error: string | null
  engineMode: EngineMode | null
  setRawInput: (v: string) => void
  startRun: () => void
  finishRun: (r: PipelineResponse) => void
  failRun: (msg: string) => void
  revealStage: (n: 1 | 2 | 3 | 4) => void
}

interface SettingsSlice {
  groqApiKey: string
  forceEngine: PreferredEngine
  keyValidationStatus: 'unchecked' | 'checking' | 'valid' | 'invalid'
  drawerOpen: boolean
  setGroqApiKey: (k: string) => void
  setForceEngine: (e: PreferredEngine) => void
  setKeyValidationStatus: (s: SettingsSlice['keyValidationStatus']) => void
  setDrawerOpen: (open: boolean) => void
}

interface MatrixSlice {
  scoredThemes: ScoredTheme[]
  sortBy: SortKey
  sortOrder: 'asc' | 'desc'
  severityMultiplier: number
  strictSEBIPenalty: boolean
  setScoredThemes: (t: ScoredTheme[]) => void
  setSort: (k: SortKey) => void
  setSeverityMultiplier: (m: number) => void
  setStrictSEBIPenalty: (s: boolean) => void
}

export type AppState = PipelineSlice & SettingsSlice & MatrixSlice

export const useAppStore = create<AppState>()((set, get) => ({
  // pipeline
  rawInput: '',
  isRunning: false,
  currentStage: 0,
  result: null,
  error: null,
  engineMode: null,
  setRawInput: (rawInput) => set({ rawInput }),
  startRun: () => set({ isRunning: true, currentStage: 0, result: null, error: null, engineMode: null }),
  finishRun: (result) => set({ result, engineMode: result.engineUsed }),
  failRun: (error) => set({ isRunning: false, error, currentStage: 0 }),
  revealStage: (n) => set({ currentStage: n, isRunning: n < 4 }),

  // settings
  groqApiKey: '',
  forceEngine: 'auto',
  keyValidationStatus: 'unchecked',
  drawerOpen: false,
  setGroqApiKey: (groqApiKey) => set({ groqApiKey, keyValidationStatus: 'unchecked' }),
  setForceEngine: (forceEngine) => set({ forceEngine }),
  setKeyValidationStatus: (keyValidationStatus) => set({ keyValidationStatus }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),

  // matrix
  scoredThemes: [],
  sortBy: 'score',
  sortOrder: 'desc',
  severityMultiplier: 1,
  strictSEBIPenalty: true,
  setScoredThemes: (scoredThemes) => set({ scoredThemes }),
  setSort: (k) => {
    const { sortBy, sortOrder } = get()
    set(sortBy === k ? { sortOrder: sortOrder === 'desc' ? 'asc' : 'desc' } : { sortBy: k, sortOrder: k === 'name' ? 'asc' : 'desc' })
  },
  setSeverityMultiplier: (severityMultiplier) => set({ severityMultiplier }),
  setStrictSEBIPenalty: (strictSEBIPenalty) => set({ strictSEBIPenalty }),
}))
