import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import ToastContainer from './components/Toast';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Settings from './pages/Settings';

export default function App() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' or 'signup'
  const [currentTab, setCurrentTab] = useState('dashboard'); // 'dashboard', 'products', 'settings'
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl mb-4 shadow-xl shadow-indigo-600/30 animate-pulse">
          SF
        </div>
        <p className="text-sm font-semibold text-slate-400">Loading StockFlow...</p>
      </div>
    );
  }

  // If not logged in, render Login or Signup
  if (!user) {
    return (
      <>
        {authView === 'login' ? (
          <Login onSwitchToSignup={() => setAuthView('signup')} />
        ) : (
          <Signup onSwitchToLogin={() => setAuthView('login')} />
        )}
        <ToastContainer />
      </>
    );
  }

  // Authenticated SaaS Dashboard layout
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 min-h-screen">
        <Navbar currentTab={currentTab} setMobileOpen={setMobileOpen} />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <Dashboard onNavigateToProducts={() => setCurrentTab('products')} />
          )}
          {currentTab === 'products' && <Products />}
          {currentTab === 'settings' && <Settings />}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
