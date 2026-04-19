import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import useTaskStore from '../store/taskStore';
import useProjectStore from '../store/projectStore';
import useAuthStore from '../store/authStore';
import useClientStore from '../store/clientStore';
import useOrganizationStore from '../store/organizationStore';
import { categoryAPI, organizationAPI, userAPI, taskAPI, whatsappAddonAPI } from '../services/api';
import useWhatsappAddonStore from '../store/whatsappAddonStore';
import Header from '../components/layout/Header';
import Input from '../components/ui/Input';
import DatePicker from '../components/ui/DatePicker';
import Select from '../components/ui/Select';
import SearchableSelect from '../components/ui/SearchableSelect';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';

const PRIORITY_META = {
  low:    { color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/20',   dot: 'bg-blue-500',   icon: 'lucide:arrow-down'   },
  medium: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', dot: 'bg-amber-500',  icon: 'lucide:minus'        },
  high:   { color: 'text-orange-600 dark:text-orange-400',bg:'bg-orange-50 dark:bg-orange-900/20',dot:'bg-orange-500', icon: 'lucide:arrow-up'     },
  urgent: { color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-900/20',     dot: 'bg-red-500',    icon: 'lucide:alert-circle' },
};

const STATUS_OPTIONS = [
  { value: 'backlog',     label: 'Backlog'      },
  { value: 'todo',        label: 'To Do'        },
  { value: 'in_progress', label: 'In Progress'  },
  { value: 'in_review',   label: 'In Review'    },
  { value: 'done',        label: 'Done'         },
];

const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Low'    },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High'   },
  { value: 'urgent', label: 'Urgent' },
];

const MAX_FILE_SIZE     = 10 * 1024 * 1024;
const ACCEPTED_IMAGES   = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function validate(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = 'Task title is required';
  else if (form.title.trim().length < 2) errors.title = 'Title must be at least 2 characters';
  if (form.dueDate) {
    const d = new Date(form.dueDate);
    if (isNaN(d.getTime())) errors.dueDate = 'Invalid date';
  }
  return errors;
}

/* ─── Org picker modal (superadmin only) ─────────────────────── */
function OrgPickerModal({ organizations, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = organizations.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Select Organization</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <Icon icon="lucide:x" className="w-5 h-5" />
          </button>
        </div>
        <div className="relative mb-3">
          <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizations…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400"
          />
        </div>
        <div className="max-h-72 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No organizations found</p>
          ) : filtered.map((org) => (
            <button
              key={org._id}
              type="button"
              onClick={() => onSelect(org)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">
                {org.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{org.name}</p>
                {org.memberCount != null && (
                  <p className="text-xs text-gray-400">{org.memberCount} member{org.memberCount !== 1 ? 's' : ''}</p>
                )}
              </div>
              <Icon icon="lucide:chevron-right" className="w-4 h-4 text-gray-300 ml-auto flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Multi-select category picker with inline create ────────── */
function CategoryPicker({ categories, selected, onToggle, onCreate, orgId, isSuperAdmin }) {
  const [open, setOpen]           = useState(false);
  const [search, setSearch]       = useState('');
  const [newName, setNewName]     = useState('');
  const [creating, setCreating]   = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = search.trim()
    ? categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : categories;

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const body = { name };
      if (isSuperAdmin && orgId) body.organizationId = orgId;
      const res = await categoryAPI.create(body);
      const cat = res.data?.data || res.data;
      onCreate(cat);
      setNewName('');
      setShowCreate(false);
      toast.success(`Category "${cat.name}" created`);
    } catch {
      toast.error('Failed to create category');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        Categories
      </label>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((c) => (
            <span
              key={c._id}
              className="inline-flex items-center gap-1 pl-2 pr-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium border border-purple-200 dark:border-purple-700"
            >
              {c.name}
              <button type="button" onClick={() => onToggle(c)} className="hover:text-purple-900 dark:hover:text-purple-100">
                <Icon icon="lucide:x" className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-left hover:border-gray-300 dark:hover:border-gray-600 transition-all"
      >
        <span className={selected.length === 0 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}>
          {selected.length === 0 ? 'Select categories…' : `${selected.length} selected`}
        </span>
        <Icon icon="lucide:chevron-down" className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
          {/* Search */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <Icon icon="lucide:search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories…"
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-purple-400"
              />
            </div>
          </div>

          {/* Category list */}
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">No categories found</p>
            ) : filtered.map((cat) => {
              const isSelected = selected.some((s) => s._id === cat._id);
              return (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => onToggle(cat)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300 dark:border-gray-600'}`}>
                    {isSelected && <Icon icon="lucide:check" className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-gray-900 dark:text-gray-100">{cat.name}</span>
                  {cat.isDefault && (
                    <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5">default</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Create new category */}
          <div className="border-t border-gray-100 dark:border-gray-800">
            {showCreate ? (
              <div className="flex items-center gap-2 px-3 py-2">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } if (e.key === 'Escape') setShowCreate(false); }}
                  placeholder="Category name…"
                  className="flex-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-1.5 outline-none focus:border-purple-400"
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {creating ? '…' : 'Add'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                  <Icon icon="lucide:x" className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
              >
                <Icon icon="lucide:plus" className="w-4 h-4" />
                Create new category
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function CreateTask({ onMenuClick }) {
  const navigate = useNavigate();
  const { createTask, isLoading } = useTaskStore();
  const { projects, fetchProjects } = useProjectStore();
  const { user } = useAuthStore();
  const { clients, fetchClients } = useClientStore();
  const { organizations, fetchOrganizations } = useOrganizationStore();
  const { features: waFeatures, isFetched: waFetched, fetch: fetchWaAddon } = useWhatsappAddonStore();
  const [sendWhatsapp, setSendWhatsapp] = useState(false);
  const [busy, setBusy] = useState(false);
  const isSuperAdmin = user?.role === 'superadmin';

  useEffect(() => { if (!waFetched) fetchWaAddon(); }, [waFetched, fetchWaAddon]);

  const [projectClient,      setProjectClient]      = useState(null);
  const [categories,         setCategories]          = useState([]);
  const [selectedCategories, setSelectedCategories]  = useState([]);
  const [members,            setMembers]             = useState([]);
  const [selectedAssignees,  setSelectedAssignees]   = useState([]);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeSearch,     setAssigneeSearch]      = useState('');
  const [attachments,        setAttachments]         = useState([]);
  const [errors,             setErrors]              = useState({});

  // Superadmin state
  const [selectedOrg,        setSelectedOrg]         = useState(null); // full org object
  const [showOrgPicker,      setShowOrgPicker]        = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', project: '',
    priority: 'medium', status: 'todo', dueDate: '',
  });

  /* ── Fetch orgs / projects / members on mount ── */
  useEffect(() => {
    if (isSuperAdmin) {
      fetchOrganizations();
      userAPI.getAll({ limit: 200 }).then((res) => {
        const d = res.data?.data?.users || res.data?.data || res.data || [];
        setMembers(Array.isArray(d) ? d : []);
      }).catch(() => {});
    } else {
      fetchProjects();
      fetchClients();
      if (user?.organizationId) {
        organizationAPI.getMembers(user.organizationId).then((res) => {
          const d = res.data?.data || res.data || [];
          setMembers(Array.isArray(d) ? d : []);
        }).catch(() => {});
      }
    }
  }, [user?.organizationId, isSuperAdmin]);

  /* ── Fetch categories (org-scoped) ── */
  useEffect(() => {
    const params = {};
    if (isSuperAdmin && selectedOrg) params.organizationId = selectedOrg._id;
    else if (!isSuperAdmin && !user?.organizationId) return;

    categoryAPI.getAll(params).then((res) => {
      const d = res.data?.data || res.data || [];
      setCategories(Array.isArray(d) ? d : []);
      setSelectedCategories([]);
    }).catch(() => {});
  }, [user?.organizationId, isSuperAdmin, selectedOrg?._id]);

  /* ── When superadmin picks org, reload scoped data ── */
  useEffect(() => {
    if (!isSuperAdmin || !selectedOrg) return;
    fetchProjects({ organizationId: selectedOrg._id });
    fetchClients({ organizationId: selectedOrg._id });
    organizationAPI.getMembers(selectedOrg._id).then((res) => {
      const d = res.data?.data || res.data || [];
      setMembers(Array.isArray(d) ? d : []);
    }).catch(() => {});
    setForm((p) => ({ ...p, project: '' }));
    setProjectClient(null);
  }, [selectedOrg?._id, isSuperAdmin]);

  /* ── Helpers ── */
  const updateField = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
  };

  const toggleAssignee = (m) =>
    setSelectedAssignees((prev) =>
      prev.find((a) => a._id === m._id) ? prev.filter((a) => a._id !== m._id) : [...prev, m]
    );

  const toggleCategory = (cat) =>
    setSelectedCategories((prev) =>
      prev.find((c) => c._id === cat._id) ? prev.filter((c) => c._id !== cat._id) : [...prev, cat]
    );

  const handleCategoryCreated = (cat) => {
    setCategories((prev) => [...prev, cat]);
    setSelectedCategories((prev) => [...prev, cat]);
  };

  const handleImagePick = (e) => {
    const files = Array.from(e.target.files || []);
    const valid = [];
    for (const file of files) {
      if (!ACCEPTED_IMAGES.includes(file.type)) { toast.error(`${file.name}: only JPEG, PNG, GIF, WebP`); continue; }
      if (file.size > MAX_FILE_SIZE)             { toast.error(`${file.name}: exceeds 10 MB limit`);       continue; }
      valid.push({ file, preview: URL.createObjectURL(file), name: file.name });
    }
    setAttachments((prev) => [...prev, ...valid]);
    e.target.value = '';
  };

  const removeAttachment = (idx) => {
    setAttachments((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (isSuperAdmin && !selectedOrg) errs.org = 'Please select an organization';
    if (Object.keys(errs).length) { setErrors(errs); toast.error('Please fix the errors below'); return; }

    const payload = {
      title:       form.title.trim(),
      description: form.description,
      priority:    form.priority,
      status:      form.status,
      assignees:   selectedAssignees.map((a) => a._id),
      categories:  selectedCategories.map((c) => c._id),
    };
    if (form.project) payload.projectId = form.project;
    if (form.dueDate) payload.dueDate = `${form.dueDate}T12:00:00.000Z`;
    if (isSuperAdmin && selectedOrg) payload.organizationId = selectedOrg._id;

    setBusy(true);
    try {
      const result = await createTask(payload);
      if (!result.success) {
        toast.error(result.error || 'Failed to create task');
        return;
      }

      const taskId = result.data._id;
      if (attachments.length > 0) {
        for (const att of attachments) {
          const fd = new FormData();
          fd.append('file', att.file);
          await taskAPI.addAttachment(taskId, fd).catch(() => {});
        }
      }
      toast.success('Task created successfully');

      if (sendWhatsapp && taskId && waFeatures?.task_reminder?.isActive) {
        try {
          const res = await whatsappAddonAPI.sendTaskReminder(taskId, {});
          if (res.data?.success) {
            toast.success('WhatsApp reminder sent to assignee');
          } else {
            toast.error('Task saved — reminder failed');
          }
        } catch (err) {
          toast.error(err.response?.data?.error || 'Task saved — reminder failed');
        }
      }
      navigate('/tasks');
    } finally {
      setBusy(false);
    }
  };

  const pm = PRIORITY_META[form.priority] || PRIORITY_META.medium;

  return (
    <div>
      {/* Superadmin org picker modal */}
      {showOrgPicker && (
        <OrgPickerModal
          organizations={organizations}
          onSelect={(org) => {
            setSelectedOrg(org);
            setShowOrgPicker(false);
            if (errors.org) setErrors((p) => ({ ...p, org: '' }));
          }}
          onClose={() => setShowOrgPicker(false)}
        />
      )}

      <Header
        title="New Task"
        breadcrumbs={[{ label: 'Tasks', href: '/tasks' }, { label: 'New Task' }]}
        onMenuClick={onMenuClick}
      />

      <div className="grid lg:grid-cols-3 gap-6 max-w-6xl">
        {/* Main form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">

          {/* Superadmin org selector banner */}
          {isSuperAdmin && (
            <div
              className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
                selectedOrg
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                  : errors.org
                  ? 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-700'
                  : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
              onClick={() => setShowOrgPicker(true)}
            >
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                <Icon icon="lucide:building-2" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                {selectedOrg ? (
                  <>
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5">Organization</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{selectedOrg.name}</p>
                  </>
                ) : (
                  <p className={`text-sm font-medium ${errors.org ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    {errors.org || 'Select an organization to continue…'}
                  </p>
                )}
              </div>
              <Icon icon="lucide:chevron-right" className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>
          )}

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
                <Select
                  label="Status"
                  value={form.status}
                  onChange={updateField('status')}
                  options={STATUS_OPTIONS}
                />
                <Select
                  label="Priority"
                  value={form.priority}
                  onChange={updateField('priority')}
                  options={PRIORITY_OPTIONS}
                />
              </div>

              <SearchableSelect
                label="Project"
                value={form.project}
                onChange={(val) => {
                  setForm((p) => ({ ...p, project: val }));
                  if (errors.project) setErrors((p) => ({ ...p, project: '' }));
                  if (val) {
                    const proj = projects.find((p) => p._id === val);
                    const cid  = proj?.clientId;
                    if (cid) {
                      const clientObj = typeof cid === 'object' ? cid : clients.find((c) => c._id === cid);
                      setProjectClient(clientObj || null);
                    } else {
                      setProjectClient(null);
                    }
                  } else {
                    setProjectClient(null);
                  }
                }}
                placeholder={isSuperAdmin && !selectedOrg ? 'Select org first' : 'Search project'}
                options={projects.map((p) => ({ value: p._id, label: p.name }))}
              />

              {/* Multi-select categories */}
              <CategoryPicker
                categories={categories}
                selected={selectedCategories}
                onToggle={toggleCategory}
                onCreate={handleCategoryCreated}
                orgId={selectedOrg?._id}
                isSuperAdmin={isSuperAdmin}
              />

              <DatePicker
                label="Due Date"
                value={form.dueDate}
                onChange={updateField('dueDate')}
                error={errors.dueDate}
              />

              {projectClient && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                  <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-sm font-bold text-green-600 dark:text-green-400 flex-shrink-0">
                    {projectClient.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide mb-0.5">Client</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{projectClient.name}</p>
                    {(projectClient.companyName || projectClient.email) && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{projectClient.companyName || projectClient.email}</p>
                    )}
                  </div>
                  <Icon icon="lucide:link" className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />
                </div>
              )}
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
                onClick={() => { setShowAssigneeDropdown((v) => !v); setAssigneeSearch(''); }}
                className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-left
                  dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100
                  hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-150"
              >
                <span className={selectedAssignees.length === 0 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}>
                  {selectedAssignees.length === 0 ? 'Select assignees...' : `${selectedAssignees.length} selected`}
                </span>
                <Icon icon="lucide:chevron-down" className={`w-4 h-4 text-gray-400 transition-transform ${showAssigneeDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showAssigneeDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="relative">
                      <Icon icon="lucide:search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={assigneeSearch}
                        onChange={(e) => setAssigneeSearch(e.target.value)}
                        placeholder="Search members..."
                        className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {(() => {
                      const filtered = assigneeSearch.trim()
                        ? members.filter((m) => m.name?.toLowerCase().includes(assigneeSearch.toLowerCase()) || m.email?.toLowerCase().includes(assigneeSearch.toLowerCase()))
                        : members;
                      if (filtered.length === 0)
                        return <p className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">No members found</p>;
                      return filtered.map((member) => {
                        const isSelected = selectedAssignees.some((a) => a._id === member._id);
                        return (
                          <button key={member._id} type="button" onClick={() => toggleAssignee(member)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'}`}>
                              {isSelected && <Icon icon="lucide:check" className="w-3 h-3 text-white" />}
                            </div>
                            <Avatar name={member.name} size="xs" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{member.name}</p>
                              <p className="text-xs text-gray-400 truncate">{member.email}</p>
                            </div>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Screenshots */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <Icon icon="lucide:image" className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              </span>
              Screenshots
            </h2>
            {attachments.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                {attachments.map((att, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 aspect-square bg-gray-50 dark:bg-gray-800">
                    <img src={att.preview} alt={att.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Icon icon="lucide:x" className="w-3 h-3" />
                    </button>
                    <p className="absolute bottom-0 left-0 right-0 px-1.5 py-1 text-[10px] text-white bg-black/50 truncate">{att.name}</p>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              <Icon icon="lucide:upload" className="w-4 h-4" />
              Add images
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple className="hidden" onChange={handleImagePick} />
            </label>
            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">JPEG, PNG, GIF, WebP · max 10 MB each</p>
          </div>

          {waFeatures?.task_reminder?.isActive && selectedAssignees.length > 0 && (
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
                  Also send WhatsApp reminder to {selectedAssignees[0]?.name || 'assignee'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">
                  Uses the assignee's phone number from their profile.
                </span>
              </span>
            </label>
          )}

          <div className="flex gap-3">
            <Button type="submit" loading={busy || isLoading} disabled={busy || isLoading} icon={busy ? undefined : 'lucide:check'}>
              {busy && sendWhatsapp && waFeatures?.task_reminder?.isActive
                ? 'Sending WhatsApp reminder…'
                : busy
                  ? 'Saving task…'
                  : sendWhatsapp && waFeatures?.task_reminder?.isActive
                    ? 'Create & Send Reminder'
                    : 'Create Task'}
            </Button>
            <Button variant="outline" type="button" onClick={() => navigate('/tasks')} disabled={busy}>Cancel</Button>
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
               form.priority === 'high'   ? 'Should be done soon' :
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

          {selectedCategories.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Categories</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedCategories.map((c) => (
                  <span key={c._id} className="text-xs px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
