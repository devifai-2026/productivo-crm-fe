import { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';

/**
 * SearchableSelect — a combobox-style select with live filtering.
 *
 * Props:
 *   label        — field label
 *   value        — currently selected value (string id)
 *   onChange     — (value: string) => void  — called with the raw id string
 *   options      — [{ value, label, meta? }]  meta is optional secondary text
 *   placeholder  — empty-state placeholder text
 *   required     — boolean
 *   error        — error string
 *   disabled     — boolean
 *   className    — extra class on the container
 */
export default function SearchableSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Search and select...',
  required,
  error,
  disabled,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find((o) => o.value === value);

  const filtered = query.trim()
    ? options.filter((o) => {
        const q = query.toLowerCase();
        return o.label.toLowerCase().includes(q) || (o.meta && o.meta.toLowerCase().includes(q));
      })
    : options;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (opt) => {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Trigger / display */}
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className={`w-full flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm text-left transition-all duration-150
            ${error
              ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : open
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}
            bg-white dark:bg-gray-900
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span className={selected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
            {selected ? selected.label : placeholder}
          </span>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => e.key === 'Enter' && handleClear(e)}
                className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <Icon icon="lucide:x" className="w-3.5 h-3.5" />
              </span>
            )}
            <Icon icon="lucide:chevron-down" className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
            {/* Search input */}
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Icon icon="lucide:search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type to search..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400 dark:focus:border-blue-500"
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-52 overflow-y-auto">
              {/* Clear / none option */}
              {!required && (
                <button
                  type="button"
                  onClick={() => { onChange(''); setOpen(false); setQuery(''); }}
                  className="w-full flex items-center px-4 py-2.5 text-sm text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left italic"
                >
                  {placeholder}
                </button>
              )}

              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">No results found</p>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors text-left
                      ${value === opt.value
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                  >
                    <div className="min-w-0">
                      <span className="block truncate font-medium">{opt.label}</span>
                      {opt.meta && <span className="block truncate text-xs text-gray-400 dark:text-gray-500 mt-0.5">{opt.meta}</span>}
                    </div>
                    {value === opt.value && (
                      <Icon icon="lucide:check" className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}
