import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import useTaskStore from '../store/taskStore';
import useAuthStore from '../store/authStore';
import useWhatsappAddonStore from '../store/whatsappAddonStore';
import { whatsappAddonAPI, taskAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import TaskTimer from '../components/tasks/TaskTimer';

const statusOptions = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];

export default function TaskDetail({ onMenuClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTask, isLoading, fetchTask, updateTask, deleteTask, clearCurrent } = useTaskStore();
  const { user } = useAuthStore();
  const { features: waFeatures, isFetched: waFetched, fetch: fetchWaAddon } = useWhatsappAddonStore();
  const canDelete = user?.role === 'superadmin' || user?.role === 'org_admin';
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showRemindModal, setShowRemindModal] = useState(false);
  const [remindPhone, setRemindPhone] = useState('');
  const [remindSending, setRemindSending] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [newSubtaskUrl, setNewSubtaskUrl] = useState('');
  const [subtaskBusy, setSubtaskBusy] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState(null);
  const [editSubtaskUrl, setEditSubtaskUrl] = useState('');

  // Notes
  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteDate, setNoteDate] = useState(todayStr());
  const [noteBusy, setNoteBusy] = useState(false);
  const [notesFilterDate, setNotesFilterDate] = useState('');

  const toggleSubtask = async (subtask) => {
    const nextStatus = subtask.status === 'done' ? 'todo' : 'done';
    try {
      await taskAPI.updateSubtask(id, subtask._id, { status: nextStatus });
      await fetchTask(id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update subtask');
    }
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    const title = newSubtask.trim();
    if (!title) return;
    setSubtaskBusy(true);
    try {
      await taskAPI.addSubtask(id, { title, url: newSubtaskUrl.trim() });
      setNewSubtask('');
      setNewSubtaskUrl('');
      await fetchTask(id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add subtask');
    } finally {
      setSubtaskBusy(false);
    }
  };

  const handleDeleteSubtask = async (subtask) => {
    if (!window.confirm(`Delete subtask "${subtask.title}"?`)) return;
    try {
      await taskAPI.deleteSubtask(id, subtask._id);
      await fetchTask(id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete subtask');
    }
  };

  const handleSaveSubtaskUrl = async (subtask) => {
    try {
      await taskAPI.updateSubtask(id, subtask._id, { url: editSubtaskUrl.trim() });
      setEditingSubtaskId(null);
      setEditSubtaskUrl('');
      await fetchTask(id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update URL');
    }
  };

  const normalizeUrl = (u) => (!u ? '' : /^https?:\/\//i.test(u) ? u : `https://${u}`);

  const fetchNotes = async (date) => {
    setNotesLoading(true);
    try {
      const res = await taskAPI.listNotes(id, date ? { date } : undefined);
      setNotes(res.data?.data || []);
    } catch {
      setNotes([]);
    }
    setNotesLoading(false);
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    const content = newNote.trim();
    if (!content) return;
    setNoteBusy(true);
    try {
      await taskAPI.addNote(id, { content, date: noteDate });
      setNewNote('');
      await fetchNotes(notesFilterDate);
      toast.success('Note saved');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add note');
    } finally {
      setNoteBusy(false);
    }
  };

  const handleDeleteNote = async (note) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await taskAPI.deleteNote(id, note._id);
      await fetchNotes(notesFilterDate);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete note');
    }
  };

  useEffect(() => {
    fetchTask(id);
    fetchNotes();
    if (!waFetched) fetchWaAddon();
    return () => clearCurrent();
  }, [id]);

  useEffect(() => { fetchNotes(notesFilterDate); }, [notesFilterDate]);

  const handleSendReminder = async (e) => {
    e.preventDefault();
    if (!remindPhone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    setRemindSending(true);
    try {
      const res = await whatsappAddonAPI.sendTaskReminder(id, { phone: remindPhone.trim() });
      if (res.data?.success) {
        toast.success('Reminder sent via WhatsApp');
        setShowRemindModal(false);
        setRemindPhone('');
      } else {
        toast.error('Failed to send reminder');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reminder');
    } finally {
      setRemindSending(false);
    }
  };

  const handleStatusChange = async (status) => {
    const result = await updateTask(id, { status });
    setShowStatusMenu(false);
    if (result.success) {
      toast.success('Status updated');
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    const result = await deleteTask(id);
    if (result.success) {
      toast.success('Task deleted');
      navigate('/tasks');
    } else {
      toast.error(result.error || 'Failed to delete task');
      setShowDeleteModal(false);
    }
  };

  if (isLoading && !currentTask) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentTask) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400">Task not found</p>
        <Button variant="ghost" onClick={() => navigate('/tasks')} className="mt-4">
          Back to Tasks
        </Button>
      </div>
    );
  }

  const task = currentTask;

  return (
    <div>
      <Header
        title={task.title}
        breadcrumbs={[
          { label: 'Tasks', href: '/tasks' },
          { label: task.title },
        ]}
        onMenuClick={onMenuClick}
      >
        {waFeatures?.task_reminder?.isActive && (
          <Button
            variant="outline"
            size="sm"
            icon="mdi:whatsapp"
            onClick={() => setShowRemindModal(true)}
            className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900"
          >
            Remind
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          icon="lucide:pencil"
          onClick={() => navigate(`/tasks/${id}/edit`)}
        >
          Edit
        </Button>
        {canDelete && (
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
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Time tracking */}
          <TaskTimer
            taskId={id}
            taskStatus={task.status}
            onComplete={() => {
              // Auto-mark task as done when timer stops? Only when user explicitly marks it.
              // Keeping the toggle manual for now — the backend already stores the total time.
            }}
          />

          {/* Description */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Description
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
              {task.description || 'No description provided'}
            </p>
          </Card>

          {/* Subtasks */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Subtasks ({(task.subtasks || []).filter((s) => s.status === 'done').length}/{(task.subtasks || []).length})
            </h3>
            <div className="space-y-1">
              {(task.subtasks || []).map((subtask) => {
                const done = subtask.status === 'done';
                const isEditingUrl = editingSubtaskId === subtask._id;
                return (
                  <div
                    key={subtask._id}
                    className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggleSubtask(subtask)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-sm ${
                          done ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {subtask.title}
                      </span>
                      {subtask.url && !isEditingUrl && (
                        <a
                          href={normalizeUrl(subtask.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 mt-0.5 text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          <Icon icon="lucide:link" className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{subtask.url}</span>
                        </a>
                      )}
                      {isEditingUrl && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <input
                            type="text"
                            value={editSubtaskUrl}
                            onChange={(e) => setEditSubtaskUrl(e.target.value)}
                            placeholder="https://…"
                            autoFocus
                            className="flex-1 px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveSubtaskUrl(subtask)}
                            className="px-2 py-1 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingSubtaskId(null); setEditSubtaskUrl(''); }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Icon icon="lucide:x" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {!isEditingUrl && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => { setEditingSubtaskId(subtask._id); setEditSubtaskUrl(subtask.url || ''); }}
                          className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                          title={subtask.url ? 'Edit URL' : 'Add URL'}
                        >
                          <Icon icon={subtask.url ? 'lucide:pencil' : 'lucide:link'} className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubtask(subtask)}
                          className="p-1 text-gray-400 hover:text-red-500"
                          title="Delete subtask"
                        >
                          <Icon icon="lucide:trash-2" className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleAddSubtask} className="mt-3 space-y-2">
              <Input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="Add a subtask (e.g. Review PR)…"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSubtaskUrl}
                  onChange={(e) => setNewSubtaskUrl(e.target.value)}
                  placeholder="Optional URL (e.g. PR link)"
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400"
                />
                <Button type="submit" size="sm" loading={subtaskBusy} disabled={!newSubtask.trim()}>
                  <Icon icon="lucide:plus" className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </form>
          </Card>

          {/* Notes */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notes</h3>
              {task.recurrence && task.recurrence !== 'none' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 tracking-wider">
                  PER-DATE
                </span>
              )}
            </div>

            <form onSubmit={handleAddNote} className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <Icon icon="lucide:calendar" className="w-4 h-4 text-gray-400" />
                <label className="text-xs text-gray-500 dark:text-gray-400">Date:</label>
                <input
                  type="date"
                  value={noteDate}
                  onChange={(e) => setNoteDate(e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400"
                />
              </div>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
                placeholder="Quick note — key point from a call, TODO, meeting takeaway…"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400 resize-none"
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm" loading={noteBusy} disabled={!newNote.trim()}>
                  <Icon icon="lucide:save" className="w-4 h-4 mr-1" />
                  Save note
                </Button>
              </div>
            </form>

            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
              <Icon icon="lucide:filter" className="w-3.5 h-3.5 text-gray-400" />
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Filter by date:</label>
              <input
                type="date"
                value={notesFilterDate}
                onChange={(e) => setNotesFilterDate(e.target.value)}
                className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400"
              />
              {notesFilterDate && (
                <button type="button" onClick={() => setNotesFilterDate('')} className="text-gray-400 hover:text-gray-600">
                  <Icon icon="lucide:x" className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {notesLoading ? (
              <Spinner size="sm" />
            ) : notes.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                No notes {notesFilterDate ? `for ${notesFilterDate}` : 'yet'}.
              </p>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const byDate = {};
                  notes.forEach((n) => { (byDate[n.date] = byDate[n.date] || []).push(n); });
                  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
                  return dates.map((date) => (
                    <div key={date}>
                      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                        {date === todayStr() ? `Today · ${date}` : date}
                      </p>
                      <div className="space-y-2">
                        {byDate[date].map((n) => (
                          <div
                            key={n._id}
                            className="group relative p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
                          >
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                              {n.content}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                {n.createdBy?.name || 'Someone'} · {n.createdAt ? format(parseISO(n.createdAt), 'MMM d, h:mm a') : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteNote(n)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                                title="Delete note"
                              >
                                <Icon icon="lucide:trash-2" className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </Card>

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Attachments
              </h3>
              <div className="space-y-2">
                {task.attachments.map((att, i) => (
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <Icon icon="lucide:paperclip" className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {att.name || att.filename || 'Attachment'}
                    </span>
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Status
                </p>
                <div className="relative">
                  <button
                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                    className="flex items-center gap-2"
                  >
                    <Badge status={task.status} size="md" />
                    <Icon icon="lucide:chevron-down" className="w-3 h-3 text-gray-400" />
                  </button>
                  {showStatusMenu && (
                    <div className="absolute top-full left-0 mt-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 min-w-[140px]">
                      {statusOptions.map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(status)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <Badge status={status} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {task.priority && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Priority
                  </p>
                  <Badge status={task.priority} size="md" />
                </div>
              )}

              {task.dueDate && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Due Date
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Icon icon="lucide:calendar" className="w-4 h-4 text-gray-400" />
                    {format(typeof task.dueDate === 'string' ? parseISO(task.dueDate) : new Date(task.dueDate), 'MMM d, yyyy')}
                  </p>
                </div>
              )}

              {task.project && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Project
                  </p>
                  <button
                    onClick={() => navigate(`/projects/${task.project._id || task.project}`)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
                  >
                    <Icon icon="lucide:folder" className="w-4 h-4" />
                    {task.project.name || 'View Project'}
                  </button>
                </div>
              )}

              {task.categories?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Categories
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {task.categories.map((cat) => (
                      <span key={cat._id} className="text-xs px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Assignees */}
          {task.assignees && task.assignees.length > 0 && (
            <Card>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Assignees
              </p>
              <div className="space-y-2">
                {task.assignees.map((assignee, i) => (
                  <div key={assignee._id || i} className="flex items-center gap-3">
                    <Avatar name={assignee.name} size="sm" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {assignee.name}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Task" size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete "{task.title}"? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>

      <Modal isOpen={showRemindModal} onClose={() => setShowRemindModal(false)} title="Send WhatsApp Reminder" size="sm">
        <form onSubmit={handleSendReminder} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Send a reminder for <strong>"{task.title}"</strong> to a WhatsApp number.
          </p>
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+91 98765 43210"
            value={remindPhone}
            onChange={(e) => setRemindPhone(e.target.value)}
            required
          />
          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => setShowRemindModal(false)}>Cancel</Button>
            <Button type="submit" icon="mdi:whatsapp" loading={remindSending}>Send Reminder</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
