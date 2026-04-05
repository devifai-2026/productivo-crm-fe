import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import Avatar from '../ui/Avatar';

// Admin-only nav items
const allNavItems = [
  { path: '/', label: 'Dashboard', icon: 'lucide:home', roles: ['superadmin', 'org_admin', 'employee'] },
  { path: '/tasks', label: 'Tasks', icon: 'lucide:check-circle', roles: ['superadmin', 'org_admin', 'employee'] },
  { path: '/projects', label: 'Projects', icon: 'lucide:folder', roles: ['superadmin', 'org_admin'] },
  { path: '/clients', label: 'Clients', icon: 'lucide:users', roles: ['superadmin', 'org_admin'] },
  { path: '/meetings', label: 'Meetings', icon: 'lucide:video', roles: ['superadmin', 'org_admin', 'employee'] },
  { path: '/invoices', label: 'Invoices', icon: 'lucide:file-text', roles: ['superadmin', 'org_admin'] },
  { path: '/conversations', label: 'WhatsApp', icon: 'lucide:message-circle', roles: ['superadmin', 'org_admin'] },
  { path: '/organizations', label: 'Organization', icon: 'lucide:building-2', roles: ['superadmin', 'org_admin'] },
  { path: '/users', label: 'Users', icon: 'lucide:shield', roles: ['superadmin'] },
  { path: '/superadmin', label: 'Admin Panel', icon: 'lucide:monitor-check', roles: ['superadmin'] },
];

const bottomItems = [
  { path: '/settings', label: 'Settings', icon: 'lucide:settings' },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user, logout } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const navigate = useNavigate();
  const userRole = user?.role || 'employee';
  const navItems = allNavItems.filter((item) => item.roles.includes(userRole));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="w-9 h-9 rounded-xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center shrink-0">
          <Icon icon="lucide:zap" className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-50 tracking-tight">
            Productivo
          </span>
        )}
        {/* Desktop collapse toggle */}
        <button
          onClick={onToggle}
          className="hidden lg:flex ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          <Icon
            icon={collapsed ? 'lucide:panel-left-open' : 'lucide:panel-left-close'}
            className="w-4 h-4"
          />
        </button>
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="lg:hidden ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          <Icon icon="lucide:x" className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onMobileClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
              ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200'
              }
              ${collapsed ? 'justify-center px-2' : ''}
            `}
            title={collapsed ? item.label : undefined}
          >
            <Icon icon={item.icon} className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full
            text-gray-600 hover:bg-gray-50 hover:text-gray-900
            dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200
            transition-all duration-150
            ${collapsed ? 'justify-center px-2' : ''}
          `}
          title={collapsed ? (isDark ? 'Light mode' : 'Dark mode') : undefined}
        >
          <Icon
            icon={isDark ? 'lucide:sun' : 'lucide:moon'}
            className="w-5 h-5 shrink-0"
          />
          {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {bottomItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onMobileClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
              ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200'
              }
              ${collapsed ? 'justify-center px-2' : ''}
            `}
            title={collapsed ? item.label : undefined}
          >
            <Icon icon={item.icon} className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {/* User section */}
        <div className={`flex items-center gap-3 px-3 py-2.5 ${collapsed ? 'justify-center px-2' : ''}`}>
          <Avatar name={user?.name} size="sm" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Logout"
            >
              <Icon icon="lucide:log-out" className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-950
          border-r border-gray-100 dark:border-gray-800
          transform transition-transform duration-300 ease-in-out lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`
          hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30
          bg-white dark:bg-gray-950
          border-r border-gray-100 dark:border-gray-800
          transition-all duration-300 ease-in-out
          ${collapsed ? 'lg:w-[68px]' : 'lg:w-64'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
