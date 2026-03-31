'use client'

export default function InvoicesPage() {
  const invoices = [
    { id: '#LX-90821', customer: 'AETHER CORP', initials: 'AC', date: 'OCT 12, 2023', amount: '$12,450.00', status: 'PAID' },
    { id: '#LX-90822', customer: 'NEON DYNAMICS', initials: 'ND', date: 'OCT 14, 2023', amount: '$3,200.00', status: 'PENDING' },
    { id: '#LX-90823', customer: 'OBSIDIAN SOLUTIONS', initials: 'OS', date: 'OCT 15, 2023', amount: '$1,150.00', status: 'REFUNDED' },
    { id: '#LX-90824', customer: 'VOID LABS', initials: 'VL', date: 'OCT 15, 2023', amount: '$55,000.00', status: 'PAID' },
    { id: '#LX-90825', customer: 'SKYNET KINETICS', initials: 'SK', date: 'OCT 16, 2023', amount: '$8,900.00', status: 'PENDING' },
  ]

  const statusStyle: Record<string, string> = {
    PAID: 'bg-[#00FF41]/5 text-[#00FF41] border border-[#00FF41]/20',
    PENDING: 'bg-yellow-400/5 text-yellow-400 border border-yellow-400/20',
    REFUNDED: 'bg-red-500/5 text-red-500 border border-red-500/20',
  }

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-[#e5e2e1]"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* TopAppBar */}
      <nav className="fixed top-0 w-full z-50 border-b border-[#353534]/20 bg-[#0a0a0a] flex justify-between items-center h-16 px-8">
        <div className="flex items-center gap-8">
          <span className="text-2xl font-black tracking-tighter text-[#00FF41]">LUMEN</span>
          <div className="hidden md:flex gap-6 items-center">
            <a className="font-mono uppercase tracking-widest text-sm text-[#c4c7c7] hover:text-[#00FF41] transition-colors" href="#">DASHBOARD</a>
            <a className="font-mono uppercase tracking-widest text-sm text-[#00FF41] font-bold border-b-2 border-[#00FF41] pb-1" href="#">REPORTS</a>
            <a className="font-mono uppercase tracking-widest text-sm text-[#c4c7c7] hover:text-[#00FF41] transition-colors" href="#">ANALYTICS</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-[#c4c7c7] hover:text-[#00FF41] transition-all">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="text-[#c4c7c7] hover:text-[#00FF41] transition-all">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </nav>

      {/* Sidebar */}
      <aside className="fixed left-0 top-16 h-full w-20 z-40 border-r border-[#353534]/20 bg-[#1c1b1b] shadow-[4px_0px_20px_rgba(0,0,0,0.6)] flex flex-col items-center py-6 gap-8">
        {[
          { icon: 'home', label: 'HOME', active: false },
          { icon: 'inventory_2', label: 'PRODUCT', active: true },
          { icon: 'settings', label: 'SETTINGS', active: false },
          { icon: 'info', label: 'ABOUT', active: false },
        ].map(({ icon, label, active }) => (
          <div key={label} className="flex flex-col items-center gap-1 cursor-pointer">
            <div className={`p-2 rounded-lg transition-all duration-300 ${active ? 'text-[#00FF41] bg-[#00FF41]/10 shadow-[0_0_10px_rgba(0,255,65,0.3)] scale-110' : 'text-[#c4c7c7] hover:bg-[#353534] hover:text-[#00FF41]'}`}>
              <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <span className={`font-mono text-[10px] tracking-tighter ${active ? 'text-[#00FF41]' : 'text-[#c4c7c7]'}`}>{label}</span>
          </div>
        ))}
      </aside>

      {/* Main Content */}
      <main className="pl-20 pt-16 min-h-screen bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto p-8 lg:p-12">

          {/* Header */}
          <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-[#e5e2e1] mb-2 uppercase">INVOICES</h1>
              <p className="font-mono text-xs tracking-widest text-[#c4c7c7] uppercase">SYSTEM ARCHIVE / SALES_MANAGER_04</p>
            </div>
            <div className="w-full md:w-64">
              <div className="flex justify-between mb-2">
                <span className="font-mono text-[10px] tracking-widest text-[#00FF41] uppercase">QUOTA_REACHED</span>
                <span className="font-mono text-[10px] text-[#c4c7c7]">84%</span>
              </div>
              <div className="h-0.5 w-full bg-[#353534] overflow-hidden">
                <div className="h-full w-[84%] bg-gradient-to-r from-[#2ae500] to-[#d7ffc5] shadow-[0_0_8px_rgba(0,255,65,0.5)]" />
              </div>
            </div>
          </header>

          {/* Filters */}
          <section className="bg-[#1c1b1b] p-6 mb-8 rounded-lg shadow-2xl flex flex-wrap items-center gap-6 border-l-2 border-[#00FF41]">
            <div className="flex-1 min-w-[300px] relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#c4c7c7] group-focus-within:text-[#00FF41] transition-colors">search</span>
              <input
                className="w-full bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#00FF41] rounded py-3 pl-12 pr-4 font-mono text-sm tracking-widest text-[#e5e2e1] placeholder:text-[#444748] transition-all outline-none"
                placeholder="SEARCH INVOICE ID OR CUSTOMER..."
                type="text"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="font-mono text-[10px] text-[#c4c7c7] tracking-widest uppercase">FROM:</label>
                <input className="bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#00FF41] rounded px-3 py-2 font-mono text-xs text-[#e5e2e1] uppercase outline-none" type="date" />
              </div>
              <div className="flex items-center gap-2">
                <label className="font-mono text-[10px] text-[#c4c7c7] tracking-widest uppercase">TO:</label>
                <input className="bg-[#1a1a1a] border-none focus:ring-1 focus:ring-[#00FF41] rounded px-3 py-2 font-mono text-xs text-[#e5e2e1] uppercase outline-none" type="date" />
              </div>
              <button className="bg-[#353534] hover:bg-[#444748] transition-colors p-2.5 rounded">
                <span className="material-symbols-outlined text-[#e5e2e1]">filter_list</span>
              </button>
            </div>
          </section>

          {/* Table */}
          <div className="overflow-hidden rounded-lg bg-[#1c1b1b] shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0a0a0a] border-b border-[#353534]/30">
                    {['INVOICE ID', 'CUSTOMER', 'DATE', 'AMOUNT', 'STATUS', 'ACTION'].map((h, i) => (
                      <th key={h} className={`px-6 py-5 font-mono text-[11px] font-bold tracking-[0.2em] text-[#00FF41] uppercase ${i === 4 ? 'text-center' : i === 5 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#353534]/10">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="bg-[#111111] hover:bg-[#161616] transition-colors">
                      <td className="px-6 py-5 font-mono text-xs tracking-widest text-[#e5e2e1]">{inv.id}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[#353534] flex items-center justify-center text-[10px] font-mono font-bold text-[#00FF41] border border-[#00FF41]/20">{inv.initials}</div>
                          <span className="font-mono text-xs tracking-widest uppercase">{inv.customer}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 font-mono text-xs text-[#c4c7c7]">{inv.date}</td>
                      <td className="px-6 py-5 font-mono text-xs font-bold text-[#e5e2e1]">{inv.amount}</td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-block px-3 py-1 rounded text-[10px] font-mono font-bold tracking-tighter uppercase ${statusStyle[inv.status]}`}>{inv.status}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button className="px-4 py-1.5 border border-[#00FF41] text-[#00FF41] text-[10px] font-mono hover:bg-[#00FF41] hover:text-[#0a0a0a] transition-all rounded uppercase tracking-widest font-bold">VIEW PDF</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <footer className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="font-mono text-[10px] text-[#c4c7c7] tracking-widest uppercase">SHOWING 1-10 OF 482 RECORDS</p>
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 flex items-center justify-center text-[#c4c7c7] hover:text-[#00FF41] transition-colors">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <div className="flex gap-1">
                {[1, 2, 3].map((n) => (
                  <button key={n} className={`w-10 h-10 flex items-center justify-center font-mono text-xs rounded transition-colors ${n === 1 ? 'bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/20' : 'text-[#c4c7c7] hover:bg-[#1c1b1b]'}`}>{n}</button>
                ))}
                <span className="w-10 h-10 flex items-center justify-center text-[#353534]">...</span>
                <button className="w-10 h-10 flex items-center justify-center text-[#c4c7c7] hover:bg-[#1c1b1b] font-mono text-xs rounded transition-colors">48</button>
              </div>
              <button className="w-10 h-10 flex items-center justify-center text-[#c4c7c7] hover:text-[#00FF41] transition-colors">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
            <button className="hidden lg:flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-[#00FF41] uppercase group">
              <span>EXPORT ALL DATA</span>
              <span className="material-symbols-outlined text-sm group-hover:translate-y-1 transition-transform">download</span>
            </button>
          </footer>

        </div>
      </main>

      {/* Realtime Traffic Widget */}
      <div className="fixed bottom-8 right-8 w-64 p-6 bg-[#353534]/60 backdrop-blur-xl rounded-lg border border-white/5 shadow-2xl z-50 pointer-events-none">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-[#00FF41]">insights</span>
          <span className="font-mono text-[10px] font-bold tracking-widest text-[#e5e2e1] uppercase">REALTIME_TRAFFIC</span>
        </div>
        <div className="flex items-end gap-1 h-12">
          {[40, 70, 90, 60, 40, 30, 80].map((h, i) => (
            <div key={i} className={`flex-1 rounded-t-sm ${i === 2 || i === 6 ? 'bg-[#00FF41]' : i === 1 || i === 4 ? 'bg-[#d7ffc5]' : 'bg-[#353534]'}`} style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>

      {/* Material Symbols font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
        .material-symbols-outlined { font-family: 'Material Symbols Outlined'; font-variation-settings: 'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; display: inline-block; line-height: 1; }
      `}</style>
    </div>
  )
}
