const colorMap = {
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  yellow: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  red: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  orange: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  cyan: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  pink: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

const statusColors = {
  // Task statuses
  todo: 'gray',
  backlog: 'indigo',
  in_progress: 'yellow',
  'in-progress': 'yellow',
  in_review: 'purple',
  'in-review': 'purple',
  done: 'green',
  completed: 'green',
  cancelled: 'gray',
  // General
  pending: 'yellow',
  active: 'green',
  inactive: 'gray',
  on_hold: 'orange',
  'on-hold': 'orange',
  overdue: 'red',
  // Invoice
  paid: 'green',
  unpaid: 'red',
  partial: 'yellow',
  sent: 'blue',
  draft: 'gray',
  // Priority
  high: 'red',
  medium: 'orange',
  low: 'blue',
  urgent: 'red',
  // Meeting
  scheduled: 'blue',
  past: 'gray',
};

const statusLabels = {
  todo: 'To Do',
  backlog: 'Backlog',
  in_progress: 'In Progress',
  'in-progress': 'In Progress',
  in_review: 'In Review',
  'in-review': 'In Review',
  done: 'Done',
  on_hold: 'On Hold',
  'on-hold': 'On Hold',
};

export default function Badge({
  children,
  color,
  status,
  size = 'sm',
  className = '',
}) {
  const resolvedColor = color || statusColors[status?.toLowerCase()] || 'gray';
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  const label = children || statusLabels[status?.toLowerCase()] || status;

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-lg
        ${sizeClasses}
        ${colorMap[resolvedColor]}
        ${className}
      `}
    >
      {label}
    </span>
  );
}
