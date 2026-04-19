import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import useMeetingStore from '../store/meetingStore';
import useProjectStore from '../store/projectStore';
import useClientStore from '../store/clientStore';
import useWhatsappAddonStore from '../store/whatsappAddonStore';
import { whatsappAddonAPI } from '../services/api';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import DatePicker from '../components/ui/DatePicker';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';

export default function CreateMeeting({ onMenuClick }) {
  const navigate = useNavigate();
  const { createMeeting, isLoading } = useMeetingStore();
  const { projects, fetchProjects } = useProjectStore();
  const { clients, fetchClients } = useClientStore();
  const { isActive: waActive, features: waFeatures, isFetched: waFetched, fetch: fetchWaAddon } = useWhatsappAddonStore();
  const [sendWhatsapp, setSendWhatsapp] = useState(false);
  const [busy, setBusy] = useState(false);

  const [meetingType, setMeetingType] = useState('personal');
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: '30',
    projectId: '',
    clientId: '',
  });

  const [attendees, setAttendees] = useState([]);
  const [newAttendee, setNewAttendee] = useState({ email: '', name: '', whatsapp: '', type: 'attendee' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProjects();
    fetchClients();
    if (!waFetched) fetchWaAddon();
  }, []);

  // Auto-add client to attendees when selected
  useEffect(() => {
    if (meetingType === 'client' && form.clientId) {
      const client = clients.find((c) => c._id === form.clientId);
      if (client) {
        const alreadyAdded = attendees.some(
          (a) => a.email?.toLowerCase() === client.email?.toLowerCase() && a.type === 'client'
        );
        if (!alreadyAdded && client.email) {
          setAttendees((prev) => [
            ...prev.filter((a) => a.type !== 'client'),
            {
              email: client.email,
              name: client.name,
              whatsapp: client.whatsappNumber || '',
              type: 'client',
            },
          ]);
        }
      }
    }
  }, [form.clientId, meetingType, clients]);

  const updateField = (field) => (e) =>
    setForm({ ...form, [field]: e.target.value });

  const handleAddAttendee = () => {
    if (!newAttendee.email) return;
    setAttendees([...attendees, { ...newAttendee }]);
    setNewAttendee({ email: '', name: '', whatsapp: '', type: 'attendee' });
  };

  const handleRemoveAttendee = (index) => {
    setAttendees(attendees.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.date || !form.time) {
      setError('Date and time are required');
      return;
    }

    // Auto-flush pending attendee row if email is filled but "Add" wasn't clicked
    let finalAttendees = [...attendees];
    if (newAttendee.email) {
      finalAttendees = [...finalAttendees, { ...newAttendee }];
    }

    const payload = {
      title: form.title,
      description: form.description || undefined,
      meetingType,
      scheduledAt: new Date(`${form.date}T${form.time}`).toISOString(),
      duration: parseInt(form.duration),
      projectId: form.projectId || undefined,
      clientId: meetingType === 'client' ? form.clientId || undefined : undefined,
      attendees: finalAttendees,
    };

    setBusy(true);
    try {
      const result = await createMeeting(payload);
      if (!result.success) {
        setError(result.error || 'Failed to create meeting');
        return;
      }

      const newId = result.data?._id;
      if (sendWhatsapp && newId && waFeatures?.meeting_invite?.isActive) {
        try {
          const res = await whatsappAddonAPI.sendMeetingInvite(newId);
          if (res.data?.success) {
            toast.success(`WhatsApp invite sent to ${res.data.sent}/${res.data.total} attendees`);
          } else {
            toast.error('Meeting saved — WhatsApp send failed');
          }
        } catch (err) {
          toast.error(err.response?.data?.error || 'Meeting saved — WhatsApp send failed');
        }
      }
      navigate(`/meetings/${newId || ''}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Header
        title="New Meeting"
        breadcrumbs={[
          { label: 'Meetings', href: '/meetings' },
          { label: 'New Meeting' },
        ]}
        onMenuClick={onMenuClick}
      />

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Meeting Type Toggle */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Meeting Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setMeetingType('personal'); setAttendees([]); setForm((f) => ({ ...f, clientId: '' })); }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all
                  ${meetingType === 'personal'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-500'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
              >
                <Icon icon="lucide:user" className="w-4 h-4" />
                Personal / Team
              </button>
              <button
                type="button"
                onClick={() => { setMeetingType('client'); setAttendees([]); }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all
                  ${meetingType === 'client'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-500'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
              >
                <Icon icon="lucide:briefcase" className="w-4 h-4" />
                Client Meeting
              </button>
            </div>
          </div>

          <Input
            label="Title"
            placeholder="Meeting title"
            value={form.title}
            onChange={updateField('title')}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description / Agenda
            </label>
            <textarea
              rows={3}
              placeholder="What's this meeting about..."
              value={form.description}
              onChange={updateField('description')}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm
                text-gray-900 placeholder-gray-400
                focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100
                dark:placeholder-gray-500 dark:focus:border-blue-400
                outline-none transition-all duration-150 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DatePicker label="Date" value={form.date} onChange={updateField('date')} required />
            <Input label="Time" type="time" value={form.time} onChange={updateField('time')} required />
            <Select
              label="Duration"
              value={form.duration}
              onChange={updateField('duration')}
              options={[
                { value: '15', label: '15 minutes' },
                { value: '30', label: '30 minutes' },
                { value: '45', label: '45 minutes' },
                { value: '60', label: '1 hour' },
                { value: '90', label: '1.5 hours' },
                { value: '120', label: '2 hours' },
              ]}
            />
          </div>

          {/* Google Meet auto-generation note */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <Icon icon="lucide:video" className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Google Meet link will be auto-generated
            </p>
          </div>

          {/* Client & Project selection */}
          {meetingType === 'client' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Client"
                value={form.clientId}
                onChange={updateField('clientId')}
                placeholder="Select client"
                options={clients.map((c) => ({
                  value: c._id,
                  label: c.name,
                }))}
                required
              />
              <Select
                label="Project (optional)"
                value={form.projectId}
                onChange={updateField('projectId')}
                placeholder="Select project"
                options={projects.map((p) => ({
                  value: p._id,
                  label: p.name,
                }))}
              />
            </div>
          )}

          {meetingType === 'personal' && (
            <Select
              label="Related Project (optional)"
              value={form.projectId}
              onChange={updateField('projectId')}
              placeholder="Select project"
              options={projects.map((p) => ({
                value: p._id,
                label: p.name,
              }))}
            />
          )}

          {/* Client auto-added notice */}
          {meetingType === 'client' && form.clientId && (() => {
            const client = clients.find((c) => c._id === form.clientId);
            return client ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                <Icon icon="lucide:check-circle" className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  {client.name} ({client.email}) will receive email
                  {waActive && client.whatsappNumber ? ' + WhatsApp' : ''} notification
                </p>
              </div>
            ) : null;
          })()}

          {/* Attendees section */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Attendees
              </label>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                You are automatically added as the organizer. Add other attendees below.
              </p>
            </div>

            {attendees.length > 0 && (
              <div className="space-y-2">
                {attendees.map((attendee, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                  >
                    <Icon icon="lucide:user" className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                        {attendee.name || attendee.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {attendee.email}
                        {attendee.whatsapp ? ` • WA: ${attendee.whatsapp}` : ''}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700">
                      {attendee.type}
                    </span>
                    {attendee.type !== 'client' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAttendee(index)}
                        className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Icon icon="lucide:x" className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add attendee form */}
            <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Email *"
                  type="email"
                  value={newAttendee.email}
                  onChange={(e) => setNewAttendee({ ...newAttendee, email: e.target.value })}
                />
                <Input
                  placeholder="Name"
                  value={newAttendee.name}
                  onChange={(e) => setNewAttendee({ ...newAttendee, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {waActive && (
                  <Input
                    placeholder="WhatsApp (e.g. +91XXXXXXXXXX)"
                    value={newAttendee.whatsapp}
                    onChange={(e) => setNewAttendee({ ...newAttendee, whatsapp: e.target.value })}
                    icon="lucide:message-circle"
                  />
                )}
                <Select
                  value={newAttendee.type}
                  onChange={(e) => setNewAttendee({ ...newAttendee, type: e.target.value })}
                  options={[
                    { value: 'attendee', label: 'Attendee' },
                  ]}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon="lucide:plus"
                onClick={handleAddAttendee}
                disabled={!newAttendee.email}
              >
                Add Attendee
              </Button>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500">
              All attendees receive an email invite.
              {waActive ? ' Those with a WhatsApp number also get a WhatsApp message.' : ''}
              {' '}Attendees in the form above are included even if you haven't clicked "Add Attendee".
            </p>
          </div>

          {waFeatures?.meeting_invite?.isActive && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-900/10 cursor-pointer">
              <input
                type="checkbox"
                checked={sendWhatsapp}
                onChange={(e) => setSendWhatsapp(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="flex-1">
                <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <Icon icon="mdi:whatsapp" className="w-4 h-4" />
                  Also send WhatsApp invite to attendees
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">
                  Sent only to attendees with a WhatsApp number filled in.
                </span>
              </span>
            </label>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" loading={busy || isLoading} disabled={busy || isLoading}>
              {busy && sendWhatsapp && waFeatures?.meeting_invite?.isActive
                ? 'Sending WhatsApp invites…'
                : busy
                  ? 'Saving meeting…'
                  : sendWhatsapp && waFeatures?.meeting_invite?.isActive
                    ? 'Schedule & Send Invite'
                    : 'Schedule Meeting'}
            </Button>
            <Button variant="outline" type="button" onClick={() => navigate('/meetings')} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
