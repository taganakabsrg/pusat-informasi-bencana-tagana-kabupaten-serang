import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Users, Map as MapIcon, LogIn, LogOut } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, signInAnonymously } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user] = useAuthState(auth);
  const location = useLocation();

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  const handleGuestLogin = () => {
    signInAnonymously(auth);
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const navItems = [
    { path: '/', label: 'Peta Dashboard', icon: MapIcon },
    { path: '/reports', label: 'Data Laporan', icon: FileText },
    { path: '/input-report', label: 'Input Laporan', icon: Home, protected: true },
  ];

  return (
    <div className="h-screen bg-slate-900 flex flex-col font-sans overflow-hidden text-slate-100">
      <header className="h-[60px] bg-slate-800 border-b border-slate-700 flex items-center justify-between px-5 shrink-0 z-50">
        <div className="flex items-center gap-6 h-full">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="https://iili.io/BUsec4s.png" 
              alt="Logo Tagana" 
              className="h-10 w-auto object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col leading-tight hidden sm:flex">
              <span className="text-[14px] font-extrabold tracking-tight text-slate-100 uppercase">
                Pusat Informasi Bencana
              </span>
              <span className="text-[14px] font-extrabold tracking-tight text-blue-500 uppercase">
                Tagana Kab. Serang
              </span>
            </div>
          </Link>
          
          <nav className="hidden md:flex h-full ml-4 gap-6">
            {navItems.map((item) => {
              if (item.protected && !user) return null;
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 text-[13px] font-medium h-full border-b-2 transition-colors ${
                    isActive
                      ? 'text-blue-500 border-blue-500'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[11px] font-bold uppercase tracking-wide">
            Siaga Aktif
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-slate-400 hidden lg:block">
                {user.isAnonymous ? 'Mode Tamu' : user.displayName}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 px-3 py-1.5 rounded text-[11px] font-bold uppercase transition-all"
              >
                <LogOut size={14} />
                Keluar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleGuestLogin}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1.5 rounded text-[11px] font-bold uppercase transition-all"
              >
                <Users size={14} />
                Lapor Sebagai Tamu
              </button>
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-[11px] font-bold uppercase transition-all shadow-sm"
              >
                <LogIn size={14} />
                Google Login
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 w-full overflow-y-auto custom-scrollbar">
        {children}
      </main>
    </div>
  );
}
