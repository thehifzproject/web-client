import type { Metadata, Viewport } from 'next'
import { Amiri, Crimson_Pro, DM_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thehifzproject.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'The Hifz Project — Memorize the Quran, word by word',
    template: '%s · The Hifz Project',
  },
  description:
    'Free, open-source Quran memorization (hifz) using spaced repetition. Word by word, ayah by ayah, surah by surah. No tutor, no school, no fees.',
  applicationName: 'The Hifz Project',
  keywords: [
    'Quran memorization',
    'hifz',
    'memorize Quran',
    'hifz app',
    'Quran app',
    'Quran online',
    'spaced repetition Quran',
    'learn Quran',
    'free hifz',
    'hafiz',
    'ayah memorization',
    'Islamic learning',
    'Tahfeez',
  ],
  authors: [{ name: 'The Hifz Project' }],
  creator: 'The Hifz Project',
  publisher: 'The Hifz Project',
  category: 'education',
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'The Hifz Project',
    title: 'The Hifz Project — Memorize the Quran, word by word',
    description:
      'Free, open-source Quran memorization with spaced repetition. Word by word, ayah by ayah, surah by surah. Built for the ummah.',
    url: '/',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Hifz Project — Memorize the Quran, word by word',
    description:
      'Free, open-source Quran memorization with spaced repetition. Word by word, ayah by ayah, surah by surah.',
  },
  formatDetection: { telephone: false, email: false, address: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0d7377' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1117' },
  ],
  colorScheme: 'dark light',
  width: 'device-width',
  initialScale: 1,
}

const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'The Hifz Project',
  url: SITE_URL,
  logo: `${SITE_URL}/logo-black.png`,
  sameAs: [] as string[],
}

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'The Hifz Project',
  url: SITE_URL,
  inLanguage: ['en', 'ar'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(!t)return;document.documentElement.dataset.theme=t;var d='#0e1117',r='#181d2a',c='#1f2535',b='#2a3145',x='#e8edf5',m='#7a8899',f='#4a5568';var l='#f4f6fa',lr='#ffffff',lc='#ffffff',lb='#e2e8f0',lx='#1a1f2e',lm='#6b7a8d',lf='#9aa5b4';var v;if(t==='dark')v=d+';--bg-raised:'+r+';--bg-card:'+c+';--border:'+b+';--text:'+x+';--text-muted:'+m+';--text-faint:'+f;else if(t==='light')v=l+';--bg-raised:'+lr+';--bg-card:'+lc+';--border:'+lb+';--text:'+lx+';--text-muted:'+lm+';--text-faint:'+lf;if(v){var s=document.createElement('style');s.id='theme-override';s.textContent=':root{--bg-base:'+v+'}';document.head.appendChild(s)}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${amiri.variable} ${crimsonPro.variable} ${dmSans.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
