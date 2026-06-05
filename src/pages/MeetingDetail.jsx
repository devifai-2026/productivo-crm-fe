import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import useMeetingStore from '../store/meetingStore';
import useAuthStore from '../store/authStore';
import useWhatsappAddonStore from '../store/whatsappAddonStore';
import { whatsappAddonAPI, meetingAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';

// JS Date → "YYYY-MM-DDTHH:mm" in local time for a datetime-local input.
function toLocalInput(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
}

export default function MeetingDetail({ onMenuClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentMeeting, isLoading, fetchMeeting, deleteMeeting, addNotes, sendNotes, clearCurrent } = useMeetingStore();
  const { user } = useAuthStore();
  const { features: waFeatures, isFetched: waFetched, fetch: fetchWaAddon } = useWhatsappAddonStore();
  const canManage = user?.role === 'superadmin' || user?.role === 'org_admin';
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleVal, setRescheduleVal] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // MOM state
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [sendingNotes, setSendingNotes] = useState(false);

  useEffect(() => {
    fetchMeeting(id);
    if (!waFetched) fetchWaAddon();
    return () => clearCurrent();
  }, [id]);

  // Per-channel invite send. `channel` is 'whatsapp' or 'email'. Disables after success.
  const [sendingChannel, setSendingChannel] = useState(null);
  const handleSendChannel = async (channel) => {
    setSendingChannel(channel);
    try {
      const res = await meetingAPI.sendInvite(id, [channel]);
      const s = res.data?.data;
      if (res.data?.success) {
        const n = channel === 'whatsapp' ? s.whatsapp.sent : s.email.sent;
        toast.success(`${channel === 'whatsapp' ? 'WhatsApp' : 'Email'} invite sent to ${n} attendee(s)`);
        fetchMeeting(id); // refresh invitesSent so the button disables
      } else {
        toast.error(s?.errors?.[0] || res.data?.error || 'Failed to send');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send');
    } finally {
      setSendingChannel(null);
    }
  };

  // Open the reschedule modal, prefilled with the meeting's current time.
  const openReschedule = () => {
    const current = currentMeeting?.scheduledAt ? new Date(currentMeeting.scheduledAt) : new Date();
    setRescheduleVal(toLocalInput(current));
    setShowReschedule(true);
  };

  const handleRescheduleWhatsapp = async () => {
    if (!rescheduleVal) { toast.error('Please pick a date and time'); return; }
    const scheduledAt = new Date(rescheduleVal);
    if (isNaN(scheduledAt.getTime())) { toast.error('Invalid date/time'); return; }
    setRescheduling(true);
    try {
      const res = await whatsappAddonAPI.rescheduleMeeting(id, { scheduledAt: scheduledAt.toISOString() });
      if (res.data?.success) {
        toast.success(`Reschedule sent to ${res.data.sent} attendee(s)`);
        setShowReschedule(false);
        fetchMeeting(id);
      } else toast.error(res.data?.error || 'Failed to reschedule');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reschedule');
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancelWhatsapp = async () => {
    if (!window.confirm('Cancel this meeting and notify attendees on WhatsApp?')) return;
    setCancelling(true);
    try {
      const res = await whatsappAddonAPI.cancelMeeting(id);
      if (res.data?.success) {
        toast.success(`Cancellation sent to ${res.data.sent} attendee(s)`);
        fetchMeeting(id);
      } else toast.error(res.data?.error || 'Failed to cancel');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  // Sync notes textarea when meeting loads
  useEffect(() => {
    if (currentMeeting) {
      setNotesText(currentMeeting.notes || '');
    }
  }, [currentMeeting?.notes]);

  const handleDelete = async () => {
    const result = await deleteMeeting(id);
    if (result.success) navigate('/meetings');
  };

  const handleSaveNotes = async () => {
    if (!notesText.trim()) {
      toast.error('Notes cannot be empty');
      return;
    }
    setSavingNotes(true);
    const result = await addNotes(id, notesText.trim());
    setSavingNotes(false);
    if (result.success) {
      toast.success('Meeting notes saved');
      setEditingNotes(false);
    } else {
      toast.error(result.error || 'Failed to save notes');
    }
  };

  const handleSendNotes = async () => {
    // If there are unsaved edits, save first
    if (editingNotes && notesText.trim()) {
      setSavingNotes(true);
      const saveResult = await addNotes(id, notesText.trim());
      setSavingNotes(false);
      if (!saveResult.success) {
        toast.error(saveResult.error || 'Failed to save notes before sending');
        return;
      }
      setEditingNotes(false);
    }

    if (!currentMeeting?.notes && !notesText.trim()) {
      toast.error('Please write meeting notes before sending');
      setEditingNotes(true);
      return;
    }

    setSendingNotes(true);
    const result = await sendNotes(id);
    setSendingNotes(false);
    if (result.success) {
      const { emailsSent = 0, whatsappSent = 0 } = result.data || {};
      toast.success(`MOM sent — ${emailsSent} email${emailsSent !== 1 ? 's' : ''}, ${whatsappSent} WhatsApp`);
    } else {
      toast.error(result.error || 'Failed to send notes');
    }
  };

  if (isLoading && !currentMeeting) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentMeeting) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400">Meeting not found</p>
        <Button variant="ghost" onClick={() => navigate('/meetings')} className="mt-4">
          Back to Meetings
        </Button>
      </div>
    );
  }

  const meeting = currentMeeting;
  let formattedDate = '';
  let formattedTime = '';
  try {
    const rawDate = meeting.scheduledAt || meeting.date;
    const date = typeof rawDate === 'string' ? parseISO(rawDate) : new Date(rawDate);
    formattedDate = format(date, 'EEEE, MMMM d, yyyy');
    formattedTime = format(date, 'h:mm a');
  } catch {
    formattedDate = 'Date unavailable';
  }

  return (
    <div>
      <Header
        title={meeting.title}
        breadcrumbs={[
          { label: 'Meetings', href: '/meetings' },
          { label: meeting.title },
        ]}
        onMenuClick={onMenuClick}
      >
        {canManage && meeting.status !== 'cancelled' && (
          <>
            <Button
              variant="outline"
              size="sm"
              icon="mdi:whatsapp"
              loading={sendingChannel === 'whatsapp'}
              disabled={meeting.invitesSent?.whatsapp || sendingChannel !== null}
              onClick={() => handleSendChannel('whatsapp')}
              className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900"
            >
              {meeting.invitesSent?.whatsapp ? 'WhatsApp Sent ✓' : 'Send WhatsApp'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon="lucide:mail"
              loading={sendingChannel === 'email'}
              disabled={meeting.invitesSent?.email || sendingChannel !== null}
              onClick={() => handleSendChannel('email')}
              className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-900"
            >
              {meeting.invitesSent?.email ? 'Email Sent ✓' : 'Send Email'}
            </Button>
          </>
        )}
        {canManage && waFeatures?.meeting_invite?.isActive && meeting.status !== 'cancelled' && (
          <>
            <Button
              variant="outline"
              size="sm"
              icon="lucide:calendar-clock"
              onClick={openReschedule}
            >
              Reschedule
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon="lucide:calendar-x"
              loading={cancelling}
              onClick={handleCancelWhatsapp}
              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900"
            >
              Cancel Meeting
            </Button>
          </>
        )}
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            icon="lucide:send"
            loading={sendingNotes}
            onClick={handleSendNotes}
          >
            Send MOM
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          icon="lucide:pencil"
          onClick={() => navigate(`/meetings/${id}/edit`)}
        >
          Edit
        </Button>
        {canManage && (
          <Button
            variant="ghost"
            size="sm"
            icon="lucide:trash-2"
            onClick={() => setShowDeleteModal(true)}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Delete
          </Button>
        )}
      </Header>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Description
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
              {meeting.description || 'No description'}
            </p>
          </Card>

          {/* Minutes of Meeting (MOM) */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Icon icon="lucide:file-text" className="w-4 h-4 text-blue-500" />
                Minutes of Meeting
              </h3>
              {canManage && !editingNotes && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon="lucide:pencil"
                  onClick={() => setEditingNotes(true)}
                >
                  {meeting.notes ? 'Edit' : 'Write MOM'}
                </Button>
              )}
            </div>

            {editingNotes ? (
              <div className="space-y-3">
                <textarea
                  rows={8}
                  placeholder="Write the minutes of this meeting — decisions made, action items, next steps…"
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm
                    text-gray-900 placeholder-gray-400
                    focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                    dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100
                    dark:placeholder-gray-500 dark:focus:border-blue-400
                    outline-none transition-all duration-150 resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    icon="lucide:check"
                    loading={savingNotes}
                    onClick={handleSaveNotes}
                  >
                    Save Notes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingNotes(false); setNotesText(meeting.notes || ''); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : meeting.notes ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                {meeting.notes}
              </p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                {canManage
                  ? 'No notes yet. Click "Write MOM" to add meeting minutes.'
                  : 'No meeting notes recorded yet.'}
              </p>
            )}

            {/* PDF link if already generated */}
            {meeting.notesPdfUrl && !editingNotes && (
              <a
                href={meeting.notesPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Icon icon="lucide:file-down" className="w-3.5 h-3.5" />
                View MOM PDF
              </a>
            )}
          </Card>

          {/* Attendees */}
          {meeting.attendees && meeting.attendees.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Attendees ({meeting.attendees.length})
              </h3>
              <div className="space-y-2">
                {meeting.attendees.map((attendee, i) => (
                  <div key={attendee._id || i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <Avatar name={attendee.name || attendee.email || attendee} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                        {attendee.name || attendee.email || attendee}
                      </p>
                      {attendee.email && attendee.name && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{attendee.email}</p>
                      )}
                    </div>
                    {attendee.type && (
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700">
                        {attendee.type}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Date</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Icon icon="lucide:calendar" className="w-4 h-4 text-gray-400" />
                  {formattedDate}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Time</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Icon icon="lucide:clock" className="w-4 h-4 text-gray-400" />
                  {formattedTime}
                </p>
              </div>

              {meeting.duration && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Duration</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {meeting.duration} minutes
                  </p>
                </div>
              )}

              {meeting.meetLink && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Meeting Link</p>
                  <a
                    href={meeting.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 dark:bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors w-full justify-center"
                  >
                    <Icon icon="lucide:video" className="w-4 h-4" />
                    Join Meeting
                  </a>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 truncate">
                    {meeting.meetLink}
                  </p>
                </div>
              )}

              {meeting.project && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Project</p>
                  <button
                    onClick={() => navigate(`/projects/${meeting.project._id || meeting.project}`)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {meeting.project.name || 'View Project'}
                  </button>
                </div>
              )}

              {meeting.client && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Client</p>
                  <button
                    onClick={() => navigate(`/clients/${meeting.client._id || meeting.client}`)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {meeting.client.name || 'View Client'}
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* MOM quick-send card (admin only) */}
          {canManage && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Icon icon="lucide:send" className="w-4 h-4 text-blue-500" />
                Send MOM
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                Generates a PDF of the meeting notes and sends it to all {meeting.attendees?.length || 0} participants via email and WhatsApp.
              </p>
              <Button
                fullWidth
                size="sm"
                icon="lucide:send"
                loading={sendingNotes}
                onClick={handleSendNotes}
              >
                Send to All Participants
              </Button>
            </Card>
          )}
        </div>
      </div>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Meeting" size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete "{meeting.title}"? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>

      {/* Reschedule modal — calendar date & time picker (no prompt) */}
      <Modal isOpen={showReschedule} onClose={() => setShowReschedule(false)} title="Reschedule Meeting" size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Pick a new date and time for “{meeting.title}”. Attendees will be notified on WhatsApp.
        </p>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New date &amp; time</label>
        <input
          type="datetime-local"
          autoFocus
          value={rescheduleVal}
          min={toLocalInput(new Date())}
          onChange={(e) => setRescheduleVal(e.target.value)}
          className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100 [color-scheme:dark]"
        />
        <div className="flex gap-3 justify-end mt-6">
          <Button variant="outline" onClick={() => setShowReschedule(false)}>Cancel</Button>
          <Button icon="lucide:calendar-check" loading={rescheduling} onClick={handleRescheduleWhatsapp}>
            Confirm reschedule
          </Button>
        </div>
      </Modal>
    </div>
  );
}
