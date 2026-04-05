import { Icon } from '@iconify/react';

export default function Select({
  label,
  error,
  options = [],
  placeholder = 'Select...',
  className = '',
  containerClassName = '',
  required,
  ...props
}) {
  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          className={`
            w-full rounded-xl border bg-white px-4 py-2.5 text-sm appearance-none
            text-gray-900 border-gray-200
            focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
            dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100
            dark:focus:border-blue-400 dark:focus:ring-blue-400/20
            outline-none transition-all duration-150 pr-10
            ${error ? 'border-red-500 dark:border-red-400' : ''}
            ${className}
          `}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
          <Icon icon="lucide:chevron-down" className="w-4 h-4" />
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
