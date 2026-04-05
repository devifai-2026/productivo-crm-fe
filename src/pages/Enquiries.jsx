import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { enquiryAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';

const STATUSES = [
  { key: 'new', label: 'New', color: 'blue' },
  { key: 'contacted', label: 'Contacted', color: 'yellow' },
  { key: 'converted', label: 'Converted', color: 'green' },
  { key: 'closed', label: 'Closed', color: 'gray' },
];

function getStatusColor(status) {
  const found = STATUSES.find((s) => s.key === status);
  return found ? found.color : 'gray';
}

function getStatusLabel(status) {
  const found = STATUSES.find((s) => s.key === status);
  return found ? found.label : status;
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const SOURCE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'landing_page', label: 'Landing Page' },
  { key: 'premium_feature', label: 'Premium Requests' },
];

const FEATURE_LABELS = {
  whatsapp_invoice: 'Invoice via WhatsApp',
  whatsapp_task_reminder: 'Task Reminders',
  whatsapp_meeting_invite: 'Meeting Invites',
};

export default function Enquiries({ onMenuClick }) {
  const [enquiries, setEnquiries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sourceTab, setSourceTab] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [notesDraft, setNotesDraft] = useState({});
  const [statusDraft, setStatusDraft] = useState({});
  const [saving, setSaving] = useState({});

  const fetchEnquiries = async () => {
    try {
      setIsLoading(true);
      const res = await enquiryAPI.getAll();
      setEnquiries(res.data?.data || res.data || []);
    } catch {
      toast.error('Failed to load enquiries');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const handleRowClick = (enquiry) => {
    const id = enquiry._id;
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      // Seed the draft values from the current enquiry data
      setNotesDraft((prev) => ({ ...prev, [id]: prev[id] ?? (enquiry.notes || '') }));
      setStatusDraft((prev) => ({ ...prev, [id]: prev[id] ?? (enquiry.status || 'new') }));
    }
  };

  const handleUpdate = async (enquiry) => {
    const id = enquiry._id;
    try {
      setSaving((prev) => ({ ...prev, [id]: true }));
      await enquiryAPI.update(id, {
        status: statusDraft[id] ?? enquiry.status,
        notes: notesDraft[id] ?? enquiry.notes,
      });
      toast.success('Enquiry updated');
      await fetchEnquiries();
    } catch {
      toast.error('Failed to update enquiry');
    } finally {
      setSaving((prev) => ({ ...prev, [id]: false }));
    }
  };

  const filteredEnquiries = sourceTab === 'all'
    ? enquiries
    : enquiries.filter((e) => (e.source || 'landing_page') === sourceTab);

  // Summary counts
  const counts = STATUSES.reduce((acc, s) => {
    acc[s.key] = filteredEnquiries.filter((e) => (e.status || 'new') === s.key).length;
    return acc;
  }, {});
  const newCount = counts.new || 0;
  const premiumCount = enquiries.filter((e) => e.source === 'premium_feature').length;

  return (
    <div>
      <Header
        title="Leads & Enquiries"
        subtitle="Potential clients who submitted an enquiry or paid for access"
        onMenuClick={onMenuClick}
      >
        {newCount > 0 && (
          <Badge color="blue" size="sm">
            {newCount} New
          </Badge>
        )}
        {premiumCount > 0 && (
          <Badge color="yellow" size="sm">
            {premiumCount} Premium
          </Badge>
        )}
      </Header>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
            <Icon icon="mdi:email-newsletter" className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-50">{enquiries.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
            <Icon icon="lucide:bell" className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">New</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{counts.new || 0}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
            <Icon icon="lucide:phone" className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Contacted</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{counts.contacted || 0}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
            <Icon icon="lucide:check-circle" className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Converted</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{counts.converted || 0}</p>
          </div>
        </Card>
      </div>

      {/* Source filter tabs */}
      <div className="flex gap-2 mb-5">
        {SOURCE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSourceTab(tab.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all
              ${sourceTab === tab.key
                ? tab.key === 'premium_feature'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
          >
            {tab.key === 'premium_feature' && (
              <Icon icon="lucide:zap" className="w-3.5 h-3.5" />
            )}
            {tab.label}
            {tab.key === 'premium_feature' && premiumCount > 0 && (
              <span className="ml-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">
                {premiumCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main content */}
      {isLoading && enquiries.length === 0 ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filteredEnquiries.length === 0 ? (
        <EmptyState
          icon="mdi:email-newsletter"
          title="No enquiries yet"
          subtitle={sourceTab === 'premium_feature' ? 'No premium feature requests yet' : 'Enquiries submitted from your landing page will appear here'}
        />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">
                    Email
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">
                    Phone
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">
                    Description
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">
                    Received
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">
                    <span className="sr-only">Expand</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filteredEnquiries.map((enquiry) => {
                  const isExpanded = expandedId === enquiry._id;
                  return (
                    <>
                      {/* Main row */}
                      <tr
                        key={enquiry._id}
                        onClick={() => handleRowClick(enquiry)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0
                              ${enquiry.source === 'premium_feature'
                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                              }`}>
                              {(enquiry.fullName || enquiry.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block max-w-[130px]">
                                {enquiry.fullName || enquiry.name || '--'}
                              </span>
                              {enquiry.source === 'premium_feature' && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                  <Icon icon="lucide:zap" className="w-3 h-3" />
                                  Premium
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate block max-w-[160px]">
                            {enquiry.email || '--'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {enquiry.phone || '--'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate block max-w-[200px]">
                            {enquiry.description
                              ? enquiry.description.length > 60
                                ? enquiry.description.slice(0, 60) + '…'
                                : enquiry.description
                              : '--'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge color={getStatusColor(enquiry.status || 'new')}>
                            {getStatusLabel(enquiry.status || 'new')}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {formatDate(enquiry.createdAt)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-gray-400 dark:text-gray-500">
                            <Icon
                              icon={isExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                              className="w-4 h-4 inline"
                            />
                          </span>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr key={`${enquiry._id}-expanded`} className="bg-gray-50 dark:bg-gray-800/30">
                          <td colSpan={7} className="px-5 py-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                              {/* Full description */}
                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                  Full Description
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                                  {enquiry.description || 'No description provided.'}
                                </p>
                              </div>

                              {/* Notes + status update */}
                              <div className="space-y-3">
                                {/* Premium feature interest */}
                                {enquiry.source === 'premium_feature' && enquiry.featureInterest?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                      Interested In
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {enquiry.featureInterest.map((f) => (
                                        <span key={f} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                                          bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-medium border border-amber-200 dark:border-amber-800">
                                          <Icon icon="lucide:zap" className="w-3 h-3" />
                                          {FEATURE_LABELS[f] || f}
                                        </span>
                                      ))}
                                    </div>
                                    {enquiry.orgName && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                        Org: <span className="font-medium text-gray-700 dark:text-gray-300">{enquiry.orgName}</span>
                                      </p>
                                    )}
                                  </div>
                                )}
                                <div>
                                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
                                    Status
                                  </label>
                                  <select
                                    value={statusDraft[enquiry._id] ?? (enquiry.status || 'new')}
                                    onChange={(e) =>
                                      setStatusDraft((prev) => ({ ...prev, [enquiry._id]: e.target.value }))
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900
                                      px-3 py-2 text-gray-700 dark:text-gray-200
                                      outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                                  >
                                    {STATUSES.map((s) => (
                                      <option key={s.key} value={s.key}>
                                        {s.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
                                    Notes
                                  </label>
                                  <textarea
                                    rows={3}
                                    value={notesDraft[enquiry._id] ?? (enquiry.notes || '')}
                                    onChange={(e) =>
                                      setNotesDraft((prev) => ({ ...prev, [enquiry._id]: e.target.value }))
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="Add internal notes about this enquiry…"
                                    className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900
                                      px-3 py-2 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500
                                      outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors resize-none"
                                  />
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdate(enquiry);
                                  }}
                                  disabled={saving[enquiry._id]}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60
                                    text-white text-sm font-medium rounded-xl transition-colors"
                                >
                                  {saving[enquiry._id] ? (
                                    <Spinner size="sm" />
                                  ) : (
                                    <Icon icon="lucide:save" className="w-4 h-4" />
                                  )}
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
