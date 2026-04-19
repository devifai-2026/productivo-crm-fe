import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import useProjectStore from '../store/projectStore';
import useClientStore from '../store/clientStore';
import Header from '../components/layout/Header';
import Input from '../components/ui/Input';
import DatePicker from '../components/ui/DatePicker';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Project name is required';
  else if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  if (form.startDate && form.endDate && form.endDate < form.startDate)
    errors.endDate = 'End date must be after start date';
  return errors;
}

export default function EditProject({ onMenuClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentProject, isLoading, fetchProject, updateProject, clearCurrent } = useProjectStore();
  const { clients, fetchClients } = useClientStore();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const envFileInputRef = useRef(null);

  useEffect(() => {
    clearCurrent();
    Promise.all([fetchProject(id), fetchClients()]);
    return () => clearCurrent();
  }, [id]);

  useEffect(() => {
    if (currentProject && currentProject._id === id) {
      setForm({
        name: currentProject.name || '',
        description: currentProject.description || '',
        clientId: currentProject.clientId?._id || currentProject.clientId || '',
        status: currentProject.status || 'active',
        startDate: currentProject.startDate ? new Date(currentProject.startDate).toISOString().split('T')[0] : '',
        endDate: currentProject.endDate ? new Date(currentProject.endDate).toISOString().split('T')[0] : '',
        domain: currentProject.domain || '',
        envFile: currentProject.envFile || '',
      });
    }
  }, [currentProject, id]);

  const updateField = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
  };

  const handleEnvFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((p) => ({ ...p, envFile: ev.target.result }));
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error('Please fix the errors below');
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description,
      clientId: form.clientId || null,
      status: form.status,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      domain: form.domain || null,
      envFile: form.envFile || null,
    };
    const result = await updateProject(id, payload);
    setSaving(false);

    if (result.success) {
      toast.success('Project updated successfully');
      navigate(`/projects/${id}`);
    } else {
      toast.error(result.error || 'Failed to update project');
    }
  };

  if (isLoading && !form) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!form) return (
    <div className="text-center py-20">
      <p className="text-gray-500 dark:text-gray-400">Project not found</p>
      <Button variant="ghost" onClick={() => navigate('/projects')} className="mt-4">Back to Projects</Button>
    </div>
  );

  return (
    <div>
      <Header
        title="Edit Project"
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: currentProject?.name || 'Project', href: `/projects/${id}` },
          { label: 'Edit' },
        ]}
        onMenuClick={onMenuClick}
      />

      <div className="max-w-2xl space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Core Details */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Icon icon="lucide:folder" className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </span>
              Project Details
            </h2>
            <div className="space-y-4">
              <Input
                label="Project Name *"
                placeholder="e.g. Website Redesign"
                icon="lucide:folder"
                value={form.name}
                onChange={updateField('name')}
                error={errors.name}
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  rows={4}
                  placeholder="Describe what this project aims to achieve..."
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

          {/* Schedule & Status */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <Icon icon="lucide:calendar" className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              </span>
              Schedule & Status
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DatePicker label="Start Date" value={form.startDate} onChange={updateField('startDate')} />
                <DatePicker label="End Date" value={form.endDate} onChange={updateField('endDate')} error={errors.endDate} min={form.startDate} />
              </div>
              <Select label="Status" value={form.status} onChange={updateField('status')} options={STATUS_OPTIONS} />
            </div>
          </div>

          {/* Client */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <Icon icon="lucide:users" className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              </span>
              Client
            </h2>
            <Select
              label="Assign to Client"
              value={form.clientId}
              onChange={updateField('clientId')}
              placeholder="Select client (optional)"
              options={clients.map((c) => ({ value: c._id, label: `${c.name}${c.companyName ? ` — ${c.companyName}` : ''}` }))}
            />
          </div>

          {/* Deployment */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Icon icon="lucide:globe" className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </span>
              Deployment
            </h2>
            <div className="space-y-4">
              <Input
                label="Domain"
                type="url"
                placeholder="https://myproject.com"
                icon="lucide:globe"
                value={form.domain}
                onChange={updateField('domain')}
              />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">.env File</label>
                  <button
                    type="button"
                    onClick={() => envFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Icon icon="lucide:upload" className="w-3.5 h-3.5" />
                    Upload .env file
                  </button>
                </div>
                <input ref={envFileInputRef} type="file" accept=".env,text/plain" onChange={handleEnvFileUpload} className="hidden" />
                <textarea
                  rows={6}
                  placeholder={"DATABASE_URL=\nAPI_KEY=\nSECRET="}
                  value={form.envFile}
                  onChange={updateField('envFile')}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 font-mono
                    focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                    dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500
                    outline-none transition-all duration-150 resize-y"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500">Upload a .env file or paste variables directly.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pb-6">
            <Button type="submit" loading={saving} icon="lucide:check">Save Changes</Button>
            <Button variant="outline" type="button" onClick={() => navigate(`/projects/${id}`)}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
