import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { format, parseISO } from 'date-fns';
import { userAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';

export default function UserDetail({ onMenuClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userAPI.getById(id);
      const data = res.data?.data || res.data;
      setUser(data);
    } catch {
      setUser(null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleToggleActive = async () => {
    if (!user) return;
    try {
      await userAPI.update(id, { isActive: !user.isActive });
      fetchUser();
    } catch {
      // silently fail
    }
  };

  const handleEditProfile = () => {
    setProfileForm({ name: user.name || '', email: user.email || '' });
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await userAPI.update(id, { name: profileForm.name, email: profileForm.email });
      setEditingProfile(false);
      fetchUser();
    } catch {
      // silently fail
    }
    setSavingProfile(false);
  };

  const handleRoleChange = async (e) => {
    const newRole = e.target.value;
    if (!newRole || newRole === user.role) return;
    setUpdatingRole(true);
    try {
      await userAPI.update(id, { role: newRole });
      fetchUser();
    } catch {
      // silently fail
    }
    setUpdatingRole(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await userAPI.delete(id);
      navigate('/users');
    } catch {
      // silently fail
    }
    setDeleting(false);
  };

  const roleColor = { superadmin: 'blue', org_admin: 'purple', employee: 'gray' };
  const roleLabel = { superadmin: 'Super Admin', org_admin: 'Admin', employee: 'Employee' };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400">User not found</p>
        <Button variant="ghost" onClick={() => navigate('/users')} className="mt-4">
          Back to Users
        </Button>
      </div>
    );
  }

  const joinedDate = user.createdAt
    ? format(typeof user.createdAt === 'string' ? parseISO(user.createdAt) : new Date(user.createdAt), 'MMMM d, yyyy')
    : null;

  return (
    <div>
      <Header
        title={user.name || 'User'}
        breadcrumbs={[
          { label: 'Users', href: '/users' },
          { label: user.name || 'User' },
        ]}
        onMenuClick={onMenuClick}
      >
          <Button
          variant="outline"
          size="sm"
          icon="lucide:pencil"
          onClick={handleEditProfile}
        >
          Edit
        </Button>
        {user.role !== 'superadmin' && (
          <Button
            variant="ghost"
            size="sm"
            icon="lucide:trash-2"
            onClick={() => setShowDeleteModal(true)}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Delete
          </Button>
        )}
      </Header>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Profile Card */}
          <Card>
            <div className="flex items-start gap-5">
              <Avatar name={user.name} size="xl" />
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">
                  {user.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {user.email}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <Badge color={roleColor[user.role] || 'gray'} size="md">
                    {roleLabel[user.role] || user.role}
                  </Badge>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                      user.isActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                        : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {user.organizationId && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 flex items-center gap-2">
                    <Icon icon="lucide:building-2" className="w-4 h-4 text-gray-400" />
                    {user.organizationId?.name || 'Organization'}
                  </p>
                )}
                {joinedDate && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-2">
                    <Icon icon="lucide:calendar" className="w-4 h-4 text-gray-400" />
                    Joined {joinedDate}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Activity Placeholder */}
          <Card>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Activity</h3>
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <Icon icon="lucide:activity" className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm text-gray-400 dark:text-gray-500">Activity tracking coming soon</p>
            </div>
          </Card>
        </div>

        {/* Sidebar / Actions */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Actions</h3>
            <div className="space-y-4">
              {/* Toggle Active */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Status
                </p>
                <Button
                  variant={user.isActive ? 'outline' : 'primary'}
                  size="sm"
                  fullWidth
                  icon={user.isActive ? 'lucide:user-x' : 'lucide:user-check'}
                  onClick={handleToggleActive}
                  disabled={user.role === 'superadmin'}
                >
                  {user.isActive ? 'Deactivate User' : 'Activate User'}
                </Button>
              </div>

              {/* Change Role */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Role
                </p>
                <Select
                  value={user.role}
                  onChange={handleRoleChange}
                  disabled={user.role === 'superadmin' || updatingRole}
                  options={[
                    { value: 'employee', label: 'Employee' },
                    { value: 'org_admin', label: 'Admin' },
                    { value: 'superadmin', label: 'Super Admin' },
                  ]}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={editingProfile}
        onClose={() => setEditingProfile(false)}
        title="Edit User"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Full name"
            icon="lucide:user"
            value={profileForm.name}
            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            placeholder="email@example.com"
            icon="lucide:mail"
            value={profileForm.email}
            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setEditingProfile(false)}>Cancel</Button>
            <Button onClick={handleSaveProfile} loading={savingProfile} disabled={!profileForm.name}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete User"
        size="sm"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete <strong>{user.name}</strong> ({user.email})?
          This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
