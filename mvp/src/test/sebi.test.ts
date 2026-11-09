import { describe, expect, it } from 'vitest'
import { enforceSEBIConstraints } from '@/lib/sebi'

// Guards the copy of the engine's checker: if these stop flagging, the copy has drifted or broken.
const ids = (text: string) => enforceSEBIConstraints(text).flags.map((f) => f.constraintId)

describe('copied SEBI checker', () => {
  it.each([
    ['Which fund is best for me?', 'SEBI_NO_FUND_REC'],
    ['Suggest a good small cap fund', 'SEBI_NO_FUND_REC'],
    ['Hurry, last chance to invest', 'SEBI_NO_FOMO'],
    ['Will I get 12% returns?', 'SEBI_NO_RETURN_PRED'],
    ['guaranteed returns please', 'SEBI_NO_RETURN_PRED'],
    ['Please advise me on my savings', 'SEBI_RIA_BOUNDARY'],
  ])('flags "%s" as %s', (text, id) => {
    expect(ids(text)).toContain(id)
  })

  it.each(['What is NAV?', 'Which date should I pick for my SIP?', 'Your SIP is still on.'])('does not flag "%s"', (text) => {
    expect(ids(text)).toEqual([])
  })

  it('blocks return predictions', () => {
    expect(enforceSEBIConstraints('Will I get 12% returns?').blocked).toBe(true)
  })
})
