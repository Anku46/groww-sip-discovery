import { Bell, MessageSquare } from 'lucide-react'
import { ALERT_COPY, SMS_MAX_LENGTH } from '@/lib/copy'
import { formatDay, formatINR } from '@/lib/schedule'
import { getInstalment, type SipState } from '@/lib/sipState'
import { alertInstalment } from './AlertBanner'

/**
 * Prototype-only: what the push notification and SMS would say on the day of the failure.
 * Nothing is sent; a real build sends these from the SIP service (MVP_Architecture.md §11).
 */
export function NotificationPreview({ sip }: { sip: SipState }) {
  const n = alertInstalment(sip)
  if (n === null) return null

  const amount = formatINR(sip.config.amount)
  const date = formatDay(getInstalment(sip, n)!.debitDate)
  const sms = ALERT_COPY.sms(amount, date)

  return (
    <details className="card mb-4 border-dashed p-4" aria-label="Notification preview">
      <summary className="label cursor-pointer">Preview: messages sent on the failure day</summary>
      <div className="mt-3 space-y-3">
        <div className="rounded-md bg-navy p-3" data-testid="push-preview">
          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Bell className="h-3.5 w-3.5" aria-hidden /> Push notification
          </p>
          <p className="mt-1 text-sm font-semibold">{ALERT_COPY.pushTitle}</p>
          <p className="text-sm text-ink-muted">{ALERT_COPY.pushBody(amount, date)}</p>
        </div>
        <div className="rounded-md bg-navy p-3" data-testid="sms-preview">
          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden /> SMS · {sms.length}/{SMS_MAX_LENGTH} characters
          </p>
          <p className="mt-1 text-sm">{sms}</p>
        </div>
      </div>
    </details>
  )
}
