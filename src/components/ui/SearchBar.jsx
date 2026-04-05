import { Icon } from '@iconify/react';

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
        <Icon icon="lucide:search" className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2.5 text-sm
          text-gray-900 placeholder-gray-400
          focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
          dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100
          dark:placeholder-gray-500 dark:focus:bg-gray-900 dark:focus:border-blue-400
          outline-none transition-all duration-150"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <Icon icon="lucide:x" className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
