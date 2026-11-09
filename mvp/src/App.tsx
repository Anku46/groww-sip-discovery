import { useLayoutEffect, useReducer, useRef, useState } from 'react'
import { Confirmation } from '@/components/Confirmation'
import { DebugPanel } from '@/components/DebugPanel'
import { FailedInstalment } from '@/components/FailedInstalment'
import { MandateReview } from '@/components/MandateReview'
import { NotificationPreview } from '@/components/NotificationPreview'
import { PayNow } from '@/components/PayNow'
import { SetupFlow } from '@/components/SetupFlow'
import { SipStatusCard } from '@/components/SipStatusCard'
import { Tracker } from '@/components/Tracker'
import { CONFIRMATION_COPY, RECOVERY_COPY } from '@/lib/copy'
import type { RecoveryAction } from '@/lib/outcome'
import { addWorkingDays, ALLOTMENT_WORKING_DAYS, formatDay, startOfDay } from '@/lib/schedule'
import { alertInstalment, appReducer, nextDebit, nextInstalment, resolveState, sipReducer } from '@/lib/sipState'
import { track } from '@/lib/track'

type Screen =
  | { name: 'home' }
  | { name: 'failed' }
  | { name: 'payNow' }
  | { name: 'reconnect'; from: 'home' | 'failed'; n: number }
  | { name: 'done'; message: string }

const TITLES: Record<Screen['name'], string> = {
  home: 'Track your instalment',
  failed: 'What happened',
  payNow: 'Pay this month',
  reconnect: RECOVERY_COPY.reconnectTitle,
  done: 'Your instalment',
}

export default function App({ today = new Date(), debug }: { today?: Date; debug?: boolean }) {
  const [setupDay] = useState(() => startOfDay(today))
  const [sip, dispatch] = useReducer(appReducer, null)
  const [n, setN] = useState(1)
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const showDebug = debug ?? (typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug'))

  // instalment_failed: once per instalment and reason, when it first resolves to failed. A layout effect so it is
  // logged before the children's regular effects (the status card's failure_alert_viewed), keeping the funnel order.
  const reportedFailures = useRef(new Set<string>())
  useLayoutEffect(() => {
    if (!sip) {
      reportedFailures.current.clear()
      return
    }
    for (const inst of sip.instalments) {
      if (inst.debitDate > sip.today) break
      const state = resolveState(sip, inst.number)
      if (state.kind !== 'failed') continue
      const key = `${inst.number}:${state.reason}`
      if (reportedFailures.current.has(key)) continue
      reportedFailures.current.add(key)
      track('instalment_failed', { n: inst.number, reason: state.reason })
    }
  }, [sip])

  const home = () => setScreen({ name: 'home' })
  const done = (message: string) => setScreen({ name: 'done', message })
  const completed = (i: number, action: RecoveryAction) => track('recovery_completed', { n: i, action })

  const onAction = (action: RecoveryAction) => {
    if (!sip) return
    track('recovery_started', { n, action, source: 'failed_screen' })
    switch (action) {
      case 'pay_now':
        return setScreen({ name: 'payNow' })
      case 'reconnect_mandate':
        return setScreen({ name: 'reconnect', from: 'failed', n })
      case 'skip':
        dispatch({ type: 'SKIP', n })
        completed(n, 'skip')
        return done(CONFIRMATION_COPY.skipped(formatDay(nextInstalment(sip, n).debitDate)))
      case 'contact_support':
        completed(n, 'contact_support')
        return done(RECOVERY_COPY.supportSent)
    }
  }

  const body = () => {
    if (!sip) {
      return <SetupFlow today={setupDay} onComplete={(config) => dispatch({ type: 'SETUP_COMPLETED', config, setupDay })} />
    }
    switch (screen.name) {
      case 'failed':
        return <FailedInstalment sip={sip} n={n} onBack={home} onAction={onAction} />
      case 'payNow':
        return (
          <PayNow
            sip={sip}
            n={n}
            onBack={() => setScreen({ name: 'failed' })}
            onPay={() => {
              dispatch({ type: 'PAY_NOW', n })
              completed(n, 'pay_now')
              done(CONFIRMATION_COPY.paid(formatDay(addWorkingDays(sip.today, ALLOTMENT_WORKING_DAYS))))
            }}
          />
        )
      case 'reconnect':
        return (
          <MandateReview
            amount={sip.config.amount}
            limit={sip.limit}
            method={sip.config.method}
            onBack={() => setScreen(screen.from === 'home' ? { name: 'home' } : { name: 'failed' })}
            onApprove={() => {
              const after = sipReducer(sip, { type: 'RECONNECT_MANDATE' })
              dispatch({ type: 'RECONNECT_MANDATE' })
              completed(screen.n, 'reconnect_mandate')
              done(CONFIRMATION_COPY.reconnected(formatDay(nextDebit(after).debitDate)))
            }}
          />
        )
      case 'done':
        return <Confirmation message={screen.message} onDone={home} />
      case 'home':
        return (
          <>
            <SipStatusCard
              sip={sip}
              onOpenFailed={(i) => {
                setN(i)
                setScreen({ name: 'failed' })
              }}
              onReconnect={() => {
                const i = alertInstalment(sip) ?? n
                track('recovery_started', { n: i, action: 'reconnect_mandate', source: 'status_card' })
                setScreen({ name: 'reconnect', from: 'home', n: i })
              }}
            />
            <NotificationPreview sip={sip} />
            <Tracker
              sip={sip}
              dispatch={dispatch}
              n={n}
              onSelect={setN}
              onOpenFailed={(i) => {
                setN(i)
                setScreen({ name: 'failed' })
              }}
            />
            <button
              type="button"
              className="btn-ghost mt-4 w-full"
              onClick={() => {
                dispatch({ type: 'RESET' })
                setN(1)
                home()
              }}
            >
              Start over
            </button>
          </>
        )
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 py-6">
      <header className="mb-5">
        <p className="label">Prototype · first SIP</p>
        <h1 className="mt-1 text-xl font-semibold">{sip ? TITLES[screen.name] : 'Start a monthly SIP'}</h1>
      </header>

      {body()}

      {showDebug && <DebugPanel />}
    </div>
  )
}
