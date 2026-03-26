'use client';

import Link from 'next/link';
import { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const handleMouseMove = (e: MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-white/5 font-body">
      <div className="flex items-center justify-between px-8 py-5 w-full max-w-[1920px] mx-auto">
        <div className="flex items-center flex-1">
          {/* Brand Logo */}
          <Link href="/" className="text-3xl font-bold tracking-tighter text-gray-400 font-headline mr-8">
            LUMEN
          </Link>
          
          {/* Categories Dropdown Button */}
          <div className="relative group mx-auto">
            <button className="flex items-center gap-2 font-headline tracking-widest uppercase text-white/70 hover:text-primary transition-all py-2 group text-sm">
              CATEGORIES
              <span className="material-symbols-outlined text-sm group-hover:rotate-180 transition-transform duration-300">keyboard_arrow_down</span>
            </button>
            {/* Megamenu Categories Dropdown Content */}
            <div className="absolute top-full left-0 mt-4 w-[1000px] opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-500 z-[60]">
              <div className="glass-panel p-10 rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] border border-white/10">
                <div className="mb-8">
                  <span className="text-[10px] font-headline text-primary tracking-[0.4em] font-bold uppercase">SYSTEM ARCHITECTURE MODULES</span>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  
                  {/* Category 01: Processors */}
                  <Link href="/browse?category_id=processors" onMouseMove={handleMouseMove} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/40 transition-all cursor-pointer group/item hover-glow">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="material-symbols-outlined text-primary text-3xl">memory</span>
                    </div>
                    <h4 className="font-headline font-bold text-lg text-white tracking-tight uppercase">PROCESSORS</h4>
                    <p className="text-[10px] font-headline text-white/40 tracking-wider mt-1 uppercase">Z-SERIES CORE</p>
                  </Link>

                  {/* Category 02: Interfaces */}
                  <Link href="/browse?category_id=interfaces" onMouseMove={handleMouseMove} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/40 transition-all cursor-pointer group/item hover-glow">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="material-symbols-outlined text-primary text-3xl">settings_input_hdmi</span>
                    </div>
                    <h4 className="font-headline font-bold text-lg text-white tracking-tight uppercase">INTERFACES</h4>
                    <p className="text-[10px] font-headline text-white/40 tracking-wider mt-1 uppercase">NEURAL BRIDGE V2</p>
                  </Link>

                  {/* Category 03: Graphics */}
                  <Link href="/browse?category_id=graphics" onMouseMove={handleMouseMove} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/40 transition-all cursor-pointer group/item hover-glow">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="material-symbols-outlined text-primary text-3xl">monitor_heart</span>
                    </div>
                    <h4 className="font-headline font-bold text-lg text-white tracking-tight uppercase">GRAPHICS</h4>
                    <p className="text-[10px] font-headline text-white/40 tracking-wider mt-1 uppercase">LUMEN CORE X</p>
                  </Link>

                  {/* Category 04: Thermals */}
                  <Link href="/browse?category_id=thermals" onMouseMove={handleMouseMove} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/40 transition-all cursor-pointer group/item hover-glow">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="material-symbols-outlined text-primary text-3xl">thermostat</span>
                    </div>
                    <h4 className="font-headline font-bold text-lg text-white tracking-tight uppercase">THERMALS</h4>
                    <p className="text-[10px] font-headline text-white/40 tracking-wider mt-1 uppercase">CRYO-ACTIVE</p>
                  </Link>

                  {/* Category 05: Storage */}
                  <Link href="/browse?category_id=storage" onMouseMove={handleMouseMove} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/40 transition-all cursor-pointer group/item hover-glow">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="material-symbols-outlined text-primary text-3xl">database</span>
                    </div>
                    <h4 className="font-headline font-bold text-lg text-white tracking-tight uppercase">STORAGE</h4>
                    <p className="text-[10px] font-headline text-white/40 tracking-wider mt-1 uppercase">QUANTUM VAULT</p>
                  </Link>

                  {/* Category 06: Expansion */}
                  <Link href="/browse?category_id=expansion" onMouseMove={handleMouseMove} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/40 transition-all cursor-pointer group/item hover-glow">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="material-symbols-outlined text-primary text-3xl">grid_view</span>
                    </div>
                    <h4 className="font-headline font-bold text-lg text-white tracking-tight uppercase">EXPANSION</h4>
                    <p className="text-[10px] font-headline text-white/40 tracking-wider mt-1 uppercase">AUXILIARY PORTS</p>
                  </Link>

                  {/* Category 07: Power */}
                  <Link href="/browse?category_id=power" onMouseMove={handleMouseMove} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/40 transition-all cursor-pointer group/item hover-glow">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="material-symbols-outlined text-primary text-3xl">bolt</span>
                    </div>
                    <h4 className="font-headline font-bold text-lg text-white tracking-tight uppercase">POWER</h4>
                    <p className="text-[10px] font-headline text-white/40 tracking-wider mt-1 uppercase">KINETIC CELLS</p>
                  </Link>

                  {/* Category 08: Security */}
                  <Link href="/browse?category_id=security" onMouseMove={handleMouseMove} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/40 transition-all cursor-pointer group/item hover-glow">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="material-symbols-outlined text-primary text-3xl">shield</span>
                    </div>
                    <h4 className="font-headline font-bold text-lg text-white tracking-tight uppercase">SECURITY</h4>
                    <p className="text-[10px] font-headline text-white/40 tracking-wider mt-1 uppercase">ENCRYPTED BUS</p>
                  </Link>

                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Central Search Bar */}
        <div className="hidden md:flex flex-1 max-w-2xl ml-4 mr-24">
          <div className="w-full relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary/50">search</span>
            <input 
              className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-6 font-headline text-xs tracking-[0.2em] focus:outline-none focus:border-primary/30 focus:bg-white/10 transition-all text-white placeholder-white/20" 
              placeholder="SEARCH QUANTUM SYSTEMS..." 
              type="text"
            />
          </div>
        </div>
        
        {/* Trailing Icons */}
        <div className="flex items-center gap-8">
          <Link href="/cart" className="text-white/60 hover:text-primary transition-all duration-300 transform hover:scale-110">
            <span className="material-symbols-outlined text-2xl">shopping_cart</span>
          </Link>
          <button
            onClick={() => {
              if (user) {
                logout();
                router.push('/login');
              } else {
                router.push('/login');
              }
            }}
            className="text-white/60 hover:text-primary transition-all duration-300 transform hover:scale-110 bg-transparent border-none cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">{user ? 'logout' : 'person'}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
