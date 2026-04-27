'use client'

import { createCheckoutSession } from '@/app/actions/billing'
import { useState } from 'react'
import { X } from 'lucide-react'

export function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  if (!open) return null

  async function handleUpgrade() {
    setLoading(true)
    setErrorMsg(null)
    const returnTo = window.location.pathname + window.location.search
    const res = await createCheckoutSession(returnTo)
    if ('url' in res) {
      window.location.href = res.url
    } else {
      setLoading(false)
      setErrorMsg(
        res.error === 'already_subscribed' ? "You're already subscribed." :
        res.error === 'unauthorized' ? 'Please sign in again.' :
        'Could not start checkout. Try again.'
      )
    }
  }

  return (
    <div className="upgrade-modal-backdrop" onClick={onClose}>
      <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
        <button className="upgrade-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <h2>Unlock voice recitation</h2>
        <p className="subtitle">Speak your answer instead of typing — just $5/month.</p>
        <ul className="upgrade-benefits">
          <li>Arabic speech recognition tuned for Quran</li>
          <li>Works on transliteration, ayah recitation, and surah chains</li>
          <li>Cancel any time</li>
        </ul>
        {errorMsg && (
          <p style={{ color: 'var(--incorrect)', fontSize: '0.85rem', textAlign: 'center', margin: '0.25rem 0 0.5rem' }}>
            {errorMsg}
          </p>
        )}
        <button className="btn btn-primary" disabled={loading} onClick={handleUpgrade}>
          {loading ? 'Opening…' : 'Upgrade — $5/month'}
        </button>
        <button className="btn btn-ghost" onClick={onClose}>Not now</button>
      </div>
    </div>
  )
}
