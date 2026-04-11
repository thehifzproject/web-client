'use client'

import { useState, useCallback, useMemo } from 'react'
import type { ReviewSchedule } from '@/lib/cards'

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Aggregate raw timestamps into per-day buckets using the browser's local
// timezone. Kept on the client so users in any tz see "today" as their today.
interface AggregatedSchedule {
  byDate: Record<string, number>
  pastByDate: Record<string, number>
  hoursByDate: Record<string, { hour: number; count: number }[]>
  overdueCount: number
  dueToday: number
}

function aggregateSchedule(schedule: ReviewSchedule): AggregatedSchedule {
  const dueDates = schedule.dues.map(s => new Date(s))
  const pastDates = schedule.pastReviews.map(s => new Date(s))

  const now = new Date()
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayStr = localDateStr(todayLocal)

  const overdueCount = dueDates.filter(d => d < todayLocal).length
  const dueToday = dueDates.filter(d => d <= now).length

  // Future-dated buckets (today and beyond) come from card due dates
  const byDate: Record<string, number> = {}
  const hoursMap: Record<string, Map<number, number>> = {}
  for (const d of dueDates) {
    const ds = localDateStr(d)
    if (ds < todayStr) continue
    byDate[ds] = (byDate[ds] ?? 0) + 1
    if (!hoursMap[ds]) hoursMap[ds] = new Map()
    const h = d.getHours()
    hoursMap[ds].set(h, (hoursMap[ds].get(h) ?? 0) + 1)
  }

  // Past buckets come from review_log
  const pastByDate: Record<string, number> = {}
  const pastHoursMap: Record<string, Map<number, number>> = {}
  for (const d of pastDates) {
    const ds = localDateStr(d)
    pastByDate[ds] = (pastByDate[ds] ?? 0) + 1
    if (!pastHoursMap[ds]) pastHoursMap[ds] = new Map()
    const h = d.getHours()
    pastHoursMap[ds].set(h, (pastHoursMap[ds].get(h) ?? 0) + 1)
  }

  // Past-day hour breakdowns use review_log only (today is already from dues)
  for (const [ds, hmap] of Object.entries(pastHoursMap)) {
    if (ds >= todayStr) continue
    hoursMap[ds] = hmap
  }

  const hoursByDate: Record<string, { hour: number; count: number }[]> = {}
  for (const [ds, hmap] of Object.entries(hoursMap)) {
    hoursByDate[ds] = [...hmap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([hour, count]) => ({ hour, count }))
  }

  return { byDate, pastByDate, hoursByDate, overdueCount, dueToday }
}

function fmtHour(h: number) {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

function fmtHourShort(h: number) {
  if (h === 0) return '12a'
  if (h < 12) return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

interface DayInfo {
  dateStr: string
  isToday: boolean
  isTomorrow: boolean
  isPast: boolean
  futureCount: number
  pastCount: number
}

function buildMonth(byDate: Record<string, number>, pastByDate: Record<string, number>, offset: number) {
  const now = new Date()
  const todayStr = localDateStr(now)
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const tomorrowStr = localDateStr(tomorrow)

  const rawMonth = now.getMonth() + offset
  const year = now.getFullYear() + Math.floor(rawMonth / 12)
  const month = ((rawMonth % 12) + 12) % 12
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = new Date(year, month, 1).toLocaleString('en-US', { month: 'long' })

  const days: DayInfo[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      dateStr,
      isToday: dateStr === todayStr,
      isTomorrow: dateStr === tomorrowStr,
      isPast: dateStr < todayStr,
      futureCount: byDate[dateStr] ?? 0,
      pastCount: pastByDate[dateStr] ?? 0,
    })
  }
  return { year, month, monthName, firstDow, days }
}

function pastColor(n: number) {
  if (n === 0) return 'color-mix(in srgb, var(--border) 55%, transparent)'
  if (n <= 3)  return 'color-mix(in srgb, var(--green) 30%, var(--bg-base))'
  if (n <= 9)  return 'color-mix(in srgb, var(--green) 58%, var(--bg-base))'
  if (n <= 19) return 'color-mix(in srgb, var(--green) 82%, var(--bg-base))'
  return 'var(--green)'
}

function futureColor(n: number) {
  if (n === 0) return 'color-mix(in srgb, var(--border) 55%, transparent)'
  if (n <= 3)  return 'color-mix(in srgb, var(--teal) 28%, var(--bg-base))'
  if (n <= 9)  return 'color-mix(in srgb, var(--teal) 55%, var(--bg-base))'
  if (n <= 19) return 'color-mix(in srgb, var(--teal) 78%, var(--bg-base))'
  return 'var(--teal)'
}

function cellBg(isPast: boolean, isToday: boolean, pastCount: number, futureCount: number) {
  if (isPast) return pastColor(pastCount)
  if (isToday) return pastCount > 0 ? pastColor(pastCount) : futureColor(futureCount)
  return futureColor(futureCount)
}

function selectionOutline(isPast: boolean, isToday: boolean, pastCount: number, futureCount: number): string {
  const count = isPast || (isToday && pastCount > 0) ? pastCount : futureCount
  if (count === 0) return 'var(--text-faint)'
  return isPast || (isToday && pastCount > 0)
    ? 'color-mix(in srgb, var(--green) 90%, black)'
    : 'color-mix(in srgb, var(--teal) 90%, black)'
}

// ─── Tooltip (hover) ─────────────────────────────────────────────────────────

const TT_WIDTH = 200
const TT_HEADER_H = 36
const TT_ROW_H = 6
const TT_TIMELINE_H = 24 * TT_ROW_H
const TT_PAD = 12
const TT_TOTAL_H = TT_HEADER_H + TT_TIMELINE_H + TT_PAD * 2

interface TooltipState {
  x: number; y: number; cellH: number
  dateStr: string; isPast: boolean; isToday: boolean
  pastCount: number; futureCount: number
}

function Tooltip({
  state, schedule,
}: {
  state: TooltipState
  schedule: AggregatedSchedule
}) {
  const { x, y, cellH, dateStr, isPast, isToday, pastCount, futureCount } = state

  const above = y - TT_TOTAL_H - 8 > 0
  const top = above ? y - TT_TOTAL_H - 8 : y + cellH + 8

  const rawLeft = x - TT_WIDTH / 2
  const left = Math.max(8, Math.min(rawLeft, (typeof window !== 'undefined' ? window.innerWidth : 1200) - TT_WIDTH - 8))

  // dateStr is YYYY-MM-DD in local tz — construct a local Date to format it
  const [yy, mm, dd] = dateStr.split('-').map(Number)
  const date = new Date(yy, mm - 1, dd)
  const dayName = date.toLocaleString('en-US', { weekday: 'short' })
  const dateFmt = date.toLocaleString('en-US', { month: 'short', day: 'numeric' })

  const hours = schedule.hoursByDate[dateStr] ?? []
  const totalCount = isPast || isToday ? pastCount : futureCount
  const hourMap = new Map(hours.map(h => [h.hour, h.count]))
  const maxHourCount = hours.length > 0 ? Math.max(...hours.map(h => h.count), 1) : 1
  const hasHourData = hours.length > 0

  return (
    <div
      className="tt-wrap"
      style={{ position: 'fixed', top, left, width: TT_WIDTH, zIndex: 9999, pointerEvents: 'none' }}
    >
      <div className={`tt-arrow ${above ? 'tt-arrow-down' : 'tt-arrow-up'}`}
        style={{ left: Math.min(Math.max(x - left, 10), TT_WIDTH - 10) }}
      />

      <div className="tt-card">
        <div className="tt-head">
          <span className="tt-date">{dayName}, {dateFmt}</span>
          <span className={`tt-badge ${isPast ? 'tt-g' : 'tt-t'}`}>
            {isPast ? 'Activity' : 'Scheduled'}
          </span>
        </div>

        {hasHourData ? (
          <div className="tt-timeline">
            {Array.from({ length: 24 }, (_, h) => {
              const count = hourMap.get(h) ?? 0
              const isLabel = h % 6 === 0
              return (
                <div key={h} className="tt-hr">
                  <span className="tt-hl">{isLabel ? fmtHourShort(h) : ''}</span>
                  <div className="tt-ht">
                    {count > 0 && (
                      <div
                        className={`tt-hb ${isPast ? 'tt-hb-g' : 'tt-hb-t'}`}
                        style={{ width: `${Math.max(8, (count / maxHourCount) * 100)}%` }}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="tt-summary">
            {totalCount > 0
              ? <><span className={`tt-sum-n ${isPast ? 'tt-g-text' : 'tt-t-text'}`}>{totalCount}</span>{' '}<span>{isPast ? 'reviewed' : 'scheduled'}</span></>
              : <span className="tt-none">{isPast ? 'No activity' : 'Nothing scheduled'}</span>
            }
          </div>
        )}
      </div>

      <style>{`
        .tt-wrap { position:fixed; }
        .tt-card { background:var(--bg-raised); border:1px solid var(--border); border-radius:0.5rem; padding:${TT_PAD}px; box-shadow:0 8px 32px rgba(0,0,0,0.14); }
        .tt-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; gap:4px; }
        .tt-date { font-size:0.7rem; font-weight:700; color:var(--text); }
        .tt-badge { font-size:0.58rem; font-weight:700; padding:1px 5px; border-radius:3px; white-space:nowrap; }
        .tt-g { background:color-mix(in srgb,var(--green) 15%,transparent); color:var(--green); }
        .tt-t { background:color-mix(in srgb,var(--teal) 15%,transparent); color:var(--teal); }
        .tt-timeline { display:flex; flex-direction:column; }
        .tt-hr { display:flex; align-items:center; height:${TT_ROW_H}px; }
        .tt-hl { font-size:0.48rem; color:var(--text-faint); width:1.8rem; text-align:right; padding-right:3px; flex-shrink:0; line-height:1; font-variant-numeric:tabular-nums; }
        .tt-ht { flex:1; height:100%; position:relative; border-top:1px solid color-mix(in srgb,var(--border) 50%,transparent); }
        .tt-hb { position:absolute; top:1px; bottom:0; left:0; border-radius:1px; }
        .tt-hb-g { background:color-mix(in srgb,var(--green) 70%,var(--bg-base)); }
        .tt-hb-t { background:color-mix(in srgb,var(--teal) 70%,var(--bg-base)); }
        .tt-summary { display:flex; align-items:center; gap:4px; padding:4px 0; font-size:0.75rem; color:var(--text-muted); }
        .tt-sum-n { font-size:1.1rem; font-weight:700; line-height:1; }
        .tt-g-text { color:var(--green); }
        .tt-t-text { color:var(--teal); }
        .tt-none { color:var(--text-faint); font-style:italic; }
        .tt-arrow { position:absolute; width:0; height:0; }
        .tt-arrow-down { border-left:5px solid transparent; border-right:5px solid transparent; border-top:5px solid var(--border); bottom:-5px; transform:translateX(-50%); }
        .tt-arrow-up { border-left:5px solid transparent; border-right:5px solid transparent; border-bottom:5px solid var(--border); top:-5px; transform:translateX(-50%); }
      `}</style>
    </div>
  )
}

// ─── Detail panel (click) ────────────────────────────────────────────────────

function DetailPanel({
  day, schedule,
}: {
  day: DayInfo
  schedule: AggregatedSchedule
}) {
  const { dateStr, isPast, pastCount, futureCount } = day

  const [yy, mm, dd] = dateStr.split('-').map(Number)
  const date = new Date(yy, mm - 1, dd)
  const dayName = date.toLocaleString('en-US', { weekday: 'long' })
  const dateFmt = date.toLocaleString('en-US', { month: 'long', day: 'numeric' })

  const hours = schedule.hoursByDate[dateStr] ?? []
  const totalCount = isPast ? pastCount : futureCount
  const hourMap = new Map(hours.map(h => [h.hour, h.count]))
  const maxHourCount = hours.length > 0 ? Math.max(...hours.map(h => h.count), 1) : 1

  return (
    <div className="dp-wrap">
      <div className="dp-head">
        <div className="dp-title">
          <span className="dp-day">{dayName}, {dateFmt}</span>
          <span className={`dp-badge ${isPast ? 'tt-g' : 'tt-t'}`}>
            {isPast ? 'Activity' : 'Scheduled'}
          </span>
        </div>
        {totalCount > 0 && (
          <span className={`dp-total ${isPast ? 'tt-g-text' : 'tt-t-text'}`}>
            {totalCount} {isPast ? 'reviewed' : 'scheduled'}
          </span>
        )}
      </div>

      {hours.length > 0 ? (
        <div className="dp-timeline">
          {Array.from({ length: 24 }, (_, h) => {
            const count = hourMap.get(h) ?? 0
            const isLabel = h % 3 === 0
            return (
              <div key={h} className="dp-hr">
                <span className="dp-hl">{isLabel ? fmtHour(h) : ''}</span>
                <div className="dp-ht">
                  {count > 0 && (
                    <div className="dp-hb-wrap">
                      <div
                        className={`dp-hb ${isPast ? 'tt-hb-g' : 'tt-hb-t'}`}
                        style={{ width: `${Math.max(6, (count / maxHourCount) * 100)}%` }}
                      />
                      <span className={`dp-hc ${isPast ? 'tt-g-text' : 'tt-t-text'}`}>{count}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="dp-empty">
          {totalCount > 0
            ? `${totalCount} ${isPast ? 'reviews completed' : 'cards scheduled'}`
            : isPast ? 'No activity' : 'Nothing scheduled'}
        </p>
      )}

      <style>{`
        .dp-wrap { border-top:1px solid var(--border); padding-top:0.875rem; }
        .dp-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:0.5rem; flex-wrap:wrap; gap:0.25rem; }
        .dp-title { display:flex; align-items:center; gap:0.5rem; }
        .dp-day { font-size:0.82rem; font-weight:700; color:var(--text); }
        .dp-badge { font-size:0.6rem; font-weight:700; padding:2px 6px; border-radius:3px; white-space:nowrap; }
        .dp-total { font-size:0.7rem; font-weight:600; }
        .dp-timeline { display:flex; flex-direction:column; gap:0; }
        .dp-hr { display:flex; align-items:center; height:12px; }
        .dp-hl { font-size:0.6rem; color:var(--text-faint); width:3rem; text-align:right; padding-right:6px; flex-shrink:0; line-height:1; font-variant-numeric:tabular-nums; }
        .dp-ht { flex:1; height:100%; position:relative; border-top:1px solid color-mix(in srgb,var(--border) 40%,transparent); }
        .dp-hb-wrap { display:flex; align-items:center; gap:4px; height:100%; }
        .dp-hb { height:8px; border-radius:2px; min-width:4px; }
        .dp-hc { font-size:0.6rem; font-weight:600; line-height:1; }
        .dp-empty { font-size:0.78rem; color:var(--text-faint); text-align:center; margin:0; font-style:italic; }
      `}</style>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ReviewCalendar({ schedule }: { schedule: ReviewSchedule }) {
  const [offset, setOffset] = useState(0)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null)

  const agg = useMemo(() => aggregateSchedule(schedule), [schedule])

  const { year, monthName, firstDow, days } = buildMonth(agg.byDate, agg.pastByDate, offset)
  const hasAnyData = Object.keys(agg.byDate).length > 0 || Object.keys(agg.pastByDate).length > 0

  const handleEnter = useCallback((e: React.MouseEvent<HTMLDivElement>, day: DayInfo) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top,
      cellH: rect.height,
      dateStr: day.dateStr,
      isPast: day.isPast,
      isToday: day.isToday,
      pastCount: day.pastCount,
      futureCount: day.futureCount,
    })
  }, [])

  const handleLeave = useCallback(() => setTooltip(null), [])

  const handleClick = useCallback((day: DayInfo) => {
    setSelectedDay(prev => prev?.dateStr === day.dateStr ? null : day)
  }, [])

  return (
    <>
      {tooltip && <Tooltip state={tooltip} schedule={agg} />}

      <div className="rcal-card">
        <div className="rcal-top">
          <span className="rcal-title">Activity & Schedule</span>
          {agg.dueToday > 0 && (
            <div className="rcal-due">
              <span className="rcal-due-dot" />
              <span className="rcal-due-lbl">{agg.dueToday} due now</span>
            </div>
          )}
        </div>

        <div className="rcal-nav">
          <button className="rcal-nb" onClick={() => { setOffset(o => o - 1); setSelectedDay(null) }} aria-label="Previous month">&lsaquo;</button>
          <span className="rcal-ml">{monthName} {year}</span>
          <button className="rcal-nb" onClick={() => { setOffset(o => o + 1); setSelectedDay(null) }} aria-label="Next month">&rsaquo;</button>
        </div>

        <div className="rcal-dow">
          {DOW_LABELS.map((l, i) => <span key={i}>{l}</span>)}
        </div>

        <div className="rcal-grid">
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`p${i}`} className="rcal-cell" style={{ background: 'transparent', cursor: 'default' }} />
          ))}
          {days.map((day) => {
            const isSelected = selectedDay?.dateStr === day.dateStr
            return (
              <div
                key={day.dateStr}
                className={`rcal-cell${day.isToday && !selectedDay ? ' rcal-today' : ''}${isSelected ? ' rcal-selected' : ''}`}
                style={{
                  background: cellBg(day.isPast, day.isToday, day.pastCount, day.futureCount),
                  ...(isSelected ? { outlineColor: selectionOutline(day.isPast, day.isToday, day.pastCount, day.futureCount) } : {}),
                }}
                onMouseEnter={(e) => handleEnter(e, day)}
                onMouseLeave={handleLeave}
                onClick={() => handleClick(day)}
              />
            )
          })}
        </div>

        <div className="rcal-legend">
          <div className="rcal-lg-group">
            <div className="rcal-lg-scale">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="rcal-lg-sq" style={{ background: pastColor(i === 0 ? 0 : i === 1 ? 2 : i === 2 ? 6 : i === 3 ? 12 : 25) }} />
              ))}
            </div>
            <span className="rcal-lg-lbl">Past</span>
          </div>
          <div className="rcal-lg-group">
            <div className="rcal-lg-scale">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="rcal-lg-sq" style={{ background: futureColor(i === 0 ? 0 : i === 1 ? 2 : i === 2 ? 6 : i === 3 ? 12 : 25) }} />
              ))}
            </div>
            <span className="rcal-lg-lbl">Scheduled</span>
          </div>
        </div>

        {selectedDay && <DetailPanel day={selectedDay} schedule={agg} />}

        {!hasAnyData && (
          <p className="rcal-empty">Start learning to see your activity here.</p>
        )}

        <style>{`
          .rcal-card { background:var(--bg-card); border:1px solid var(--border); border-radius:1rem; padding:1.1rem; display:flex; flex-direction:column; gap:0.875rem; }

          .rcal-top { display:flex; align-items:center; justify-content:space-between; }
          .rcal-title { font-size:0.75rem; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); }
          .rcal-due { display:flex; align-items:center; gap:0.35rem; }
          .rcal-due-dot { width:6px; height:6px; border-radius:50%; background:var(--teal); animation:rcal-pulse 2s ease-in-out infinite; }
          @keyframes rcal-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
          .rcal-due-lbl { font-size:0.7rem; font-weight:700; color:var(--teal); }

          .rcal-nav { display:flex; align-items:center; justify-content:space-between; }
          .rcal-ml { font-size:1.05rem; font-weight:700; color:var(--text); font-family:var(--font-crimson),serif; }
          .rcal-nb { background:none; border:none; cursor:pointer; color:var(--text-muted); font-size:1.1rem; line-height:1; padding:2px 6px; border-radius:4px; transition:color 0.15s,background 0.15s; }
          .rcal-nb:hover { color:var(--text); background:var(--border); }

          .rcal-dow { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; }
          .rcal-dow span { font-size:0.62rem; font-weight:600; color:var(--text-faint); text-align:center; line-height:1; padding-bottom:3px; }

          .rcal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; }
          .rcal-cell { aspect-ratio:1; border-radius:4px; cursor:pointer; transition:filter 0.1s,outline-color 0.15s; }
          .rcal-cell:hover { filter:brightness(1.3); }
          .rcal-today { outline:2px solid var(--teal); outline-offset:1px; }
          .rcal-selected { outline:2px solid; outline-offset:1px; }

          .rcal-legend { display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap; }
          .rcal-lg-group { display:flex; align-items:center; gap:0.35rem; }
          .rcal-lg-scale { display:flex; gap:2px; }
          .rcal-lg-sq { width:13px; height:13px; border-radius:3px; }
          .rcal-lg-lbl { font-size:0.72rem; color:var(--text-muted); font-weight:500; }

          .rcal-empty { font-size:0.78rem; color:var(--text-faint); text-align:center; margin:0; }

          .tt-hb-g { background:color-mix(in srgb,var(--green) 70%,var(--bg-base)); }
          .tt-hb-t { background:color-mix(in srgb,var(--teal) 70%,var(--bg-base)); }
          .tt-g { background:color-mix(in srgb,var(--green) 15%,transparent); color:var(--green); }
          .tt-t { background:color-mix(in srgb,var(--teal) 15%,transparent); color:var(--teal); }
          .tt-g-text { color:var(--green); }
          .tt-t-text { color:var(--teal); }
        `}</style>
      </div>
    </>
  )
}
