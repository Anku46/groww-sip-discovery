/**
 * Stage 4 — SEBI constraint check & opportunity contribution. Always deterministic and always run, whatever
 * engine produced Stage 3 (Architecture.md §9: the enforcer cannot be disabled).
 */
import {
  addressabilityFor, enforceSEBIConstraints, FRICTION_THEMES,
  type Stage1Result, type Stage3Result, type Stage4Result,
} from '@groww-sip/shared'

const THEMES_BY_ID = new Map(FRICTION_THEMES.map((t) => [t.id, t]))
const SEBI_RESTRICTED = new Set(FRICTION_THEMES.filter((t) => t.sebiRestricted).map((t) => t.id))

export function runStage4(stage1: Stage1Result, stage3: Stage3Result): Stage4Result {
  const profile = stage3.behavioralProfile
  // Check both forms: raw-but-scrubbed text catches English patterns, normalized text catches Hinglish ones.
  const enforcement = enforceSEBIConstraints(`${stage1.scrubbed}\n${stage1.normalized}`, profile, SEBI_RESTRICTED)

  const theme = THEMES_BY_ID.get(profile.primaryFrictionTheme)
  const base = theme ? addressabilityFor(theme) : 1
  const addressabilityWeight = enforcement.addressabilityOverride ?? base

  return {
    constraintFlags: enforcement.flags,
    addressabilityWeight,
    opportunityContribution: {
      themeId: profile.primaryFrictionTheme,
      churnSeverity: profile.churnSeverity,
      addressabilityWeight,
      weightedContribution: enforcement.blocked ? 0 : Math.round(profile.churnSeverity * addressabilityWeight * 100) / 100,
    },
  }
}
