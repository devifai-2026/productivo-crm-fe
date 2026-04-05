import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import useClientStore from '../store/clientStore';
import useAuthStore from '../store/authStore';
import { uploadAPI, organizationAPI } from '../services/api';
import Header from '../components/layout/Header';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import AddressSearch from '../components/ui/AddressSearch';

const PIPELINE_OPTIONS = [
  { value: 'lead', label: 'Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quotation_sent', label: 'Quotation Sent' },
  { value: 'quotation_revised', label: 'Quotation Revised' },
  { value: 'mvp_shared', label: 'MVP Shared' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
  { value: 'inactive', label: 'Inactive' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\d{7,15}$/;
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const CIN_RE = /^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

function validate(form, isSuperAdmin) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Client name is required';
  if (form.email && !EMAIL_RE.test(form.email)) errors.email = 'Enter a valid email address';
  if (form.phoneNumber && !PHONE_RE.test(form.phoneNumber))
    errors.phoneNumber = 'Phone must be 7-15 digits only';
  if (form.whatsappNumber && !PHONE_RE.test(form.whatsappNumber))
    errors.whatsappNumber = 'WhatsApp must be 7-15 digits only';
  if (form.gstNumber && !GST_RE.test(form.gstNumber.toUpperCase()))
    errors.gstNumber = 'Invalid GST format (e.g. 22AAAAA0000A1Z5)';
  if (form.cinNumber && !CIN_RE.test(form.cinNumber.toUpperCase()))
    errors.cinNumber = 'Invalid CIN format (e.g. U12345MH2020PTC123456)';
  if (isSuperAdmin && !form.organizationId)
    errors.organizationId = 'Please select an organization';
  return errors;
}

export default function CreateClient({ onMenuClick }) {
  const navigate = useNavigate();
  const { createClient, isLoading } = useClientStore();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'superadmin';
  const fileInputRef = useRef(null);

  const [organizations, setOrganizations] = useState([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    whatsappNumber: '',
    companyName: '',
    logo: '',
    gstNumber: '',
    cinNumber: '',
    pipelineStage: 'lead',
    source: '',
    website: '',
    organizationId: '',
  });
  const [sameAsWhatsApp, setSameAsWhatsApp] = useState(false);
  const [address, setAddress] = useState({ street: '', city: '', state: '', zipCode: '', lat: null, lng: null });
  const [isDummyAddress, setIsDummyAddress] = useState(false);
  const [errors, setErrors] = useState({});
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      organizationAPI.get().then((res) => {
        const orgs = res.data?.data || res.data || [];
        setOrganizations(Array.isArray(orgs) ? orgs : []);
      }).catch(() => {});
    }
  }, [isSuperAdmin]);

  const updateField = (field) => (e) => {
    const value = e.target.value;
    const phoneFields = ['phoneNumber', 'whatsappNumber'];
    const v = phoneFields.includes(field) ? value.replace(/\D/g, '') : value;
    setForm((prev) => {
      const next = { ...prev, [field]: v };
      // keep whatsApp in sync if checkbox is on
      if (field === 'phoneNumber' && sameAsWhatsApp) {
        next.whatsappNumber = v;
      }
      return next;
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
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
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadAPI.upload(fd);
      const url = res.data?.data?.url || res.data?.url || '';
      setForm((prev) => ({ ...prev, logo: url }));
    } catch { toast.error('Logo upload failed'); }
    setUploadingLogo(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form, isSuperAdmin);
    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error('Please fix the errors below');
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email || undefined,
      countryCode: '+91',
      phoneNumber: form.phoneNumber || undefined,
      whatsappNumber: form.whatsappNumber || undefined,
      companyName: form.companyName || undefined,
      logo: form.logo || undefined,
      gstNumber: form.gstNumber ? form.gstNumber.toUpperCase() : undefined,
      cinNumber: form.cinNumber ? form.cinNumber.toUpperCase() : undefined,
      pipelineStage: form.pipelineStage,
      source: form.source || undefined,
      website: form.website || undefined,
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

    if (isSuperAdmin && form.organizationId) {
      payload.organizationId = form.organizationId;
    }

    const result = await createClient(payload);
    if (result.success) {
      toast.success('Client created successfully');
      navigate(`/clients/${result.data._id}`);
    } else {
      toast.error(result.error || 'Failed to create client');
    }
  };

  return (
    <div>
      <Header
        title="New Client"
        breadcrumbs={[{ label: 'Clients', href: '/clients' }, { label: 'New Client' }]}
        onMenuClick={onMenuClick}
      />

      <div className="grid lg:grid-cols-3 gap-6 max-w-6xl">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Superadmin: Organization selector */}
            {isSuperAdmin && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800/40 p-6">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                    <Icon icon="lucide:building-2" className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  </span>
                  Organization
                </h2>
                <Select
                  label="Create client on behalf of *"
                  required
                  value={form.organizationId}
                  onChange={updateField('organizationId')}
                  placeholder="Select organization"
                  options={organizations.map((o) => ({ value: o._id, label: o.name }))}
                  error={errors.organizationId}
                />
              </div>
            )}

            {/* Basic Info Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <Icon icon="lucide:user" className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </span>
                Basic Information
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-5">
                  <div
                    className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors overflow-hidden bg-gray-50 dark:bg-gray-800/50 flex-shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {logoPreview || form.logo ? (
                      <img src={logoPreview || form.logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        {uploadingLogo
                          ? <Icon icon="lucide:loader-2" className="w-5 h-5 text-gray-400 animate-spin" />
                          : <Icon icon="lucide:image-plus" className="w-5 h-5 text-gray-400" />}
                        <span className="text-[10px] text-gray-400">Logo</span>
                      </div>
                    )}
                    {(logoPreview || form.logo) && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setLogoPreview(null); setForm((p) => ({ ...p, logo: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <Icon icon="lucide:x" className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <div className="flex-1 space-y-3">
                    <Input
                      label="Client Name *"
                      placeholder="John Smith"
                      icon="lucide:user"
                      value={form.name}
                      onChange={updateField('name')}
                      error={errors.name}
                    />
                    <Input
                      label="Company Name"
                      placeholder="Acme Corp"
                      icon="lucide:building-2"
                      value={form.companyName}
                      onChange={updateField('companyName')}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <Icon icon="lucide:phone" className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                </span>
                Contact Details
              </h2>
              <div className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="client@example.com"
                  icon="lucide:mail"
                  value={form.email}
                  onChange={updateField('email')}
                  error={errors.email}
                />
                <Input
                  label="Website"
                  type="url"
                  placeholder="https://example.com"
                  icon="lucide:globe"
                  value={form.website}
                  onChange={updateField('website')}
                />

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-sm text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 whitespace-nowrap">+91</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="9876543210"
                      value={form.phoneNumber}
                      onChange={updateField('phoneNumber')}
                      className={`flex-1 rounded-r-xl border bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all
                        dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500
                        ${errors.phoneNumber ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                    />
                  </div>
                  {errors.phoneNumber && <p className="text-xs text-red-500 dark:text-red-400">{errors.phoneNumber}</p>}

                  {/* Same as WhatsApp checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer mt-1.5">
                    <input
                      type="checkbox"
                      checked={sameAsWhatsApp}
                      onChange={(e) => handleSameAsWhatsApp(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500/30 accent-green-500"
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
                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-sm text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 whitespace-nowrap">+91</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="9876543210"
                      value={form.whatsappNumber}
                      onChange={updateField('whatsappNumber')}
                      disabled={sameAsWhatsApp}
                      className={`flex-1 rounded-r-xl border bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all
                        dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500
                        ${sameAsWhatsApp ? 'opacity-60 cursor-not-allowed' : ''}
                        ${errors.whatsappNumber ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                    />
                  </div>
                  {errors.whatsappNumber && <p className="text-xs text-red-500 dark:text-red-400">{errors.whatsappNumber}</p>}
                </div>
              </div>
            </div>

            {/* Business Info Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                  <Icon icon="lucide:briefcase" className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                </span>
                Business Details
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="GST Number"
                    placeholder="22AAAAA0000A1Z5"
                    icon="lucide:receipt"
                    value={form.gstNumber}
                    onChange={(e) => { setForm((p) => ({ ...p, gstNumber: e.target.value.toUpperCase() })); if (errors.gstNumber) setErrors((p) => ({ ...p, gstNumber: '' })); }}
                    error={errors.gstNumber}
                  />
                  <Input
                    label="CIN Number"
                    placeholder="U12345MH2020PTC123456"
                    icon="lucide:hash"
                    value={form.cinNumber}
                    onChange={(e) => { setForm((p) => ({ ...p, cinNumber: e.target.value.toUpperCase() })); if (errors.cinNumber) setErrors((p) => ({ ...p, cinNumber: '' })); }}
                    error={errors.cinNumber}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Pipeline Stage"
                    value={form.pipelineStage}
                    onChange={updateField('pipelineStage')}
                    options={PIPELINE_OPTIONS}
                  />
                  <Input
                    label="Lead Source"
                    placeholder="Website, Referral, LinkedIn…"
                    icon="lucide:link"
                    value={form.source}
                    onChange={updateField('source')}
                  />
                </div>
              </div>
            </div>

            {/* Address Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <Icon icon="lucide:map-pin" className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </span>
                Address
              </h2>
              <AddressSearch
                value={address}
                onChange={(fields) => setAddress((prev) => ({ ...prev, ...fields }))}
                isDummy={isDummyAddress}
                onDummyChange={setIsDummyAddress}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" loading={isLoading} icon="lucide:check">Create Client</Button>
              <Button variant="outline" type="button" onClick={() => navigate('/clients')}>Cancel</Button>
            </div>
          </form>
        </div>

        {/* Right Info Panel */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Tips</h3>
            <ul className="space-y-3">
              {[
                { icon: 'lucide:info', text: 'Name is the only required field. All other fields are optional.' },
                { icon: 'lucide:phone', text: 'Check "Same number on WhatsApp" to auto-fill WhatsApp.' },
                { icon: 'lucide:receipt', text: 'GST: 15-character alphanumeric. CIN: 21-character company ID.' },
                { icon: 'lucide:map-pin', text: 'Search for an address or toggle dummy if unknown.' },
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Icon icon={tip.icon} className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{tip.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/40 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                <Icon icon="lucide:git-branch" className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pipeline Stages</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Track your sales progress</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {PIPELINE_OPTIONS.map((s) => (
                <div key={s.value} className={`flex items-center gap-2 text-xs py-1 px-2 rounded-lg transition-colors ${form.pipelineStage === s.value ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                  <Icon icon={form.pipelineStage === s.value ? 'lucide:check-circle' : 'lucide:circle'} className="w-3 h-3" />
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
