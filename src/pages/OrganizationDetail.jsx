import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import useOrganizationStore from '../store/organizationStore';
import useAuthStore from '../store/authStore';
import { organizationAPI, categoryAPI, paymentAccountAPI, uploadAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';

export default function OrganizationDetail({ onMenuClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentOrg, isLoading, fetchOrgById, deleteOrg } = useOrganizationStore();
  const currentUser = useAuthStore((s) => s.user);
  const canDeleteOrg = currentUser?.role === 'superadmin' || currentUser?.role === 'org_admin';
  const canToggleInvoiceAccess = currentUser?.role === 'superadmin' || currentUser?.role === 'product_owner';
  const [togglingInvoiceAccess, setTogglingInvoiceAccess] = useState(false);
  const [showDeleteOrgModal, setShowDeleteOrgModal] = useState(false);
  const [deletingOrg, setDeletingOrg] = useState(false);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberRole, setMemberRole] = useState('employee');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Payment Accounts state
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  // Unified form: all three sections at once
  const [accountForm, setAccountForm] = useState({
    name: '',
    isDefault: false,
    // bank section
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    // upi section
    upiId: '',
    upiHolderName: '',
    // qr section
    qrImageUrl: '',
    qrUpiId: '',
    qrHolderName: '',
  });
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [uploadingQr, setUploadingQr] = useState(false);

  useEffect(() => {
    fetchOrgById(id);
    fetchMembers();
    fetchCategories();
    fetchPaymentAccounts();
  }, [id]);

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const res = await organizationAPI.getMembers(id);
      const data = res.data?.data || res.data || [];
      setMembers(Array.isArray(data) ? data : []);
    } catch {
      // silently fail
    }
    setLoadingMembers(false);
  };

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await categoryAPI.getAll();
      const data = res.data?.data || res.data || [];
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      // silently fail
    }
    setLoadingCategories(false);
  };

  const handleAddMember = async () => {
    if (!memberEmail) {
      setMemberError('Email is required.');
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(memberEmail.trim())) {
      setMemberError('Enter a valid email address.');
      return;
    }
    if (memberName && memberName.trim().length < 2) {
      setMemberError('Name must be at least 2 characters.');
      return;
    }
    const digits = memberPhone.replace(/\D/g, '');
    const validLength = digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
    if (!validLength) {
      setMemberError('Enter a valid 10-digit phone number (or +91 followed by 10 digits).');
      return;
    }
    if (memberPassword && memberPassword.length < 6) {
      setMemberError('Password must be at least 6 characters.');
      return;
    }
    setAddingMember(true);
    setMemberError('');
    try {
      await organizationAPI.addMember(id, {
        email: memberEmail,
        name: memberName || undefined,
        phoneNumber: memberPhone.trim(),
        password: memberPassword || undefined,
        role: memberRole,
      });
      setMemberEmail('');
      setMemberName('');
      setMemberPhone('');
      setMemberPassword('');
      setMemberRole('employee');
      setShowMemberModal(false);
      fetchOrgById(id);
      fetchMembers();
    } catch (err) {
      setMemberError(err.response?.data?.error || 'Failed to add member');
    }
    setAddingMember(false);
  };

  const handleRemoveMember = async (userId) => {
    try {
      await organizationAPI.removeMember(id, userId);
      fetchMembers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await categoryAPI.create({ name: newCategory.trim() });
      setNewCategory('');
      fetchCategories();
    } catch {
      // handle error silently
    }
  };

  const handleDeleteCategory = async (catId) => {
    try {
      await categoryAPI.delete(catId);
      setCategories((prev) => prev.filter((c) => c._id !== catId));
    } catch {
      // handle error silently
    }
  };

  const handleSeedDefaults = async () => {
    try {
      await categoryAPI.seedDefaults();
      fetchCategories();
    } catch {
      // handle error silently
    }
  };

  const handleToggleInvoiceAccess = async () => {
    setTogglingInvoiceAccess(true);
    try {
      await organizationAPI.updateInvoicePermission(id, !org.canViewInvoices);
      fetchOrgById(id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update invoice permission');
    }
    setTogglingInvoiceAccess(false);
  };

  // Payment Accounts handlers
  const fetchPaymentAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await paymentAccountAPI.getAll({ organizationId: id });
      const data = res.data?.data || res.data || [];
      setPaymentAccounts(Array.isArray(data) ? data : []);
    } catch {
      // silently fail
    }
    setLoadingAccounts(false);
  };

  const resetAccountForm = () => {
    setAccountForm({
      name: '',
      isDefault: false,
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      accountHolderName: '',
      upiId: '',
      upiHolderName: '',
      qrImageUrl: '',
      qrUpiId: '',
      qrHolderName: '',
    });
    setEditingAccount(null);
    setAccountError('');
  };

  const openAddAccountModal = () => {
    resetAccountForm();
    setShowAccountModal(true);
  };

  const openEditAccountModal = (account) => {
    setEditingAccount(account);
    // Populate only the section that matches the account type being edited
    const base = {
      name: account.name || account.accountName || '',
      isDefault: account.isDefault || false,
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      accountHolderName: '',
      upiId: '',
      upiHolderName: '',
      qrImageUrl: '',
      qrUpiId: '',
      qrHolderName: '',
    };
    if (account.type === 'bank') {
      base.bankName = account.bankName || '';
      base.accountNumber = account.accountNumber || '';
      base.ifscCode = account.ifscCode || '';
      base.accountHolderName = account.accountHolderName || '';
    } else if (account.type === 'upi') {
      base.upiId = account.upiId || '';
      base.upiHolderName = account.accountHolderName || '';
    } else if (account.type === 'qr') {
      base.qrImageUrl = account.qrImageUrl || '';
      base.qrUpiId = account.upiId || '';
      base.qrHolderName = account.accountHolderName || '';
    }
    setAccountForm(base);
    setAccountError('');
    setShowAccountModal(true);
  };

  const handleSaveAccount = async () => {
    if (!accountForm.name) return;

    const existingTypes = editingAccount ? [] : paymentAccounts.map((a) => a.type);
    const hasBankData = !existingTypes.includes('bank') && (accountForm.bankName || accountForm.accountNumber || accountForm.ifscCode || accountForm.accountHolderName);
    const hasUpiData = !existingTypes.includes('upi') && (accountForm.upiId || accountForm.upiHolderName);
    const hasQrData = !existingTypes.includes('qr') && accountForm.qrImageUrl;

    if (!editingAccount && !hasBankData && !hasUpiData && !hasQrData) {
      const shownTypes = ['Bank', 'UPI', 'QR'].filter((_, i) => !existingTypes.includes(['bank', 'upi', 'qr'][i]));
      setAccountError(`Please fill at least one section — ${shownTypes.join(', ')}.`);
      return;
    }

    setSavingAccount(true);
    setAccountError('');
    try {
      if (editingAccount) {
        // Edit mode: update only the existing single account's section
        const type = editingAccount.type;
        const payload = {
          accountName: accountForm.name,
          name: accountForm.name,
          type,
          isDefault: accountForm.isDefault,
          organizationId: id,
        };
        if (type === 'bank') {
          payload.bankName = accountForm.bankName || undefined;
          payload.accountNumber = accountForm.accountNumber || undefined;
          payload.ifscCode = accountForm.ifscCode || undefined;
          payload.accountHolderName = accountForm.accountHolderName || undefined;
        } else if (type === 'upi') {
          payload.upiId = accountForm.upiId || undefined;
          payload.accountHolderName = accountForm.upiHolderName || undefined;
        } else if (type === 'qr') {
          payload.qrImageUrl = accountForm.qrImageUrl || undefined;
          payload.upiId = accountForm.qrUpiId || undefined;
          payload.accountHolderName = accountForm.qrHolderName || undefined;
        }
        await paymentAccountAPI.update(editingAccount._id, payload);
      } else {
        // Add mode: create a separate account for each filled section
        const creates = [];
        if (hasBankData) {
          creates.push(paymentAccountAPI.create({
            accountName: accountForm.name,
            name: accountForm.name,
            type: 'bank',
            bankName: accountForm.bankName || undefined,
            accountNumber: accountForm.accountNumber || undefined,
            ifscCode: accountForm.ifscCode || undefined,
            accountHolderName: accountForm.accountHolderName || undefined,
            isDefault: accountForm.isDefault && !hasUpiData && !hasQrData,
            organizationId: id,
          }));
        }
        if (hasUpiData) {
          creates.push(paymentAccountAPI.create({
            accountName: accountForm.name,
            name: accountForm.name,
            type: 'upi',
            upiId: accountForm.upiId || undefined,
            accountHolderName: accountForm.upiHolderName || undefined,
            isDefault: accountForm.isDefault && !hasBankData && !hasQrData,
            organizationId: id,
          }));
        }
        if (hasQrData) {
          creates.push(paymentAccountAPI.create({
            accountName: accountForm.name,
            name: accountForm.name,
            type: 'qr',
            qrImageUrl: accountForm.qrImageUrl || undefined,
            upiId: accountForm.qrUpiId || undefined,
            accountHolderName: accountForm.qrHolderName || undefined,
            isDefault: accountForm.isDefault && !hasBankData && !hasUpiData,
            organizationId: id,
          }));
        }
        await Promise.all(creates);
      }
      setShowAccountModal(false);
      resetAccountForm();
      fetchPaymentAccounts();
    } catch (err) {
      setAccountError(err.response?.data?.error || err.response?.data?.message || 'Failed to save account');
    }
    setSavingAccount(false);
  };

  const handleDeleteAccount = async (accountId) => {
    try {
      await paymentAccountAPI.delete(accountId);
      setPaymentAccounts((prev) => prev.filter((a) => a._id !== accountId));
    } catch {
      // silently fail
    }
  };

  const handleSetDefault = async (accountId) => {
    try {
      await paymentAccountAPI.setDefault(accountId);
      fetchPaymentAccounts();
    } catch {
      // silently fail
    }
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'qr-codes');
      const res = await uploadAPI.upload(formData);
      const url = res.data?.data?.url || res.data?.url;
      if (url) setAccountForm((prev) => ({ ...prev, qrImageUrl: url }));
    } catch {
      setAccountError('Failed to upload QR image');
    }
    setUploadingQr(false);
  };

  const handleDeleteOrg = async () => {
    setDeletingOrg(true);
    const result = await deleteOrg(id);
    setDeletingOrg(false);
    if (result.success) navigate('/organizations');
  };

  if (isLoading && !currentOrg) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400">Organization not found</p>
        <Button variant="ghost" onClick={() => navigate('/organizations')} className="mt-4">
          Back to Organizations
        </Button>
      </div>
    );
  }

  const org = currentOrg;

  // Route all Drive image URLs through our backend proxy to avoid CORS/embedding issues
  const fixDriveUrl = (url) => {
    if (!url) return null;
    // Already a proxy URL — return as-is
    if (url.startsWith('/api/v1/image-proxy')) return url;
    // lh3.googleusercontent.com/d/FILE_ID
    const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (lh3Match) return `/api/v1/image-proxy?id=${lh3Match[1]}`;
    // drive.google.com/uc?id=FILE_ID
    const ucMatch = url.match(/drive\.google\.com\/uc\?[^"]*id=([a-zA-Z0-9_-]+)/);
    if (ucMatch) return `/api/v1/image-proxy?id=${ucMatch[1]}`;
    return url;
  };
  const logoUrl = fixDriveUrl(org.logo);

  const address = org.address;
  const addressStr = address
    ? [address.street, address.city, address.state, address.zipCode].filter(Boolean).join(', ')
    : null;

  return (
    <div>
      <Header
        title={org.name}
        breadcrumbs={[
          { label: 'Organizations', href: '/organizations' },
          { label: org.name },
        ]}
        onMenuClick={onMenuClick}
      >
        {canDeleteOrg && (
          <Button
            variant="ghost"
            size="sm"
            icon="lucide:trash-2"
            onClick={() => setShowDeleteOrgModal(true)}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Delete Org
          </Button>
        )}
      </Header>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Members */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Members ({members.filter((m) => m.role !== 'superadmin').length})
              </h3>
              <Button
                size="sm"
                variant="ghost"
                icon="lucide:plus"
                onClick={() => setShowMemberModal(true)}
              >
                Add Member
              </Button>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {loadingMembers ? (
                <div className="px-5 py-10 text-center">
                  <Spinner />
                </div>
              ) : members.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500">No members yet</p>
                </div>
              ) : (
                members.map((member) => {
                  const roleColor = {
                    superadmin: 'blue',
                    org_admin: 'purple',
                    employee: 'gray',
                  };
                  const roleLabel = {
                    superadmin: 'Super Admin',
                    org_admin: 'Admin',
                    employee: 'Employee',
                  };
                  return (
                    <div
                      key={member._id}
                      className="flex items-center gap-4 px-5 py-3.5 group"
                    >
                      <Avatar name={member.name || member.email} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {member.name || member.email}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {member.email}
                        </p>
                      </div>
                      <Badge color={roleColor[member.role] || 'gray'}>
                        {roleLabel[member.role] || member.role}
                      </Badge>
                      {member.role !== 'superadmin' && member._id !== currentUser?._id && (
                        currentUser?.role === 'superadmin' ||
                        (currentUser?.role === 'org_admin' && member.role === 'employee')
                      ) && (
                        <button
                          onClick={() => handleRemoveMember(member._id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove member"
                        >
                          <Icon icon="lucide:x" className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Invoice Access — superadmin controls whether org_admins can view invoices */}
          {canToggleInvoiceAccess && (
            <Card>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                  <Icon icon="lucide:file-text" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Invoice Access for Admins</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {org.canViewInvoices
                      ? 'Org admins can view, create and manage invoices in this organization.'
                      : 'Org admins cannot view invoices. Only superadmin has access.'}
                  </p>
                </div>
                <button
                  onClick={handleToggleInvoiceAccess}
                  disabled={togglingInvoiceAccess}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                    ${org.canViewInvoices ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
                    ${togglingInvoiceAccess ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={org.canViewInvoices ? 'Revoke invoice access' : 'Grant invoice access'}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${org.canViewInvoices ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </Card>
          )}

          {/* Categories */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Categories ({categories.length})
              </h3>
              <Button
                size="sm"
                variant="ghost"
                icon="lucide:sparkles"
                onClick={handleSeedDefaults}
              >
                Seed Defaults
              </Button>
            </div>
            <div className="p-5">
              {/* Add new category */}
              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="New category name..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handleAddCategory}
                  icon="lucide:plus"
                  disabled={!newCategory.trim()}
                >
                  Add
                </Button>
              </div>

              {/* Category list */}
              {loadingCategories ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : categories.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                  No categories yet. Add one or seed defaults.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <span
                      key={cat._id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 group"
                    >
                      {cat.name}
                      <button
                        onClick={() => handleDeleteCategory(cat._id)}
                        className="p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Icon icon="lucide:x" className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Payment Accounts */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Payment Accounts ({paymentAccounts.length})
              </h3>
              {!(['bank', 'upi', 'qr'].every((t) => paymentAccounts.some((a) => a.type === t))) && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon="lucide:plus"
                  onClick={openAddAccountModal}
                >
                  Add Account
                </Button>
              )}
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {loadingAccounts ? (
                <div className="px-5 py-10 text-center">
                  <Spinner />
                </div>
              ) : paymentAccounts.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <Icon icon="lucide:credit-card" className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 dark:text-gray-500">No payment accounts yet</p>
                </div>
              ) : (
                paymentAccounts.map((account) => (
                  <div
                    key={account._id}
                    className="flex items-center gap-4 px-5 py-3.5 group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                      {account.type === 'qr' && account.qrImageUrl ? (
                        <img src={fixDriveUrl(account.qrImageUrl)} alt="QR" className="w-9 h-9 object-cover" />
                      ) : (
                        <Icon
                          icon={account.type === 'upi' ? 'lucide:smartphone' : account.type === 'qr' ? 'lucide:qr-code' : 'lucide:landmark'}
                          className="w-4 h-4 text-gray-500 dark:text-gray-400"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {account.name || account.accountName || 'Account'}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {account.type === 'upi'
                          ? `UPI: ${account.upiId || '--'}`
                          : account.type === 'qr'
                            ? 'QR Code'
                            : `${account.bankName || 'Bank'} - ${account.accountNumber ? '****' + account.accountNumber.slice(-4) : '--'}`
                        }
                      </p>
                    </div>
                    <Badge color={account.type === 'upi' ? 'purple' : account.type === 'qr' ? 'green' : 'blue'}>
                      {account.type === 'upi' ? 'UPI' : account.type === 'qr' ? 'QR' : 'Bank'}
                    </Badge>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditAccountModal(account)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Edit account"
                      >
                        <Icon icon="lucide:pencil" className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account._id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete account"
                      >
                        <Icon icon="lucide:trash-2" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                {logoUrl ? (
                  <img src={logoUrl} alt={org.name} className="w-14 h-14 rounded-2xl object-cover" />
                ) : (
                  <Icon icon="lucide:building-2" className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-3">
                {org.name}
              </h3>
            </div>
            <div className="space-y-3">
              {org.cinNumber && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl">
                  <Icon icon="lucide:hash" className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">CIN</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{org.cinNumber}</p>
                  </div>
                </div>
              )}

              {org.taxPercentage !== undefined && org.taxPercentage !== null && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl">
                  <Icon icon="lucide:percent" className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Tax</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{org.taxPercentage}%</p>
                  </div>
                </div>
              )}

              {org.website && (
                <a
                  href={org.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <Icon icon="lucide:globe" className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{org.website}</span>
                </a>
              )}

              {org.phone && (
                <a
                  href={`tel:${org.phone}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <Icon icon="lucide:phone" className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{org.phone}</span>
                </a>
              )}

              {addressStr && (
                <div className="flex items-start gap-3 p-2.5">
                  <Icon icon="lucide:map-pin" className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{addressStr}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        title="Add Member"
        size="sm"
      >
        <div className="space-y-4">
          {memberError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
              {memberError}
            </div>
          )}
          <Input
            label="Email"
            type="email"
            placeholder="member@example.com"
            icon="lucide:mail"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            required
          />
          <Input
            label="Full Name"
            placeholder="John Doe"
            icon="lucide:user"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
          />
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+91 98765 43210"
            icon="lucide:phone"
            value={memberPhone}
            onChange={(e) => setMemberPhone(e.target.value)}
            required
          />
          <Input
            label="Password (for new users)"
            type="password"
            placeholder="Min 6 characters"
            icon="lucide:lock"
            value={memberPassword}
            onChange={(e) => setMemberPassword(e.target.value)}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">
            If this email isn't registered yet, an account will be created automatically.
          </p>
          <Select
            label="Role"
            value={memberRole}
            onChange={(e) => setMemberRole(e.target.value)}
            options={
              currentUser?.role === 'superadmin'
                ? [{ value: 'employee', label: 'Employee' }, { value: 'org_admin', label: 'Admin' }]
                : [{ value: 'employee', label: 'Employee' }]
            }
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => { setShowMemberModal(false); setMemberError(''); }}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} loading={addingMember} disabled={!memberEmail || !memberPhone}>
              Add Member
            </Button>
          </div>
        </div>
      </Modal>

      {/* Payment Account Modal */}
      <Modal
        isOpen={showAccountModal}
        onClose={() => { setShowAccountModal(false); resetAccountForm(); }}
        title={editingAccount ? `Edit ${editingAccount.type === 'bank' ? 'Bank Account' : editingAccount.type === 'upi' ? 'UPI' : 'QR Code'}` : 'Add Payment Account'}
        size="md"
      >
        <div className="space-y-5">
          {accountError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
              {accountError}
            </div>
          )}

          <Input
            label="Account Name *"
            placeholder="e.g. Devifai Business Account"
            icon="lucide:credit-card"
            value={accountForm.name}
            onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
            required
          />

          {!editingAccount && (() => {
            const existingTypes = paymentAccounts.map((a) => a.type);
            const missing = ['bank', 'upi', 'qr'].filter((t) => !existingTypes.includes(t));
            if (missing.length === 0) return null;
            return (
              <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">
                Fill any section below — each filled section will be saved as a separate payment method.
              </p>
            );
          })()}

          {/* Bank Account Section */}
          {(editingAccount ? editingAccount.type === 'bank' : !paymentAccounts.some((a) => a.type === 'bank')) && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon icon="lucide:landmark" className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Bank Account</span>
              </div>
              <Input
                label="Bank Name"
                placeholder="e.g. State Bank of India"
                value={accountForm.bankName}
                onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
              />
              <Input
                label="Account Number"
                placeholder="Account number"
                icon="lucide:hash"
                value={accountForm.accountNumber}
                onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
              />
              <Input
                label="IFSC Code"
                placeholder="e.g. SBIN0001234"
                value={accountForm.ifscCode}
                onChange={(e) => setAccountForm({ ...accountForm, ifscCode: e.target.value })}
              />
              <Input
                label="Account Holder Name"
                placeholder="Name as on bank account"
                icon="lucide:user"
                value={accountForm.accountHolderName}
                onChange={(e) => setAccountForm({ ...accountForm, accountHolderName: e.target.value })}
              />
            </div>
          )}

          {/* UPI Section */}
          {(editingAccount ? editingAccount.type === 'upi' : !paymentAccounts.some((a) => a.type === 'upi')) && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon icon="lucide:smartphone" className="w-4 h-4 text-green-500" />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">UPI</span>
              </div>
              <Input
                label="UPI ID"
                placeholder="e.g. business@upi"
                icon="lucide:smartphone"
                value={accountForm.upiId}
                onChange={(e) => setAccountForm({ ...accountForm, upiId: e.target.value })}
              />
              <Input
                label="Account Holder Name"
                placeholder="Name on UPI account"
                icon="lucide:user"
                value={accountForm.upiHolderName}
                onChange={(e) => setAccountForm({ ...accountForm, upiHolderName: e.target.value })}
              />
            </div>
          )}

          {/* QR Code Section */}
          {(editingAccount ? editingAccount.type === 'qr' : !paymentAccounts.some((a) => a.type === 'qr')) && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon icon="lucide:qr-code" className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">QR Code</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">QR Code Image</label>
                {accountForm.qrImageUrl ? (
                  <div className="space-y-2">
                    <img
                      src={fixDriveUrl(accountForm.qrImageUrl)}
                      alt="QR Code"
                      className="w-36 h-36 object-contain border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setAccountForm((prev) => ({ ...prev, qrImageUrl: '' }))}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      Remove QR
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-colors">
                    {uploadingQr ? (
                      <span className="text-sm text-gray-400">Uploading...</span>
                    ) : (
                      <>
                        <Icon icon="lucide:upload" className="w-5 h-5 text-gray-400 mb-1.5" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">Click to upload QR image</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">PNG, JPG, WEBP</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} disabled={uploadingQr} />
                  </label>
                )}
              </div>
              <Input
                label="UPI ID (optional)"
                placeholder="Linked UPI ID"
                icon="lucide:smartphone"
                value={accountForm.qrUpiId}
                onChange={(e) => setAccountForm({ ...accountForm, qrUpiId: e.target.value })}
              />
              <Input
                label="Account Holder Name"
                placeholder="Name on account"
                icon="lucide:user"
                value={accountForm.qrHolderName}
                onChange={(e) => setAccountForm({ ...accountForm, qrHolderName: e.target.value })}
              />
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => { setShowAccountModal(false); resetAccountForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveAccount} loading={savingAccount} disabled={!accountForm.name}>
              {editingAccount ? 'Update' : 'Add Account'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Org Modal */}
      <Modal isOpen={showDeleteOrgModal} onClose={() => setShowDeleteOrgModal(false)} title="Delete Organization" size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Are you sure you want to delete <strong>{org.name}</strong>?
        </p>
        <p className="text-sm text-red-600 dark:text-red-400 mb-6">
          This will remove the organization and disconnect all members. This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setShowDeleteOrgModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteOrg} loading={deletingOrg}>Delete Organization</Button>
        </div>
      </Modal>
    </div>
  );
}
