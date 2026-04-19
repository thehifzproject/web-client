'use client'

import { useMemo } from 'react'
import { Flame } from 'lucide-react'

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function computeStreak(pastReviews: string[]): number {
  if (pastReviews.length === 0) return 0

  // Collect unique local dates that had at least one review
  const activeDays = new Set<string>()
  for (const ts of pastReviews) {
    activeDays.add(localDateStr(new Date(ts)))
  }

  const now = new Date()
  const todayStr = localDateStr(now)

  // Walk backwards from today (or yesterday if no reviews yet today)
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!activeDays.has(todayStr)) {
    // Allow streak to still count if yesterday was active (haven't reviewed today yet)
    cursor.setDate(cursor.getDate() - 1)
    if (!activeDays.has(localDateStr(cursor))) return 0
  }

  let streak = 0
  while (activeDays.has(localDateStr(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export function Streak({ pastReviews }: { pastReviews: string[] }) {
  const streak = useMemo(() => computeStreak(pastReviews), [pastReviews])

  return (
    <div className="nav-streak">
      <Flame size={16} />
      <span>{streak}</span>
    </div>
  )
}
