import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import useOrganizationStore from '../store/organizationStore';
import useAuthStore from '../store/authStore';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import SearchBar from '../components/ui/SearchBar';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import OrgTree from './OrgTree';

export default function Organizations({ onMenuClick }) {
  const { organizations, isLoading, fetchOrganizations } = useOrganizationStore();
  const { user, subscriptionPlan } = useAuthStore();
  const [search, setSearch] = useState('');
  const [view, setView] = useState('list');
  const navigate = useNavigate();

  const userRole = user?.role || 'employee';
  const isPro = userRole !== 'superadmin' || subscriptionPlan === 'pro' || subscriptionPlan === 'enterprise';
  // Free superadmin can't create more orgs (master org already exists)
  const canCreateOrg = isPro || userRole === 'product_owner' || organizations.length === 0;

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const filtered = organizations.filter((org) =>
    !search || org.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header
        title="Organizations"
        subtitle={`${organizations.length} organization${organizations.length !== 1 ? 's' : ''}`}
        actionLabel={canCreateOrg ? 'New Organization' : 'Upgrade to Add More'}
        actionIcon={canCreateOrg ? 'lucide:plus' : 'lucide:lock'}
        onAction={() => canCreateOrg ? navigate('/organizations/new') : navigate('/plan')}
        onMenuClick={onMenuClick}
      />

      <div className="flex items-center gap-2 mb-5">
        {[
          { key: 'list', label: 'List', icon: 'lucide:list' },
          { key: 'tree', label: 'Hierarchy', icon: 'lucide:git-branch' },
        ].map((t) => {
          const active = view === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                active
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Icon icon={t.icon} className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {view === 'tree' ? (
        <OrgTree onMenuClick={onMenuClick} embedded />
      ) : (
      <>
      <div className="mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search organizations..."
          className="max-w-md"
        />
      </div>

      {isLoading && organizations.length === 0 ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="lucide:building-2"
          title={search ? 'No matching organizations' : 'No organizations yet'}
          subtitle={search ? 'Try a different search term' : 'Create your first organization to get started'}
          actionLabel={!search ? 'Create Organization' : undefined}
          onAction={!search ? () => navigate('/organizations/new') : undefined}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((org) => (
            <Card
              key={org._id}
              hover
              onClick={() => navigate(`/organizations/${org._id}`)}
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                  <Icon icon="lucide:building-2" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {org.name}
                  </h3>
                  {org.email && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {org.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <Icon icon="lucide:users" className="w-3 h-3" />
                  {org.memberCount || 0} member{(org.memberCount || 0) !== 1 ? 's' : ''}
                </p>
                {org.role && (
                  <Badge color={org.role === 'owner' ? 'blue' : org.role === 'admin' ? 'purple' : 'gray'}>
                    {org.role}
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}
