import { useState, useMemo } from 'react';
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
  parseISO,
} from 'date-fns';

export default function MiniCalendar({ meetings = [], onMeetingClick }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // Map meetings to dates
  const meetingsByDate = useMemo(() => {
    const map = {};
    meetings.forEach((m) => {
      const dateStr = m.scheduledAt || m.date;
      if (!dateStr) return;
      try {
        const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
        const key = format(date, 'yyyy-MM-dd');
        if (!map[key]) map[key] = [];
        map[key].push(m);
      } catch {}
    });
    return map;
  }, [meetings]);

  const selectedKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedMeetings = meetingsByDate[selectedKey] || [];

  const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  return (
    <div>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          >
            <Icon icon="lucide:chevron-left" className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setCurrentMonth(new Date());
              setSelectedDate(new Date());
            }}
            className="px-2 py-1 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          >
            <Icon icon="lucide:chevron-right" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium text-gray-400 dark:text-gray-500 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((day, i) => {
          const key = format(day, 'yyyy-MM-dd');
          const hasMeetings = !!meetingsByDate[key];
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(day)}
              className={`
                relative flex flex-col items-center justify-center py-1.5 rounded-lg text-xs transition-all
                ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-700' : ''}
                ${isCurrentMonth && !isSelected && !today ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800' : ''}
                ${today && !isSelected ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}
                ${isSelected ? 'bg-blue-600 dark:bg-blue-500 text-white font-semibold' : ''}
              `}
            >
              {format(day, 'd')}
              {hasMeetings && (
                <div className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500 dark:bg-blue-400'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day meetings */}
      <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          {isToday(selectedDate)
            ? "Today's Schedule"
            : format(selectedDate, 'EEE, MMM d')}
        </p>

        {selectedMeetings.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-600 py-3 text-center">
            No meetings
          </p>
        ) : (
          <div className="space-y-1.5">
            {selectedMeetings
              .sort((a, b) => new Date(a.scheduledAt || a.date) - new Date(b.scheduledAt || b.date))
              .map((meeting) => {
                const time = (() => {
                  try {
                    const d = typeof (meeting.scheduledAt || meeting.date) === 'string'
                      ? parseISO(meeting.scheduledAt || meeting.date)
                      : new Date(meeting.scheduledAt || meeting.date);
                    return format(d, 'h:mm a');
                  } catch {
                    return '';
                  }
                })();

                const typeColor = meeting.meetingType === 'client'
                  ? 'bg-amber-500'
                  : 'bg-blue-500';

                return (
                  <button
                    key={meeting._id}
                    onClick={() => onMeetingClick?.(meeting._id)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                  >
                    <div className={`w-1 h-8 rounded-full ${typeColor} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                        {meeting.title}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {time}{meeting.duration ? ` · ${meeting.duration}min` : ''}
                      </p>
                    </div>
                    {meeting.meetLink && (
                      <Icon icon="lucide:video" className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    )}
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
