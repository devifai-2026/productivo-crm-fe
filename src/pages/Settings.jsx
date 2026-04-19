import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { authAPI, categoryAPI, organizationAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';

function ProfileField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{value || '—'}</p>
    </div>
  );
}

export default function Settings({ onMenuClick }) {
  const { user, logout, refreshProfile } = useAuthStore();
  const { isDark, mode, setMode } = useThemeStore();

  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [showMpinModal, setShowMpinModal] = useState(false);
  const [mpin, setMpin] = useState('');
  const [mpinConfirm, setMpinConfirm] = useState('');
  const [mpinError, setMpinError] = useState('');
  const [mpinLoading, setMpinLoading] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Phone profile flow
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [phoneRequests, setPhoneRequests] = useState([]);
  const [pendingRequestExists, setPendingRequestExists] = useState(false);
  const [reviewingId, setReviewingId] = useState(null); // id of request currently being approved/rejected

  const isSuperadmin = user?.role === 'superadmin';
  const phoneEditWindowActive = user?.phoneEditUntil && new Date(user.phoneEditUntil) > new Date();

  useEffect(() => {
    fetchCategories();
    if (isSuperadmin) fetchPhoneRequests();
    checkExistingRequest();
  }, [isSuperadmin]);

  const fetchPhoneRequests = async () => {
    try {
      const res = await authAPI.listPhoneRequests();
      setPhoneRequests(res.data?.data || []);
    } catch {}
  };

  const checkExistingRequest = async () => {
    // cheapest check: a successful request-change POST returns pending:true if one exists —
    // but we don't want to create one. Skip silently — the UI will show a toast from the POST handler.
  };

  const handleSavePhone = async () => {
    const trimmed = phoneInput.trim();
    if (!trimmed) return toast.error('Phone number is required.');
    const digits = trimmed.replace(/\D/g, '');
    const validLength = digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
    if (!validLength) {
      toast.error('Enter a valid 10-digit phone number (or +91 followed by 10 digits).');
      return;
    }
    setPhoneBusy(true);
    try {
      if (!user?.phoneNumber) {
        await authAPI.setPhone(phoneInput.trim());
        toast.success('Phone number saved.');
      } else {
        await authAPI.updatePhone(phoneInput.trim());
        toast.success('Phone number updated.');
      }
      setPhoneInput('');
      await refreshProfile();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save phone.');
    } finally {
      setPhoneBusy(false);
    }
  };

  const handleRequestChange = async () => {
    setPhoneBusy(true);
    try {
      const res = await authAPI.requestPhoneChange(changeReason.trim());
      if (res.data?.autoApproved) {
        toast.success('You have 24 hours to update your phone.');
        await refreshProfile();
      } else {
        toast.success('Request sent to your superadmin for approval.');
        setPendingRequestExists(true);
      }
      setShowChangeModal(false);
      setChangeReason('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit request.');
    } finally {
      setPhoneBusy(false);
    }
  };

  const handleApprove = async (id) => {
    setReviewingId(id);
    try {
      await authAPI.approvePhoneRequest(id, '');
      toast.success('Approved. User notified by email.');
      await fetchPhoneRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve.');
    } finally {
      setReviewingId(null);
    }
  };

  const handleReject = async (id) => {
    setReviewingId(id);
    try {
      await authAPI.rejectPhoneRequest(id, '');
      toast.success('Rejected. User notified by email.');
      await fetchPhoneRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject.');
    } finally {
      setReviewingId(null);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await categoryAPI.getAll();
      const data = res.data?.data || res.data || [];
      setCategories(Array.isArray(data) ? data : []);
    } catch {}
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await categoryAPI.create({ name: newCategory.trim() });
      setNewCategory('');
      fetchCategories();
    } catch {}
  };

  const handleDeleteCategory = async (id) => {
    try {
      await categoryAPI.delete(id);
      fetchCategories();
    } catch {}
  };

  const handleSetupMpin = async () => {
    setMpinError('');
    if (mpin.length < 4) {
      setMpinError('MPIN must be at least 4 digits');
      return;
    }
    if (mpin !== mpinConfirm) {
      setMpinError('MPINs do not match');
      return;
    }
    setMpinLoading(true);
    try {
      await authAPI.setupMpin({ mpin });
      localStorage.setItem('mpin_enabled', 'true');
      setShowMpinModal(false);
      setMpin('');
      setMpinConfirm('');
    } catch (err) {
      setMpinError(err.response?.data?.message || 'Failed to set MPIN');
    }
    setMpinLoading(false);
  };

  const handleDeleteOwnAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeletingAccount(true);
    try {
      await authAPI.deleteOwnAccount();
      toast.success('Your account and all data have been deleted.');
      logout();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete account.');
    }
    setDeletingAccount(false);
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: 'lucide:sun' },
    { value: 'dark', label: 'Dark', icon: 'lucide:moon' },
    { value: 'system', label: 'System', icon: 'lucide:monitor' },
  ];

  return (
    <div>
      <Header
        title="Settings"
        subtitle="Manage your preferences"
        onMenuClick={onMenuClick}
      />

      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <Card>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Profile
          </h3>
          <div className="flex items-center gap-4 mb-6">
            <Avatar name={user?.name} size="xl" />
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {user?.name || 'User'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user?.email}
              </p>
              {user?.organization?.name && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {user.organization.name}
                </p>
              )}
            </div>
          </div>

          {/* Read-only fields */}
          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <ProfileField label="Full Name" value={user?.name} />
            <ProfileField label="Email" value={user?.email} />

            {/* Phone — editable once, then request-change flow */}
            {user?.phoneNumber && !phoneEditWindowActive ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">
                    Phone Number
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user.phoneNumber}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon="lucide:pencil"
                  onClick={() => setShowChangeModal(true)}
                  disabled={pendingRequestExists}
                >
                  {pendingRequestExists ? 'Request Pending…' : 'Request Change'}
                </Button>
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                  Phone Number
                </label>
                {phoneEditWindowActive && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2">
                    ✓ Edit window active — you can update your phone until{' '}
                    {new Date(user.phoneEditUntil).toLocaleString()}
                  </p>
                )}
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleSavePhone} loading={phoneBusy} icon="lucide:save">
                    Save
                  </Button>
                </div>
                {!user?.phoneNumber && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                    One-time set. Future changes require superadmin approval.
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Pending phone change requests — superadmin only */}
        {isSuperadmin && phoneRequests.length > 0 && (
          <Card>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Phone Change Requests
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Users in your org requesting phone updates. Approved users get a 24h window to set their new number.
            </p>
            <div className="space-y-3">
              {phoneRequests.map((r) => (
                <div
                  key={r._id}
                  className="flex items-start justify-between gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {r.userId?.name} <span className="text-gray-400">·</span>{' '}
                      <span className="text-xs text-gray-500 dark:text-gray-400">{r.userId?.email}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Current: {r.currentPhone || '—'} · Role: {r.userId?.role}
                    </p>
                    {r.reason && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">"{r.reason}"</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(r._id)}
                      loading={reviewingId === r._id}
                      disabled={!!reviewingId && reviewingId !== r._id}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(r._id)}
                      loading={reviewingId === r._id}
                      disabled={!!reviewingId && reviewingId !== r._id}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Theme */}
        <Card>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Appearance
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setMode(option.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150
                  ${
                    mode === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <Icon
                  icon={option.icon}
                  className={`w-6 h-6 ${
                    mode === option.value
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    mode === option.value
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* Security */}
        <Card>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Security
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <Icon icon="lucide:lock" className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">MPIN</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Set up a 4-digit security pin
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMpinModal(true)}
              >
                Setup
              </Button>
            </div>
          </div>
        </Card>

        {/* Danger Zone — superadmin only */}
        {user?.role === 'superadmin' && (
          <Card className="border border-red-200 dark:border-red-900">
            <h3 className="text-base font-semibold text-red-600 dark:text-red-400 mb-1">Danger Zone</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Permanently deletes your account, organisation, and all associated data. This cannot be undone.
            </p>
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Delete my account</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Removes all users, projects, clients, invoices and more.</p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => { setDeleteConfirmText(''); setShowDeleteAccountModal(true); }}
              >
                Delete Account
              </Button>
            </div>
          </Card>
        )}

        {/* Categories */}
        <Card>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Categories
          </h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="New category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm
                text-gray-900 placeholder-gray-400
                focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100
                dark:placeholder-gray-500 dark:focus:border-blue-400
                outline-none transition-all duration-150"
            />
            <Button
              icon="lucide:plus"
              onClick={handleAddCategory}
              disabled={!newCategory.trim()}
            >
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {categories.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                No categories yet
              </p>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {cat.name}
                  </span>
                  <button
                    onClick={() => handleDeleteCategory(cat._id)}
                    className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Icon icon="lucide:x" className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        title="Delete Account Permanently"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">This will permanently delete:</p>
            <ul className="text-xs text-red-600 dark:text-red-400 mt-1 space-y-0.5 list-disc list-inside">
              <li>Your account and all org members</li>
              <li>All organisations, clients, projects, tasks</li>
              <li>All invoices, meetings, activity logs</li>
            </ul>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Type <strong>DELETE</strong> to confirm:
          </p>
          <Input
            placeholder="Type DELETE to confirm"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
          />
          <div className="flex gap-3 justify-end pt-1">
            <Button variant="outline" onClick={() => setShowDeleteAccountModal(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={handleDeleteOwnAccount}
              loading={deletingAccount}
              disabled={deleteConfirmText !== 'DELETE'}
            >
              Delete Everything
            </Button>
          </div>
        </div>
      </Modal>

      {/* MPIN Modal */}
      <Modal
        isOpen={showMpinModal}
        onClose={() => {
          setShowMpinModal(false);
          setMpin('');
          setMpinConfirm('');
          setMpinError('');
        }}
        title="Setup MPIN"
        size="sm"
      >
        <div className="space-y-4">
          {mpinError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{mpinError}</p>
            </div>
          )}
          <Input
            label="Enter MPIN"
            type="password"
            placeholder="4+ digits"
            value={mpin}
            onChange={(e) => setMpin(e.target.value)}
            maxLength={6}
          />
          <Input
            label="Confirm MPIN"
            type="password"
            placeholder="Re-enter MPIN"
            value={mpinConfirm}
            onChange={(e) => setMpinConfirm(e.target.value)}
            maxLength={6}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowMpinModal(false);
                setMpin('');
                setMpinConfirm('');
                setMpinError('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSetupMpin} loading={mpinLoading}>
              Save MPIN
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showChangeModal} onClose={() => setShowChangeModal(false)} title="Request Phone Change" size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Your superadmin will review this request. Once approved, you'll have 24 hours to update your phone number in Settings.
        </p>
        <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
          Reason (optional)
        </label>
        <textarea
          rows={3}
          value={changeReason}
          onChange={(e) => setChangeReason(e.target.value.slice(0, 300))}
          placeholder="Why do you need to change your phone number?"
          className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500 resize-none"
        />
        <div className="flex gap-3 justify-end pt-4">
          <Button variant="outline" onClick={() => setShowChangeModal(false)}>Cancel</Button>
          <Button onClick={handleRequestChange} loading={phoneBusy}>Send Request</Button>
        </div>
      </Modal>
    </div>
  );
}
