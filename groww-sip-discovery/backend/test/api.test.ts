import { CORPUS_SUMMARY, DISCOVERY_ANSWERS, FRICTION_THEMES, GOLDEN_SET, scoreThemes, VERBATIMS } from '@groww-sip/shared'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { makeApp, TEST_ORIGIN } from './helpers'

const { app } = makeApp()

describe('4.1 server skeleton', () => {
  it('P4-1.1 health', async () => {
    const r = await request(app).get('/api/health').expect(200)
    expect(r.body.status).toBe('ok')
    expect(new Date(r.body.timestamp).toISOString()).toBe(r.body.timestamp)
  })
  it('P4-1.2 security headers', async () => {
    const r = await request(app).get('/api/health')
    expect(r.headers['x-content-type-options']).toBe('nosniff')
    expect(r.headers['x-powered-by']).toBeUndefined()
  })
  it('P4-1.3 CORS allows the configured origin only', async () => {
    const ok = await request(app).get('/api/health').set('Origin', TEST_ORIGIN)
    expect(ok.headers['access-control-allow-origin']).toBe(TEST_ORIGIN)
    const bad = await request(app).get('/api/health').set('Origin', 'https://evil.example')
    expect(bad.headers['access-control-allow-origin']).toBeUndefined()
  })
  it('P4-1.4 unknown route is a JSON 404', async () => {
    const r = await request(app).get('/api/nope').expect(404)
    expect(r.body.error).toBe('not_found')
  })
  it('P4-1.5 malformed JSON is a JSON 400', async () => {
    const r = await request(app).post('/api/pipeline/run').set('Content-Type', 'application/json').send('{bad').expect(400)
    expect(r.body.error).toBe('invalid_json')
  })
  it('rejects oversized and empty input', async () => {
    await request(app).post('/api/pipeline/run').send({ rawInput: '   ' }).expect(400)
    await request(app).post('/api/pipeline/run').send({ rawInput: 'x'.repeat(2001) }).expect(400)
    await request(app).post('/api/pipeline/run').send({ rawInput: 42 }).expect(400)
  })
})

describe('4.7 data endpoints', () => {
  it('P4-7.1 corpus summary', async () => {
    expect((await request(app).get('/api/corpus/summary').expect(200)).body).toEqual(CORPUS_SUMMARY)
  })
  it('P4-7.2 verbatims, paginated', async () => {
    const r = await request(app).get('/api/corpus/verbatims?limit=10').expect(200)
    expect(r.body.total).toBe(25)
    expect(r.body.items).toHaveLength(10)
    expect(r.body.totalPages).toBe(3)
  })
  it('P4-7.3 each filter matches the data', async () => {
    const cases: [string, (v: (typeof VERBATIMS)[number]) => boolean][] = [
      ['channel=Forum', (v) => v.source === 'Forum'],
      ['stage=MONTH_0_1', (v) => v.lifecycleStage === 'MONTH_0_1'],
      ['segment=INFLUENCER_LED', (v) => v.userSegment === 'INFLUENCER_LED'],
      ['theme=THEME_MANDATE_SETUP_FAILURE', (v) => v.primaryThemeId === 'THEME_MANDATE_SETUP_FAILURE'],
    ]
    for (const [q, pred] of cases) {
      const r = await request(app).get(`/api/corpus/verbatims?${q}&limit=100`).expect(200)
      expect(r.body.total, q).toBe(VERBATIMS.filter(pred).length)
      expect(r.body.items.every(pred), q).toBe(true)
    }
  })
  it('P4-7.4 combined filters + case-insensitive search (AND across, OR within)', async () => {
    const r = await request(app).get('/api/corpus/verbatims?channel=YouTube,PlayStore&search=MANDATE&limit=100').expect(200)
    const expected = VERBATIMS.filter((v) => ['YouTube', 'PlayStore'].includes(v.source) && v.rawText.toLowerCase().includes('mandate'))
    expect(r.body.total).toBe(expected.length)
    expect(expected.length).toBeGreaterThan(0)
  })
  it('P4-7.5 pagination edges and bad params', async () => {
    const r = await request(app).get('/api/corpus/verbatims?page=99').expect(200)
    expect(r.body.items).toEqual([])
    expect(r.body.total).toBe(25)
    await request(app).get('/api/corpus/verbatims?limit=0').expect(400)
    await request(app).get('/api/corpus/verbatims?page=-1').expect(400)
    await request(app).get('/api/corpus/verbatims?channel=Reddit').expect(400)
  })
  it('P4-7.6/7.7 themes and scoring parity', async () => {
    expect((await request(app).get('/api/themes').expect(200)).body).toEqual(FRICTION_THEMES)
    const body = { severityMultiplier: 1.5, strictSEBIPenalty: false }
    const r = await request(app).post('/api/themes/score').send(body).expect(200)
    expect(r.body).toEqual(scoreThemes(FRICTION_THEMES, { ...body, totalCorpusSize: CORPUS_SUMMARY.totalFiltered }))
    await request(app).post('/api/themes/score').send({ severityMultiplier: 5 }).expect(400)
    await request(app).post('/api/themes/score').send({ strictSEBIPenalty: 'yes' }).expect(400)
  })
  it('P4-7.8 discovery answers', async () => {
    expect((await request(app).get('/api/discovery-answers').expect(200)).body).toHaveLength(DISCOVERY_ANSWERS.length)
  })
  it('P4-7.9 golden set, agreement, corrections', async () => {
    const g = await request(app).get('/api/golden-set').expect(200)
    expect(g.body).toHaveLength(GOLDEN_SET.length)
    const a = await request(app).get('/api/golden-set/agreement').expect(200)
    expect(a.body.totalItems).toBe(GOLDEN_SET.length)
    expect((await request(app).get('/api/golden-set/corrections').expect(200)).body.length).toBeGreaterThanOrEqual(3)
  })
  it('quick-load chips', async () => {
    expect((await request(app).get('/api/quick-load-chips').expect(200)).body.length).toBeGreaterThanOrEqual(5)
  })
})

describe('4.9 golden set AI labels', () => {
  it('P4-9.1–9.3 labels populated and agreement matches a hand count', async () => {
    const items = (await request(app).get('/api/golden-set').expect(200)).body as { humanLabel: { theme: string; churnSeverity: number }; aiLabel: { theme: string; churnSeverity: number } | null }[]
    expect(items.every((i) => i.aiLabel)).toBe(true)
    const themeMatches = items.filter((i) => i.aiLabel!.theme === i.humanLabel.theme).length
    const sevMatches = items.filter((i) => Math.abs(i.aiLabel!.churnSeverity - i.humanLabel.churnSeverity) <= 0.5).length
    const a = (await request(app).get('/api/golden-set/agreement').expect(200)).body
    expect(a.status).toBe('scored')
    expect(a.themeAgreementPct).toBe(Math.round((themeMatches / items.length) * 1000) / 10)
    expect(a.severityAgreementPct).toBe(Math.round((sevMatches / items.length) * 1000) / 10)
  })
  it('without a labels file the agreement is not_scored', async () => {
    const { app: bare } = makeApp({ goldenAiLabels: null })
    expect((await request(bare).get('/api/golden-set/agreement').expect(200)).body.status).toBe('not_scored')
  })
})
