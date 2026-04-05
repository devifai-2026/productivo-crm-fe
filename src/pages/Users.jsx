import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { userAPI, organizationAPI, superAdminAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import SearchBar from '../components/ui/SearchBar';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';

// ─── Product-owner view: list all superadmin accounts ────────────────────────

function SuperadminAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [blockModal, setBlockModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [acting, setActing] = useState(false);

  const fetchAccounts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      const res = await superAdminAPI.getUsers(params);
      const data = res.data?.data || res.data;
      setAccounts(data.users || []);
      setPagination(data.pagination || { total: 0, page: 1, pages: 1, limit: 20 });
    } catch {
      setAccounts([]);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchAccounts(1); }, [fetchAccounts]);

  const handleBlock = async () => {
    if (!blockModal) return;
    setActing(true);
    try {
      const res = await superAdminAPI.blockAccount(blockModal._id);
      const { isActive } = res.data?.data || {};
      toast.success(isActive ? `${blockModal.name} unblocked.` : `${blockModal.name} blocked.`);
      setBlockModal(null);
      fetchAccounts(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed.');
    }
    setActing(false);
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setActing(true);
    try {
      await superAdminAPI.deleteAccount(deleteModal._id);
      toast.success(`${deleteModal.name}'s account and all data deleted.`);
      setDeleteModal(null);
      fetchAccounts(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed.');
    }
    setActing(false);
  };

  return (
    <div>
      <Header
        title="Superadmin Accounts"
        subtitle={`${pagination.total} registered`}
      />

      <div className="mb-6">
        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
        />
      </div>

      <Card padding={false}>
        {loading ? (
          <div className="py-20 flex justify-center"><Spinner size="lg" /></div>
        ) : accounts.length === 0 ? (
          <div className="py-20 text-center">
            <Icon icon="lucide:users" className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-gray-500">No accounts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Account</th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Master Org</th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Joined</th>
                  <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {accounts.map((acct) => (
                  <tr key={acct._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={acct.name} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{acct.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{acct.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {acct.organizationId?.name || <span className="text-gray-400 italic">No org</span>}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full
                        ${acct.isActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                          : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${acct.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {acct.isActive ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(acct.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setBlockModal(acct)}
                          className={`p-1.5 rounded-lg transition-colors text-gray-400
                            ${acct.isActive
                              ? 'hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                              : 'hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                            }`}
                          title={acct.isActive ? 'Block account' : 'Unblock account'}
                        >
                          <Icon icon={acct.isActive ? 'lucide:ban' : 'lucide:check-circle'} className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteModal(acct)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete account & all data"
                        >
                          <Icon icon="lucide:trash-2" className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Page {pagination.page} of {pagination.pages} ({pagination.total} accounts)
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => fetchAccounts(pagination.page - 1)} disabled={pagination.page <= 1}>Previous</Button>
              <Button size="sm" variant="outline" onClick={() => fetchAccounts(pagination.page + 1)} disabled={pagination.page >= pagination.pages}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Block / Unblock confirmation */}
      <Modal isOpen={!!blockModal} onClose={() => setBlockModal(null)} title={blockModal?.isActive ? 'Block Account' : 'Unblock Account'} size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {blockModal?.isActive
            ? <>Blocking <strong>{blockModal?.name}</strong> will prevent them and all members of their organisation from logging in. Their data will be preserved.</>
            : <>Unblocking <strong>{blockModal?.name}</strong> will restore access for them and all their org members.</>
          }
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setBlockModal(null)}>Cancel</Button>
          <Button
            variant={blockModal?.isActive ? 'danger' : 'primary'}
            onClick={handleBlock}
            loading={acting}
          >
            {blockModal?.isActive ? 'Block Account' : 'Unblock Account'}
          </Button>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Account Permanently" size="sm">
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-4">
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">This action cannot be undone.</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Deletes all organisations, users, clients, projects, tasks, invoices, meetings and activity logs for this account.
          </p>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Are you sure you want to permanently delete <strong>{deleteModal?.name}</strong> ({deleteModal?.email})?
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setDeleteModal(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={acting}>Delete Everything</Button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Superadmin view: list org members ───────────────────────────────────────

function OrgMembers({ onMenuClick }) {
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

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);

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
      <Header title="Users" subtitle={`${pagination.total} total`} onMenuClick={onMenuClick} />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." />
        </div>
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          options={[
            { value: '', label: 'All Roles' },
            { value: 'org_admin', label: 'Admin' },
            { value: 'employee', label: 'Employee' },
          ]}
        />
        <Select
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          options={[
            { value: '', label: 'All Organizations' },
            ...organizations.map((o) => ({ value: o._id, label: o.name })),
          ]}
        />
      </div>

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
                  <tr
                    key={user._id}
                    onClick={() => navigate(`/users/${user._id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                  >
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
                      <Badge color={roleColor[user.role] || 'gray'}>{roleLabel[user.role] || user.role}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{user.organizationId?.name || '—'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleActive(user); }}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors
                          ${user.isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100'
                          }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {user.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {user.role !== 'superadmin' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteModal(user); }}
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

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Page {pagination.page} of {pagination.pages} ({pagination.total} users)
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => fetchUsers(pagination.page - 1)} disabled={pagination.page <= 1}>Previous</Button>
              <Button size="sm" variant="outline" onClick={() => fetchUsers(pagination.page + 1)} disabled={pagination.page >= pagination.pages}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete User" size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Are you sure you want to delete <strong>{deleteModal?.name}</strong> ({deleteModal?.email})? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setDeleteModal(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Router: show different view based on role ───────────────────────────────

export default function Users({ onMenuClick }) {
  const { user } = useAuthStore();
  if (user?.role === 'product_owner') return <SuperadminAccounts />;
  return <OrgMembers onMenuClick={onMenuClick} />;
}
