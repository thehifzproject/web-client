'use client'

import { useState, useCallback } from 'react'
import type { ReviewSchedule } from '@/lib/cards'

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function utcDateStr(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function fmtHourShort(h: number) {
  if (h === 0) return '12a'
  if (h < 12) return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

function buildMonth(byDate: Record<string, number>, pastByDate: Record<string, number>, offset: number) {
  const now = new Date()
  const todayStr = utcDateStr(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())))
  const tomorrowStr = utcDateStr(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)))

  const rawMonth = now.getUTCMonth() + offset
  const year = now.getUTCFullYear() + Math.floor(rawMonth / 12)
  const month = ((rawMonth % 12) + 12) % 12
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const monthName = new Date(Date.UTC(year, month, 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })

  const days = []
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

// ─── Tooltip ──────────────────────────────────────────────────────────────────

const TT_WIDTH = 200
const TT_HEADER_H = 36
const TT_ROW_H = 6       // px per hour row
const TT_TIMELINE_H = 24 * TT_ROW_H  // 144px
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
  schedule: ReviewSchedule
}) {
  const { x, y, cellH, dateStr, isPast, isToday, pastCount, futureCount } = state

  // Show above if enough room, else below
  const above = y - TT_TOTAL_H - 8 > 0
  const top = above ? y - TT_TOTAL_H - 8 : y + cellH + 8

  // Clamp horizontally
  const rawLeft = x - TT_WIDTH / 2
  const left = Math.max(8, Math.min(rawLeft, (typeof window !== 'undefined' ? window.innerWidth : 1200) - TT_WIDTH - 8))

  const date = new Date(dateStr + 'T00:00:00Z')
  const dayName = date.toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' })
  const dateFmt = date.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

  // Determine which hour data to use — available for all future dates (today onwards)
  const hours = !isPast ? (schedule.hoursByDate[dateStr] ?? []) : null

  const totalCount = isPast || isToday ? pastCount : futureCount
  const hourMap = new Map(hours?.map(h => [h.hour, h.count]) ?? [])
  const maxHourCount = hours && hours.length > 0 ? Math.max(...hours.map(h => h.count), 1) : 1
  const hasHourData = hours !== null

  return (
    <div
      className="tt-wrap"
      style={{ position: 'fixed', top, left, width: TT_WIDTH, zIndex: 9999, pointerEvents: 'none' }}
    >
      {/* Arrow pointing to cell */}
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
                      >
                        <span className="tt-hc">{count}</span>
                      </div>
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
        .tt-hb { position:absolute; top:1px; bottom:0; left:0; border-radius:1px; display:flex; align-items:center; }
        .tt-hb-g { background:color-mix(in srgb,var(--green) 70%,var(--bg-base)); }
        .tt-hb-t { background:color-mix(in srgb,var(--teal) 70%,var(--bg-base)); }
        .tt-hc { font-size:0.42rem; color:white; padding:0 2px; white-space:nowrap; line-height:1; }
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

// ─── Main component ───────────────────────────────────────────────────────────

export function ReviewCalendar({ schedule }: { schedule: ReviewSchedule }) {
  const [offset, setOffset] = useState(0)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const { year, monthName, firstDow, days } = buildMonth(schedule.byDate, schedule.pastByDate, offset)
  const hasAnyData = Object.keys(schedule.byDate).length > 0 || Object.keys(schedule.pastByDate).length > 0

  const handleEnter = useCallback((e: React.MouseEvent<HTMLDivElement>, day: typeof days[0]) => {
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

  return (
    <>
      {tooltip && <Tooltip state={tooltip} schedule={schedule} />}

      <div className="rcal-card">
        <div className="rcal-top">
          <span className="rcal-title">Activity & Schedule</span>
          {schedule.dueToday > 0 && (
            <div className="rcal-due">
              <span className="rcal-due-dot" />
              <span className="rcal-due-lbl">{schedule.dueToday} due now</span>
            </div>
          )}
        </div>

        <div className="rcal-nav">
          <button className="rcal-nb" onClick={() => setOffset(o => o - 1)} aria-label="Previous month">‹</button>
          <span className="rcal-ml">{monthName} {year}</span>
          <button className="rcal-nb" onClick={() => setOffset(o => o + 1)} aria-label="Next month">›</button>
        </div>

        <div className="rcal-dow">
          {DOW_LABELS.map((l, i) => <span key={i}>{l}</span>)}
        </div>

        <div className="rcal-grid">
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`p${i}`} className="rcal-cell" style={{ background: 'transparent', cursor: 'default' }} />
          ))}
          {days.map((day) => (
            <div
              key={day.dateStr}
              className={`rcal-cell${day.isToday ? ' rcal-today' : ''}`}
              style={{ background: cellBg(day.isPast, day.isToday, day.pastCount, day.futureCount) }}
              onMouseEnter={(e) => handleEnter(e, day)}
              onMouseLeave={handleLeave}
            />
          ))}
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
          .rcal-cell { aspect-ratio:1; border-radius:4px; cursor:pointer; transition:filter 0.1s; }
          .rcal-cell:hover { filter:brightness(1.3); }
          .rcal-today { outline:2px solid var(--teal); outline-offset:0; }

          .rcal-legend { display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap; }
          .rcal-lg-group { display:flex; align-items:center; gap:0.35rem; }
          .rcal-lg-scale { display:flex; gap:2px; }
          .rcal-lg-sq { width:13px; height:13px; border-radius:3px; }
          .rcal-lg-lbl { font-size:0.72rem; color:var(--text-muted); font-weight:500; }

          .rcal-empty { font-size:0.78rem; color:var(--text-faint); text-align:center; margin:0; }
        `}</style>
      </div>
    </>
  )
}
