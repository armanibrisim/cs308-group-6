'use client'

import { useState, useMemo } from 'react'

type Status = 'PENDING' | 'APPROVED' | 'REJECTED'

interface Comment {
  id: number
  product: string
  user: string
  rating: number
  text: string
  date: string
  status: Status
}

const MOCK_DATA: Comment[] = [
  { id: 1, product: 'Sonic-X Pro Headphones', user: 'Alex K.', rating: 5, text: 'Amazing sound quality. The active noise cancellation is top-tier. Worth every penny of the premium price tag.', date: 'OCT 12, 2023', status: 'PENDING' },
  { id: 2, product: 'Nvidia RTX 3080', user: 'Maya R.', rating: 4, text: 'Great performance but it runs a bit hot. Make sure you have excellent airflow in your case before installing.', date: 'OCT 14, 2023', status: 'PENDING' },
  { id: 3, product: 'Lumen Mechanical TKL', user: 'Jordan T.', rating: 2, text: "Keys feel cheap compared to my previous board. I expected better stabilization for the spacebar at this price.", date: 'OCT 15, 2023', status: 'APPROVED' },
  { id: 4, product: 'Sonic-X Pro Headphones', user: 'Sam W.', rating: 1, text: "Broke after one week of normal use. Pure garbage. Don't waste your money.", date: 'OCT 16, 2023', status: 'REJECTED' },
  { id: 5, product: 'Nvidia RTX 3080', user: 'Chris P.', rating: 5, text: 'Absolute beast of a GPU. Running Cyberpunk at max settings with RTX on is finally a reality at high framerates.', date: 'OCT 17, 2023', status: 'PENDING' },
]

const TABS = ['COMMENTS', 'PRODUCTS', 'STOCK', 'DELIVERIES'] as const
type Tab = typeof TABS[number]

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="material-symbols-outlined text-xs"
          style={{
            fontVariationSettings: "'FILL' 1",
            color: i < rating ? '#00FF41' : '#3f3f46',
          }}
        >
          star
        </span>
      ))}
    </div>
  )
}

function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1
        className="text-6xl font-black tracking-tight text-[#00FF41] mb-4 uppercase"
        style={{ textShadow: '0 0 8px #00FF41' }}
      >
        {title}
      </h1>
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse" />
        <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">
          COMING SOON — AVAILABLE AFTER PROGRESS DEMO
        </p>
      </div>
    </div>
  )
}

export default function ProductManagerDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('COMMENTS')
  const [comments, setComments] = useState<Comment[]>(MOCK_DATA)
  const [filter, setFilter] = useState<'ALL' | Status>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const handleStatusChange = (id: number, status: Status) => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, status } : c))
  }

  const filteredComments = useMemo(() => {
    return comments.filter(c => {
      const matchesFilter = filter === 'ALL' || c.status === filter
      const matchesSearch =
        c.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.user.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesFilter && matchesSearch
    })
  }, [comments, filter, searchQuery])

  const pendingCount = comments.filter(c => c.status === 'PENDING').length

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#0a0a0a', color: '#e5e2e1', fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* Sidebar */}
      <aside
        className="fixed left-0 top-0 h-full w-20 flex flex-col items-center py-8 border-r border-zinc-800 z-50"
        style={{ backgroundColor: '#0a0a0a' }}
      >
        <div className="mb-12 text-lg font-bold text-[#00FF41]" style={{ textShadow: '0 0 8px #00FF41' }}>
          LUMEN
        </div>
        <nav className="flex flex-col gap-10">
          <button className="flex flex-col items-center gap-1 text-zinc-600 hover:text-[#00FF41] transition-all">
            <span className="material-symbols-outlined text-2xl">payments</span>
            <span className="text-[8px] mt-1">SALES</span>
          </button>
          <button
            className="flex flex-col items-center gap-1 text-[#00FF41] p-2 rounded transition-all"
            style={{ boxShadow: '0 0 10px #00FF41' }}
          >
            <span
              className="material-symbols-outlined text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              inventory_2
            </span>
            <span className="text-[8px] mt-1">PRODUCT</span>
          </button>
        </nav>
        <div
          className="mt-auto opacity-30 text-[10px]"
          style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
        >
          ADMIN_V.2.0.4
        </div>
      </aside>

      {/* Topbar */}
      <header
        className="fixed top-0 right-0 left-20 flex justify-between items-center px-12 py-4 border-b border-zinc-800/50 z-40"
        style={{ backgroundColor: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center gap-8">
          <div className="text-xl font-black text-[#00FF41] tracking-tighter">LUMEN</div>
          <nav className="hidden md:flex gap-6 font-mono text-xs font-medium uppercase tracking-tighter">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 transition-all duration-300 ${
                  activeTab === tab
                    ? 'text-[#00FF41] border-b-2 border-[#00FF41]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-zinc-400 hover:text-[#00FF41] transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="flex items-center gap-3 pl-6 border-l border-zinc-800">
            <div className="text-right">
              <div className="text-[10px] text-zinc-500 font-mono">PRODUCT MGR</div>
              <div className="text-xs text-[#e5e2e1] font-bold tracking-tight">JORDAN_PM</div>
            </div>
            <span
              className="material-symbols-outlined text-3xl text-zinc-400"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              account_circle
            </span>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="fixed top-[68px] left-20 right-0 h-[2px] bg-zinc-900 z-50">
        <div
          className="h-full w-[65%] bg-gradient-to-r from-[#2ae500] to-[#d7ffc5]"
          style={{ boxShadow: '0 0 10px #00FF41' }}
        />
      </div>

      {/* Main */}
      <main className="ml-20 pt-24 pb-12 px-12 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'COMMENTS' ? (
            <>
              {/* Page Header */}
              <section className="mb-12">
                <h1 className="text-4xl font-black tracking-tight text-[#00FF41] mb-1">COMMENTS</h1>
                <p className="text-xs text-zinc-500 font-mono tracking-widest">
                  MODERATION QUEUE / PRODUCT_MANAGER_01
                </p>
              </section>

              {/* Search & Filters */}
              <section
                className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 p-6 rounded-lg border border-zinc-800/20"
                style={{ backgroundColor: '#1c1b1b' }}
              >
                <div className="relative w-full md:w-1/2">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-zinc-500 text-sm">
                    search
                  </span>
                  <input
                    className="w-full text-xs py-3 pl-12 pr-4 focus:outline-none focus:border-[#00FF41] transition-colors font-mono placeholder:text-zinc-600 border border-zinc-800"
                    style={{ backgroundColor: '#353534', color: '#e5e2e1' }}
                    placeholder="SEARCH BY PRODUCT OR CUSTOMER..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                  {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-6 py-2 font-bold text-[10px] uppercase tracking-wider rounded border transition-all ${
                        filter === f
                          ? 'bg-[#2ff801] text-black border-[#00FF41]'
                          : 'text-zinc-400 border-transparent hover:border-zinc-700'
                      }`}
                      style={filter !== f ? { backgroundColor: '#353534' } : {}}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </section>

              {/* Comment Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredComments.map(comment => (
                  <div
                    key={comment.id}
                    className={`p-6 border-l-[3px] relative transition-all hover:brightness-110 ${
                      comment.status === 'APPROVED'
                        ? 'border-[#00FF41]'
                        : comment.status === 'REJECTED'
                        ? 'border-red-500 opacity-50 grayscale hover:grayscale-0'
                        : 'border-yellow-500'
                    }`}
                    style={{ backgroundColor: '#201f1f' }}
                  >
                    {comment.status !== 'PENDING' && (
                      <div
                        className={`absolute top-4 right-4 text-[8px] px-2 py-0.5 font-bold border ${
                          comment.status === 'APPROVED'
                            ? 'text-[#00FF41] border-[#00FF41]/20'
                            : 'text-red-500 border-red-500/20'
                        }`}
                        style={{
                          backgroundColor:
                            comment.status === 'APPROVED'
                              ? 'rgba(0,255,65,0.05)'
                              : 'rgba(239,68,68,0.05)',
                        }}
                      >
                        {comment.status}
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-[10px] text-[#00FF41] font-bold uppercase tracking-widest mb-1">
                          {comment.product}
                        </div>
                        <div className="text-[10px] text-zinc-500 uppercase">{comment.user}</div>
                      </div>
                      <div className={comment.status !== 'PENDING' ? 'mr-16' : ''}>
                        <StarRating rating={comment.rating} />
                      </div>
                    </div>

                    <p
                      className="text-sm text-white leading-relaxed mb-6"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {comment.text}
                    </p>

                    <div className="flex justify-between items-end">
                      <div className="text-[9px] text-zinc-500 font-mono">{comment.date}</div>
                      {comment.status === 'PENDING' && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleStatusChange(comment.id, 'REJECTED')}
                            className="text-[9px] font-bold text-red-500 px-3 py-1.5 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all"
                          >
                            REJECT
                          </button>
                          <button
                            onClick={() => handleStatusChange(comment.id, 'APPROVED')}
                            className="text-[9px] font-bold text-[#00FF41] px-3 py-1.5 border border-[#00FF41]/30 hover:bg-[#00FF41] hover:text-black transition-all"
                          >
                            APPROVE
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Fetch New Placeholder */}
                <div
                  className="border border-dashed border-zinc-800 p-6 flex flex-col items-center justify-center text-center opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
                  style={{ backgroundColor: '#0e0e0e' }}
                >
                  <span className="material-symbols-outlined text-4xl mb-4 text-[#00FF41]">refresh</span>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#00FF41]">
                    Fetch New Queue
                  </div>
                  <div className="text-[8px] text-zinc-600 mt-2">LAST UPDATED: 2 MIN AGO</div>
                </div>
              </div>
            </>
          ) : (
            <PlaceholderView title={activeTab} />
          )}
        </div>
      </main>

      {/* Status Toast */}
      <div className="fixed bottom-8 right-8 z-50">
        <div
          className="p-4 border border-[#00FF41]/20 rounded shadow-2xl flex items-center gap-4"
          style={{ background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(20px)' }}
        >
          <div className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse" />
          <div className="text-[10px] font-mono">
            <span className="text-zinc-500">SYSTEM_STATUS:</span>
            <span className="text-[#00FF41] font-bold ml-1">MONITORING_ACTIVE</span>
          </div>
          <div className="pl-4 border-l border-zinc-800 text-[10px] font-mono text-zinc-500 uppercase">
            {pendingCount} Pending Actions
          </div>
        </div>
      </div>
    </div>
  )
}
