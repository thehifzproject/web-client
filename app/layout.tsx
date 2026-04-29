import type { Metadata } from 'next'
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

export const metadata: Metadata = {
  title: 'The Hifz Project',
  description: 'Memorize the Quran — word by word, ayah by ayah, surah by surah.',
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
        {children}
        <Analytics />
      </body>
    </html>
  )
}
