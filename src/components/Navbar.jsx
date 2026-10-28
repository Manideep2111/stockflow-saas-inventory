import React from 'react';
import { Menu, Building2, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ currentTab, setMobileOpen }) {
  const { organization } = useAuth();

  const titles = {
    dashboard: 'Inventory Dashboard',
    products: 'Product Management',
    settings: 'Organization Settings'
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-slate-900 tracking-tight">
            {titles[currentTab] || 'StockFlow'}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">
          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
          <span>{organization?.name || 'Organization'}</span>
        </div>
        
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Connected & synced" />
      </div>
    </header>
  );
}
