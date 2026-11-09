import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '@/App'
import { SipStatusCard } from '@/components/SipStatusCard'
import { FAILURE_REASONS } from '@/lib/outcome'
import { createSipState, sipHealth, sipReducer, type SipAction, type SipState } from '@/lib/sipState'

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)
// ₹1,000 on the 5th, set up Mon 9 Nov 2026: #1 debits Mon 7 Dec, #2 Tue 5 Jan 2027, #3 Fri 5 Feb.
const fresh = () => createSipState({ amount: 1000, sipDay: 5, method: 'upi' }, d(2026, 11, 9))
const run = (sip: SipState, ...actions: SipAction[]) => actions.reduce(sipReducer, sip)
const on = (y: number, m: number, day: number): SipAction => ({ type: 'SET_TODAY', today: d(y, m, day) })
const card = () => screen.getByLabelText('SIP status')
const renderCard = (sip: SipState) => render(<SipStatusCard sip={sip} onOpenFailed={() => {}} onReconnect={() => {}} />)

describe('SipStatusCard', () => {
  it('says the SIP is running, with the next debit', () => {
    renderCard(fresh())
    expect(card()).toHaveAttribute('data-health', 'running')
    expect(card()).toHaveTextContent('Is my SIP running?')
    expect(card()).toHaveTextContent('Your SIP is running')
    expect(card()).toHaveTextContent(/Next debit: ₹1,000 on .*7 Dec/)
    expect(within(card()).queryByRole('button')).not.toBeInTheDocument()
  })

  it('gives the next real debit after a skip', () => {
    renderCard(run(fresh(), { type: 'SKIP', n: 1 }))
    expect(card()).toHaveTextContent(/Next debit: ₹1,000 on .*5 Jan/)
  })

  it('needs attention after a failure, with a link to what happened', () => {
    renderCard(run(fresh(), { type: 'SIMULATE_OUTCOME', n: 1, outcome: 'insufficient_balance' }, on(2026, 12, 7)))
    expect(card()).toHaveAttribute('data-health', 'needs_attention')
    expect(card()).toHaveTextContent(/Your last instalment didn.t go through/)
    expect(within(card()).getByRole('button', { name: 'See what happened' })).toBeInTheDocument()
    expect(within(card()).queryByRole('button', { name: /Turn automatic payments back on/ })).not.toBeInTheDocument()
  })

  it('shows autopay off with a way to turn it back on', () => {
    renderCard(run(fresh(), { type: 'SIMULATE_OUTCOME', n: 1, outcome: 'mandate_revoked' }, on(2026, 12, 7)))
    expect(card()).toHaveAttribute('data-health', 'autopay_off')
    expect(card()).toHaveTextContent('Automatic payments are off')
    expect(within(card()).getByRole('button', { name: 'Turn automatic payments back on' })).toBeInTheDocument()
    expect(within(card()).getByRole('button', { name: 'See what happened' })).toBeInTheDocument()
  })

  it('still shows autopay off after the missed month is paid, but without the failure link', () => {
    renderCard(
      run(fresh(), { type: 'SIMULATE_OUTCOME', n: 1, outcome: 'mandate_revoked' }, on(2026, 12, 8), { type: 'PAY_NOW', n: 1 }),
    )
    expect(card()).toHaveAttribute('data-health', 'autopay_off')
    expect(within(card()).queryByRole('button', { name: 'See what happened' })).not.toBeInTheDocument()
  })

  // "Done when: the card agrees with the tracker in every simulated scenario."
  const days = [d(2026, 12, 1), d(2026, 12, 4), d(2026, 12, 7), d(2026, 12, 9), d(2026, 12, 29), d(2027, 1, 5), d(2027, 2, 9)]
  it.each(['success', ...FAILURE_REASONS] as const)('agrees with sipHealth across the months for %s', (outcome) => {
    for (const today of days) {
      const sip = run(fresh(), { type: 'SIMULATE_OUTCOME', n: 1, outcome }, { type: 'SET_TODAY', today })
      const { unmount } = renderCard(sip)
      expect(card()).toHaveAttribute('data-health', sipHealth(sip))
      unmount()
    }
  })
})

describe('status card in the app', () => {
  async function track() {
    const user = userEvent.setup()
    render(<App today={d(2026, 11, 9)} debug={false} />)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: /Approve/ }))
    await user.click(screen.getByRole('button', { name: 'Track my first instalment' }))
    return user
  }
  const setToday = (value: string) => fireEvent.change(screen.getByLabelText('Pretend today is'), { target: { value } })

  it('sits at the top of the tracker and follows a skip', async () => {
    const user = await track()
    expect(card()).toHaveTextContent(/Next debit: ₹500 on .*7 Dec/)
    await user.click(screen.getByRole('button', { name: 'Skip' }))
    expect(card()).toHaveTextContent(/Next debit: ₹500 on .*5 Jan/)
  })

  it('turns autopay back on straight from the card, and Back returns to the tracker', async () => {
    const user = await track()
    await user.selectOptions(screen.getByLabelText('Simulate this debit'), 'mandate_revoked')
    setToday('2026-12-07')

    await user.click(within(card()).getByRole('button', { name: 'Turn automatic payments back on' }))
    expect(screen.getByText('This is a limit, not a charge')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(card()).toHaveAttribute('data-health', 'autopay_off')

    await user.click(within(card()).getByRole('button', { name: 'Turn automatic payments back on' }))
    await user.click(screen.getByRole('button', { name: /Approve/ }))
    expect(screen.getByRole('status')).toHaveTextContent(/Automatic payments are back on\. Your next instalment is on .*5 Jan/)
    await user.click(screen.getByRole('button', { name: 'Back to tracker' }))
    // Autopay is on again, but December was missed and is still unpaid.
    expect(card()).toHaveAttribute('data-health', 'needs_attention')
  })
})
