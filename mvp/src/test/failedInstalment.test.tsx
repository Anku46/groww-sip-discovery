import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { FailedInstalment } from '@/components/FailedInstalment'
import type { FailureReason } from '@/lib/outcome'
import { createSipState, sipReducer, type SipAction, type SipState } from '@/lib/sipState'

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)
// ₹1,000 on the 5th, set up Mon 9 Nov 2026: #1 debits Mon 7 Dec, #2 Tue 5 Jan 2027.
const fresh = () => createSipState({ amount: 1000, sipDay: 5, method: 'upi' }, d(2026, 11, 9))
const run = (sip: SipState, ...actions: SipAction[]) => actions.reduce(sipReducer, sip)
const failedOn = (reason: FailureReason) =>
  run(fresh(), { type: 'SIMULATE_OUTCOME', n: 1, outcome: reason }, { type: 'SET_TODAY', today: d(2026, 12, 7) })

const fact = (id: string) => screen.getByTestId(id)

describe('FailedInstalment', () => {
  it.each([
    ['insufficient_balance', "This month's ₹1,000 didn't go through", /still on\. Next debit: .*5 Jan/, /Your bank may charge/, false],
    ['bank_technical', "This month's ₹1,000 didn't go through", /still on\. Next debit: .*5 Jan/, /Some banks charge/, false],
    ['unknown', "This month's ₹1,000 didn't go through", /still on\. Next debit: .*5 Jan/, /Some banks charge/, false],
    ['mandate_revoked', "This month's ₹1,000 wasn't taken", /Automatic payments are off/, /never reached your bank/, true],
    ['mandate_not_active', "This month's ₹1,000 wasn't taken", /Automatic payments are off/, /never reached your bank/, true],
  ] as const)('%s: title, the three facts and the why', (reason, title, sipFact, chargeFact, explainer) => {
    render(<FailedInstalment sip={failedOn(reason)} n={1} onBack={() => {}} onAction={() => {}} />)

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByText(/7 Dec/)).toBeInTheDocument() // what happened, with the debit date
    expect(fact('fact-money')).toHaveTextContent('No money was taken for this instalment.')
    expect(fact('fact-sip')).toHaveTextContent(sipFact)
    expect(fact('fact-charge')).toHaveTextContent(chargeFact)
    expect(fact('fact-charge')).toHaveTextContent(/bank/i)
    expect(screen.getByText('Why did this happen?')).toBeInTheDocument()

    if (explainer) expect(screen.getByText('What are automatic payments?')).toBeInTheDocument()
    else expect(screen.queryByText('What are automatic payments?')).not.toBeInTheDocument()
  })

  it('shows a calm fallback and a way back when the instalment has not failed', async () => {
    const onBack = vi.fn()
    render(<FailedInstalment sip={fresh()} n={1} onBack={onBack} onAction={() => {}} />)
    expect(screen.getByText('This instalment has no problem to sort out.')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Back to tracker' }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})

describe('opening the failed-instalment screen from the tracker', () => {
  it('opens for the selected instalment and returns to it', async () => {
    const user = userEvent.setup()
    render(<App today={d(2026, 11, 9)} debug={false} />)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: /Approve/ }))
    await user.click(screen.getByRole('button', { name: 'Track my first instalment' }))

    // No failure, no button.
    expect(screen.queryByRole('button', { name: 'See what happened' })).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Instalment'), '2')
    await user.selectOptions(screen.getByLabelText('Simulate this debit'), 'insufficient_balance')
    await user.click(screen.getByRole('button', { name: 'Go to debit day' }))
    await user.click(screen.getByRole('button', { name: 'See what happened' }))

    expect(screen.getByRole('heading', { level: 1, name: 'What happened' })).toBeInTheDocument()
    expect(screen.getByText('Instalment #2')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: "This month's ₹500 didn't go through" })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back to tracker' }))
    expect(screen.getByLabelText('Instalment')).toHaveValue('2')
    expect(screen.getByRole('button', { name: 'See what happened' })).toBeInTheDocument()
  })
})
