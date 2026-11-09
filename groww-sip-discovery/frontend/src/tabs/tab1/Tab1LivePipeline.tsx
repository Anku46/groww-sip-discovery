import { usePipelineRun } from '@/api/hooks'
import { SectionTitle } from '@/components/ui/States'
import { PipelineViewer } from './PipelineViewer'
import { VerbatimInput } from './VerbatimInput'

export default function Tab1LivePipeline() {
  const run = usePipelineRun()
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="space-y-3 lg:sticky lg:top-32 lg:self-start">
        <SectionTitle hint="PII scrub → domain rules → behavior → SEBI check">Live discovery pipeline</SectionTitle>
        <VerbatimInput onRun={run} />
      </div>
      <PipelineViewer onRetry={run} />
    </div>
  )
}
