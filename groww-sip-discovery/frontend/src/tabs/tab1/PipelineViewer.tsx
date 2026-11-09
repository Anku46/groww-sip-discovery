import { AlertTriangle, Cpu } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, ErrorState, LoadingShimmer } from '@/components/ui/States'
import { ENGINE_LABEL, FALLBACK_REASON } from '@/lib/labels'
import { useAppStore } from '@/store'
import { Stage1Card, Stage2Card, Stage3Card, Stage4Card } from './StageCards'

export function PipelineViewer({ onRetry }: { onRetry: () => void }) {
  const result = useAppStore((s) => s.result)
  const stage = useAppStore((s) => s.currentStage)
  const isRunning = useAppStore((s) => s.isRunning)
  const error = useAppStore((s) => s.error)

  return (
    <section aria-label="Pipeline output" aria-busy={isRunning} aria-live="polite" className="space-y-4">
      {error && <ErrorState message={error} onRetry={onRetry} />}

      {!result && !isRunning && !error && (
        <EmptyState title="Run the pipeline to see each stage">
          Pick an example above or paste your own text. Each of the four stages appears here as it completes.
        </EmptyState>
      )}

      {result && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={result.engineUsed === 'llm' ? 'teal' : result.engineUsed === 'fallback' ? 'amber' : 'slate'} icon={<Cpu className="h-3 w-3" aria-hidden="true" />}>
            {ENGINE_LABEL[result.engineUsed]} engine
          </Badge>
          <span className="text-xs text-ink-muted">{Math.round(result.executionTimeMs)} ms</span>
        </div>
      )}

      {result?.engineUsed === 'fallback' && (
        <div role="status" className="flex items-start gap-2 rounded-md border border-amber/60 bg-amber/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-text" aria-hidden="true" />
          <p>
            The LLM wasn’t used because {FALLBACK_REASON[result.fallbackReason ?? 'provider_error']}. These results come from the
            deterministic engine.
          </p>
        </div>
      )}

      {result && stage >= 1 && <Stage1Card s={result.stages.stage1} />}
      {result && stage >= 2 && <Stage2Card s={result.stages.stage2} />}
      {result && stage >= 3 && <Stage3Card s={result.stages.stage3} />}
      {result && stage >= 4 && <Stage4Card s={result.stages.stage4} />}

      {isRunning && (
        <div className="card p-5" role="status">
          <span className="sr-only">Running stage {Math.min(stage + 1, 4)} of 4</span>
          <LoadingShimmer lines={3} />
        </div>
      )}
    </section>
  )
}
