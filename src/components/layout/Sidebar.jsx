import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import useWhatsappAddonStore from '../../store/whatsappAddonStore';
import Avatar from '../ui/Avatar';

// Routes accessible on free plan (superadmin)
const FREE_PLAN_ROUTES = new Set(['/', '/tasks', '/projects', '/clients', '/invoices', '/settings', '/premium', '/plan', '/organizations', '/users', '/usage', '/attendance', '/timesheet', '/org-tree']);

const allNavItems = [
  // Shared
  { path: '/',              label: 'Dashboard',       icon: 'lucide:home',           roles: ['product_owner', 'superadmin', 'org_admin', 'employee'] },
  // Org workspace
  { path: '/tasks',         label: 'Tasks',           icon: 'lucide:check-circle',   roles: ['superadmin', 'org_admin', 'employee'] },
  { path: '/projects',      label: 'Projects',        icon: 'lucide:folder',         roles: ['superadmin', 'org_admin'] },
  { path: '/clients',       label: 'Clients',         icon: 'lucide:users',          roles: ['superadmin', 'org_admin'] },
  { path: '/meetings',      label: 'Meetings',        icon: 'lucide:video',          roles: ['superadmin', 'org_admin', 'employee'] },
  { path: '/invoices',      label: 'Invoices',        icon: 'lucide:file-text',      roles: ['superadmin', 'org_admin'] },
  { path: '/conversations', label: 'WhatsApp',        icon: 'lucide:message-circle', roles: ['superadmin', 'org_admin'] },
  { path: '/organizations', label: 'Organization',    icon: 'lucide:building-2',     roles: ['superadmin', 'org_admin'] },
  { path: '/users',         label: 'Users',           icon: 'lucide:shield',         roles: ['superadmin', 'org_admin'] },
  { path: '/premium',       label: 'Add-ons',         icon: 'lucide:zap',            roles: ['superadmin', 'org_admin'], isAddonsItem: true },
  { path: '/usage',         label: 'Data & Activity', icon: 'lucide:activity',       roles: ['superadmin', 'product_owner'] },
  { path: '/attendance',    label: 'Attendance',      icon: 'lucide:clock',          roles: ['superadmin', 'org_admin', 'employee'] },
  { path: '/timesheet',     label: 'Timesheet',       icon: 'lucide:clipboard-list', roles: ['superadmin', 'org_admin'] },
  // product_owner platform-level
  { path: '/users',         label: 'Accounts',        icon: 'lucide:shield-check',   roles: ['product_owner'] },
  { path: '/enquiries',     label: 'Leads',           icon: 'mdi:email-newsletter',  roles: ['product_owner'] },
  { path: '/superadmin',    label: 'Admin Panel',     icon: 'lucide:monitor-check',  roles: ['product_owner'] },
];

const bottomItems = [
  { path: '/plan',     label: 'My Plan',  icon: 'lucide:credit-card', isPlanItem: true },
  { path: '/settings', label: 'Settings', icon: 'lucide:settings' },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user, logout, subscriptionPlan } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const navigate = useNavigate();
  const userRole = user?.role || 'employee';
  // For superadmin: only pro/enterprise counts as paid. Anything else (free, null, undefined) = free plan.
  const isSuperadmin = userRole === 'superadmin';
  const isPro = !isSuperadmin || subscriptionPlan === 'pro' || subscriptionPlan === 'enterprise';

  const { isActive: waActive, isFetched: waFetched, fetch: fetchWaAddon } = useWhatsappAddonStore();

  const navItems = allNavItems.filter((item) => {
    if (!item.roles.includes(userRole)) return false;
    // Hide Add-ons tab once any WhatsApp add-on has been purchased
    if (item.isAddonsItem && waActive) return false;
    return true;
  });

  useEffect(() => {
    if (user && user.role !== 'product_owner' && !waFetched) {
      fetchWaAddon();
    }
  }, [user, waFetched, fetchWaAddon]);

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
        <button
          onClick={onToggle}
          className="hidden lg:flex ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          <Icon icon={collapsed ? 'lucide:panel-left-open' : 'lucide:panel-left-close'} className="w-4 h-4" />
        </button>
        <button
          onClick={onMobileClose}
          className="lg:hidden ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          <Icon icon="lucide:x" className="w-4 h-4" />
        </button>
      </div>

      {/* Free plan banner */}
      {!isPro && !collapsed && (
        <div
          onClick={() => { navigate('/plan'); onMobileClose?.(); }}
          className="mx-3 mt-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 border border-violet-200 dark:border-violet-800 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:sparkles" className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
              <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">Free Plan</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-600 text-white">Upgrade</span>
          </div>
          <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">Tap to view My Plan →</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isWaItem = item.path === '/conversations';
          const isWaLocked = isWaItem && userRole !== 'product_owner' && !waActive;
          const isPremiumItem = item.path === '/premium' && isSuperadmin;
          const isAddonsItem = item.isAddonsItem && isSuperadmin;
          const isPlanItem = item.isPlanItem && isSuperadmin;

          // Plan-lock: free superadmin trying to access a pro route
          const isPlanLocked = !isPro && !FREE_PLAN_ROUTES.has(item.path);

          // WhatsApp item locked (addon not active)
          if (isWaLocked && !isPlanLocked) {
            return (
              <NavLink
                key={item.path + item.label}
                to="/premium"
                onClick={onMobileClose}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                  text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800/50 dark:hover:text-gray-400
                  ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? 'WhatsApp (Add-on not enabled)' : undefined}
              >
                <Icon icon={item.icon} className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {!collapsed && (
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400">
                    Locked
                  </span>
                )}
                {collapsed && (
                  <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold px-1 py-0.5 rounded bg-blue-500 text-white leading-none">!</span>
                )}
              </NavLink>
            );
          }

          // Plan locked — show as greyed with "Pro" badge, click goes to /plan
          if (isPlanLocked) {
            return (
              <NavLink
                key={item.path + item.label}
                to="/plan"
                onClick={onMobileClose}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                  text-gray-400 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/30
                  ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? `${item.label} — Pro only` : undefined}
              >
                <Icon icon={item.icon} className="w-5 h-5 shrink-0 opacity-50" />
                {!collapsed && <span className="flex-1 opacity-60">{item.label}</span>}
                {!collapsed && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 shrink-0">
                    PRO
                  </span>
                )}
                {collapsed && (
                  <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold px-1 py-0.5 rounded bg-violet-500 text-white leading-none">P</span>
                )}
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.path + item.label}
              to={item.path}
              end={item.path === '/'}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                ${isPlanItem || isPremiumItem || isAddonsItem
                  ? isActive
                    ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400'
                    : 'text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/20'
                  : isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200'
                }
                ${collapsed ? 'justify-center px-2' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon icon={item.icon} className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {!collapsed && isPlanItem && !isPro && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-600 text-white shrink-0">
                  Upgrade
                </span>
              )}
              {!collapsed && isPlanItem && isPro && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                  Pro
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
        <button
          onClick={toggle}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full
            text-gray-600 hover:bg-gray-50 hover:text-gray-900
            dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200
            transition-all duration-150 ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? (isDark ? 'Light mode' : 'Dark mode') : undefined}
        >
          <Icon icon={isDark ? 'lucide:sun' : 'lucide:moon'} className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {bottomItems.map((item) => {
          // My Plan only visible to superadmin (isSuperadmin already accounts for user?.role)
          if (item.isPlanItem && !isSuperadmin) return null;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                ${item.isPlanItem
                  ? isActive
                    ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400'
                    : 'text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/20'
                  : isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200'
                }
                ${collapsed ? 'justify-center px-2' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon icon={item.icon} className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {!collapsed && item.isPlanItem && !isPro && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-600 text-white shrink-0">
                  Upgrade
                </span>
              )}
              {!collapsed && item.isPlanItem && isPro && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                  Pro
                </span>
              )}
            </NavLink>
          );
        })}

        <div className={`flex items-center gap-3 px-3 py-2.5 ${collapsed ? 'justify-center px-2' : ''}`}>
          <Avatar name={user?.name} size="sm" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
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
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={onMobileClose} />
      )}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-950
        border-r border-gray-100 dark:border-gray-800
        transform transition-transform duration-300 ease-in-out lg:hidden
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {sidebarContent}
      </aside>
      <aside className={`
        hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30
        bg-white dark:bg-gray-950
        border-r border-gray-100 dark:border-gray-800
        transition-all duration-300 ease-in-out
        ${collapsed ? 'lg:w-[68px]' : 'lg:w-64'}`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
