import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { invoiceAPI, meetingAPI, whatsappAddonAPI } from '../../services/api';
import Spinner from '../ui/Spinner';

// kind: 'invoice' | 'meeting'
const CONFIG = {
  invoice: {
    title: 'Send Invoice',
    icon: 'lucide:file-text',
    fetch: () => invoiceAPI.getAll({ limit: 50 }),
    send: (id) => whatsappAddonAPI.sendInvoice(id),
    label: (inv) => `Invoice ${inv.invoiceNumber || ''}`.trim(),
    sub: (inv) => [inv.clientId?.name, inv.purpose || inv.projectId?.name, inv.totalAmount != null ? `₹${inv.totalAmount}` : '']
      .filter(Boolean).join(' · '),
  },
  meeting: {
    title: 'Send Meeting Invite',
    icon: 'lucide:calendar',
    fetch: () => meetingAPI.getAll({ limit: 50 }),
    send: (id) => whatsappAddonAPI.sendMeetingInvite(id),
    label: (m) => m.title || 'Meeting',
    sub: (m) => [m.scheduledAt ? new Date(m.scheduledAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '', m.meetLink ? 'Has link' : '']
      .filter(Boolean).join(' · '),
  },
  reschedule: {
    title: 'Reschedule Meeting',
    icon: 'lucide:calendar-clock',
    fetch: () => meetingAPI.getAll({ limit: 50 }),
    // For reschedule the caller passes the chosen ISO datetime as the 2nd arg.
    send: (id, scheduledAt) => whatsappAddonAPI.rescheduleMeeting(id, { scheduledAt }),
    needsDateTime: true,
    sendLabel: 'Reschedule',
    label: (m) => m.title || 'Meeting',
    sub: (m) => (m.scheduledAt ? new Date(m.scheduledAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''),
  },
  cancel: {
    title: 'Cancel Meeting',
    icon: 'lucide:calendar-x',
    fetch: () => meetingAPI.getAll({ limit: 50 }),
    send: (id) => whatsappAddonAPI.cancelMeeting(id),
    sendLabel: 'Cancel',
    label: (m) => m.title || 'Meeting',
    sub: (m) => (m.scheduledAt ? new Date(m.scheduledAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''),
  },
};

// JS Date → "YYYY-MM-DDTHH:mm" in local time for a datetime-local input.
function toLocalInput(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
}

export default function SendAttachmentPicker({ kind, onClose, onSent }) {
  const cfg = CONFIG[kind];
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [sendingId, setSendingId] = useState(null);
  const [search, setSearch] = useState('');
  // For the reschedule flow: which meeting's date picker is open, and its chosen value.
  const [pickerId, setPickerId] = useState(null);
  const [pickerVal, setPickerVal] = useState('');

  useEffect(() => {
    let alive = true;
    cfg.fetch()
      .then((res) => {
        if (!alive) return;
        const data = res.data?.data || res.data || [];
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => { if (alive) { setError(err.response?.data?.error || 'Failed to load'); setLoading(false); } });
    return () => { alive = false; };
  }, [kind]);

  const handleSend = async (id, scheduledAt) => {
    setSendingId(id);
    setError('');
    try {
      const res = await cfg.send(id, scheduledAt);
      if (res.data?.success !== false) {
        onSent?.();
        onClose();
      } else {
        setError(res.data?.error || 'Send failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Send failed');
    } finally {
      setSendingId(null);
    }
  };

  // Open the inline calendar picker for a meeting, prefilled with its current time.
  const openPicker = (it) => {
    const base = it.scheduledAt ? new Date(it.scheduledAt) : new Date();
    setPickerVal(toLocalInput(base));
    setPickerId(it._id);
    setError('');
  };

  const confirmReschedule = (id) => {
    if (!pickerVal) { setError('Please pick a date and time'); return; }
    const dt = new Date(pickerVal);
    if (isNaN(dt.getTime())) { setError('Invalid date/time'); return; }
    handleSend(id, dt.toISOString());
  };

  const filtered = items.filter((it) => {
    const hay = `${cfg.label(it)} ${cfg.sub(it)}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Icon icon={cfg.icon} className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{cfg.title}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><Icon icon="lucide:x" className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${kind}s…`}
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner size="md" /></div>
          ) : error ? (
            <p className="text-sm text-red-500 text-center py-6">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No {kind}s found.</p>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map((it) => {
                const isPicking = cfg.needsDateTime && pickerId === it._id;
                return (
                <li key={it._id}>
                  <div className={`p-3 rounded-xl border transition-colors ${isPicking ? 'border-green-400 dark:border-green-500' : 'border-gray-200 dark:border-gray-700 hover:border-green-400'}`}>
                    <div className="flex items-center gap-3">
                      <Icon icon={cfg.icon} className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{cfg.label(it)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{cfg.sub(it)}</p>
                      </div>
                      {!isPicking && (
                        <button
                          onClick={() => (cfg.needsDateTime ? openPicker(it) : handleSend(it._id))}
                          disabled={sendingId === it._id}
                          className="px-3 py-1.5 text-sm rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-medium inline-flex items-center gap-1.5 shrink-0"
                        >
                          {sendingId === it._id ? <Spinner size="sm" color="white" /> : <Icon icon={cfg.needsDateTime ? 'lucide:calendar-clock' : 'lucide:send'} className="w-4 h-4" />}
                          {cfg.sendLabel || 'Send'}
                        </button>
                      )}
                    </div>

                    {/* Inline calendar date+time picker (reschedule) */}
                    {isPicking && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">New date &amp; time</label>
                        <input
                          type="datetime-local"
                          autoFocus
                          value={pickerVal}
                          min={toLocalInput(new Date())}
                          onChange={(e) => setPickerVal(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-gray-100 [color-scheme:dark]"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => { setPickerId(null); setPickerVal(''); }}
                            className="px-3 py-1.5 text-sm rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => confirmReschedule(it._id)}
                            disabled={sendingId === it._id}
                            className="px-3 py-1.5 text-sm rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-medium inline-flex items-center gap-1.5"
                          >
                            {sendingId === it._id ? <Spinner size="sm" color="white" /> : <Icon icon="lucide:check" className="w-4 h-4" />}
                            Confirm reschedule
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
