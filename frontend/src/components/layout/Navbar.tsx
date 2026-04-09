'use client';

import Link from 'next/link';
import { MouseEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useCategories } from '../../context/CategoryContext';

// Slug → Material Symbol icon mapping (fallback: inventory_2)
const ICON_MAP: Record<string, string> = {
  smartphones:        'smartphone',
  phones:             'smartphone',
  mobile:             'smartphone',
  laptop:             'laptop',
  laptops:            'laptop',
  computer:           'computer',
  computers:          'computer',
  desktop:            'desktop_windows',
  tablet:             'tablet',
  tablets:            'tablet',
  headphone:          'headphones',
  headphones:         'headphones',
  audio:              'headphones',
  camera:             'camera_alt',
  cameras:            'camera_alt',
  tv:                 'tv',
  monitor:            'monitor',
  monitors:           'monitor',
  gaming:             'sports_esports',
  console:            'sports_esports',
  consoles:           'sports_esports',
  keyboard:           'keyboard',
  mouse:              'mouse',
  storage:            'database',
  ssd:                'database',
  hdd:                'database',
  memory:             'memory',
  ram:                'memory',
  processor:          'memory',
  processors:         'memory',
  cpu:                'memory',
  gpu:                'monitor_heart',
  graphics:           'monitor_heart',
  accessory:          'cable',
  accessories:        'cable',
  'mobile-accessories': 'cable',
  cable:              'cable',
  charger:            'bolt',
  power:              'bolt',
  battery:            'battery_charging_full',
  speaker:            'speaker',
  speakers:           'speaker',
  wearable:           'watch',
  wearables:          'watch',
  watch:              'watch',
  smartwatch:         'watch',
  printer:            'print',
  printers:           'print',
  network:            'router',
  router:             'router',
  security:           'shield',
  smart:              'home',
  smarthome:          'home',
};

function getCategoryIcon(id: string): string {
  const lower = id.toLowerCase();
  // exact match
  if (ICON_MAP[lower]) return ICON_MAP[lower];
  // partial match
  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return icon;
  }
  return 'inventory_2';
}

const NAV_LINKS = [
  { label: 'HOME', href: '/' },
  { label: 'PRODUCTS', href: '/browse' },
];

interface NavCategory {
  id: string;
  name: string;
  count: number;
  icon: string;
}

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { categories: rawCategories } = useCategories();
  const categories: NavCategory[] = rawCategories.map(c => ({ ...c, icon: getCategoryIcon(c.id) }));

  const openDropdown = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setDropdownOpen(true);
  };

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setDropdownOpen(false), 400);
  };

  const handleMouseMove = (e: MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  // Number of columns: 4 if many categories, 3 if few
  const cols = categories.length <= 6 ? 3 : 4;

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-white/5 font-body">
      <div className="flex items-center justify-between px-8 py-5 w-full max-w-[1920px] mx-auto">

        {/* ── Left: Logo + Nav links + Categories ── */}
        <div className="flex items-center gap-10 flex-1">

          {/* Brand Logo */}
          <Link href="/" className="text-3xl font-bold tracking-tighter text-gray-400 font-headline shrink-0">
            LUMEN
          </Link>

          {/* Static nav links */}
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-headline tracking-widest uppercase text-white/60 hover:text-primary transition-colors duration-200 text-sm shrink-0"
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
            <button className="flex items-center gap-1.5 font-headline tracking-widest uppercase text-white/60 hover:text-primary transition-colors duration-200 text-sm py-2">
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
                <div className="mb-8 flex items-center justify-between">
                  <span className="text-[10px] font-headline text-primary tracking-[0.4em] font-bold uppercase">
                    BROWSE BY CATEGORY
                  </span>
                  <Link
                    href="/browse"
                    onClick={() => setDropdownOpen(false)}
                    className="text-[10px] font-headline text-white/30 tracking-[0.3em] uppercase hover:text-primary transition-colors"
                  >
                    VIEW ALL →
                  </Link>
                </div>

                {categories.length === 0 ? (
                  // Loading skeleton
                  <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                    {Array.from({ length: cols * 2 }).map((_, i) => (
                      <div key={i} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse flex items-center gap-4">
                        <div className="w-6 h-6 rounded bg-white/10 shrink-0" />
                        <div className="h-4 bg-white/10 rounded w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/browse?category_id=${encodeURIComponent(cat.id)}`}
                        onMouseMove={handleMouseMove}
                        className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/40 transition-all cursor-pointer hover-glow flex items-center gap-4"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className="material-symbols-outlined text-primary text-2xl shrink-0">{cat.icon}</span>
                        <h4 className="font-headline font-bold text-sm text-white tracking-tight uppercase leading-tight">
                          {cat.name}
                        </h4>
                      </Link>
                    ))}
                  </div>
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
          <Link href="/cart" className="text-white/60 hover:text-primary transition-all duration-300 hover:scale-110 inline-flex">
            <span className="material-symbols-outlined text-2xl">shopping_cart</span>
          </Link>
          <Link
            href={user ? '/profile' : '/login'}
            className="text-white/60 hover:text-primary transition-all duration-300 hover:scale-110 inline-flex"
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
              className="text-white/60 hover:text-primary transition-all duration-300 hover:scale-110 bg-transparent border-none cursor-pointer inline-flex"
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
