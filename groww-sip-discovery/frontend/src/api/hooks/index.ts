import { useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '@/store'
import { api, errorMessage, type VerbatimQuery } from '../client'
import { useApi } from './useApi'

export { useApi }

/** Runs the pipeline, then reveals the four stage cards one after another. */
export function usePipelineRun() {
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  return useCallback(async () => {
    const s = useAppStore.getState()
    const text = s.rawInput.trim()
    if (!text || s.isRunning) return
    timers.current.forEach(clearTimeout)
    s.startRun()
    try {
      const result = await api.runPipeline(text, s.forceEngine, s.groqApiKey || undefined)
      useAppStore.getState().finishRun(result)
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      const step = reduce ? 0 : 350
      ;([1, 2, 3, 4] as const).forEach((n, i) => {
        timers.current.push(window.setTimeout(() => useAppStore.getState().revealStage(n), step * i))
      })
    } catch (e) {
      useAppStore.getState().failRun(errorMessage(e))
    }
  }, [])
}

export const useCorpusSummary = () => useApi((sig) => api.corpusSummary(sig), [])

export function useCorpus(q: VerbatimQuery) {
  const key = JSON.stringify(q)
  return useApi((sig) => api.verbatims(q, sig), [key], { debounceMs: q.search ? 250 : 0 })
}

export const useThemes = () => useApi((sig) => api.themes(sig), [])

export function useScoredThemes() {
  const severityMultiplier = useAppStore((s) => s.severityMultiplier)
  const strict = useAppStore((s) => s.strictSEBIPenalty)
  const setScored = useAppStore((s) => s.setScoredThemes)
  return useApi(async (sig) => {
    const scored = await api.scoreThemes(severityMultiplier, strict, sig)
    setScored(scored)
    return scored
  }, [severityMultiplier, strict], { debounceMs: 200 })
}

export const useDiscoveryAnswers = () => useApi((sig) => api.discoveryAnswers(sig), [])
export const useQuickLoadChips = () => useApi((sig) => api.quickLoadChips(sig), [])

export function useGoldenSet() {
  const items = useApi((sig) => api.goldenSet(sig), [])
  const agreement = useApi((sig) => api.agreement(sig), [])
  const corrections = useApi((sig) => api.corrections(sig), [])
  return { items, agreement, corrections }
}

export { errorMessage }
