import { describe, expect, it } from 'vitest'
import { enforceSEBIConstraints, FRICTION_THEMES, GOLDEN_SET, VERBATIMS } from '../src'

const ids = (text: string) => enforceSEBIConstraints(text).flags.map((f) => f.constraintId).sort()

// evals/phase-3-eval.md § D
describe('enforceSEBIConstraints — eval cases D1–D9', () => {
  it('D1 fund recommendation', () => {
    const r = enforceSEBIConstraints('which small cap fund is best')
    expect(ids('which small cap fund is best')).toEqual(['SEBI_NO_FUND_REC'])
    expect(r.flags[0]!.penaltyType).toBe('DOWNGRADE')
    expect(r.addressabilityOverride).toBe(0.2)
    expect(r.blocked).toBe(false)
  })
  it('D2 return prediction blocks', () => {
    const r = enforceSEBIConstraints('will I get 15% returns in 1 year?')
    expect(ids('will I get 15% returns in 1 year?')).toEqual(['SEBI_NO_RETURN_PRED'])
    expect(r.addressabilityOverride).toBe(0.2)
    expect(r.blocked).toBe(true)
  })
  it('D3 FOMO warns without override', () => {
    const r = enforceSEBIConstraints('everyone is buying this fund, should I hurry?')
    expect(ids('everyone is buying this fund, should I hurry?')).toEqual(['SEBI_NO_FOMO'])
    expect(r.addressabilityOverride).toBeNull()
  })
  it('D4 RIA boundary', () => {
    const r = enforceSEBIConstraints('should I move my whole savings into equity, advise me')
    expect(ids('should I move my whole savings into equity, advise me')).toEqual(['SEBI_RIA_BOUNDARY'])
    expect(r.addressabilityOverride).toBe(0.2)
  })
  it('D5 operational complaint is clean', () => expect(ids('my SIP amount got deducted twice')).toEqual([]))
  it('D6 Hinglish bounce complaint is clean', () => expect(ids('NACH bounce ho gaya, penalty laga')).toEqual([]))
  it('D7 Hinglish fund recommendation', () => expect(ids('kaunsa fund best hai bhai')).toEqual(['SEBI_NO_FUND_REC']))
  it('D8 multiple triggers do not compound', () => {
    const r = enforceSEBIConstraints('best fund that gives 20% guaranteed')
    expect(ids('best fund that gives 20% guaranteed')).toEqual(['SEBI_NO_FUND_REC', 'SEBI_NO_RETURN_PRED'])
    expect(r.addressabilityOverride).toBe(0.2)
  })
  it('D9 empty input', () => {
    expect(enforceSEBIConstraints('')).toEqual({ flags: [], addressabilityOverride: null, blocked: false })
  })
})

describe('enforceSEBIConstraints — corpus', () => {
  const restricted = new Set(FRICTION_THEMES.filter((t) => t.sebiRestricted).map((t) => t.id))

  it('profile with a SEBI-restricted theme adds a DOWNGRADE', () => {
    const theme = [...restricted][0]!
    const r = enforceSEBIConstraints('thank you for the video', { primaryFrictionTheme: theme }, restricted)
    expect(r.flags).toHaveLength(1)
    expect(r.flags[0]).toMatchObject({ constraintId: 'SEBI_NO_FUND_REC', triggeredBy: 'behavioral_profile' })
  })

  it('flags the real advice requests in the corpus', () => {
    for (const text of [
      'What if i dont know nothing and just want to do a sip monthly best advice and company',
      'Bro I am new to SIP. Can you please suggest some good area to invest.',
      'Me 10,000₹/ Month 40 saal ke Liye Nifty 50 me SIP karna Chahta Hu. To kya Safe Rahega ? Aur 12 % Return Milega Ki nahi',
    ]) {
      expect(enforceSEBIConstraints(text).flags.length, text).toBeGreaterThan(0)
    }
  })

  it('does not flag beginner concept or mechanics questions', () => {
    for (const text of [
      'What is NAV price written on mutual funds',
      'everyone told me that mutual fund is good but I was not able to understand',
      'This is the best way to SIP Kaise Start Kare',
      'I have selected amount of rs.500 for SIP, but after payment when it comes for autopay it shows rs.15000/month . Why?',
      'Sir please Tell me If I want to stop SIP how can I do',
    ]) {
      expect(ids(text), text).toEqual([])
    }
  })

  it('text precision on non-advice corpus records stays high', () => {
    const texts = [...VERBATIMS.map((v) => ({ text: v.rawText, theme: v.primaryThemeId })),
      ...GOLDEN_SET.map((g) => ({ text: g.rawText, theme: g.humanLabel.theme }))]
    const nonAdvice = texts.filter((t) => !restricted.has(t.theme))
    const falsePositives = nonAdvice.filter((t) => enforceSEBIConstraints(t.text).flags.some((f) => f.penaltyType !== 'WARN'))
    expect(falsePositives.length / nonAdvice.length).toBeLessThanOrEqual(0.1)
  })
})
