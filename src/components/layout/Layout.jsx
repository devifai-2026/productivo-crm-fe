import { useState } from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content */}
      <main
        className={`
          min-h-screen transition-all duration-300 ease-in-out
          ${collapsed ? 'lg:pl-[68px]' : 'lg:pl-64'}
        `}
      >
        <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto">
          {/* Pass mobileOpen setter to children via context or direct */}
          {typeof children === 'function'
            ? children({ onMenuClick: () => setMobileOpen(true) })
            : children}
        </div>
      </main>
    </div>
  );
}
