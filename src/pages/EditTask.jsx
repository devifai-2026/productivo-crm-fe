import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import useTaskStore from '../store/taskStore';
import useProjectStore from '../store/projectStore';
import useAuthStore from '../store/authStore';
import { categoryAPI, organizationAPI } from '../services/api';
import Header from '../components/layout/Header';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';

const STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const PRIORITY_META = {
  low: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'lucide:arrow-down' },
  medium: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'lucide:minus' },
  high: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: 'lucide:arrow-up' },
  urgent: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', icon: 'lucide:alert-circle' },
};

function validate(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = 'Task title is required';
  else if (form.title.trim().length < 2) errors.title = 'Title must be at least 2 characters';
  return errors;
}

export default function EditTask({ onMenuClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTask, isLoading, fetchTask, updateTask } = useTaskStore();
  const { projects, fetchProjects } = useProjectStore();
  const { user } = useAuthStore();
  const [categories, setCategories] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTask(id);
    fetchProjects();
    categoryAPI.getAll().then((res) => {
      const d = res.data?.data || res.data || [];
      setCategories(Array.isArray(d) ? d : []);
    }).catch(() => {});
    if (user?.organizationId) {
      organizationAPI.getMembers(user.organizationId).then((res) => {
        const d = res.data?.data || res.data || [];
        setMembers(Array.isArray(d) ? d : []);
      }).catch(() => {});
    }
  }, [id, user?.organizationId]);

  useEffect(() => {
    if (currentTask) {
      setForm({
        title: currentTask.title || '',
        description: currentTask.description || '',
        project: currentTask.projectId?._id || currentTask.projectId || '',
        category: currentTask.categoryId?._id || currentTask.categoryId || '',
        priority: currentTask.priority || 'medium',
        status: currentTask.status || 'todo',
        dueDate: currentTask.dueDate ? new Date(currentTask.dueDate).toISOString().split('T')[0] : '',
      });
      if (currentTask.assignees?.length) setSelectedAssignees(currentTask.assignees);
    }
  }, [currentTask]);

  const updateField = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
  };

  const toggleAssignee = (m) =>
    setSelectedAssignees((prev) =>
      prev.find((a) => a._id === m._id) ? prev.filter((a) => a._id !== m._id) : [...prev, m]
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); toast.error('Please fix the errors below'); return; }

    setSaving(true);
    const result = await updateTask(id, {
      title: form.title.trim(),
      description: form.description,
      categoryId: form.category || null,
      priority: form.priority,
      status: form.status,
      dueDate: form.dueDate ? `${form.dueDate}T12:00:00.000Z` : null,
      assignees: selectedAssignees.map((a) => a._id),
    });
    setSaving(false);

    if (result.success) {
      toast.success('Task updated successfully');
      navigate(`/tasks/${id}`);
    } else {
      toast.error(result.error || 'Failed to update task');
    }
  };

  if (isLoading && !form) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!form) return (
    <div className="text-center py-20">
      <p className="text-gray-500 dark:text-gray-400">Task not found</p>
      <Button variant="ghost" onClick={() => navigate('/tasks')} className="mt-4">Back to Tasks</Button>
    </div>
  );

  const pm = PRIORITY_META[form.priority] || PRIORITY_META.medium;

  return (
    <div>
      <Header
        title="Edit Task"
        breadcrumbs={[
          { label: 'Tasks', href: '/tasks' },
          { label: currentTask?.title || 'Task', href: `/tasks/${id}` },
          { label: 'Edit' },
        ]}
        onMenuClick={onMenuClick}
      />

      <div className="grid lg:grid-cols-3 gap-6 max-w-6xl">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">

          {/* Core Details */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Icon icon="lucide:check-square" className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </span>
              Task Details
            </h2>
            <div className="space-y-4">
              <Input
                label="Title *"
                placeholder="What needs to be done?"
                value={form.title}
                onChange={updateField('title')}
                error={errors.title}
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  rows={4}
                  placeholder="Add more context or steps..."
                  value={form.description}
                  onChange={updateField('description')}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400
                    focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                    dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500
                    outline-none transition-all duration-150 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Classification */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <Icon icon="lucide:tag" className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              </span>
              Classification
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Status" value={form.status} onChange={updateField('status')} options={STATUS_OPTIONS} />
                <Select label="Priority" value={form.priority} onChange={updateField('priority')} options={PRIORITY_OPTIONS} />
              </div>
              <Select
                label="Category"
                value={form.category}
                onChange={updateField('category')}
                placeholder="Select category"
                options={categories.map((c) => ({ value: c._id, label: c.name }))}
              />
              <Input label="Due Date" type="date" value={form.dueDate} onChange={updateField('dueDate')} />
            </div>
          </div>

          {/* Assignees */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <Icon icon="lucide:users" className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              </span>
              Assignees
            </h2>
            {selectedAssignees.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedAssignees.map((a) => (
                  <span key={a._id} className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                    <Avatar name={a.name} size="xs" />
                    {a.name}
                    <button type="button" onClick={() => toggleAssignee(a)} className="ml-0.5 hover:text-blue-900 dark:hover:text-blue-100">
                      <Icon icon="lucide:x" className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAssigneeDropdown((v) => !v)}
                className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-left
                  dark:bg-gray-900 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-150"
              >
                <span className={selectedAssignees.length === 0 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}>
                  {selectedAssignees.length === 0 ? 'Select assignees...' : `${selectedAssignees.length} selected`}
                </span>
                <Icon icon="lucide:chevron-down" className="w-4 h-4 text-gray-400" />
              </button>
              {showAssigneeDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {members.length === 0
                    ? <p className="px-4 py-3 text-sm text-gray-400">No members found</p>
                    : members.map((member) => {
                        const selected = selectedAssignees.some((a) => a._id === member._id);
                        return (
                          <button key={member._id} type="button" onClick={() => toggleAssignee(member)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'}`}>
                              {selected && <Icon icon="lucide:check" className="w-3 h-3 text-white" />}
                            </div>
                            <Avatar name={member.name} size="xs" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{member.name}</p>
                              <p className="text-xs text-gray-400 truncate">{member.email}</p>
                            </div>
                          </button>
                        );
                      })}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" loading={saving} icon="lucide:check">Save Changes</Button>
            <Button variant="outline" type="button" onClick={() => navigate(`/tasks/${id}`)}>Cancel</Button>
          </div>
        </form>

        {/* Right Panel */}
        <div className="space-y-4">
          <div className={`rounded-2xl border p-5 transition-colors ${pm.bg} border-gray-100 dark:border-gray-800`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon icon={pm.icon} className={`w-4 h-4 ${pm.color}`} />
              <p className={`text-sm font-semibold ${pm.color}`}>{PRIORITY_OPTIONS.find((p) => p.value === form.priority)?.label} Priority</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {form.priority === 'urgent' ? 'Needs immediate attention' :
               form.priority === 'high' ? 'Should be done soon' :
               form.priority === 'medium' ? 'Normal work item' : 'Can wait until bandwidth allows'}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Status Flow</p>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((s) => (
                <div key={s.value} className={`flex items-center gap-2 text-xs py-1.5 px-2.5 rounded-lg transition-colors ${form.status === s.value ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${form.status === s.value ? 'bg-white' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          {form.dueDate && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Due Date</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Icon icon="lucide:calendar" className="w-4 h-4 text-blue-500" />
                {new Date(form.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
