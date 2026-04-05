import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { format, parseISO } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import useInvoiceStore from '../store/invoiceStore';
import { invoiceAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import SearchBar from '../components/ui/SearchBar';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';

const STATUS_COLORS = {
  draft: '#94a3b8',
  sent: '#60a5fa',
  paid: '#34d399',
  overdue: '#f87171',
  cancelled: '#d1d5db',
};

const statusTabs = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
];

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

const GROUP_OPTIONS = [
  { value: '', label: 'No Grouping' },
  { value: 'client', label: 'By Client' },
  { value: 'project', label: 'By Project' },
];

const PAGE_SIZE = 15;

export default function Invoices({ onMenuClick }) {
  const { invoices, isLoading, pagination, fetchInvoices } = useInvoiceStore();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCharts, setShowCharts] = useState(false);
  const [groupBy, setGroupBy] = useState('');
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  // Quick action state
  const [actionInvoice, setActionInvoice] = useState(null); // { invoice, type: 'paid'|'sent'|'payment' }
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '', date: new Date().toISOString().split('T')[0],
    method: 'bank_transfer', reference: '', notes: '',
  });

  const handleSearchChange = useCallback((val) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  }, []);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  useEffect(() => {
    const params = { page, limit: PAGE_SIZE };
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter) params.status = statusFilter;
    fetchInvoices(params);
  }, [debouncedSearch, statusFilter, page]);

  const handleStatusChange = (val) => { setStatusFilter(val); setPage(1); };

  const refresh = () => {
    const params = { page, limit: PAGE_SIZE };
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter) params.status = statusFilter;
    fetchInvoices(params);
  };

  const handleQuickMarkPaid = async () => {
    setActionLoading(true);
    try {
      await invoiceAPI.update(actionInvoice.invoice._id, { status: 'paid' });
      refresh();
      setActionInvoice(null);
    } catch { /* silent */ }
    setActionLoading(false);
  };

  const handleQuickMarkSent = async () => {
    setActionLoading(true);
    try {
      await invoiceAPI.update(actionInvoice.invoice._id, { status: 'sent' });
      refresh();
      setActionInvoice(null);
    } catch { /* silent */ }
    setActionLoading(false);
  };

  const handleQuickPayment = async () => {
    if (!paymentForm.amount) return;
    setActionLoading(true);
    try {
      await invoiceAPI.addPayment(actionInvoice.invoice._id, {
        amount: parseFloat(paymentForm.amount),
        date: paymentForm.date,
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined,
      });
      refresh();
      setActionInvoice(null);
      setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], method: 'bank_transfer', reference: '', notes: '' });
    } catch { /* silent */ }
    setActionLoading(false);
  };

  const openAction = (e, invoice, type) => {
    e.stopPropagation();
    if (type === 'payment') {
      setPaymentForm({
        amount: String(Math.max((invoice.total || 0) - (invoice.payments || []).reduce((s, p) => s + p.amount, 0), 0) || ''),
        date: new Date().toISOString().split('T')[0],
        method: 'bank_transfer', reference: '', notes: '',
      });
    }
    setActionInvoice({ invoice, type });
  };

  const totalPages = pagination?.pages || 1;
  const totalCount = pagination?.total || invoices.length;

  // Summary stats using actual payments
  const activeInvoices = invoices.filter((i) => i.status !== 'cancelled');
  const totalAmount = activeInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const paidAmount = activeInvoices.reduce((sum, inv) =>
    sum + (inv.payments || []).reduce((s, p) => s + (p.amount || 0), 0), 0);
  const pendingAmount = totalAmount - paidAmount;

  const statusGroups = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
  const pieData = statusGroups
    .map((s) => ({ name: s.charAt(0).toUpperCase() + s.slice(1), value: invoices.filter((i) => i.status === s).length, color: STATUS_COLORS[s] }))
    .filter((d) => d.value > 0);
  const barData = statusGroups.map((s) => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    Amount: invoices.filter((i) => i.status === s).reduce((sum, inv) => sum + (inv.total || 0), 0),
    fill: STATUS_COLORS[s],
  }));

  // Grouping logic — client-side on current page
  const groupedInvoices = (() => {
    if (!groupBy) return [{ label: null, items: invoices }];
    const map = new Map();
    invoices.forEach((inv) => {
      const key = groupBy === 'client'
        ? (inv.clientId?.name || inv.client?.name || 'No Client')
        : (inv.projectId?.name || inv.project?.name || 'No Project');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(inv);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([label, items]) => ({ label, items }));
  })();

  const InvoiceRow = ({ invoice }) => {
    const client = invoice.clientId || invoice.client;
    const project = invoice.projectId || invoice.project;
    const totalPaid = (invoice.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
    const balance = Math.max((invoice.total || 0) - totalPaid, 0);
    const canMarkPaid = invoice.status !== 'paid' && invoice.status !== 'cancelled';
    const canMarkSent = invoice.status === 'draft';
    const canAddPayment = invoice.status !== 'cancelled' && balance > 0;

    return (
      <Card hover onClick={() => navigate(`/invoices/${invoice._id}`)} className="!p-0 overflow-hidden">
        <div className="flex items-center gap-3 p-3 sm:p-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
            <Icon icon="lucide:file-text" className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {invoice.invoiceNumber || `INV-${invoice._id?.slice(-6)}`}
              </h3>
              <Badge status={invoice.status} />
              {invoice.paymentStatus && invoice.paymentStatus !== 'unpaid' && (
                <Badge status={invoice.paymentStatus} />
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              {client?.name && (
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Icon icon="lucide:user" className="w-3 h-3" />
                  {client.name}
                </span>
              )}
              {project?.name && (
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Icon icon="lucide:folder" className="w-3 h-3" />
                  {project.name}
                </span>
              )}
              {invoice.createdAt && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {format(parseISO(invoice.createdAt), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>

          {/* Amount + quick actions */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                ₹{(invoice.total || 0).toLocaleString('en-IN')}
              </p>
              {totalPaid > 0 && balance > 0 && (
                <p className="text-xs text-amber-500">₹{balance.toLocaleString('en-IN')} due</p>
              )}
            </div>

            {/* Quick action buttons — stop propagation so row click doesn't fire */}
            <div className="flex items-center gap-1">
              {canAddPayment && (
                <div className="relative group">
                  <button
                    onClick={(e) => openAction(e, invoice, 'payment')}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Icon icon="lucide:circle-dollar-sign" className="w-4 h-4" />
                  </button>
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-700 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    Record Payment
                  </span>
                </div>
              )}
              {canMarkSent && (
                <div className="relative group">
                  <button
                    onClick={(e) => openAction(e, invoice, 'sent')}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Icon icon="lucide:send" className="w-4 h-4" />
                  </button>
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-700 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    Mark as Sent
                  </span>
                </div>
              )}
              {canMarkPaid && (
                <div className="relative group">
                  <button
                    onClick={(e) => openAction(e, invoice, 'paid')}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                  >
                    <Icon icon="lucide:check-circle" className="w-4 h-4" />
                  </button>
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-700 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    Mark as Paid
                  </span>
                </div>
              )}
            </div>
            <Icon icon="lucide:chevron-right" className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          </div>
        </div>
        {/* Mobile amount bar */}
        <div className="flex sm:hidden items-center justify-between px-3 pb-2.5 text-xs text-gray-400 dark:text-gray-500">
          <span>₹{(invoice.total || 0).toLocaleString('en-IN')}</span>
          {balance > 0 && totalPaid > 0 && <span className="text-amber-500">₹{balance.toLocaleString('en-IN')} due</span>}
        </div>
      </Card>
    );
  };

  return (
    <div>
      <Header
        title="Invoices"
        subtitle={`${totalCount} invoices`}
        actionLabel="New Invoice"
        actionIcon="lucide:plus"
        onAction={() => navigate('/invoices/new')}
        onMenuClick={onMenuClick}
      />

      {/* Amount Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card className="!p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-50">₹{totalAmount.toLocaleString('en-IN')}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Collected</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₹{paidAmount.toLocaleString('en-IN')}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pending</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">₹{pendingAmount.toLocaleString('en-IN')}</p>
        </Card>
      </div>

      {/* Charts toggle */}
      {invoices.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowCharts((s) => !s)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-3"
          >
            <Icon icon={showCharts ? 'lucide:chevron-up' : 'lucide:bar-chart-2'} className="w-4 h-4" />
            {showCharts ? 'Hide charts' : 'Show charts'}
          </button>
          {showCharts && (
            <div className="grid sm:grid-cols-2 gap-4 mb-2">
              <Card>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Amount by Status</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Bar dataKey="Amount" radius={[4, 4, 0, 0]}>
                      {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Invoices by Status</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} paddingAngle={2}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Search + Group controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by invoice, client, or project..."
          className="flex-1"
        />
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value)}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {GROUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-900 rounded-xl p-1 w-fit overflow-x-auto">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleStatusChange(tab.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap
              ${statusFilter === tab.value
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      {isLoading && invoices.length === 0 ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon="lucide:file-text"
          title={search || statusFilter ? 'No matching invoices' : 'No invoices yet'}
          subtitle={search || statusFilter ? 'Try adjusting your filters' : 'Create your first invoice'}
          actionLabel={!search && !statusFilter ? 'Create Invoice' : undefined}
          onAction={!search && !statusFilter ? () => navigate('/invoices/new') : undefined}
        />
      ) : (
        <>
          <div className="space-y-4 relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white/50 dark:bg-gray-950/50 flex items-center justify-center z-10 rounded-xl">
                <Spinner size="md" />
              </div>
            )}
            {groupedInvoices.map(({ label, items }) => (
              <div key={label || '__all__'}>
                {label && (
                  <div className="flex items-center gap-2 mb-2 mt-2">
                    <Icon icon={groupBy === 'client' ? 'lucide:user' : 'lucide:folder'} className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">({items.length})</span>
                  </div>
                )}
                <div className="space-y-2">
                  {items.map((invoice) => <InvoiceRow key={invoice._id} invoice={invoice} />)}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages} &middot; {totalCount} total
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isLoading}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <Icon icon="lucide:chevron-left" className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p;
                  if (totalPages <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button key={p} onClick={() => setPage(p)} disabled={isLoading}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                        ${page === p ? 'bg-blue-600 text-white' : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}
                        disabled:opacity-40 disabled:cursor-not-allowed`}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || isLoading}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <Icon icon="lucide:chevron-right" className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick action modals */}
      {actionInvoice?.type === 'paid' && (
        <Modal
          isOpen
          onClose={() => setActionInvoice(null)}
          title="Mark as Paid"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Mark <span className="font-semibold text-gray-900 dark:text-gray-100">{actionInvoice.invoice.invoiceNumber}</span> as fully paid?
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setActionInvoice(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleQuickMarkPaid} loading={actionLoading} className="flex-1">Mark as Paid</Button>
          </div>
        </Modal>
      )}

      {actionInvoice?.type === 'sent' && (
        <Modal
          isOpen
          onClose={() => setActionInvoice(null)}
          title="Mark as Sent"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Mark <span className="font-semibold text-gray-900 dark:text-gray-100">{actionInvoice.invoice.invoiceNumber}</span> as sent?
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setActionInvoice(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleQuickMarkSent} loading={actionLoading} className="flex-1">Mark as Sent</Button>
          </div>
        </Modal>
      )}

      {actionInvoice?.type === 'payment' && (
        <Modal
          isOpen
          onClose={() => setActionInvoice(null)}
          title={`Record Payment — ${actionInvoice.invoice.invoiceNumber}`}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Amount" type="number" step="0.01" min="0" icon="lucide:indian-rupee"
                value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
              <Input label="Date" type="date" value={paymentForm.date}
                onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Method" value={paymentForm.method}
                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })} options={PAYMENT_METHODS} />
              <Input label="Reference" placeholder="Txn / Cheque no." value={paymentForm.reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} />
            </div>
            <textarea rows={2} placeholder="Notes (optional)" value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400
                focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500
                outline-none transition-all resize-none" />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setActionInvoice(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleQuickPayment} loading={actionLoading} disabled={!paymentForm.amount} className="flex-1">Record</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
