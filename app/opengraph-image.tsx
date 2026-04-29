import { ImageResponse } from 'next/og'

export const alt = 'The Hifz Project — Memorize the Quran, word by word'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0e1117 0%, #1f2535 100%)',
          color: '#e8edf5',
          padding: 80,
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            color: '#14a085',
            letterSpacing: 4,
            textTransform: 'uppercase',
            marginBottom: 36,
            fontWeight: 600,
          }}
        >
          The Hifz Project
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 92,
            fontWeight: 600,
            lineHeight: 1.1,
            marginBottom: 16,
            letterSpacing: -2,
          }}
        >
          Memorize the Quran.
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 92,
            fontWeight: 600,
            lineHeight: 1.1,
            color: '#14a085',
            marginBottom: 56,
            letterSpacing: -2,
          }}
        >
          Word by word.
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 30,
            color: '#7a8899',
            maxWidth: 880,
            lineHeight: 1.5,
          }}
        >
          Free, open source. Spaced repetition for hifz.
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 56,
            display: 'flex',
            gap: 16,
            fontSize: 22,
            color: '#4a5568',
          }}
        >
          <span>Word</span>
          <span style={{ color: '#2a3145' }}>·</span>
          <span>Ayah</span>
          <span style={{ color: '#2a3145' }}>·</span>
          <span>Surah</span>
        </div>
      </div>
    ),
    { ...size },
  )
}
