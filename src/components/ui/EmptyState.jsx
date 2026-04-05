import { Icon } from '@iconify/react';
import Button from './Button';

export default function EmptyState({
  icon = 'lucide:inbox',
  title = 'No items found',
  subtitle,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon icon={icon} className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h3>
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm mb-6">
          {subtitle}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} icon="lucide:plus">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
