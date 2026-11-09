import type { FrictionTheme } from '@groww-sip/shared'
import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import { humanize } from './labels'

// Themes rarely change; fetch once per page load and share.
let cache: Promise<FrictionTheme[]> | null = null

export function useThemeNames() {
  const [themes, setThemes] = useState<FrictionTheme[]>([])
  useEffect(() => {
    let live = true
    cache ??= api.themes().catch((e) => { cache = null; throw e })
    cache.then((t) => live && setThemes(t)).catch(() => {})
    return () => { live = false }
  }, [])
  const byId = new Map(themes.map((t) => [t.id, t]))
  return {
    themes,
    name: (id: string) => byId.get(id)?.name ?? (id === 'UNCLASSIFIED' ? 'Unclassified' : humanize(id)),
  }
}
