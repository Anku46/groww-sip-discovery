import { useReducer, useState, useSyncExternalStore } from 'react'
import { Confirmation } from '@/components/Confirmation'
import { FailedInstalment } from '@/components/FailedInstalment'
import { MandateReview } from '@/components/MandateReview'
import { PayNow } from '@/components/PayNow'
import { SetupFlow } from '@/components/SetupFlow'
import { Tracker } from '@/components/Tracker'
import { CONFIRMATION_COPY, RECOVERY_COPY } from '@/lib/copy'
import type { RecoveryAction } from '@/lib/outcome'
import { addWorkingDays, ALLOTMENT_WORKING_DAYS, formatDay, startOfDay } from '@/lib/schedule'
import { appReducer, nextInstalment, sipReducer, upcomingInstalment } from '@/lib/sipState'
import { getEvents, subscribe } from '@/lib/track'

type Screen = { name: 'home' } | { name: 'failed' } | { name: 'payNow' } | { name: 'reconnect' } | { name: 'done'; message: string }

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

  const home = () => setScreen({ name: 'home' })
  const done = (message: string) => setScreen({ name: 'done', message })

  const onAction = (action: RecoveryAction) => {
    if (!sip) return
    switch (action) {
      case 'pay_now':
        return setScreen({ name: 'payNow' })
      case 'reconnect_mandate':
        return setScreen({ name: 'reconnect' })
      case 'skip':
        dispatch({ type: 'SKIP', n })
        return done(CONFIRMATION_COPY.skipped(formatDay(nextInstalment(sip, n).debitDate)))
      case 'contact_support':
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
            onBack={() => setScreen({ name: 'failed' })}
            onApprove={() => {
              const after = sipReducer(sip, { type: 'RECONNECT_MANDATE' })
              dispatch({ type: 'RECONNECT_MANDATE' })
              done(CONFIRMATION_COPY.reconnected(formatDay(upcomingInstalment(after).debitDate)))
            }}
          />
        )
      case 'done':
        return <Confirmation message={screen.message} onDone={home} />
      case 'home':
        return (
          <>
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

      {showDebug && <EventLog />}
    </div>
  )
}

function EventLog() {
  const events = useSyncExternalStore(subscribe, getEvents)
  return (
    <details className="card mt-6 p-3 text-xs" open>
      <summary className="label cursor-pointer">Events ({events.length})</summary>
      <ul className="mt-2 space-y-1 font-mono">
        {[...events].reverse().map((e, i) => (
          <li key={`${e.at}-${i}`}>
            {e.name} {Object.keys(e.props).length > 0 && <span className="text-ink-faint">{JSON.stringify(e.props)}</span>}
          </li>
        ))}
      </ul>
    </details>
  )
}
