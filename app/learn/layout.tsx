import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Learn',
  robots: { index: false, follow: false, nocache: true },
}

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return children
}
