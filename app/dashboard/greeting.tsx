'use client'

import { useSyncExternalStore } from 'react'

// Computed on the client so it reflects the user's local time, not the
// server's UTC. The server snapshot is empty (a non-breaking space) so SSR
// and first client render match; the real greeting paints after hydration.
const noopSubscribe = () => () => {}

function clientGreeting(): string {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

export function Greeting({ firstName }: { firstName: string }) {
  const greeting = useSyncExternalStore(noopSubscribe, clientGreeting, () => '')

  return (
    <h1 className="dash-greeting">
      {greeting ? `${greeting}, ${firstName}.` : <>&nbsp;</>}
    </h1>
  )
}
