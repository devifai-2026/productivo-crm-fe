import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import useAuthStore from '../store/authStore';
import { organizationAPI, uploadAPI } from '../services/api';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function SetupOrg() {
  const navigate = useNavigate();
  const { initialize } = useAuthStore();
  const fileRef = useRef(null);

  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    website: '',
    cinNumber: '',
    taxPercentage: '18',
    street: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const updateField = (field) => (e) =>
    setForm({ ...form, [field]: e.target.value });

  const handleLogoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'logos');
      const res = await uploadAPI.upload(formData);
      setLogoUrl(res.data?.data?.url || res.data?.url || '');
    } catch {
      setError('Failed to upload logo');
      setLogoPreview(null);
    }
    setUploading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Organization name is required');
      return;
    }
    setIsLoading(true);
    setError('');

    const payload = {
      name: form.name,
      phone: form.phone || undefined,
      website: form.website || undefined,
      cinNumber: form.cinNumber || undefined,
      taxPercentage: form.taxPercentage ? parseFloat(form.taxPercentage) : 18,
      logo: logoUrl || undefined,
    };

    if (form.street || form.city || form.state || form.zipCode) {
      payload.address = {
        street: form.street,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
      };
    }

    try {
      await organizationAPI.create(payload);
      await initialize(); // Re-fetch user profile with org
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create organization');
    }
    setIsLoading(false);
  };

  // Choose mode screen
  if (!mode) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center mx-auto mb-4">
              <Icon icon="lucide:building-2" className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              Set up your organization
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Create a new organization or ask your admin to add you
            </p>
          </div>

          <Card
            hover
            onClick={() => setMode('create')}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Icon icon="lucide:plus" className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-50">Create Organization</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Start a new organization and become its admin
                </p>
              </div>
              <Icon icon="lucide:chevron-right" className="w-5 h-5 text-gray-400 ml-auto" />
            </div>
          </Card>

          <Card className="opacity-60">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Icon icon="lucide:user-plus" className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-50">Join Organization</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ask your org admin to add your email as a member
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Create org form
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        <button
          onClick={() => setMode(null)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6"
        >
          <Icon icon="lucide:arrow-left" className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-1">
          Create your organization
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          You'll be the admin. You can add team members later.
        </p>

        <Card>
          <form onSubmit={handleCreate} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Logo */}
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative group">
                  <img src={logoPreview} alt="" className="w-16 h-16 rounded-2xl object-cover border border-gray-200 dark:border-gray-700" />
                  {uploading && (
                    <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                      <Icon icon="lucide:loader-2" className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center hover:border-blue-400 transition-colors"
                >
                  <Icon icon="lucide:image-plus" className="w-6 h-6 text-gray-400" />
                </button>
              )}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Company Logo</p>
                <p className="text-xs text-gray-400">Optional • PNG, JPG</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
            </div>

            <Input label="Organization Name" placeholder="Acme Inc." value={form.name} onChange={updateField('name')} required />

            <div className="grid grid-cols-2 gap-4">
              <Input label="CIN Number" placeholder="U12345MH2020PTC123456" value={form.cinNumber} onChange={updateField('cinNumber')} />
              <Input label="Tax %" type="number" placeholder="18" value={form.taxPercentage} onChange={updateField('taxPercentage')} min="0" max="100" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Phone" placeholder="+91 12345 67890" value={form.phone} onChange={updateField('phone')} />
              <Input label="Website" placeholder="https://acme.com" value={form.website} onChange={updateField('website')} />
            </div>

            <Input label="Street" placeholder="123 Main St" value={form.street} onChange={updateField('street')} />
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="City" value={form.city} onChange={updateField('city')} />
              <Input placeholder="State" value={form.state} onChange={updateField('state')} />
              <Input placeholder="ZIP" value={form.zipCode} onChange={updateField('zipCode')} />
            </div>

            <Button type="submit" loading={isLoading} disabled={uploading} className="w-full">
              Create Organization
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
