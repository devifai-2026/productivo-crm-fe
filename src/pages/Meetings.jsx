import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { format, parseISO, isPast } from 'date-fns';
import useMeetingStore from '../store/meetingStore';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';

const tabs = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

export default function Meetings({ onMenuClick }) {
  const { meetings, isLoading, fetchMeetings } = useMeetingStore();
  const [tab, setTab] = useState('upcoming');
  const navigate = useNavigate();

  useEffect(() => {
    fetchMeetings();
  }, []);

  const now = new Date();
  const filtered = meetings.filter((m) => {
    try {
      const raw = m.scheduledAt || m.date;
      const date = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
      return tab === 'upcoming' ? !isPast(date) : isPast(date);
    } catch {
      return tab === 'past';
    }
  });

  return (
    <div>
      <Header
        title="Meetings"
        subtitle={`${meetings.length} total meetings`}
        actionLabel="New Meeting"
        actionIcon="lucide:plus"
        onAction={() => navigate('/meetings/new')}
        onMenuClick={onMenuClick}
      />

      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-900 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150
              ${
                tab === t.value
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && meetings.length === 0 ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="lucide:video"
          title={tab === 'upcoming' ? 'No upcoming meetings' : 'No past meetings'}
          subtitle={tab === 'upcoming' ? 'Schedule a meeting to get started' : 'Past meetings will appear here'}
          actionLabel={tab === 'upcoming' ? 'Schedule Meeting' : undefined}
          onAction={tab === 'upcoming' ? () => navigate('/meetings/new') : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((meeting) => {
            let dateStr = '';
            let timeStr = '';
            try {
              const raw = meeting.scheduledAt || meeting.date;
              const date = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
              dateStr = format(date, 'EEEE, MMMM d');
              timeStr = format(date, 'h:mm a');
            } catch {
              dateStr = 'Date unavailable';
            }

            return (
              <Card
                key={meeting._id}
                hover
                onClick={() => navigate(`/meetings/${meeting._id}`)}
                className="!p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                    <Icon
                      icon="lucide:video"
                      className="w-5 h-5 text-purple-600 dark:text-purple-400"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {meeting.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Icon icon="lucide:calendar" className="w-3 h-3" />
                        {dateStr}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Icon icon="lucide:clock" className="w-3 h-3" />
                        {timeStr}
                      </span>
                      {meeting.duration && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {meeting.duration} min
                        </span>
                      )}
                    </div>
                  </div>
                  {meeting.meetLink && (
                    <a
                      href={meeting.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      Join
                    </a>
                  )}
                  <Icon
                    icon="lucide:chevron-right"
                    className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0"
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
