import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { LandingPage } from './landing'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thehifzproject.com'

export const metadata: Metadata = {
  title: 'Memorize the Quran — Free, open-source hifz with spaced repetition',
  description:
    'Memorize the Quran word by word, ayah by ayah, surah by surah. Spaced repetition, all 114 surahs, free forever. No tutor, no school, no fees.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Memorize the Quran — Free, open-source hifz with spaced repetition',
    description:
      'Memorize the Quran word by word, ayah by ayah, surah by surah. Spaced repetition, all 114 surahs, free forever.',
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Memorize the Quran — Free, open-source hifz with spaced repetition',
    description:
      'Memorize the Quran word by word, ayah by ayah, surah by surah. Free forever.',
  },
}

const webApplicationLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'The Hifz Project',
  url: SITE_URL,
  description:
    'Free, open-source Quran memorization (hifz) using spaced repetition. Teaches the Quran word by word, ayah by ayah, surah by surah.',
  applicationCategory: 'EducationalApplication',
  applicationSubCategory: 'Quran memorization',
  operatingSystem: 'Web',
  browserRequirements: 'Requires JavaScript and a modern browser',
  inLanguage: ['en', 'ar'],
  isAccessibleForFree: true,
  audience: {
    '@type': 'Audience',
    audienceType: 'Muslims learning to memorize the Quran',
  },
  offers: [
    {
      '@type': 'Offer',
      name: 'Free tier',
      price: '0',
      priceCurrency: 'USD',
      description:
        'All 114 surahs, every word and ayah, with spaced repetition scheduling. Free forever.',
    },
    {
      '@type': 'Offer',
      name: 'Voice add-on',
      price: '5',
      priceCurrency: 'USD',
      description:
        'Speak your recitation instead of typing. Arabic transcription tuned for Quran. $5/month, cancel any time.',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '5',
        priceCurrency: 'USD',
        billingDuration: 'P1M',
        unitText: 'MONTH',
      },
    },
  ],
  featureList: [
    'Spaced repetition scheduling (9 stages from Stranger to Preserved)',
    'Word-level memorization with Arabic, transliteration, and meaning',
    'Ayah identification and recitation drills',
    'Surah sequence drills (5-ayah chains)',
    'Per-word audio playback',
    'Optional voice recitation grading (paid add-on)',
    'Activity calendar and streak tracking',
    'All 114 surahs of the Quran',
  ],
}

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.onboarding_complete) redirect('/onboarding')
    redirect('/dashboard')
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationLd) }}
      />
      <LandingPage />
    </>
  )
}
