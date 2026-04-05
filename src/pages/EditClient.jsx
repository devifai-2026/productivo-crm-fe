import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import useClientStore from '../store/clientStore';
import { uploadAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import AddressSearch from '../components/ui/AddressSearch';

const PIPELINE_OPTIONS = [
  { value: 'lead', label: 'Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quotation_sent', label: 'Quotation Sent' },
  { value: 'quotation_revised', label: 'Quotation Revised' },
  { value: 'mvp_shared', label: 'MVP Shared' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
];

export default function EditClient({ onMenuClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentClient, isLoading, fetchClient, updateClient } = useClientStore();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(null);
  const [sameAsWhatsApp, setSameAsWhatsApp] = useState(false);
  const [address, setAddress] = useState({ street: '', city: '', state: '', zipCode: '', lat: null, lng: null });
  const [isDummyAddress, setIsDummyAddress] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClient(id);
  }, [id]);

  useEffect(() => {
    if (currentClient) {
      const phone = currentClient.phoneNumber || '';
      const wa = currentClient.whatsappNumber || '';
      setForm({
        name: currentClient.name || '',
        email: currentClient.email || '',
        countryCode: currentClient.countryCode || '+91',
        phoneNumber: phone,
        whatsappNumber: wa,
        companyName: currentClient.companyName || '',
        logo: currentClient.logo || '',
        gstNumber: currentClient.gstNumber || '',
        cinNumber: currentClient.cinNumber || '',
        pipelineStage: currentClient.pipelineStage || 'lead',
        source: currentClient.source || '',
        website: currentClient.website || '',
      });
      setSameAsWhatsApp(phone && wa && phone === wa);
      setIsDummyAddress(currentClient.isDummyAddress || false);
      setAddress({
        street: currentClient.address?.street || '',
        city: currentClient.address?.city || '',
        state: currentClient.address?.state || '',
        zipCode: currentClient.address?.zipCode || '',
        lat: currentClient.addressLat || null,
        lng: currentClient.addressLng || null,
      });
    }
  }, [currentClient]);

  const updateField = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'phoneNumber' && sameAsWhatsApp) {
        next.whatsappNumber = value;
      }
      return next;
    });
  };

  const handleSameAsWhatsApp = (checked) => {
    setSameAsWhatsApp(checked);
    if (checked) {
      setForm((prev) => ({ ...prev, whatsappNumber: prev.phoneNumber }));
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadAPI.upload(formData);
      const url = res.data?.data?.url || res.data?.url || '';
      setForm((prev) => ({ ...prev, logo: url }));
    } catch { /* silently fail */ }
    setUploadingLogo(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      name: form.name,
      email: form.email || null,
      countryCode: form.countryCode || '+91',
      phoneNumber: form.phoneNumber || null,
      whatsappNumber: form.whatsappNumber || null,
      companyName: form.companyName || null,
      logo: form.logo || null,
      gstNumber: form.gstNumber || null,
      cinNumber: form.cinNumber || null,
      pipelineStage: form.pipelineStage,
      source: form.source || null,
      website: form.website || null,
      isDummyAddress,
    };

    if (!isDummyAddress) {
      payload.address = {
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        zipCode: address.zipCode || '',
      };
      if (address.lat) payload.addressLat = address.lat;
      if (address.lng) payload.addressLng = address.lng;
    }

    const result = await updateClient(id, payload);
    setSaving(false);
    if (result.success) {
      navigate(`/clients/${id}`);
    } else {
      setError(result.error || 'Failed to update client.');
    }
  };

  if (isLoading && !form) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!form) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400">Client not found</p>
        <Button variant="ghost" onClick={() => navigate('/clients')} className="mt-4">Back to Clients</Button>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Edit Client"
        breadcrumbs={[{ label: 'Clients', href: '/clients' }, { label: currentClient?.name || 'Client', href: `/clients/${id}` }, { label: 'Edit' }]}
        onMenuClick={onMenuClick}
      />
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <Input label="Name *" placeholder="Client name" icon="lucide:user" value={form.name} onChange={updateField('name')} required />
          <Input label="Company Name" placeholder="Company or business name" icon="lucide:building-2" value={form.companyName} onChange={updateField('companyName')} />

          {/* Logo Upload */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Logo</label>
            <div className="flex items-center gap-4">
              {(logoPreview || form.logo) ? (
                <div className="relative">
                  <img src={logoPreview || form.logo} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-gray-200 dark:border-gray-700" />
                  <button type="button" onClick={() => { setLogoPreview(null); setForm((p) => ({ ...p, logo: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <Icon icon="lucide:x" className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors">
                  {uploadingLogo ? <Icon icon="lucide:loader-2" className="w-5 h-5 text-gray-400 animate-spin" /> : <Icon icon="lucide:image-plus" className="w-5 h-5 text-gray-400" />}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                {form.logo ? 'Change logo' : 'Upload logo'}
              </button>
            </div>
          </div>

          <Input label="Email" type="email" placeholder="client@example.com" icon="lucide:mail" value={form.email} onChange={updateField('email')} />
          <Input label="Website" type="url" placeholder="https://example.com" icon="lucide:globe" value={form.website} onChange={updateField('website')} />

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-sm text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400">+91</span>
              <input type="tel" placeholder="98765 43210" value={form.phoneNumber} onChange={updateField('phoneNumber')} className="flex-1 rounded-r-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500 outline-none transition-all" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-1.5">
              <input
                type="checkbox"
                checked={sameAsWhatsApp}
                onChange={(e) => handleSameAsWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-green-500"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Icon icon="ri:whatsapp-fill" className="w-3.5 h-3.5 text-green-500" />
                Same number on WhatsApp
              </span>
            </label>
          </div>

          {/* WhatsApp */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Icon icon="ri:whatsapp-fill" className="w-4 h-4 text-green-500" />
              WhatsApp
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-sm text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400">+91</span>
              <input
                type="tel"
                placeholder="98765 43210"
                value={form.whatsappNumber}
                onChange={updateField('whatsappNumber')}
                disabled={sameAsWhatsApp}
                className={`flex-1 rounded-r-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500 outline-none transition-all ${sameAsWhatsApp ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="GST Number" placeholder="22AAAAA0000A1Z5 (optional)" icon="lucide:receipt" value={form.gstNumber} onChange={updateField('gstNumber')} />
            <Input label="CIN Number" placeholder="U12345MH2020PTC123456 (optional)" icon="lucide:hash" value={form.cinNumber} onChange={updateField('cinNumber')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Pipeline Stage" value={form.pipelineStage} onChange={updateField('pipelineStage')} options={PIPELINE_OPTIONS} />
            <Input label="Source" placeholder="e.g. Website, Referral, LinkedIn" icon="lucide:link" value={form.source} onChange={updateField('source')} />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Icon icon="lucide:map-pin" className="w-4 h-4 text-gray-400" />
              Address
            </label>
            <AddressSearch
              value={address}
              onChange={(fields) => setAddress((prev) => ({ ...prev, ...fields }))}
              isDummy={isDummyAddress}
              onDummyChange={setIsDummyAddress}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" loading={saving}>Save Changes</Button>
            <Button variant="outline" type="button" onClick={() => navigate(`/clients/${id}`)}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
