import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '@/App'
import { getEvents, recoveryFunnel, resetEvents, type EventName, type TrackedEvent } from '@/lib/track'

const ev = (name: EventName, props: TrackedEvent['props'] = {}): TrackedEvent => ({ name, at: '', props })

describe('recoveryFunnel', () => {
  it('is all zeros with no events', () => {
    expect(recoveryFunnel([]).counts).toEqual({ failed: 0, alerted: 0, viewed: 0, started: 0, completed: 0 })
  })

  it('counts distinct failed instalments per stage, ignoring repeats and instalments that never failed', () => {
    const { counts, completedBy } = recoveryFunnel([
      ev('instalment_failed', { n: 1, reason: 'insufficient_balance' }),
      ev('instalment_failed', { n: 2, reason: 'bank_technical' }),
      ev('failure_alert_viewed', { n: 1 }),
      ev('failure_alert_viewed', { n: 1 }),
      ev('failure_alert_viewed', { n: 2 }),
      ev('failure_screen_viewed', { n: 1 }),
      ev('failure_screen_viewed', { n: 1 }),
      ev('recovery_started', { n: 1, action: 'pay_now' }),
      ev('recovery_started', { n: 3, action: 'skip' }), // #3 never failed: not counted
      ev('recovery_completed', { n: 1, action: 'pay_now' }),
      ev('recovery_completed', { n: 1, action: 'pay_now' }),
    ])
    expect(counts).toEqual({ failed: 2, alerted: 2, viewed: 1, started: 1, completed: 1 })
    expect(completedBy).toEqual({ pay_now: 1 })
  })
})

describe('events from the app', () => {
  beforeEach(() => resetEvents())

  async function failInstalment1(reason: string) {
    const user = userEvent.setup()
    render(<App today={new Date(2026, 10, 9)} debug />)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: /Approve/ }))
    await user.click(screen.getByRole('button', { name: 'Track my first instalment' }))
    await user.selectOptions(screen.getByLabelText('Simulate this debit'), reason)
    fireEvent.change(screen.getByLabelText('Pretend today is'), { target: { value: '2026-12-07' } })
    return user
  }
  const card = () => screen.getByLabelText('SIP status')
  const names = () => getEvents().map((e) => e.name)
  const find = (name: EventName) => getEvents().filter((e) => e.name === name)
  const stage = (key: string) => document.querySelector(`[data-stage="${key}"]`)?.getAttribute('data-count')

  it('records the whole pay-now path in order, and the funnel shows it', async () => {
    const user = await failInstalment1('insufficient_balance')
    await user.click(within(card()).getByRole('button', { name: 'See what happened' }))
    await user.click(screen.getByRole('button', { name: 'Pay this month now' }))
    await user.click(screen.getByRole('button', { name: /Pay ₹500 with UPI/ }))

    const order = ['instalment_failed', 'failure_alert_viewed', 'failure_screen_viewed', 'recovery_started', 'recovery_completed'] as const
    const at = order.map((name) => names().indexOf(name))
    expect(at.every((i) => i >= 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)

    expect(find('instalment_failed')[0]!.props).toEqual({ n: 1, reason: 'insufficient_balance' })
    expect(find('failure_screen_viewed')[0]!.props).toEqual({ n: 1, reason: 'insufficient_balance' })
    expect(find('recovery_started')[0]!.props).toEqual({ n: 1, action: 'pay_now', source: 'failed_screen' })
    expect(find('recovery_completed')[0]!.props).toEqual({ n: 1, action: 'pay_now' })

    await user.click(screen.getByRole('button', { name: 'Back to tracker' }))
    for (const key of ['failed', 'alerted', 'viewed', 'started', 'completed']) expect(stage(key)).toBe('1')
    expect(screen.getByTestId('completed-by')).toHaveTextContent('pay_now 1')
  })

  it('reports a failure once, however often the screens are revisited', async () => {
    const user = await failInstalment1('bank_technical')
    for (let i = 0; i < 2; i++) {
      await user.click(within(card()).getByRole('button', { name: 'See what happened' }))
      await user.click(screen.getByRole('button', { name: 'Back to tracker' }))
    }
    expect(find('instalment_failed')).toHaveLength(1)
    expect(find('failure_screen_viewed')).toHaveLength(2)
    expect(stage('viewed')).toBe('1')
  })

  it('records the status card states as they change', async () => {
    await failInstalment1('insufficient_balance')
    const states = find('status_card_viewed').map((e) => e.props.state)
    expect(states).toEqual(['running', 'needs_attention'])
  })

  it('records a reconnect started from the status card', async () => {
    const user = await failInstalment1('mandate_revoked')
    await user.click(within(card()).getByRole('button', { name: 'Turn automatic payments back on' }))
    await user.click(screen.getByRole('button', { name: /Approve/ }))
    expect(find('recovery_started')[0]!.props).toEqual({ n: 1, action: 'reconnect_mandate', source: 'status_card' })
    expect(find('recovery_completed')[0]!.props).toEqual({ n: 1, action: 'reconnect_mandate' })
  })

  it.each([
    ['insufficient_balance', 'Skip this month', 'skip'],
    ['unknown', 'Ask support what happened', 'contact_support'],
  ])('%s: "%s" starts and completes in one step', async (reason, label, action) => {
    const user = await failInstalment1(reason)
    await user.click(within(card()).getByRole('button', { name: 'See what happened' }))
    await user.click(screen.getByRole('button', { name: label }))
    expect(find('recovery_started').map((e) => e.props.action)).toEqual([action])
    expect(find('recovery_completed').map((e) => e.props.action)).toEqual([action])
  })

  it('records a start but no completion when the investor backs out of paying', async () => {
    const user = await failInstalment1('insufficient_balance')
    await user.click(within(card()).getByRole('button', { name: 'See what happened' }))
    await user.click(screen.getByRole('button', { name: 'Pay this month now' }))
    await user.click(screen.getByRole('button', { name: 'Back to tracker' }))
    expect(find('recovery_started')).toHaveLength(1)
    expect(find('recovery_completed')).toHaveLength(0)
  })
})
