import { formatDay, formatINR, type Installment } from '@/lib/schedule'

export function ScheduleList({ schedule, amount }: { schedule: Installment[]; amount: number }) {
  return (
    <ol className="divide-y divide-line" aria-label="Upcoming instalments">
      {schedule.map((inst) => (
        <li key={inst.number} className="flex items-center justify-between gap-3 py-2.5">
          <div>
            <p className="font-medium">
              #{inst.number} · {formatDay(inst.debitDate)}
            </p>
            <p className="text-xs text-ink-faint">Changes possible until {formatDay(inst.cutoff)}</p>
          </div>
          <span className="font-medium tabular-nums">{formatINR(amount)}</span>
        </li>
      ))}
    </ol>
  )
}
