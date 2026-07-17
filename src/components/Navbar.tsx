import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag, LayoutDashboard, Shield, LogOut, Store, Menu, X,
  Wallet, Plus, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { classNames, toStr } from '../lib/format';

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const nav = useNavigate();
  const isAdmin = profile?.role === 'admin';
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    setMobileOpen(false);
    await signOut();
    nav('/');
  };

  const initial = (profile?.store_name || profile?.full_name || profile?.email || 'V').charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
            <ShoppingBag className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            Uni<span className="text-emerald-400">mart</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          <NavLink to="/" icon={<Store className="h-4 w-4" />} label="Market" />
          {profile && !isAdmin && <NavLink to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />}
          {isAdmin && <NavLink to="/admin" icon={<Shield className="h-4 w-4" />} label="Admin" />}

          {profile ? (
            <div className="relative ml-1" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full ring-1 ring-slate-700 hover:ring-emerald-400 transition"
              >
                <span className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                  {initial}
                </span>
                <ChevronDown className={classNames('h-3.5 w-3.5 text-slate-400 transition', menuOpen && 'rotate-180')} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl ring-1 ring-slate-200 py-1.5 animate-[slideIn_0.15s_ease-out]">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-800 truncate">{toStr(profile.store_name) || toStr(profile.full_name) || 'Vendor'}</p>
                    <p className="text-xs text-slate-400 truncate">{toStr(profile.email)}</p>
                  </div>
                  <MenuItem to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" onClick={() => setMenuOpen(false)} />
                  <MenuItem to="/dashboard" icon={<Wallet className="h-4 w-4" />} label="My Wallet" onClick={() => setMenuOpen(false)} />
                  <MenuItem to="/dashboard" icon={<Plus className="h-4 w-4" />} label="Post Item" onClick={() => setMenuOpen(false)} />
                  <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 transition shadow-md shadow-emerald-500/20">
              Sign In / Register
            </Link>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden flex items-center justify-center h-9 w-9 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown — rendered below header, does not overlap content */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-1">
          <MobileLink to="/" icon={<Store className="h-4 w-4" />} label="Marketplace" onClick={() => setMobileOpen(false)} />
          {profile && !isAdmin && (
            <>
              <MobileLink to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" onClick={() => setMobileOpen(false)} />
              <MobileLink to="/dashboard" icon={<Wallet className="h-4 w-4" />} label="My Wallet" onClick={() => setMobileOpen(false)} />
              <MobileLink to="/dashboard" icon={<Plus className="h-4 w-4" />} label="Post Item" onClick={() => setMobileOpen(false)} />
            </>
          )}
          {isAdmin && <MobileLink to="/admin" icon={<Shield className="h-4 w-4" />} label="Admin Portal" onClick={() => setMobileOpen(false)} />}
          {profile ? (
            <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-rose-400 hover:bg-slate-800 transition text-sm font-medium">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          ) : (
            <Link to="/login" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 transition">
              Sign In / Register as Vendor
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition text-sm font-medium">
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function MenuItem({ to, icon, label, onClick }: { to: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">
      {icon} {label}
    </Link>
  );
}

function MobileLink({ to, icon, label, onClick }: { to: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition text-sm font-medium">
      {icon} {label}
    </Link>
  );
}
