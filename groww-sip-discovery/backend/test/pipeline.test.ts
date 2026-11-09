import { readFileSync } from 'node:fs'
import { GOLDEN_SET, QUICK_LOAD_CHIPS } from '@groww-sip/shared'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { runStage1 } from '../src/engine/deterministic/stage1'
import { makeApp } from './helpers'

const { app } = makeApp()
const post = (path: string, body: object) => request(app).post(`/api/pipeline/${path}`).send(body)

describe('4.2 Stage 1 — PII + Hinglish', () => {
  const pii: [string, string][] = [
    ['call me on 9876543210 please', 'phone'],
    ['call me on +91 98765 43210 please', 'phone'],
    ['my number +91-9876543210', 'phone'],
    ['mail me a.b@gmail.com', 'email'],
    ['my upi is rahul@okaxis', 'upi'],
    ['upi 9876543210@ybl', 'upi'],
    ['account 123456789012 in SBI', 'bank_account'],
    ['PAN ABCDE1234F', 'pan'],
    ['Hi, my name is Priya Sharma and my SIP failed', 'name'],
    ['@nithin_kumrr for UPI Autopay', 'name'],
  ]
  it.each(pii)('P4-2.x masks %s', (text, type) => {
    const r = runStage1(text)
    expect(r.piiEntitiesFound.map((e) => e.type)).toContain(type)
  })
  it('P4-2.6 no false positives on amounts, percentages, durations', () => {
    for (const t of ['₹5000 SIP', 'portfolio -2% after 5 months', 'T-3 cutoff', 'autopay shows rs.15000/month', 'OTP OF RS. 100000.00', 'I am 24 now and just started SIP', 'I am New to SIP'])
      expect(runStage1(t).piiEntitiesFound, t).toEqual([])
  })
  it('P4-2.7 Hinglish normalized and PII masked together', async () => {
    const r = await post('stage/1', { rawInput: 'Sir mera paisa kat gaya, call 9876543210, kya kre' }).expect(200)
    expect(r.body.scrubbed).not.toContain('9876543210')
    expect(r.body.normalized).toContain('was deducted')
    expect(r.body.normalized).toContain('what should I do')
  })
  it('P4-2.8 validation', async () => {
    await post('stage/1', {}).expect(400)
    await post('stage/1', { rawInput: 123 }).expect(400)
  })
  it('PII recall 100% on the fixture', () => {
    const missed = pii.filter(([t, type]) => !runStage1(t).piiEntitiesFound.some((e) => e.type === type))
    expect(missed).toEqual([])
  })
})

describe('4.3 Stage 2 — domain rules', () => {
  it('P4-3.1 NACH bounce verbatim triggers NACH_BOUNCE and T3_LOCKOUT', async () => {
    const r = await post('stage/2', { rawInput: 'My SIP bounced and the bank charged a penalty. I cancelled it yesterday but it was still deducted.' }).expect(200)
    const ids = r.body.activeDomainRules.map((x: { id: string }) => x.id)
    expect(ids).toContain('RULE_NACH_BOUNCE')
    expect(ids).toContain('RULE_T3_LOCKOUT')
  })
  it('P4-3.2 no domain terms → no rules', async () => {
    expect((await post('stage/2', { rawInput: 'thank you for this lovely video' }).expect(200)).body.activeDomainRules).toEqual([])
  })
  it('P4-3.3 Hinglish trigger matches like its English equivalent', async () => {
    const hi = (await post('stage/2', { rawInput: 'mera paisa kat gaya' })).body.ruleMatches.map((m: { ruleId: string }) => m.ruleId)
    const en = (await post('stage/2', { rawInput: 'my money was deducted' })).body.ruleMatches.map((m: { ruleId: string }) => m.ruleId)
    expect(hi).toEqual(en)
    expect(hi).toContain('RULE_INSTALLMENT_VS_DEBIT')
  })
  it('accepts Stage 1 output instead of rawInput', async () => {
    const stage1 = runStage1('autopay shows 15000 for my 500 SIP')
    const r = await post('stage/2', { stage1 }).expect(200)
    expect(r.body.ruleMatches.map((m: { ruleId: string }) => m.ruleId)).toContain('RULE_UPI_MANDATE_LIMIT')
  })
  it('short keywords do not fire inside other words', async () => {
    expect((await post('stage/2', { rawInput: 'amount credited, navigation is fine' })).body.ruleMatches).toEqual([])
  })
})

describe('4.4 Stage 3 — behavioral extraction', () => {
  it('P4-4.1 "5 months ho gaye portfolio abhi bhi -2%"', async () => {
    const p = (await post('stage/3', { rawInput: '5 months ho gaye portfolio abhi bhi -2%' }).expect(200)).body.behavioralProfile
    expect(p.investorLifecycleStage).toBe('MONTH_5_8')
    expect(p.churnSeverity).toBeGreaterThanOrEqual(3)
    expect(p.churnSeverity).toBeLessThanOrEqual(4)
  })
  it('P4-4.2 first SIP → MONTH_0_1', async () => {
    expect((await post('stage/3', { rawInput: 'first SIP lagaya aaj, payment done' })).body.behavioralProfile.investorLifecycleStage).toBe('MONTH_0_1')
  })
  it('P4-4.3 cancelling intent → severity 5', async () => {
    expect((await post('stage/3', { rawInput: 'I want to stop my SIP, done with this' })).body.behavioralProfile.churnSeverity).toBe(5)
  })
  it('P4-4.5 output shape', async () => {
    const p = (await post('stage/3', { rawInput: 'why is 15000 shown for autopay?' })).body.behavioralProfile
    expect(Number.isInteger(p.churnSeverity)).toBe(true)
    expect(Array.isArray(p.emotionalSignals)).toBe(true)
    expect(typeof p.churnSeverityRationale).toBe('string')
  })
})

describe('4.5 Stage 4 — SEBI', () => {
  it('P4-5.1 fund recommendation', async () => {
    const r = (await post('stage/4', { rawInput: 'which small cap fund is best' }).expect(200)).body
    expect(r.constraintFlags.map((f: { constraintId: string }) => f.constraintId)).toContain('SEBI_NO_FUND_REC')
    expect(r.addressabilityWeight).toBe(0.2)
  })
  it('P4-5.2 return prediction blocks the contribution', async () => {
    const r = (await post('stage/4', { rawInput: 'will I get 15% returns in 1 year?' })).body
    expect(r.constraintFlags[0].constraintId).toBe('SEBI_NO_RETURN_PRED')
    expect(r.addressabilityWeight).toBe(0.2)
    expect(r.opportunityContribution.weightedContribution).toBe(0)
  })
  it('P4-5.3 operational complaint is clean', async () => {
    const r = (await post('stage/4', { rawInput: 'my SIP amount got deducted twice this month' })).body
    expect(r.constraintFlags).toEqual([])
    expect(r.addressabilityWeight).toBeGreaterThan(0.2)
  })
})

describe('4.6 full pipeline', () => {
  it('P4-6.1/6.2 every quick-load chip returns a complete response', async () => {
    for (const chip of QUICK_LOAD_CHIPS) {
      const r = (await post('run', { rawInput: chip.text }).expect(200)).body
      expect(r.engineUsed, chip.label).toBe('deterministic')
      expect(Object.keys(r.stages)).toEqual(['stage1', 'stage2', 'stage3', 'stage4'])
      expect(typeof r.executionTimeMs).toBe('number')
      expect(typeof r.sebiConstraintTriggered).toBe('boolean')
    }
  })
  it('SEBI chip triggers a constraint', async () => {
    const chip = QUICK_LOAD_CHIPS.find((c) => c.label.startsWith('SEBI'))!
    const r = (await post('run', { rawInput: chip.text })).body
    expect(r.sebiConstraintTriggered).toBe(true)
    expect(r.stages.stage4.addressabilityWeight).toBe(0.2)
  })
  it('P4-6.3 deterministic p95 < 200ms over 100 runs', async () => {
    const times: number[] = []
    for (let i = 0; i < 100; i++) {
      const chip = QUICK_LOAD_CHIPS[i % QUICK_LOAD_CHIPS.length]!
      const t = performance.now()
      await post('run', { rawInput: chip.text }).expect(200)
      times.push(performance.now() - t)
    }
    times.sort((a, b) => a - b)
    expect(times[94]!).toBeLessThan(200)
  })
  it('P4-6.4 deterministic: same input → same stages', async () => {
    const text = QUICK_LOAD_CHIPS[0]!.text
    const a = (await post('run', { rawInput: text })).body
    const b = (await post('run', { rawInput: text })).body
    expect(a.stages).toEqual(b.stages)
  })
  it('P4-6.6 masked PII never reappears downstream or in logs', async () => {
    const { app: logged, logs } = makeApp()
    const r = (await request(logged).post('/api/pipeline/run').send({ rawInput: 'autopay 15000 dikha raha hai, call 9876543210 or rahul@okaxis' })).body
    const downstream = JSON.stringify([r.stages.stage2, r.stages.stage3, r.stages.stage4])
    for (const secret of ['9876543210', 'rahul@okaxis']) {
      expect(downstream).not.toContain(secret)
      expect(logs()).not.toContain(secret)
    }
  })
})

describe('P4-9.5 no golden-set leakage into engine code', () => {
  it('engine source contains no golden-set IDs or texts', () => {
    const files = ['stage1', 'stage2', 'stage3', 'stage4'].map((f) =>
      readFileSync(new URL(`../src/engine/deterministic/${f}.ts`, import.meta.url), 'utf8')).join('\n')
    for (const g of GOLDEN_SET) {
      expect(files).not.toContain(g.id)
      expect(files).not.toContain(g.verbatimId)
      expect(files).not.toContain(g.rawText.slice(0, 40))
    }
  })
})
