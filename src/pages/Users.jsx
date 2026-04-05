import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { userAPI, organizationAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import SearchBar from '../components/ui/SearchBar';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';

export default function Users({ onMenuClick }) {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (orgFilter) params.organizationId = orgFilter;

      const res = await userAPI.getAll(params);
      const data = res.data?.data || res.data;
      setUsers(data.users || []);
      setPagination(data.pagination || { total: 0, page: 1, pages: 1, limit: 20 });
    } catch {
      setUsers([]);
    }
    setLoading(false);
  }, [search, roleFilter, orgFilter]);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  useEffect(() => {
    organizationAPI.get().then((res) => {
      const data = res.data?.data || res.data || [];
      setOrganizations(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await userAPI.delete(deleteModal._id);
      setDeleteModal(null);
      fetchUsers(pagination.page);
    } catch {}
    setDeleting(false);
  };

  const handleToggleActive = async (user) => {
    try {
      await userAPI.update(user._id, { isActive: !user.isActive });
      fetchUsers(pagination.page);
    } catch {}
  };

  const roleColor = { superadmin: 'blue', org_admin: 'purple', employee: 'gray' };
  const roleLabel = { superadmin: 'Super Admin', org_admin: 'Admin', employee: 'Employee' };

  return (
    <div>
      <Header title="Users" subtitle={`${pagination.total} total users`} onMenuClick={onMenuClick} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
          />
        </div>
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          placeholder="All Roles"
          options={[
            { value: '', label: 'All Roles' },
            { value: 'superadmin', label: 'Super Admin' },
            { value: 'org_admin', label: 'Admin' },
            { value: 'employee', label: 'Employee' },
          ]}
        />
        <Select
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          placeholder="All Organizations"
          options={[
            { value: '', label: 'All Organizations' },
            ...organizations.map((o) => ({ value: o._id, label: o.name })),
          ]}
        />
      </div>

      {/* Users Table */}
      <Card padding={false}>
        {loading ? (
          <div className="py-20 flex justify-center"><Spinner size="lg" /></div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center">
            <Icon icon="lucide:users" className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-gray-500">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">User</th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Organization</th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {users.map((user) => (
                  <tr key={user._id} onClick={() => navigate(`/users/${user._id}`)} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge color={roleColor[user.role] || 'gray'}>
                        {roleLabel[user.role] || user.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {user.organizationId?.name || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggleActive(user)}
                        disabled={user.role === 'superadmin'}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                          user.isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        } ${user.role === 'superadmin' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {user.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {user.role !== 'superadmin' && (
                        <button
                          onClick={() => setDeleteModal(user)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete user"
                        >
                          <Icon icon="lucide:trash-2" className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Page {pagination.page} of {pagination.pages} ({pagination.total} users)
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchUsers(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchUsers(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete User" size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Are you sure you want to delete <strong>{deleteModal?.name}</strong> ({deleteModal?.email})?
          This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setDeleteModal(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
