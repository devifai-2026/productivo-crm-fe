import { useState } from 'react';
import { Icon } from '@iconify/react';

export default function Input({
  label,
  error,
  icon,
  type = 'text',
  className = '',
  containerClassName = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            <Icon icon={icon} className="w-4.5 h-4.5" />
          </div>
        )}
        <input
          type={inputType}
          className={`
            w-full rounded-xl border bg-white px-4 py-2.5 text-sm
            text-gray-900 placeholder-gray-400
            border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
            dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100
            dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20
            outline-none transition-all duration-150
            ${icon ? 'pl-10' : ''}
            ${isPassword ? 'pr-10' : ''}
            ${error ? 'border-red-500 dark:border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${className}
          `}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <Icon
              icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'}
              className="w-4.5 h-4.5"
            />
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
