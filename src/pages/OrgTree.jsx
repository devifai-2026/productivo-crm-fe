import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { organizationAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

function OrgNode({ node, depth, expanded, toggle, onClick }) {
  const hasChildren = node.children && node.children.length > 0;
  const isOpen = expanded.has(String(node._id));
  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 pr-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => onClick?.(node)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); toggle(String(node._id)); }}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 shrink-0"
          >
            <Icon
              icon={isOpen ? 'lucide:chevron-down' : 'lucide:chevron-right'}
              className="w-4 h-4 text-gray-400"
            />
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
          <Icon
            icon={node.parentOrgId ? 'lucide:building' : 'lucide:building-2'}
            className="w-4 h-4 text-blue-600 dark:text-blue-400"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {node.name}
            </p>
            {!node.parentOrgId && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                Master
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {node.memberCounts?.total || 0} members
            {node.memberCounts?.org_admin ? ` · ${node.memberCounts.org_admin} admin${node.memberCounts.org_admin > 1 ? 's' : ''}` : ''}
            {node.memberCounts?.employee ? ` · ${node.memberCounts.employee} employee${node.memberCounts.employee > 1 ? 's' : ''}` : ''}
          </p>
        </div>

        <Icon
          icon="lucide:arrow-right"
          className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 shrink-0"
        />
      </div>

      {hasChildren && isOpen && (
        <div>
          {node.children.map((child) => (
            <OrgNode
              key={child._id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              onClick={onClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SuperadminGroup({ root, expanded, toggle, onOrgClick }) {
  const totalOrgs = (function count(orgs) {
    let n = 0;
    for (const o of orgs) {
      n += 1 + count(o.children || []);
    }
    return n;
  })(root.orgs || []);

  return (
    <Card className="mb-4">
      {/* Superadmin header */}
      {(root.kind === 'superadmin' || root.kind === 'orphan') && (
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Icon
              icon={root.kind === 'orphan' ? 'lucide:help-circle' : 'lucide:crown'}
              className="w-5 h-5 text-violet-600 dark:text-violet-400"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {root.name || '(unnamed)'}
            </p>
            {root.email && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{root.email}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{totalOrgs}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-400">org{totalOrgs === 1 ? '' : 's'}</p>
          </div>
        </div>
      )}

      {root.orgs?.length > 0 ? (
        <div>
          {root.orgs.map((org) => (
            <OrgNode
              key={org._id}
              node={org}
              depth={0}
              expanded={expanded}
              toggle={toggle}
              onClick={onOrgClick}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic py-2">No organizations yet.</p>
      )}
    </Card>
  );
}

export default function OrgTree({ onMenuClick }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    setLoading(true);
    organizationAPI
      .getTree()
      .then((res) => setTree(res.data?.data || null))
      .catch((err) => toast.error(err.response?.data?.error || 'Failed to load tree'))
      .finally(() => setLoading(false));
  }, []);

  // Auto-expand root-level orgs on first load
  useEffect(() => {
    if (!tree?.roots) return;
    const next = new Set();
    for (const root of tree.roots) {
      for (const org of root.orgs || []) next.add(String(org._id));
    }
    setExpanded(next);
  }, [tree]);

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOrgClick = (org) => {
    if (org?._id) navigate(`/organizations/${org._id}`);
  };

  const expandAll = () => {
    if (!tree?.roots) return;
    const next = new Set();
    const walk = (orgs) => {
      for (const o of orgs) {
        next.add(String(o._id));
        if (o.children?.length) walk(o.children);
      }
    };
    for (const root of tree.roots) walk(root.orgs || []);
    setExpanded(next);
  };

  const collapseAll = () => setExpanded(new Set());

  const scopeLabel =
    tree?.scope === 'platform' ? 'Entire platform'
    : tree?.scope === 'superadmin' ? `${user?.name}'s organizations`
    : tree?.scope === 'org' ? 'Your organization'
    : '—';

  return (
    <div>
      <Header
        title="Org Tree"
        subtitle={loading ? 'Loading…' : scopeLabel}
        onMenuClick={onMenuClick}
      />

      {!loading && tree?.roots?.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 inline-flex items-center gap-1"
          >
            <Icon icon="lucide:chevrons-down" className="w-3.5 h-3.5" />
            Expand all
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 inline-flex items-center gap-1"
          >
            <Icon icon="lucide:chevrons-up" className="w-3.5 h-3.5" />
            Collapse all
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : !tree?.roots?.length ? (
        <EmptyState icon="lucide:building-2" title="No organizations" description="Nothing to show yet." />
      ) : (
        <div>
          {tree.roots.map((root, i) => (
            <SuperadminGroup
              key={root.id || root.name || i}
              root={root}
              expanded={expanded}
              toggle={toggle}
              onOrgClick={handleOrgClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
