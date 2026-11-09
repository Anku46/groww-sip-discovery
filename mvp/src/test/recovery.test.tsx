import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '@/App'

// ₹500 on the 5th via UPI, set up Mon 9 Nov 2026: #1 debits Mon 7 Dec, #2 Tue 5 Jan 2027.
// Pay-now for #1 is open until Mon 28 Dec.
const today = new Date(2026, 10, 9)

async function failInstalment1(reason: string, date?: string) {
  const user = userEvent.setup()
  render(<App today={today} debug={false} />)
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  await user.click(screen.getByRole('button', { name: /Approve/ }))
  await user.click(screen.getByRole('button', { name: 'Track my first instalment' }))
  await user.selectOptions(screen.getByLabelText('Simulate this debit'), reason)
  if (date) fireEvent.change(screen.getByLabelText('Pretend today is'), { target: { value: date } })
  else await user.click(screen.getByRole('button', { name: 'Go to debit day' }))
  await user.click(screen.getByRole('button', { name: 'See what happened' }))
  return user
}

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const noButton = (name: string | RegExp) => expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()

describe('recovery actions', () => {
  it.each([
    ['insufficient_balance', ['Pay this month now', 'Skip this month']],
    ['bank_technical', ['Pay this month now', 'Skip this month']],
    ['unknown', ['Pay this month now', 'Ask support what happened']],
    ['mandate_revoked', ['Turn automatic payments back on', 'Pay this month now']],
    ['mandate_not_active', ['Turn automatic payments back on', 'Pay this month now']],
  ])('%s offers %o, primary first', async (reason, labels) => {
    await failInstalment1(reason)
    const actions = screen.getByRole('region', { name: 'What you can do' })
    const shown = [...actions.querySelectorAll('button')].map((b) => b.textContent)
    expect(shown).toEqual(labels)
    expect(button(labels[0]!)).toHaveClass('btn-primary')
    expect(button(labels[1]!)).toHaveClass('btn-ghost')
  })

  it('pays this month now, then shows units on the way', async () => {
    const user = await failInstalment1('insufficient_balance')
    await user.click(button('Pay this month now'))
    expect(screen.getByRole('heading', { name: 'Pay instalment #1' })).toBeInTheDocument()
    expect(screen.getByText(/one-time payment for this month only/)).toBeInTheDocument()

    await user.click(button('Pay ₹500 with UPI (simulated)'))
    expect(screen.getByRole('status')).toHaveTextContent(/Payment received\. Units for this instalment usually show by .*9 Dec/)

    await user.click(button('Back to tracker'))
    expect(screen.getByRole('heading', { name: 'Paid, units on the way' })).toBeInTheDocument()
    noButton('See what happened')
    expect(document.querySelector('[data-step="paid"]')).toHaveAttribute('data-status', 'done')
  })

  it('can back out of paying', async () => {
    const user = await failInstalment1('bank_technical')
    await user.click(button('Pay this month now'))
    await user.click(button('Back to tracker'))
    expect(screen.getByRole('region', { name: 'What you can do' })).toBeInTheDocument()
  })

  it('skips this month and keeps the SIP running', async () => {
    const user = await failInstalment1('insufficient_balance')
    await user.click(button('Skip this month'))
    expect(screen.getByRole('status')).toHaveTextContent(/This month is skipped\. Your next instalment is on .*5 Jan/)
    await user.click(button('Back to tracker'))
    expect(screen.getByRole('heading', { name: 'Skipped this month' })).toBeInTheDocument()
  })

  it('turns automatic payments back on; the missed month can still be paid and the next one debits', async () => {
    const user = await failInstalment1('mandate_revoked')
    await user.click(button('Turn automatic payments back on'))
    expect(screen.getByText('This is a limit, not a charge')).toBeInTheDocument()

    await user.click(button('Approve ₹15,000 limit (simulated)'))
    expect(screen.getByRole('status')).toHaveTextContent(/Automatic payments are back on\. Your next instalment is on .*5 Jan/)

    await user.click(button('Back to tracker'))
    await user.click(button('See what happened'))
    noButton('Turn automatic payments back on')
    expect(button('Pay this month now')).toBeInTheDocument()
    expect(screen.getByTestId('fact-sip')).toHaveTextContent(/still on/)

    await user.click(button('Back to tracker'))
    await user.selectOptions(screen.getByLabelText('Instalment'), '2')
    await user.click(button('Go to debit day'))
    expect(screen.getByRole('heading', { name: 'Debited, units on the way' })).toBeInTheDocument()
  })

  it('sends an unknown failure to support', async () => {
    const user = await failInstalment1('unknown')
    await user.click(button('Ask support what happened'))
    expect(screen.getByRole('status')).toHaveTextContent('Your request has gone to support.')
  })

  it('stops offering pay-now after the window closes', async () => {
    await failInstalment1('insufficient_balance', '2026-12-29')
    expect(screen.getByTestId('pay-now-closed')).toHaveTextContent(/can no longer be paid\. Your next instalment is on .*5 Jan/)
    noButton('Pay this month now')
    expect(button('Skip this month')).toHaveClass('btn-primary')
  })

  it('still offers pay-now on the last day of the window', async () => {
    await failInstalment1('insufficient_balance', '2026-12-28')
    expect(button('Pay this month now')).toBeInTheDocument()
    expect(screen.queryByTestId('pay-now-closed')).not.toBeInTheDocument()
  })
})
