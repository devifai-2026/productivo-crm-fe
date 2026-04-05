import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { authAPI, categoryAPI, organizationAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';

export default function Settings({ onMenuClick }) {
  const { user } = useAuthStore();
  const { isDark, mode, setMode } = useThemeStore();

  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [showMpinModal, setShowMpinModal] = useState(false);
  const [mpin, setMpin] = useState('');
  const [mpinConfirm, setMpinConfirm] = useState('');
  const [mpinError, setMpinError] = useState('');
  const [mpinLoading, setMpinLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

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
          <div className="flex items-center gap-4">
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
        </Card>

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
    </div>
  );
}
