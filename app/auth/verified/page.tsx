import Image from 'next/image'

export default function VerifiedPage() {
  return (
    <div className="verified-page">
      <div className="verified-bg" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="khatim" x="0" y="0" width="70" height="70" patternUnits="userSpaceOnUse">
              <polygon
                points="35,20.86 39.14,25 45,25 45,30.86 49.14,35 45,39.14 45,45 39.14,45 35,49.14 30.86,45 25,45 25,39.14 20.86,35 25,30.86 25,25 30.86,25"
                fill="currentColor"
                opacity="0.045"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#khatim)"/>
        </svg>
      </div>

      <div className="verified-card">
        <div className="verified-logo">
          <Image src="/logo-black.png" alt="" className="logo-icon" width={24} height={24} />
          <span className="verified-logo-name">The Hifz Project</span>
        </div>

        <div className="verified-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="verified-heading">Email verified</h1>
        <p className="verified-body">
          Your account is confirmed. You can close this tab — the original tab will sign you in automatically.
        </p>
      </div>

      <style>{`
        .verified-page { min-height:100dvh; display:flex; align-items:center; justify-content:center; padding:1rem; position:relative; background:var(--bg-base); }
        .verified-bg { position:fixed; inset:0; pointer-events:none; color:var(--teal); z-index:0; }
        .verified-card { position:relative; z-index:1; width:100%; max-width:400px; background:var(--bg-card); border:1px solid var(--border); border-radius:1.25rem; padding:2.5rem 2rem; box-shadow:0 8px 32px rgba(0,0,0,0.08); text-align:center; }
        .verified-logo { display:flex; align-items:center; gap:0.5rem; margin-bottom:2rem; justify-content:center; }
        .verified-logo-mark { font-size:1.5rem; color:var(--teal); }
        .verified-logo-name { font-family:var(--font-crimson),serif; font-size:1.25rem; font-weight:600; color:var(--text); }
        .verified-icon { width:60px; height:60px; border-radius:50%; background:color-mix(in srgb,var(--correct) 12%,transparent); color:var(--correct); display:flex; align-items:center; justify-content:center; margin:0 auto 1.5rem; }
        .verified-heading { font-family:var(--font-crimson),serif; font-size:1.75rem; font-weight:600; color:var(--text); margin:0 0 0.75rem; }
        .verified-body { color:var(--text-muted); font-size:0.9rem; line-height:1.6; margin:0; }
      `}</style>
    </div>
  )
}
