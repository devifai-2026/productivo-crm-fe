const sizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export default function Spinner({ size = 'md', className = '' }) {
  return (
    <div
      className={`
        ${sizes[size]}
        border-2 border-gray-200 dark:border-gray-700
        border-t-blue-600 dark:border-t-blue-400
        rounded-full animate-spin
        ${className}
      `}
    />
  );
}
