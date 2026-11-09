import { act, render, screen, waitFor, within } from '@testing-library/react'
import { Suspense } from 'react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CHIPS, pipelineResponse, SCORED, THEMES, VERBATIMS } from './fixtures'

const api = vi.hoisted(() => ({
  health: vi.fn(), runPipeline: vi.fn(), validateKey: vi.fn(), quickLoadChips: vi.fn(), corpusSummary: vi.fn(), verbatims: vi.fn(),
  themes: vi.fn(), scoreThemes: vi.fn(), discoveryAnswers: vi.fn(), goldenSet: vi.fn(), agreement: vi.fn(), corrections: vi.fn(), glossary: vi.fn(),
}))
vi.mock('@/api/client', async (orig) => ({ ...(await orig<typeof import('@/api/client')>()), api }))

import App, { AppRoutes } from '@/App'
import { Header } from '@/components/layout/Header'
import { SettingsDrawer } from '@/components/layout/SettingsDrawer'
import { Accordion } from '@/components/ui/Accordion'
import { SeverityDots } from '@/components/ui/SeverityDots'
import { useAppStore } from '@/store'

const initial = useAppStore.getState()

beforeEach(() => {
  useAppStore.setState(initial, true)
  Object.values(api).forEach((f) => f.mockReset())
  api.health.mockResolvedValue({ status: 'ok' })
  api.quickLoadChips.mockResolvedValue(CHIPS)
  api.themes.mockResolvedValue(THEMES)
  api.scoreThemes.mockResolvedValue(SCORED)
  api.corpusSummary.mockResolvedValue({ totalRaw: 6174, totalFiltered: 70, rawPerChannel: {}, filteredPerChannel: { YouTube: 50, Forum: 16 }, filteredPerLanguage: {}, afterRuleFilter: 97, removedOnAnalystReview: 27 })
  api.discoveryAnswers.mockResolvedValue([{ id: 'Q1', questionText: 'Why do they start?', answer: 'Creators.', supportingVerbatimIds: ['YT-1'], supportingQuotes: [{ id: 'YT-1', source: 'YouTube', text: 'because of you' }], relatedThemeIds: ['THEME_CONCEPT_GAPS'] }])
  api.verbatims.mockImplementation(async (q: { channel?: string[] }) => {
    const items = VERBATIMS.filter((v) => !q.channel?.length || q.channel.includes(v.source))
    return { items, total: items.length, page: 1, limit: 10, totalPages: 1 }
  })
})

// Tabs are lazy-loaded, so routes need a Suspense boundary (App provides one in the real tree).
const renderAt = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Header />
    <Suspense fallback={<p>Loading</p>}><AppRoutes /></Suspense>
    <SettingsDrawer />
  </MemoryRouter>,
)
const matchCount = async () => (await screen.findByText((_, el) => el?.tagName === 'P' && /verbatims? match$/.test(el.textContent ?? ''))).textContent

describe('5.2 shell and navigation', () => {
  it('renders four tabs and marks the active one', async () => {
    renderAt('/opportunity-matrix')
    const nav = screen.getByRole('navigation', { name: 'Main sections' })
    expect(within(nav).getAllByRole('link')).toHaveLength(4)
    expect(within(nav).getByRole('link', { current: 'page' })).toHaveTextContent(/matrix/i)
    expect(screen.getByRole('button', { name: 'Open settings' })).toBeInTheDocument()
  })
  it('full App mounts with HashRouter', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Live discovery pipeline' })).toBeInTheDocument()
  })
})

describe('5.3 primitives', () => {
  it('severity dots expose the number', () => {
    render(<SeverityDots value={4} />)
    expect(screen.getByRole('img', { name: 'Severity 4 of 5' })).toBeInTheDocument()
  })
  it('accordion toggles aria-expanded', async () => {
    render(<Accordion items={[{ id: 'a', title: 'Q', content: 'Answer' }]} />)
    const btn = screen.getByRole('button', { name: 'Q' })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Answer')).toBeVisible()
  })
})

describe('5.5 Tab 1', () => {
  it('chip → run → four stage cards, PII and Hinglish shown', async () => {
    api.runPipeline.mockResolvedValue(pipelineResponse())
    renderAt('/')
    await userEvent.click(await screen.findByRole('button', { name: 'Hinglish mandate amount' }))
    expect(screen.getByLabelText('Investor feedback')).toHaveValue(CHIPS[0]!.text)
    await userEvent.click(screen.getByRole('button', { name: 'Run pipeline' }))
    expect(api.runPipeline).toHaveBeenCalledWith(CHIPS[0]!.text, 'auto', undefined)
    expect(await screen.findByRole('heading', { name: /Stage 4/ }, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByText('Phone → [PHONE]')).toBeInTheDocument()
    expect(screen.getByText('was deducted')).toBeInTheDocument()
    expect(screen.getByText(/No SEBI constraint/)).toBeInTheDocument()
  })
  it('SEBI result shows the restricted banner and blocked flag', async () => {
    api.runPipeline.mockResolvedValue(pipelineResponse({ sebi: true }))
    renderAt('/')
    await userEvent.click(await screen.findByRole('button', { name: 'SEBI: return assurance' }))
    await userEvent.click(screen.getByRole('button', { name: 'Run pipeline' }))
    expect(await screen.findByText(/SEBI-restricted/, {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByText(/Blocked: No return prediction/)).toBeInTheDocument()
  })
  it('fallback shows the amber notice', async () => {
    api.runPipeline.mockResolvedValue(pipelineResponse({ engine: 'fallback', fallbackReason: 'invalid_api_key' }))
    renderAt('/')
    await userEvent.type(await screen.findByLabelText('Investor feedback'), 'what is NAV')
    await userEvent.click(screen.getByRole('button', { name: 'Run pipeline' }))
    expect(await screen.findByText(/Groq rejected the API key/)).toBeInTheDocument()
  })
  it('empty input cannot run; backend error is shown with retry', async () => {
    api.runPipeline.mockRejectedValue(Object.assign(new Error('x'), { request: {}, response: undefined }))
    renderAt('/')
    expect(await screen.findByRole('button', { name: 'Run pipeline' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Investor feedback'), 'hello SIP')
    await userEvent.click(screen.getByRole('button', { name: 'Run pipeline' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Couldn't reach the server/)
    expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument()
  })
})

describe('5.6 Tab 2', () => {
  it('renders ranked themes, sorts, and re-scores when the toggle changes', async () => {
    renderAt('/opportunity-matrix')
    const table = await screen.findByRole('table')
    const firstRowHeader = () => within(table).getAllByRole('rowheader')[0]
    expect(firstRowHeader()).toHaveTextContent('Autopay mandate')
    await userEvent.click(within(table).getByRole('button', { name: /Theme/ }))
    expect(firstRowHeader()).toHaveTextContent('Autopay mandate') // A–Z
    await userEvent.click(within(table).getByRole('button', { name: /Theme/ }))
    expect(firstRowHeader()).toHaveTextContent('Seeking fund picks') // Z–A
    await userEvent.click(screen.getByRole('switch'))
    await waitFor(() => expect(api.scoreThemes).toHaveBeenLastCalledWith(1, false, expect.anything()))
    await userEvent.click(screen.getByRole('button', { name: /Why do they start/ }))
    expect(screen.getByText('Creators.')).toBeInTheDocument()
  })
})

describe('5.7 Tab 3', () => {
  it('filters by channel and shows the live count', async () => {
    renderAt('/dataset-explorer')
    expect(await matchCount()).toBe('2 verbatims match')
    await userEvent.click(await screen.findByRole('button', { name: 'Forum' }))
    await waitFor(async () => expect(await matchCount()).toBe('1 verbatim match'))
    expect(api.verbatims).toHaveBeenLastCalledWith(expect.objectContaining({ channel: ['Forum'], page: 1 }), expect.anything())
  })
})

describe('5.9 settings drawer', () => {
  it('validates a key, keeps it out of storage, and engine choice reaches the header', async () => {
    api.validateKey.mockResolvedValue({ valid: true })
    renderAt('/')
    await userEvent.click(screen.getByRole('button', { name: 'Open settings' }))
    const dialog = await screen.findByRole('dialog', { name: 'Settings' })
    await userEvent.type(within(dialog).getByLabelText('Groq API key'), 'gsk_test')
    expect(within(dialog).getByLabelText('Groq API key')).toHaveAttribute('type', 'password')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Validate key' }))
    expect(await within(dialog).findByText('Key works.')).toBeInTheDocument()
    expect(api.validateKey).toHaveBeenCalledWith('gsk_test')
    await userEvent.click(within(dialog).getByRole('radio', { name: /Force LLM/ }))
    expect(JSON.stringify({ ...localStorage })).not.toContain('gsk_test')
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('gsk_test')
    await act(async () => { await userEvent.keyboard('{Escape}') })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('LLM')).toBeInTheDocument()
  })
})
