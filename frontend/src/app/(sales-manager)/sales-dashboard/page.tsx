export default function SalesManagerDashboard() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ backgroundColor: '#0a0a0a', color: '#e5e2e1', fontFamily: "'JetBrains Mono', monospace" }}
    >
      <h1
        className="text-6xl font-black tracking-tight uppercase mb-4"
        style={{ color: '#00FF41', textShadow: '0 0 8px #00FF41' }}
      >
        SALES DASHBOARD
      </h1>
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse" />
        <p className="text-xs tracking-widest uppercase" style={{ color: '#71717a' }}>
          COMING SOON — AVAILABLE AFTER PROGRESS DEMO
        </p>
      </div>
    </div>
  )
}
