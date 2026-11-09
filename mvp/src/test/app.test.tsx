import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '@/App'
import { getEvents, resetEvents } from '@/lib/track'

const today = new Date(2026, 10, 9)

describe('setup → tracker flow', () => {
  beforeEach(() => resetEvents())

  it('explains the mandate limit, completes setup and shows the tracker', async () => {
    const user = userEvent.setup()
    render(<App today={today} debug={false} />)

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText('This is a limit, not a charge')).toBeInTheDocument()
    expect(screen.getByText('Debited each month').nextElementSibling).toHaveTextContent('₹500')
    expect(screen.getByText('Mandate limit').nextElementSibling).toHaveTextContent('₹15,000')

    await user.click(screen.getByRole('button', { name: /Approve ₹15,000 limit/ }))
    await user.click(screen.getByRole('button', { name: 'Track my first instalment' }))
    expect(screen.getByRole('heading', { name: 'Scheduled' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByRole('status')).toHaveTextContent('applies to this instalment')

    await user.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.getByRole('heading', { name: 'Skipped this month' })).toBeInTheDocument()

    const names = getEvents().map((e) => e.name)
    expect(names).toEqual(expect.arrayContaining(['mandate_explainer_viewed', 'mandate_approved', 'setup_completed', 'tracker_viewed', 'change_requested']))
  })

  it('blocks UPI for amounts over ₹15,000', async () => {
    const user = userEvent.setup()
    render(<App today={today} debug={false} />)
    const amount = screen.getByLabelText('Monthly amount (₹)')
    await user.clear(amount)
    await user.type(amount, '20000')
    expect(screen.getByRole('alert')).toHaveTextContent('e-NACH')
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    await user.click(screen.getByLabelText(/Bank mandate/))
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
  })
})

describe('simulating a failed debit in the tracker', () => {
  beforeEach(() => resetEvents())

  async function setUpAndTrack() {
    const user = userEvent.setup()
    render(<App today={today} debug={false} />)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: /Approve/ }))
    await user.click(screen.getByRole('button', { name: 'Track my first instalment' }))
    return user
  }

  const step = (key: string) => document.querySelector(`[data-step="${key}"]`)

  it.each([
    ['insufficient_balance', "This month's ₹500 didn't go through"],
    ['bank_technical', "This month's ₹500 didn't go through"],
    ['unknown', "This month's ₹500 didn't go through"],
    ['mandate_revoked', "This month's ₹500 wasn't taken"],
    ['mandate_not_active', "This month's ₹500 wasn't taken"],
  ])('%s shows as failed on the debit day, never with units', async (reason, title) => {
    const user = await setUpAndTrack()
    await user.selectOptions(screen.getByLabelText('Simulate this debit'), reason)
    // Before the debit day nothing has failed yet.
    expect(screen.queryByRole('heading', { name: title })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Go to debit day' }))
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByText(/No money was taken for this instalment/)).toBeInTheDocument()
    expect(step('debit')).toHaveAttribute('data-status', 'failed')
    expect(step('units')).not.toHaveAttribute('data-status', 'done')

    await user.click(screen.getByRole('button', { name: 'Go to units day' }))
    expect(step('units')).not.toHaveAttribute('data-status', 'done')
  })

  it('shows a successful debit through to units', async () => {
    const user = await setUpAndTrack()
    await user.click(screen.getByRole('button', { name: 'Go to units day' }))
    expect(screen.getByRole('heading', { name: 'Units in your account' })).toBeInTheDocument()
    expect(step('units')).toHaveAttribute('data-status', 'done')
  })

  it('keeps autopay-off failures on later instalments', async () => {
    const user = await setUpAndTrack()
    await user.selectOptions(screen.getByLabelText('Simulate this debit'), 'mandate_revoked')
    await user.selectOptions(screen.getByLabelText('Instalment'), '2')
    await user.click(screen.getByRole('button', { name: 'Go to debit day' }))
    expect(screen.getByRole('heading', { name: "This month's ₹500 wasn't taken" })).toBeInTheDocument()
    expect(step('sent')).toHaveAttribute('data-status', 'failed')
  })
})
