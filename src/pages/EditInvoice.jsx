import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import useInvoiceStore from '../store/invoiceStore';
import { invoiceAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount || 0);

const EDITABLE_STATUSES = ['draft'];
const REVISABLE_STATUSES = ['sent', 'paid', 'overdue'];

export default function EditInvoice({ onMenuClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentInvoice, isLoading, fetchInvoice, updateInvoice } = useInvoiceStore();

  const [items, setItems] = useState([{ description: '', quantity: 1, rate: 0 }]);
  const [notes, setNotes] = useState('');
  const [purpose, setPurpose] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxPercentage, setTaxPercentage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [revising, setRevising] = useState(false);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [showReviseModal, setShowReviseModal] = useState(false);

  useEffect(() => {
    fetchInvoice(id);
  }, [id]);

  useEffect(() => {
    if (currentInvoice && !initialized) {
      setItems(
        (currentInvoice.items || []).map((item) => ({
          description: item.description || '',
          quantity: item.quantity || 1,
          rate: item.rate || 0,
        }))
      );
      setNotes(currentInvoice.notes || '');
      setPurpose(currentInvoice.purpose || '');
      setDueDate(currentInvoice.dueDate ? new Date(currentInvoice.dueDate).toISOString().slice(0, 10) : '');
      setTaxPercentage(currentInvoice.taxPercentage ?? 0);
      setInitialized(true);
    }
  }, [currentInvoice, initialized]);

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { description: '', quantity: 1, rate: 0 }]);
  const removeItem = (index) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };

  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0), 0);
  const taxAmount = (subtotal * (parseFloat(taxPercentage) || 0)) / 100;
  const total = subtotal + taxAmount;

  const buildPayload = () => ({
    items: items.map((item) => ({
      description: item.description,
      quantity: parseFloat(item.quantity) || 1,
      rate: parseFloat(item.rate) || 0,
      amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0),
    })),
    notes,
    purpose: (purpose || '').trim(),
    dueDate: dueDate || null,
    taxPercentage: parseFloat(taxPercentage) || 0,
  });

  const validate = () => {
    if (items.some((i) => !i.description.trim())) {
      setError('All items must have a description.');
      return false;
    }
    return true;
  };

  // Direct save — only for draft invoices
  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setSaving(true);
    const result = await updateInvoice(id, buildPayload());
    setSaving(false);
    if (result.success) {
      navigate(`/invoices/${id}`);
    } else {
      setError(result.error || 'Failed to save invoice.');
    }
  };

  // Revise — creates a new versioned invoice for sent/paid/overdue
  const handleRevise = async () => {
    setError('');
    if (!validate()) { setShowReviseModal(false); return; }
    setRevising(true);
    try {
      const res = await invoiceAPI.revise(id, buildPayload());
      const newInvoice = res.data?.data;
      setShowReviseModal(false);
      navigate(`/invoices/${newInvoice._id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to revise invoice.');
      setShowReviseModal(false);
    }
    setRevising(false);
  };

  if (isLoading && !initialized) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!currentInvoice) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400">Invoice not found</p>
        <Button variant="ghost" onClick={() => navigate('/invoices')} className="mt-4">Back to Invoices</Button>
      </div>
    );
  }

  if (currentInvoice.status === 'cancelled') {
    return (
      <div className="text-center py-20">
        <Icon icon="lucide:ban" className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">Cancelled invoices cannot be edited</p>
        <Button variant="ghost" onClick={() => navigate(`/invoices/${id}`)} className="mt-4">Back to Invoice</Button>
      </div>
    );
  }

  const isDraft = EDITABLE_STATUSES.includes(currentInvoice.status);
  const isRevisable = REVISABLE_STATUSES.includes(currentInvoice.status);
  const nextVersion = (currentInvoice.version || 1) + 1;
  const rootNumber = (currentInvoice.invoiceNumber || '').replace(/-v\d+$/, '');
  const newInvoiceNumber = `${rootNumber}-v${nextVersion}`;

  const client = currentInvoice.clientId || currentInvoice.client;

  return (
    <div>
      <Header
        title={isDraft ? 'Edit Invoice' : 'Revise Invoice'}
        breadcrumbs={[
          { label: 'Invoices', href: '/invoices' },
          { label: currentInvoice.invoiceNumber || 'Invoice', href: `/invoices/${id}` },
          { label: isDraft ? 'Edit' : 'Revise' },
        ]}
        onMenuClick={onMenuClick}
      />

      {/* Revision notice for sent/paid invoices */}
      {isRevisable && (
        <div className="mb-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
          <Icon icon="lucide:info" className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              This invoice has been {currentInvoice.status} — it cannot be edited directly
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              Saving will create a new invoice <span className="font-mono font-bold">{newInvoiceNumber}</span> and cancel{' '}
              <span className="font-mono font-bold">{currentInvoice.invoiceNumber}</span>.
            </p>
          </div>
        </div>
      )}

      <Card className="max-w-3xl">
        <form onSubmit={isDraft ? handleSave : (e) => { e.preventDefault(); setShowReviseModal(true); }} className="space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Client info (read-only) */}
          {client && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <Icon icon="lucide:user" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Client (cannot be changed)</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{client.name}</p>
              </div>
            </div>
          )}

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Line Items</label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <Icon icon="lucide:plus" className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>
            <div className="space-y-3">
              <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-1">
                <div className="col-span-5 text-xs font-medium text-gray-400 uppercase tracking-wider">Description</div>
                <div className="col-span-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Qty</div>
                <div className="col-span-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Rate (₹)</div>
                <div className="col-span-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</div>
                <div className="col-span-1" />
              </div>
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Item description"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500 outline-none transition-all"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 outline-none transition-all"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={item.rate}
                      onChange={(e) => updateItem(index, 'rate', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 outline-none transition-all"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      ₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="sm:col-span-1 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Icon icon="lucide:trash-2" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tax & Totals */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="max-w-xs ml-auto space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500 dark:text-gray-400 w-24 shrink-0">GST (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(e.target.value)}
                  className="w-20 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 outline-none"
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatINR(subtotal)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">GST ({taxPercentage}%)</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{formatINR(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-900 dark:text-gray-100">Total</span>
                <span className="text-gray-900 dark:text-gray-100">{formatINR(total)}</span>
              </div>
            </div>
          </div>

          {/* Purpose + Due Date */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Invoice For"
              placeholder="e.g. Website Development"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              maxLength={200}
            />
            <Input
              label="Payment Due By"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <textarea
              rows={3}
              placeholder="Additional notes or payment terms..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-400 outline-none transition-all duration-150 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            {isDraft ? (
              <Button type="submit" loading={saving} icon="lucide:save">
                Save Changes
              </Button>
            ) : (
              <Button
                type="submit"
                loading={revising}
                icon="lucide:git-branch"
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Create Revision ({newInvoiceNumber})
              </Button>
            )}
            <Button variant="outline" type="button" onClick={() => navigate(`/invoices/${id}`)}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      {/* Revise confirmation modal */}
      <Modal
        isOpen={showReviseModal}
        onClose={() => setShowReviseModal(false)}
        title="Create Invoice Revision"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This will:
          </p>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-center gap-2">
              <Icon icon="lucide:plus-circle" className="w-4 h-4 text-emerald-500 shrink-0" />
              Create a new draft invoice <span className="font-mono font-bold">{newInvoiceNumber}</span>
            </li>
            <li className="flex items-center gap-2">
              <Icon icon="lucide:x-circle" className="w-4 h-4 text-red-500 shrink-0" />
              Cancel <span className="font-mono font-bold">{currentInvoice.invoiceNumber}</span>
            </li>
          </ul>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            The original invoice will be marked as cancelled and will still be visible in invoice history.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleRevise}
              loading={revising}
              icon="lucide:git-branch"
            >
              Confirm Revision
            </Button>
            <Button variant="outline" onClick={() => setShowReviseModal(false)}>
              Go Back
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
