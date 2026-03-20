import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import useAuthStore from '../../store/authStore';

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <div className="app-layout">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="main-layout">
        {user && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
        <main className={`main-content ${!user ? 'full-width' : ''}`}
          style={!user ? { marginLeft: 0 } : {}}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
