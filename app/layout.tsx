import type { Metadata } from 'next'
import { Amiri, Crimson_Pro, DM_Sans } from 'next/font/google'
import './globals.css'

const amiri = Amiri({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-amiri',
})

const crimsonPro = Crimson_Pro({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-crimson',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: 'The Hifz Project',
  description: 'Memorize the Quran — word by word, ayah by ayah, surah by surah.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${amiri.variable} ${crimsonPro.variable} ${dmSans.variable}`}>
        {children}
      </body>
    </html>
  )
}
