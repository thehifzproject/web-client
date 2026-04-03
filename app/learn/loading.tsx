export default function LearnLoading() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
        <div className="skel" style={{ width: 18, height: 18, borderRadius: 4 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          <div className="skel" style={{ width: 100, height: 20, borderRadius: 4 }} />
          <div className="skel" style={{ width: 60, height: 22, borderRadius: 16 }} />
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div className="skel" style={{ width: '100%', maxWidth: 580, height: 480, borderRadius: 20 }} />
      </div>
      <style>{`
        .skel { background: var(--border); animation: skel-pulse 1.4s ease-in-out infinite; }
        @keyframes skel-pulse { 0%,100% { opacity:1 } 50% { opacity:0.45 } }
      `}</style>
    </div>
  )
}
