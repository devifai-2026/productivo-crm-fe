import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import useOrganizationStore from '../store/organizationStore';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import SearchBar from '../components/ui/SearchBar';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';

export default function Organizations({ onMenuClick }) {
  const { organizations, isLoading, fetchOrganizations } = useOrganizationStore();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

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
        actionLabel="New Organization"
        actionIcon="lucide:plus"
        onAction={() => navigate('/organizations/new')}
        onMenuClick={onMenuClick}
      />

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
    </div>
  );
}
