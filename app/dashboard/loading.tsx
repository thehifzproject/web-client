import Image from 'next/image'

export default function DashboardLoading() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)' }}>
      {/* Nav skeleton */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Image src="/logo-black.png" alt="" className="logo-icon" width={20} height={20} />
          <span style={{ fontFamily: 'var(--font-crimson),serif', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)' }}>The Hifz Project</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="skel" style={{ width: 48, height: 22, borderRadius: 4 }} />
          <div className="skel" style={{ width: 22, height: 22, borderRadius: '50%' }} />
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem 4rem', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="skel" style={{ height: 40, width: 260, borderRadius: 8 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="skel" style={{ height: 68, borderRadius: 16 }} />
            <div className="skel" style={{ height: 68, borderRadius: 16 }} />
          </div>
          <div className="skel" style={{ height: 180, borderRadius: 16 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '0.5rem' }}>
            {[...Array(6)].map((_, i) => <div key={i} className="skel" style={{ height: 70, borderRadius: 12 }} />)}
          </div>
          <div className="skel" style={{ height: 90, borderRadius: 16 }} />
        </div>
        {/* Right column */}
        <div className="skel" style={{ height: 360, borderRadius: 16 }} />
      </div>

      <style>{`
        .skel { background: var(--border); animation: skel-pulse 1.4s ease-in-out infinite; }
        @keyframes skel-pulse { 0%,100% { opacity:1 } 50% { opacity:0.45 } }
        @media (max-width:900px) { [style*="grid-template-columns: 1fr 300px"] { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
