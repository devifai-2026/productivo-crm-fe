import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { format, parseISO } from 'date-fns';
import useInvoiceStore from '../store/invoiceStore';
import { invoiceAPI, paymentAccountAPI } from '../services/api';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';

const fixDriveUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('/api/v1/image-proxy')) return url;
  const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match) return `/api/v1/image-proxy?id=${lh3Match[1]}`;
  const ucMatch = url.match(/drive\.google\.com\/uc\?[^"]*id=([a-zA-Z0-9_-]+)/);
  if (ucMatch) return `/api/v1/image-proxy?id=${ucMatch[1]}`;
  return url;
};

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export default function InvoiceDetail({ onMenuClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentInvoice, isLoading, fetchInvoice, updateInvoice, clearCurrent } = useInvoiceStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendCC, setSendCC] = useState('');
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [showActions, setShowActions] = useState(false);

  // Payment form — add new
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'bank_transfer',
    reference: '',
    notes: '',
  });
  const [addingPayment, setAddingPayment] = useState(false);

  // Payment inline edit
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [editPaymentForm, setEditPaymentForm] = useState({});
  const [savingPayment, setSavingPayment] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  useEffect(() => {
    fetchInvoice(id);
    paymentAccountAPI.getAll().then((res) => {
      const data = res.data?.data || res.data || [];
      setPaymentAccounts(Array.isArray(data) ? data : []);
    }).catch(() => {});
    return () => clearCurrent();
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    const result = await updateInvoice(id, { status: 'cancelled' });
    setDeleting(false);
    if (result.success) {
      setShowDeleteModal(false);
      navigate('/invoices');
    }
  };

  const handleMarkPaid = async () => {
    await updateInvoice(id, { status: 'paid' });
  };

  const handleMarkSent = async () => {
    await updateInvoice(id, { status: 'sent' });
  };

  const handleRecalculateTax = async () => {
    const orgTax = currentInvoice?.organizationId?.taxPercentage ?? 0;
    await updateInvoice(id, { taxPercentage: orgTax });
    setShowActions(false);
  };

  const handleAddPayment = async () => {
    const entered = parseFloat(paymentForm.amount);
    if (!paymentForm.amount || entered <= 0) return;
    const balanceDue = totalAmount - totalPaid;
    if (entered > balanceDue + 0.001) {
      toast.error(`Amount ₹${entered.toLocaleString('en-IN')} exceeds balance due ₹${balanceDue.toLocaleString('en-IN')}`);
      return;
    }
    setAddingPayment(true);
    try {
      await invoiceAPI.addPayment(id, {
        amount: entered,
        date: paymentForm.date,
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined,
      });
      setPaymentForm({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'bank_transfer',
        reference: '',
        notes: '',
      });
      setShowPaymentForm(false);
      fetchInvoice(id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record payment');
    }
    setAddingPayment(false);
  };

  const handleRemovePayment = async (paymentId) => {
    try {
      await invoiceAPI.removePayment(id, paymentId);
      fetchInvoice(id);
    } catch {
      // silently fail
    }
  };

  const startEditPayment = (payment) => {
    setEditingPaymentId(payment._id);
    setEditPaymentForm({
      amount: payment.amount,
      date: payment.date ? new Date(payment.date).toISOString().split('T')[0] : '',
      method: payment.method || 'bank_transfer',
      reference: payment.reference || '',
      notes: payment.notes || '',
    });
  };

  const handleUpdatePayment = async () => {
    setSavingPayment(true);
    try {
      await invoiceAPI.updatePayment(id, editingPaymentId, {
        amount: parseFloat(editPaymentForm.amount),
        date: editPaymentForm.date,
        method: editPaymentForm.method,
        reference: editPaymentForm.reference || undefined,
        notes: editPaymentForm.notes || undefined,
      });
      setEditingPaymentId(null);
      fetchInvoice(id);
    } catch {
      // silently fail
    }
    setSavingPayment(false);
  };

  const triggerBlobDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadInvoice = async () => {
    setDownloadingInvoice(true);
    try {
      const res = await invoiceAPI.download(id);
      triggerBlobDownload(res.data, `${invoice.invoiceNumber}.pdf`);
    } catch {
      // silently fail
    }
    setDownloadingInvoice(false);
  };

  const handleDownloadReceipt = async (paymentId) => {
    setDownloadingReceipt(paymentId || true);
    try {
      const res = await invoiceAPI.downloadReceipt(id, paymentId);
      const filename = `Receipt-${invoice.invoiceNumber}${paymentId ? `-${paymentId.slice(-6)}` : ''}.pdf`;
      triggerBlobDownload(res.data, filename);
    } catch {
      // silently fail
    }
    setDownloadingReceipt(false);
  };

  const handleSendInvoice = async () => {
    setSending(true);
    try {
      await invoiceAPI.send(id, {
        ccEmails: sendCC ? sendCC.split(',').map((e) => e.trim()).filter(Boolean) : undefined,
      });
      setSendCC('');
      setShowSendModal(false);
      fetchInvoice(id);
    } catch {
      // silently fail
    }
    setSending(false);
  };

  if (isLoading && !currentInvoice) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentInvoice) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400">Invoice not found</p>
        <Button variant="ghost" onClick={() => navigate('/invoices')} className="mt-4">
          Back to Invoices
        </Button>
      </div>
    );
  }

  const invoice = currentInvoice;
  const client = invoice.clientId || invoice.client;
  const items = invoice.items || invoice.lineItems || [];
  const payments = invoice.payments || [];
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalAmount = invoice.total || 0;
  const paymentPercentage = totalAmount > 0 ? Math.min((totalPaid / totalAmount) * 100, 100) : 0;

  const paymentStatus = totalPaid >= totalAmount && totalAmount > 0
    ? 'paid'
    : totalPaid > 0
      ? 'partial'
      : 'unpaid';

  const version = invoice.version || 1;
  const canEdit = invoice.status !== 'cancelled';
  const isDraft = invoice.status === 'draft';
  const editLabel = isDraft ? 'Edit' : 'Revise';

  return (
    <div>
      {/* Mobile-first Header */}
      <div className="mb-4">
        {/* Top bar: back + menu */}
        <div className="flex items-center gap-2 mb-3">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Icon icon="lucide:menu" className="w-5 h-5" />
            </button>
          )}
          <nav className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
            <a
              href="/invoices"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors shrink-0"
            >
              Invoices
            </a>
            <Icon icon="lucide:chevron-right" className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0" />
            <span className="text-gray-400 dark:text-gray-500 truncate">
              {invoice.invoiceNumber || 'Invoice'}
            </span>
          </nav>
        </div>

        {/* Title + overflow actions menu */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-50 tracking-tight truncate">
              {invoice.invoiceNumber || invoice.number || `Invoice #${invoice._id?.slice(-6)}`}
            </h1>
            {version > 1 && (
              <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                v{version}
              </span>
            )}
          </div>

          {/* Mobile: icon-only primary action + overflow menu */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Primary action visible on mobile */}
            {(invoice.status === 'sent' || invoice.status === 'unpaid') && (
              <Button variant="primary" size="sm" icon="lucide:check" onClick={handleMarkPaid}>
                <span className="hidden sm:inline">Mark as Paid</span>
              </Button>
            )}
            {invoice.status === 'draft' && (
              <Button variant="outline" size="sm" icon="lucide:pencil" onClick={() => navigate(`/invoices/${id}/edit`)}>
                <span className="hidden sm:inline">Edit</span>
              </Button>
            )}

            {/* Overflow menu for secondary actions */}
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
              >
                <Icon icon="lucide:more-vertical" className="w-5 h-5" />
              </button>

              {showActions && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowActions(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 w-52 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg py-1 overflow-hidden">
                    {canEdit && (
                      <button
                        onClick={() => { navigate(`/invoices/${id}/edit`); setShowActions(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Icon icon={isDraft ? 'lucide:pencil' : 'lucide:git-branch'} className="w-4 h-4" />
                        {editLabel}
                      </button>
                    )}
                    <button
                      onClick={() => { handleDownloadInvoice(); setShowActions(false); }}
                      disabled={downloadingInvoice}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      {downloadingInvoice
                        ? <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                        : <Icon icon="lucide:download" className="w-4 h-4" />
                      }
                      Download PDF
                    </button>
                    <button
                      onClick={() => { setShowSendModal(true); setShowActions(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Icon icon="lucide:send" className="w-4 h-4" />
                      Send Invoice
                    </button>
                    {invoice.status === 'draft' && (
                      <button
                        onClick={() => { handleMarkSent(); setShowActions(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Icon icon="lucide:arrow-right" className="w-4 h-4" />
                        Mark as Sent
                      </button>
                    )}
                    {(invoice.status === 'sent' || invoice.status === 'unpaid') && (
                      <button
                        onClick={() => { handleMarkPaid(); setShowActions(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Icon icon="lucide:check" className="w-4 h-4" />
                        Mark as Paid
                      </button>
                    )}
                    {invoice.taxPercentage !== (invoice.organizationId?.taxPercentage ?? 0) && (
                      <button
                        onClick={handleRecalculateTax}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      >
                        <Icon icon="lucide:refresh-cw" className="w-4 h-4" />
                        Recalculate Tax ({invoice.organizationId?.taxPercentage ?? 0}%)
                      </button>
                    )}
                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
                    <button
                      onClick={() => { setShowDeleteModal(true); setShowActions(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Icon icon="lucide:trash-2" className="w-4 h-4" />
                      Delete Invoice
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Revision lineage banner */}
      {invoice.revisedFromId && (
        <div className="mb-3 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Icon icon="lucide:git-branch" className="w-4 h-4 shrink-0" />
          <span>Revised from a previous version</span>
        </div>
      )}

      {/* Summary strip — always visible at top on mobile */}
      <div className="mb-4 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge status={invoice.status} size="md" />
            <Badge status={paymentStatus} size="md" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              ₹{totalAmount.toLocaleString('en-IN')}
            </p>
            {totalPaid > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ₹{totalPaid.toLocaleString('en-IN')} paid
              </p>
            )}
          </div>
        </div>

        {/* Payment progress bar */}
        {totalAmount > 0 && (
          <div className="mt-3">
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  paymentPercentage >= 100
                    ? 'bg-emerald-500'
                    : paymentPercentage > 0
                      ? 'bg-amber-500'
                      : 'bg-gray-300 dark:bg-gray-700'
                }`}
                style={{ width: `${paymentPercentage}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-gray-400 dark:text-gray-500">
              <span>{paymentPercentage.toFixed(0)}% paid</span>
              {totalAmount - totalPaid > 0 && (
                <span className="text-red-500 dark:text-red-400 font-medium">
                  ₹{Math.max(totalAmount - totalPaid, 0).toLocaleString('en-IN')} due
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main layout: stacked on mobile, 3-col on large screens */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4">

        {/* Sidebar info — shown first on mobile as compact strip */}
        <div className="lg:col-start-3 lg:row-start-1 space-y-4">
          {/* Key amounts card (hidden on mobile — already shown in summary strip above) */}
          <Card className="hidden lg:block">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Status</p>
                <Badge status={invoice.status} size="md" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Payment</p>
                <Badge status={paymentStatus} size="md" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Amount Paid</p>
                <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  ₹{totalPaid.toLocaleString('en-IN')}
                </p>
              </div>
              {totalAmount - totalPaid > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Balance Due</p>
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                    ₹{Math.max(totalAmount - totalPaid, 0).toLocaleString('en-IN')}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Project</p>
                {invoice.project ? (
                  <button
                    onClick={() => navigate(`/projects/${invoice.project._id || invoice.project}`)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {invoice.project.name || 'View Project'}
                  </button>
                ) : (
                  <span className="text-sm text-gray-400 dark:text-gray-500">N/A</span>
                )}
              </div>
              {invoice.paymentAccountIds?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Payment Accounts</p>
                  <div className="flex flex-wrap gap-1">
                    {invoice.paymentAccountIds.map((a) => (
                      <span key={a._id} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {a.accountName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Project / Account — shown on mobile as a small card */}
          {(invoice.project || invoice.paymentAccountIds?.length > 0) && (
            <Card className="lg:hidden">
              <div className="flex flex-wrap gap-4">
                {invoice.project && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Project</p>
                    <button
                      onClick={() => navigate(`/projects/${invoice.project._id || invoice.project}`)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {invoice.project.name || 'View Project'}
                    </button>
                  </div>
                )}
                {invoice.paymentAccountIds?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Payment Accounts</p>
                    <div className="flex flex-wrap gap-1">
                      {invoice.paymentAccountIds.map((a) => (
                        <span key={a._id} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {a.accountName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Main content column */}
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1 space-y-4">

          {/* Invoice Preview */}
          <Card>
            {/* Invoice header: number + status */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">
                  {invoice.invoiceNumber || invoice.number || 'INVOICE'}
                </h2>
                <div className="flex flex-col gap-0.5 mt-1">
                  {invoice.date && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Date: {format(typeof invoice.date === 'string' ? parseISO(invoice.date) : new Date(invoice.date), 'MMM d, yyyy')}
                    </p>
                  )}
                  {invoice.dueDate && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Due: {format(typeof invoice.dueDate === 'string' ? parseISO(invoice.dueDate) : new Date(invoice.dueDate), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              </div>
              <Badge status={invoice.status} size="md" />
            </div>

            {/* Client Info */}
            {client && (
              <div className="mb-5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Bill To</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{client.name}</p>
                {client.email && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 break-all">{client.email}</p>
                )}
                {(() => {
                  const addr = typeof client.address === 'object' && client.address
                    ? [client.address.street, client.address.city, client.address.state, client.address.zipCode, client.address.country].filter(Boolean).join(', ')
                    : client.address;
                  return addr ? <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{addr}</p> : null;
                })()}
              </div>
            )}

            {/* Line Items — card-style on mobile instead of table */}
            {items.length > 0 && (
              <>
                {/* Mobile: stacked cards */}
                <div className="space-y-2 sm:hidden">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-snug">
                          {item.description || item.name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {item.quantity || 1} × ₹{(item.rate || item.price || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 shrink-0">
                        ₹{(item.amount || (item.quantity || 1) * (item.rate || item.price || 0)).toLocaleString('en-IN')}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Desktop: table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider py-3 pr-4">
                          Description
                        </th>
                        <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider py-3 px-4">
                          Qty
                        </th>
                        <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider py-3 px-4">
                          Rate
                        </th>
                        <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider py-3 pl-4">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {items.map((item, i) => (
                        <tr key={i}>
                          <td className="py-3 pr-4 text-sm text-gray-700 dark:text-gray-300">
                            {item.description || item.name}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 text-right">
                            {item.quantity || 1}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 text-right">
                            ₹{(item.rate || item.price || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 pl-4 text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                            ₹{(item.amount || (item.quantity || 1) * (item.rate || item.price || 0)).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              {invoice.subtotal !== undefined && (
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>₹{(invoice.subtotal || 0).toLocaleString('en-IN')}</span>
                </div>
              )}
              {invoice.taxAmount !== undefined && invoice.taxAmount > 0 && (
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Tax{invoice.taxPercentage > 0 ? ` (${invoice.taxPercentage}%)` : ''}</span>
                  <span>₹{(invoice.taxAmount || 0).toLocaleString('en-IN')}</span>
                </div>
              )}
              {invoice.discount !== undefined && invoice.discount > 0 && (
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Discount</span>
                  <span>-₹{(invoice.discount || 0).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 dark:text-gray-50 pt-2 border-t border-gray-100 dark:border-gray-800">
                <span>Total</span>
                <span>₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </Card>

          {/* Payments */}
          <Card padding={false}>
            {/* Header */}
            <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                Payments ({payments.length})
              </h3>
              <div className="flex items-center gap-2">
                {payments.length > 0 && (
                  <button
                    onClick={() => handleDownloadReceipt()}
                    disabled={downloadingReceipt === true}
                    className="p-2 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-50"
                    title="Download latest receipt"
                  >
                    {downloadingReceipt === true
                      ? <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                      : <Icon icon="lucide:receipt" className="w-4 h-4" />
                    }
                  </button>
                )}
                <button
                  onClick={() => { setShowPaymentForm(!showPaymentForm); setEditingPaymentId(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Icon icon="lucide:plus" className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Add Payment Form */}
            {showPaymentForm && (
              <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 bg-blue-50/40 dark:bg-blue-900/10">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">New Payment</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Amount" type="number" step="0.01" min="0" placeholder="0.00" icon="lucide:indian-rupee"
                      value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
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
                      dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-400
                      outline-none transition-all resize-none" />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(false)} className="flex-1">Cancel</Button>
                    <Button size="sm" onClick={handleAddPayment} loading={addingPayment} disabled={!paymentForm.amount} className="flex-1">Record</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Payments List */}
            {payments.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Icon icon="lucide:credit-card" className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">No payments recorded yet</p>
              </div>
            ) : (() => {
              // Latest payment = last in array (most recently added/edited)
              const latest = payments[payments.length - 1];
              const history = payments.slice(0, payments.length - 1);

              const PaymentRow = ({ payment, isLatest }) => {
                const isEditing = editingPaymentId === payment._id;
                const methodLabel = PAYMENT_METHODS.find((m) => m.value === payment.method)?.label || payment.method || '--';
                return (
                  <div className={`border-b border-gray-50 dark:border-gray-800 last:border-0 ${isLatest ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}>
                    {isEditing ? (
                      /* ── Inline edit form ── */
                      <div className="px-4 py-4 bg-amber-50/40 dark:bg-amber-900/10 space-y-3">
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Editing Payment</p>
                        <div className="grid grid-cols-2 gap-3">
                          <Input label="Amount" type="number" step="0.01" min="0" icon="lucide:indian-rupee"
                            value={editPaymentForm.amount}
                            onChange={(e) => setEditPaymentForm({ ...editPaymentForm, amount: e.target.value })} />
                          <Input label="Date" type="date" value={editPaymentForm.date}
                            onChange={(e) => setEditPaymentForm({ ...editPaymentForm, date: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Select label="Method" value={editPaymentForm.method}
                            onChange={(e) => setEditPaymentForm({ ...editPaymentForm, method: e.target.value })} options={PAYMENT_METHODS} />
                          <Input label="Reference" placeholder="Txn / Cheque no." value={editPaymentForm.reference}
                            onChange={(e) => setEditPaymentForm({ ...editPaymentForm, reference: e.target.value })} />
                        </div>
                        <textarea rows={2} placeholder="Notes (optional)" value={editPaymentForm.notes}
                          onChange={(e) => setEditPaymentForm({ ...editPaymentForm, notes: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400
                            focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
                            dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500
                            outline-none transition-all resize-none" />
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingPaymentId(null)} className="flex-1">Cancel</Button>
                          <Button size="sm" onClick={handleUpdatePayment} loading={savingPayment}
                            disabled={!editPaymentForm.amount} className="flex-1">Save</Button>
                        </div>
                      </div>
                    ) : (
                      /* ── Read row ── */
                      <div className="px-4 py-3 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isLatest && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">Latest</span>
                            )}
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              ₹{(payment.amount || 0).toLocaleString('en-IN')}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                              {methodLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {payment.date && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {format(typeof payment.date === 'string' ? parseISO(payment.date) : new Date(payment.date), 'MMM d, yyyy')}
                              </span>
                            )}
                            {payment.reference && (
                              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">#{payment.reference}</span>
                            )}
                            {payment.notes && (
                              <span className="text-xs text-gray-400 dark:text-gray-500 italic truncate max-w-[140px]">{payment.notes}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {payment.recordedBy?.name && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">by {payment.recordedBy.name}</span>
                            )}
                            {payment.updatedBy?.name && (
                              <span className="text-xs text-amber-500 dark:text-amber-400">· edited by {payment.updatedBy.name}</span>
                            )}
                            {payment.updatedAt && (
                              <span className="text-xs text-amber-400 dark:text-amber-500">
                                {format(new Date(payment.updatedAt), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => startEditPayment(payment)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                            title="Edit payment">
                            <Icon icon="lucide:pencil" className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDownloadReceipt(payment._id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                            title="Download receipt" disabled={downloadingReceipt === payment._id}>
                            {downloadingReceipt === payment._id
                              ? <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                              : <Icon icon="lucide:receipt" className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleRemovePayment(payment._id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Remove payment">
                            <Icon icon="lucide:trash-2" className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <div>
                  {/* Latest payment — always visible */}
                  <PaymentRow payment={latest} isLatest={true} />

                  {/* History toggle */}
                  {history.length > 0 && (
                    <>
                      <button
                        onClick={() => setShowPaymentHistory((s) => !s)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-t border-gray-100 dark:border-gray-800"
                      >
                        <span>{showPaymentHistory ? 'Hide' : 'Show'} {history.length} earlier payment{history.length > 1 ? 's' : ''}</span>
                        <Icon icon={showPaymentHistory ? 'lucide:chevron-up' : 'lucide:chevron-down'} className="w-3.5 h-3.5" />
                      </button>
                      {showPaymentHistory && (
                        <div className="border-t border-gray-100 dark:border-gray-800">
                          {[...history].reverse().map((p) => (
                            <PaymentRow key={p._id} payment={p} isLatest={false} />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {invoice.notes}
              </p>
            </Card>
          )}

          {/* Payment Details */}
          {(invoice.paymentAccountIds?.length > 0) && (
            <Card padding={false}>
              <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Payment Details</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Use any of the following methods to pay</p>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {invoice.paymentAccountIds.map((account) => (
                  <div key={account._id} className="px-4 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon
                        icon={account.type === 'upi' ? 'lucide:smartphone' : account.type === 'qr' ? 'lucide:qr-code' : 'lucide:landmark'}
                        className="w-4 h-4 text-gray-400"
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {account.accountName}
                      </span>
                    </div>
                    {account.type === 'bank' && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm ml-6">
                        {account.bankName && (
                          <div>
                            <span className="text-xs text-gray-400 block">Bank</span>
                            <span className="text-gray-700 dark:text-gray-300">{account.bankName}</span>
                          </div>
                        )}
                        {account.accountNumber && (
                          <div>
                            <span className="text-xs text-gray-400 block">Acc No</span>
                            <span className="text-gray-700 dark:text-gray-300 font-mono text-xs">{account.accountNumber}</span>
                          </div>
                        )}
                        {account.ifscCode && (
                          <div>
                            <span className="text-xs text-gray-400 block">IFSC</span>
                            <span className="text-gray-700 dark:text-gray-300 font-mono text-xs">{account.ifscCode}</span>
                          </div>
                        )}
                        {account.accountHolderName && (
                          <div>
                            <span className="text-xs text-gray-400 block">Name</span>
                            <span className="text-gray-700 dark:text-gray-300">{account.accountHolderName}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {account.type === 'upi' && (
                      <div className="ml-6 space-y-1.5 text-sm">
                        {account.upiId && (
                          <div>
                            <span className="text-xs text-gray-400 block">UPI ID</span>
                            <span className="text-gray-700 dark:text-gray-300 font-mono text-xs break-all">{account.upiId}</span>
                          </div>
                        )}
                        {account.accountHolderName && (
                          <div>
                            <span className="text-xs text-gray-400 block">Name</span>
                            <span className="text-gray-700 dark:text-gray-300">{account.accountHolderName}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {account.type === 'qr' && account.qrImageUrl && (
                      <div className="ml-6 mt-2">
                        <img src={fixDriveUrl(account.qrImageUrl)} alt="QR Code" className="w-28 h-28 object-contain border border-gray-200 dark:border-gray-700 rounded-xl p-1 bg-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Activity Log */}
          {invoice.activityLog && invoice.activityLog.length > 0 && (
            <Card padding={false}>
              <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  Activity ({invoice.activityLog.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {[...invoice.activityLog].reverse().map((entry, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon icon="lucide:activity" className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{entry.action}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {entry.by?.name && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">{entry.by.name}</span>
                        )}
                        {entry.at && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {format(typeof entry.at === 'string' ? parseISO(entry.at) : new Date(entry.at), 'MMM d, yyyy h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Invoice"
        size="sm"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete this invoice? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>Delete</Button>
        </div>
      </Modal>

      {/* Send Invoice Modal */}
      <Modal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        title="Send Invoice"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Send this invoice via Email and WhatsApp to the client.
          </p>
          {client && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{client.name}</p>
              {client.email && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{client.email}</p>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              CC Emails (comma separated)
            </label>
            <input
              type="text"
              placeholder="cc1@example.com, cc2@example.com"
              value={sendCC}
              onChange={(e) => setSendCC(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm
                text-gray-900 placeholder-gray-400
                focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100
                dark:placeholder-gray-500 dark:focus:border-blue-400
                outline-none transition-all duration-150"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowSendModal(false)}>Cancel</Button>
            <Button icon="lucide:send" onClick={handleSendInvoice} loading={sending}>
              Send
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
