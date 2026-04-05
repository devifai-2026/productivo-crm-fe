import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import useProjectStore from '../store/projectStore';
import useClientStore from '../store/clientStore';
import Header from '../components/layout/Header';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import SearchableSelect from '../components/ui/SearchableSelect';
import Button from '../components/ui/Button';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
];

const STATUS_META = {
  active: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'lucide:play-circle', desc: 'Project is currently in progress' },
  on_hold: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'lucide:pause-circle', desc: 'Project is paused temporarily' },
  completed: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'lucide:check-circle', desc: 'Project has been completed' },
};

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Project name is required';
  else if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  if (form.startDate && form.endDate && form.endDate < form.startDate)
    errors.endDate = 'End date must be after start date';
  return errors;
}

export default function CreateProject({ onMenuClick }) {
  const navigate = useNavigate();
  const { createProject, isLoading } = useProjectStore();
  const { clients, fetchClients } = useClientStore();
  const [errors, setErrors] = useState({});
  const envFileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    client: '',
    startDate: '',
    endDate: '',
    status: 'active',
    domain: '',
    envFile: '',
  });

  useEffect(() => { fetchClients(); }, []);

  const updateField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleEnvFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((prev) => ({ ...prev, envFile: ev.target.result }));
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

    const payload = { name: form.name.trim(), description: form.description, status: form.status };
    if (form.client) payload.clientId = form.client;
    if (form.startDate) payload.startDate = form.startDate;
    if (form.endDate) payload.endDate = form.endDate;
    if (form.domain) payload.domain = form.domain;
    if (form.envFile) payload.envFile = form.envFile;

    const result = await createProject(payload);
    if (result.success) {
      toast.success('Project created successfully');
      navigate('/projects');
    } else {
      toast.error(result.error || 'Failed to create project');
    }
  };

  const statusMeta = STATUS_META[form.status] || STATUS_META.active;
  const selectedClient = clients.find((c) => c._id === form.client);

  return (
    <div>
      <Header
        title="New Project"
        breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'New Project' }]}
        onMenuClick={onMenuClick}
      />

      <div className="grid lg:grid-cols-3 gap-6 max-w-6xl">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">

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
                <Input label="Start Date" type="date" value={form.startDate} onChange={updateField('startDate')} />
                <Input label="End Date" type="date" value={form.endDate} onChange={updateField('endDate')} error={errors.endDate} />
              </div>
              <Select
                label="Status"
                value={form.status}
                onChange={updateField('status')}
                options={STATUS_OPTIONS}
              />
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
            <SearchableSelect
              label="Assign to Client"
              value={form.client}
              onChange={(val) => {
                setForm((prev) => ({ ...prev, client: val }));
                if (errors.client) setErrors((prev) => ({ ...prev, client: '' }));
              }}
              placeholder="Search client (optional)"
              options={clients.map((c) => ({
                value: c._id,
                label: c.name,
                meta: c.companyName || c.email || undefined,
              }))}
            />
            {selectedClient && (
              <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
                  {selectedClient.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedClient.name}</p>
                  {selectedClient.email && <p className="text-xs text-gray-500 dark:text-gray-400">{selectedClient.email}</p>}
                </div>
              </div>
            )}
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

          <div className="flex gap-3">
            <Button type="submit" loading={isLoading} icon="lucide:check" onClick={handleSubmit}>Create Project</Button>
            <Button variant="outline" type="button" onClick={() => navigate('/projects')}>Cancel</Button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Status Preview */}
          <div className={`rounded-2xl border p-5 transition-colors ${statusMeta.bg} border-gray-100 dark:border-gray-800`}>
            <div className="flex items-center gap-3 mb-2">
              <Icon icon={statusMeta.icon} className={`w-5 h-5 ${statusMeta.color}`} />
              <p className={`text-sm font-semibold ${statusMeta.color}`}>{STATUS_OPTIONS.find((s) => s.value === form.status)?.label}</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{statusMeta.desc}</p>
          </div>

          {/* Timeline Preview */}
          {(form.startDate || form.endDate) && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Timeline</p>
              <div className="space-y-3">
                {form.startDate && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Start</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {new Date(form.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
                {form.endDate && (
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${errors.endDate ? 'bg-red-500' : 'bg-blue-500'}`} />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">End</p>
                      <p className={`text-sm font-medium ${errors.endDate ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
                        {new Date(form.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Quick Tips</p>
            <ul className="space-y-2.5">
              {[
                'Project name is required. Keep it short and descriptive.',
                'Assign a client to link this project to your CRM.',
                'Set start and end dates to track your project timeline.',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Icon icon="lucide:info" className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
