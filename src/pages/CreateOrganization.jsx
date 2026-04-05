import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import useOrganizationStore from '../store/organizationStore';
import { uploadAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import AddressSearch from '../components/ui/AddressSearch';

export default function CreateOrganization({ onMenuClick }) {
  const navigate = useNavigate();
  const { createOrg } = useOrganizationStore();
  const fileRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    website: '',
    cinNumber: '',
    taxPercentage: '',
  });

  const [address, setAddress] = useState({ street: '', city: '', state: '', zipCode: '', lat: null, lng: null });
  const [isDummyAddress, setIsDummyAddress] = useState(false);

  const updateField = (field) => (e) =>
    setForm({ ...form, [field]: e.target.value });

  const handleAddressChange = (fields) => setAddress((prev) => ({ ...prev, ...fields }));

  const handleLogoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'logos');
      const res = await uploadAPI.upload(formData);
      const url = res.data?.data?.url || res.data?.url;
      setLogoUrl(url);
    } catch {
      setError('Failed to upload logo. Try again.');
      setLogoPreview(null);
    }
    setUploading(false);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoUrl('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const payload = {
      name: form.name,
      phone: form.phone || undefined,
      website: form.website || undefined,
      cinNumber: form.cinNumber || undefined,
      taxPercentage: form.taxPercentage ? parseFloat(form.taxPercentage) : undefined,
      logo: logoUrl || undefined,
      isDummyAddress,
    };

    if (!isDummyAddress) {
      const hasAddr = address.street || address.city || address.state || address.zipCode;
      if (hasAddr) {
        payload.address = {
          street: address.street || undefined,
          city: address.city || undefined,
          state: address.state || undefined,
          zipCode: address.zipCode || undefined,
        };
        if (address.lat) payload.addressLat = address.lat;
        if (address.lng) payload.addressLng = address.lng;
      }
    }

    const result = await createOrg(payload);
    setIsLoading(false);

    if (result.success) {
      navigate(`/organizations/${result.org._id}`);
    } else {
      setError(result.error);
    }
  };

  return (
    <div>
      <Header
        title="New Organization"
        breadcrumbs={[
          { label: 'Organizations', href: '/organizations' },
          { label: 'New Organization' },
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

          {/* Logo Upload */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Logo
            </label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative group">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-20 h-20 rounded-2xl object-cover border border-gray-200 dark:border-gray-700"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icon icon="lucide:x" className="w-3.5 h-3.5" />
                  </button>
                  {uploading && (
                    <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                      <Icon icon="lucide:loader-2" className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center gap-1 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                >
                  <Icon icon="lucide:upload" className="w-5 h-5 text-gray-400" />
                  <span className="text-[10px] text-gray-400">Upload</span>
                </button>
              )}
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p>Upload your company logo</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">PNG, JPG up to 10MB</p>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleLogoSelect}
              className="hidden"
            />
          </div>

          <Input
            label="Organization Name"
            placeholder="Enter organization name"
            icon="lucide:building-2"
            value={form.name}
            onChange={updateField('name')}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone"
              type="tel"
              placeholder="+91 12345 67890"
              icon="lucide:phone"
              value={form.phone}
              onChange={updateField('phone')}
            />
            <Input
              label="Website"
              placeholder="https://yourcompany.com"
              icon="lucide:globe"
              value={form.website}
              onChange={updateField('website')}
            />
          </div>

          {/* Address with search */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Icon icon="lucide:map-pin" className="w-4 h-4 text-gray-400" />
              Address
            </label>
            <AddressSearch
              value={address}
              onChange={handleAddressChange}
              isDummy={isDummyAddress}
              onDummyChange={setIsDummyAddress}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="CIN Number"
              placeholder="Corporate Identification Number"
              icon="lucide:hash"
              value={form.cinNumber}
              onChange={updateField('cinNumber')}
            />
            <Input
              label="Tax Percentage"
              type="number"
              placeholder="e.g. 18"
              icon="lucide:percent"
              value={form.taxPercentage}
              onChange={updateField('taxPercentage')}
              min="0"
              max="100"
              step="0.01"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" loading={isLoading} disabled={uploading}>
              Create Organization
            </Button>
            <Button variant="outline" type="button" onClick={() => navigate('/organizations')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
