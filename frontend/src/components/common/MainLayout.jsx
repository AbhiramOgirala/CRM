import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import useAuthStore from '../../store/authStore';

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <div className="app-layout">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="main-layout">
        {user && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
        {/* Overlay — closes sidebar on mobile tap-outside */}
        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
              zIndex: 1050, display: 'none'
            }}
          />
        )}
        <main
          id="main-content"
          className={`main-content ${!user ? 'full-width' : ''}`}
          style={!user ? { marginLeft: 0 } : {}}
          tabIndex="-1"
        >
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
