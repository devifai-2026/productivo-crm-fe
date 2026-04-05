export default function Card({
  children,
  className = '',
  padding = true,
  hover = false,
  onClick,
  ...props
}) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white dark:bg-gray-900 rounded-2xl
        border border-gray-100 dark:border-gray-800
        shadow-sm
        ${padding ? 'p-5' : ''}
        ${hover ? 'hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200 cursor-pointer' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
