import { useState, useMemo, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parse,
  isValid,
} from 'date-fns';

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseValue(value) {
  if (!value) return null;
  const d = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : null;
}

function formatDisplay(value) {
  const d = parseValue(value);
  if (!d) return '';
  return format(d, 'dd MMM yyyy');
}

export default function DatePicker({
  label,
  error,
  value = '',
  onChange,
  placeholder = 'Select date',
  required = false,
  disabled = false,
  min,
  max,
  className = '',
  containerClassName = '',
  name,
  id,
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => parseValue(value) || new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const wrapperRef = useRef(null);
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);
  const [openUpward, setOpenUpward] = useState(false);

  const selected = useMemo(() => parseValue(value), [value]);
  const minDate = useMemo(() => parseValue(min), [min]);
  const maxDate = useMemo(() => parseValue(max), [max]);

  const closePopover = () => {
    setOpen(false);
    setShowMonthPicker(false);
    setShowYearPicker(false);
  };

  const togglePopover = () => {
    if (disabled) return;
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        setViewMonth(selected || new Date());
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          setOpenUpward(spaceBelow < 360 && rect.top > 360);
        }
      } else {
        setShowMonthPicker(false);
        setShowYearPicker(false);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        closePopover();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [viewMonth]);

  const years = useMemo(() => {
    const base = viewMonth.getFullYear();
    const start = base - 7;
    return Array.from({ length: 16 }, (_, i) => start + i);
  }, [viewMonth]);

  const isDisabled = (day) => {
    if (minDate && day < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true;
    if (maxDate && day > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return true;
    return false;
  };

  const emit = (val) => {
    if (!onChange) return;
    onChange({ target: { name, value: val, type: 'date' } });
  };

  const handleSelect = (day) => {
    if (isDisabled(day)) return;
    emit(format(day, 'yyyy-MM-dd'));
    closePopover();
  };

  const handleClear = (e) => {
    e.stopPropagation();
    emit('');
  };

  const display = formatDisplay(value);

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div ref={wrapperRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          id={id}
          disabled={disabled}
          onClick={togglePopover}
          className={`
            w-full flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm text-left
            text-gray-900
            border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
            dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100
            dark:focus:border-blue-400 dark:focus:ring-blue-400/20
            outline-none transition-all duration-150
            disabled:opacity-60 disabled:cursor-not-allowed
            ${error ? 'border-red-500 dark:border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${className}
          `}
        >
          <Icon icon="lucide:calendar" className="w-4.5 h-4.5 text-gray-400 dark:text-gray-500 shrink-0" />
          <span className={`flex-1 truncate ${display ? '' : 'text-gray-400 dark:text-gray-500'}`}>
            {display || placeholder}
          </span>
          {display && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
              aria-label="Clear date"
            >
              <Icon icon="lucide:x" className="w-4 h-4" />
            </span>
          )}
          <Icon
            icon="lucide:chevron-down"
            className={`w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div
            ref={popoverRef}
            className={`absolute z-50 ${openUpward ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72
              rounded-2xl border border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-900 shadow-xl p-3`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                aria-label="Previous month"
              >
                <Icon icon="lucide:chevron-left" className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { setShowMonthPicker((v) => !v); setShowYearPicker(false); }}
                  className="px-2 py-1 rounded-lg text-sm font-semibold text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {format(viewMonth, 'MMMM')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowYearPicker((v) => !v); setShowMonthPicker(false); }}
                  className="px-2 py-1 rounded-lg text-sm font-semibold text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {format(viewMonth, 'yyyy')}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                aria-label="Next month"
              >
                <Icon icon="lucide:chevron-right" className="w-4 h-4" />
              </button>
            </div>

            {showMonthPicker ? (
              <div className="grid grid-cols-3 gap-1.5">
                {MONTHS.map((m, idx) => {
                  const isCurrent = viewMonth.getMonth() === idx;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setViewMonth(new Date(viewMonth.getFullYear(), idx, 1));
                        setShowMonthPicker(false);
                      }}
                      className={`py-2 rounded-lg text-xs font-medium transition-colors
                        ${isCurrent
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    >
                      {m.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            ) : showYearPicker ? (
              <div className="grid grid-cols-4 gap-1.5">
                {years.map((y) => {
                  const isCurrent = viewMonth.getFullYear() === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        setViewMonth(new Date(y, viewMonth.getMonth(), 1));
                        setShowYearPicker(false);
                      }}
                      className={`py-2 rounded-lg text-xs font-medium transition-colors
                        ${isCurrent
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 mb-1">
                  {WEEK_DAYS.map((d) => (
                    <div
                      key={d}
                      className="text-center text-[10px] font-medium text-gray-400 dark:text-gray-500 py-1"
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {calendarDays.map((day, i) => {
                    const inMonth = isSameMonth(day, viewMonth);
                    const isSel = selected && isSameDay(day, selected);
                    const today = isToday(day);
                    const dis = isDisabled(day);
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={dis}
                        onClick={() => handleSelect(day)}
                        className={`
                          py-1.5 rounded-lg text-xs transition-all
                          ${dis ? 'text-gray-200 dark:text-gray-800 cursor-not-allowed' : ''}
                          ${!dis && !inMonth ? 'text-gray-300 dark:text-gray-700' : ''}
                          ${!dis && inMonth && !isSel && !today ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800' : ''}
                          ${!dis && today && !isSel ? 'text-blue-600 dark:text-blue-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-800' : ''}
                          ${isSel ? 'bg-blue-600 dark:bg-blue-500 text-white font-semibold' : ''}
                        `}
                      >
                        {format(day, 'd')}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      if (isDisabled(today)) return;
                      emit(format(today, 'yyyy-MM-dd'));
                      closePopover();
                    }}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    Today
                  </button>
                  {value && (
                    <button
                      type="button"
                      onClick={() => { emit(''); closePopover(); }}
                      className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
