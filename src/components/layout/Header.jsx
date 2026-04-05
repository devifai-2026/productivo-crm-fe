import { Icon } from '@iconify/react';
import Button from '../ui/Button';

export default function Header({
  title,
  subtitle,
  actionLabel,
  actionIcon,
  onAction,
  breadcrumbs,
  children,
  onMenuClick,
}) {
  return (
    <div className="mb-6 lg:mb-8">
      {/* Mobile menu button + breadcrumbs row */}
      <div className="flex items-center gap-2 mb-2">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Icon icon="lucide:menu" className="w-5 h-5" />
          </button>
        )}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && (
                  <Icon
                    icon="lucide:chevron-right"
                    className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600"
                  />
                )}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {children}
          {actionLabel && onAction && (
            <Button onClick={onAction} icon={actionIcon || 'lucide:plus'}>
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
