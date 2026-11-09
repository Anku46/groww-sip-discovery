import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '@/App'

// ₹500 on the 5th via UPI, set up Mon 9 Nov 2026: #1 debits Mon 7 Dec, #2 Tue 5 Jan 2027.
const today = new Date(2026, 10, 9)
const BANNER = "Your ₹500 SIP instalment didn't go through. No money was taken."

async function trackWith(reason: string) {
  const user = userEvent.setup()
  render(<App today={today} debug={false} />)
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  await user.click(screen.getByRole('button', { name: /Approve/ }))
  await user.click(screen.getByRole('button', { name: 'Track my first instalment' }))
  await user.selectOptions(screen.getByLabelText('Simulate this debit'), reason)
  return user
}

const setToday = (value: string) => fireEvent.change(screen.getByLabelText('Pretend today is'), { target: { value } })
const banner = () => screen.queryByRole('alert', { name: 'Instalment alert' })
const openFromBanner = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(within(banner()!).getByRole('button', { name: 'See what happened' }))

describe('failure alert banner', () => {
  it('appears on the debit day of a failure, not before', async () => {
    await trackWith('insufficient_balance')
    setToday('2026-12-04')
    expect(banner()).not.toBeInTheDocument()
    setToday('2026-12-07')
    expect(banner()).toHaveTextContent(BANNER)
  })

  it('does not appear when the debit succeeds', async () => {
    await trackWith('success')
    setToday('2026-12-07')
    expect(banner()).not.toBeInTheDocument()
    expect(screen.queryByText(/Preview: messages sent/)).not.toBeInTheDocument()
  })

  it('opens the failed instalment, even when another one is selected in the tracker', async () => {
    const user = await trackWith('bank_technical')
    setToday('2026-12-08')
    await user.selectOptions(screen.getByLabelText('Instalment'), '3')
    await openFromBanner(user)
    expect(screen.getByText('Instalment #1')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: "This month's ₹500 didn't go through" })).toBeInTheDocument()
  })

  it('goes away once the month is paid', async () => {
    const user = await trackWith('insufficient_balance')
    setToday('2026-12-07')
    await openFromBanner(user)
    await user.click(screen.getByRole('button', { name: 'Pay this month now' }))
    await user.click(screen.getByRole('button', { name: /Pay ₹500 with UPI/ }))
    await user.click(screen.getByRole('button', { name: 'Back to tracker' }))
    expect(banner()).not.toBeInTheDocument()
  })

  it('goes away once the month is skipped', async () => {
    const user = await trackWith('insufficient_balance')
    setToday('2026-12-07')
    await openFromBanner(user)
    await user.click(screen.getByRole('button', { name: 'Skip this month' }))
    await user.click(screen.getByRole('button', { name: 'Back to tracker' }))
    expect(banner()).not.toBeInTheDocument()
  })

  it('stays after reconnecting autopay while the missed month is unpaid, then goes once it is paid', async () => {
    const user = await trackWith('mandate_revoked')
    setToday('2026-12-07')
    await openFromBanner(user)
    await user.click(screen.getByRole('button', { name: 'Turn automatic payments back on' }))
    await user.click(screen.getByRole('button', { name: /Approve/ }))
    await user.click(screen.getByRole('button', { name: 'Back to tracker' }))
    expect(banner()).toBeInTheDocument()

    await openFromBanner(user)
    await user.click(screen.getByRole('button', { name: 'Pay this month now' }))
    await user.click(screen.getByRole('button', { name: /Pay ₹500 with UPI/ }))
    await user.click(screen.getByRole('button', { name: 'Back to tracker' }))
    expect(banner()).not.toBeInTheDocument()
  })

  it('only alerts about the latest instalment: a later successful debit clears an old alert', async () => {
    await trackWith('insufficient_balance')
    setToday('2026-12-07')
    expect(banner()).toBeInTheDocument()
    setToday('2027-01-05')
    expect(banner()).not.toBeInTheDocument()
  })

  it('keeps alerting while autopay is off, on every later instalment', async () => {
    await trackWith('mandate_revoked')
    setToday('2027-01-05')
    expect(banner()).toHaveTextContent(BANNER)
  })
})

describe('tracker button vs banner', () => {
  it('shows one "See what happened" for the latest failure, and the tracker button for an older one', async () => {
    const user = await trackWith('insufficient_balance') // #1 fails
    await user.selectOptions(screen.getByLabelText('Instalment'), '2')
    await user.selectOptions(screen.getByLabelText('Simulate this debit'), 'bank_technical') // #2 fails too
    setToday('2027-01-05')

    // #2 is selected and is the banner's instalment: only the banner's button.
    expect(screen.getAllByRole('button', { name: 'See what happened' })).toHaveLength(1)

    // #1 is an older failure: the tracker offers its own button as well.
    await user.selectOptions(screen.getByLabelText('Instalment'), '1')
    expect(screen.getAllByRole('button', { name: 'See what happened' })).toHaveLength(2)
  })
})

describe('notification preview', () => {
  it('shows the push and SMS text for the failed instalment, with the SMS length', async () => {
    await trackWith('insufficient_balance')
    setToday('2026-12-07')
    expect(screen.getByText('Preview: messages sent on the failure day')).toBeInTheDocument()

    const push = screen.getByTestId('push-preview')
    expect(push).toHaveTextContent('SIP instalment not completed')
    expect(push).toHaveTextContent(/Your ₹500 instalment on .*7 Dec didn't go through\. No money was taken\./)

    const sms = screen.getByTestId('sms-preview')
    expect(sms).toHaveTextContent(/Your ₹500 SIP instalment on .*7 Dec didn't go through/)
    const count = Number(/(\d+)\/160 characters/.exec(sms.textContent ?? '')?.[1])
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThanOrEqual(160)
  })
})
