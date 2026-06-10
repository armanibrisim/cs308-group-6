'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useCategories } from '../../context/CategoryContext';
import { getCategoryIcon } from '../../constants/categoryIcons';


const NAV_LINKS = [
  { label: 'HOME', href: '/' },
  { label: 'PRODUCTS', href: '/browse' },
];

interface NavCategory {
  id: string;
  name: string;
  count: number;
  icon: string;
  parent_category_id?: string | null;
}

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [lightMode, setLightMode] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      setLightMode(true);
    }
  }, []);

  const toggleTheme = () => {
    const next = !lightMode;
    setLightMode(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
    }
  };

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { categories: rawCategories } = useCategories();
  const categories: NavCategory[] = rawCategories.map(c => ({
    ...c,
    icon: getCategoryIcon(c.id, (c as any).icon),
    parent_category_id: c.parent_category_id ?? null,
  }));

  // Separate main categories (no parent) from subcategories
  const mainCats = categories.filter(c => !c.parent_category_id);
  const subCatMap: Record<string, NavCategory[]> = {};
  for (const c of categories) {
    if (c.parent_category_id) {
      if (!subCatMap[c.parent_category_id]) subCatMap[c.parent_category_id] = [];
      subCatMap[c.parent_category_id].push(c);
    }
  }

  const openDropdown = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setDropdownOpen(true);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => {
      setDropdownOpen(false);
      setActiveCat(null);
    }, 400);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  }, []);

  const handleMainCatClick = useCallback((cat: NavCategory) => {
    const hasSubs = !!subCatMap[cat.id]?.length;
    if (hasSubs) {
      setActiveCat(prev => prev === cat.id ? null : cat.id);
    } else {
      setDropdownOpen(false);
      setActiveCat(null);
      router.push(`/browse?category_id=${encodeURIComponent(cat.id)}`);
    }
  }, [subCatMap, router]);

  // Number of columns: 4 if many main cats, 3 if few
  const cols = mainCats.length <= 6 ? 3 : 4;

  const activeSubs = activeCat ? (subCatMap[activeCat] ?? []) : [];
  const activeCatObj = activeCat ? mainCats.find(c => c.id === activeCat) : null;
  const subCols = activeSubs.length <= 4 ? activeSubs.length || 1 : activeSubs.length <= 6 ? 3 : 4;

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/95 border-b border-white/5 font-body">
      <div className="flex items-center justify-between px-8 py-5 w-full max-w-[1920px] mx-auto">

        {/* ── Left: Logo + Nav links + Categories ── */}
        <div className="flex items-center gap-10 flex-1">

          {/* Brand Logo */}
          <div className="flex flex-col items-start shrink-0">
            <Link href="/" className="lumen-logo shrink-0">
              <Image src="/logo.png" alt="LUMEN" width={52} height={56} priority style={{ objectFit: 'contain' }} />
            </Link>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1 mt-0.5 opacity-35 hover:opacity-80 transition-opacity"
              style={{ fontSize: '7px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '9px' }}>
                {lightMode ? 'dark_mode' : 'light_mode'}
              </span>
              {lightMode ? 'DARK' : 'LIGHT'}
            </button>
          </div>

          {/* Static nav links */}
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-headline tracking-widest uppercase text-white/85 hover:text-primary transition-colors duration-200 text-sm shrink-0"
            >
              {link.label}
            </Link>
          ))}

          {/* Categories dropdown */}
          <div
            className="relative shrink-0"
            onMouseEnter={openDropdown}
            onMouseLeave={scheduleClose}
          >
            <button className="flex items-center gap-1.5 font-headline tracking-widest uppercase text-white/85 hover:text-primary transition-colors duration-200 text-sm py-2">
              CATEGORIES
              <span
                className="material-symbols-outlined text-sm transition-transform duration-300"
                style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                keyboard_arrow_down
              </span>
            </button>

            {/* Megamenu panel */}
            <div
              className="absolute top-full left-0 z-[60]"
              style={{
                width: cols === 4 ? '960px' : '720px',
                opacity: dropdownOpen ? 1 : 0,
                transform: dropdownOpen ? 'translateY(0)' : 'translateY(8px)',
                pointerEvents: dropdownOpen ? 'auto' : 'none',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
              }}
            >
              {/* Invisible bridge */}
              <div className="h-2 w-full" />

              <div className="glass-panel p-10 rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] border border-white/10">

                {/* ── Header row ── */}
                <div className="mb-8 flex items-center justify-between">
                  <span className="text-[10px] font-headline text-primary tracking-[0.4em] font-bold uppercase">
                    BROWSE BY CATEGORY
                  </span>
                  <Link
                    href="/browse"
                    onClick={() => { setDropdownOpen(false); setActiveCat(null); }}
                    className="text-[10px] font-headline text-white/30 tracking-[0.3em] uppercase hover:text-primary transition-colors"
                  >
                    VIEW ALL →
                  </Link>
                </div>

                {mainCats.length === 0 ? (
                  // Loading skeleton
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                    {Array.from({ length: cols * 2 }).map((_, i) => (
                      <div key={i} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse flex items-center gap-4">
                        <div className="w-6 h-6 rounded bg-white/10 shrink-0" />
                        <div className="h-4 bg-white/10 rounded w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* ── Main categories grid ── */}
                    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                      {mainCats.map((cat) => {
                        const hasSubs = !!subCatMap[cat.id]?.length;
                        const isActive = activeCat === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onMouseMove={handleMouseMove}
                            onClick={() => handleMainCatClick(cat)}
                            className="p-4 rounded-2xl border transition-all cursor-pointer hover-glow flex items-center gap-3 text-left w-full"
                            style={{
                              background: isActive
                                ? 'rgba(var(--c-neon-rgb, 0,255,136), 0.08)'
                                : 'rgba(255,255,255,0.03)',
                              borderColor: isActive
                                ? 'rgba(var(--c-neon-rgb, 0,255,136), 0.45)'
                                : 'rgba(255,255,255,0.05)',
                            }}
                          >
                            <span
                              className="material-symbols-outlined text-2xl shrink-0 transition-colors"
                              style={{ color: isActive ? 'var(--c-primary, #00ff88)' : 'rgba(var(--c-neon-rgb,0,255,136),0.7)' }}
                            >
                              {cat.icon}
                            </span>
                            <h4 className="font-headline font-bold text-sm tracking-tight uppercase leading-tight flex-1 transition-colors"
                              style={{ color: isActive ? 'var(--c-primary, #00ff88)' : 'white' }}
                            >
                              {cat.name}
                            </h4>
                            {hasSubs && (
                              <span
                                className="material-symbols-outlined text-base shrink-0 transition-all duration-300"
                                style={{
                                  color: 'rgba(var(--c-neon-rgb,0,255,136),0.5)',
                                  transform: isActive ? 'rotate(90deg)' : 'rotate(0deg)',
                                }}
                              >
                                chevron_right
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* ── Subcategory panel (animated slide-down) ── */}
                    <div
                      style={{
                        overflow: 'hidden',
                        maxHeight: activeCat ? '400px' : '0px',
                        opacity: activeCat ? 1 : 0,
                        transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
                        marginTop: activeCat ? '1.25rem' : '0',
                      }}
                    >
                      {/* Divider + breadcrumb */}
                      <div className="flex items-center gap-3 mb-4">
                        <div style={{ height: '1px', background: 'rgba(var(--c-neon-rgb,0,255,136),0.15)', flex: 1 }} />
                        <span className="flex items-center gap-1.5 text-[10px] font-headline tracking-[0.3em] uppercase"
                          style={{ color: 'rgba(var(--c-neon-rgb,0,255,136),0.5)' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
                            {activeCatObj?.icon ?? 'category'}
                          </span>
                          {activeCatObj?.name}
                          <span style={{ opacity: 0.4 }}>/</span>
                          <span style={{ opacity: 0.6 }}>SUBCATEGORIES</span>
                        </span>
                        <div style={{ height: '1px', background: 'rgba(var(--c-neon-rgb,0,255,136),0.15)', flex: 1 }} />
                      </div>

                      {/* Subcategory cards */}
                      <div
                        className="grid gap-2"
                        style={{ gridTemplateColumns: `repeat(${Math.min(subCols, 4)}, 1fr)` }}
                      >
                        {activeSubs.map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/browse?category_id=${encodeURIComponent(sub.id)}`}
                            onClick={() => { setDropdownOpen(false); setActiveCat(null); }}
                            className="flex items-center gap-2.5 px-4 py-3 rounded-xl transition-all group"
                            style={{
                              background: 'rgba(var(--c-neon-rgb,0,255,136),0.04)',
                              border: '1px solid rgba(var(--c-neon-rgb,0,255,136),0.1)',
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.background = 'rgba(var(--c-neon-rgb,0,255,136),0.1)';
                              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(var(--c-neon-rgb,0,255,136),0.3)';
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.background = 'rgba(var(--c-neon-rgb,0,255,136),0.04)';
                              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(var(--c-neon-rgb,0,255,136),0.1)';
                            }}
                          >
                            <span
                              className="material-symbols-outlined text-base shrink-0"
                              style={{ color: 'rgba(var(--c-neon-rgb,0,255,136),0.6)' }}
                            >
                              {sub.icon}
                            </span>
                            <span className="font-headline text-xs font-semibold tracking-wide uppercase leading-tight"
                              style={{ color: 'rgba(255,255,255,0.75)' }}
                            >
                              {sub.name}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Centre: Search bar ── */}
        <form
          className="hidden md:flex flex-1 max-w-xl mx-8"
          onSubmit={(e) => {
            e.preventDefault()
            const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value.trim()
            if (q) router.push(`/browse?search=${encodeURIComponent(q)}`)
            else router.push('/browse')
          }}
        >
          <div className="w-full relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary/50">search</span>
            <input
              name="q"
              className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-6 font-headline text-xs tracking-[0.2em] focus:outline-none focus:border-primary/30 focus:bg-white/10 transition-all text-white placeholder-white/20"
              placeholder="SEARCH QUANTUM SYSTEMS..."
              type="text"
            />
          </div>
        </form>

        {/* ── Right: Icons ── */}
        <div className="flex items-center gap-8">
          <Link href="/cart" className="text-white/80 hover:text-primary transition-all duration-300 hover:scale-110 inline-flex">
            <span className="material-symbols-outlined text-2xl">shopping_cart</span>
          </Link>
          <Link
            href={user ? '/profile' : '/login'}
            className="text-white/80 hover:text-primary transition-all duration-300 hover:scale-110 inline-flex"
            aria-label={user ? 'Open your profile' : 'Sign in'}
          >
            <span className="material-symbols-outlined text-2xl">person</span>
          </Link>
          {user ? (
            <button
              type="button"
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="text-white/80 hover:text-primary transition-all duration-300 hover:scale-110 bg-transparent border-none cursor-pointer inline-flex"
              aria-label="Sign out"
            >
              <span className="material-symbols-outlined text-2xl">logout</span>
            </button>
          ) : null}
        </div>

      </div>
    </nav>
  );
}
