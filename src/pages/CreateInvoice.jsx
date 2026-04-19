import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import useInvoiceStore from '../store/invoiceStore';
import useClientStore from '../store/clientStore';
import useAuthStore from '../store/authStore';
import { paymentAccountAPI, organizationAPI, projectAPI, whatsappAddonAPI } from '../services/api';
import useWhatsappAddonStore from '../store/whatsappAddonStore';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import SearchableSelect from '../components/ui/SearchableSelect';
import Button from '../components/ui/Button';

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount || 0);

export default function CreateInvoice({ onMenuClick }) {
  const navigate = useNavigate();
  const { createInvoice, isLoading } = useInvoiceStore();
  const { clients, fetchClients } = useClientStore();
  const { user } = useAuthStore();
  const { features: waFeatures, isFetched: waFetched, fetch: fetchWaAddon } = useWhatsappAddonStore();
  const [sendWhatsapp, setSendWhatsapp] = useState(false);
  // `busy` = any part of the submit chain in flight — save OR follow-up WA send
  const [busy, setBusy] = useState(false);
  const isSuperAdmin = user?.role === 'superadmin';

  useEffect(() => { if (!waFetched) fetchWaAddon(); }, [waFetched, fetchWaAddon]);

  const [form, setForm] = useState({
    organizationId: '',
    clientId: '',
    projectId: '',
    purpose: '',
    dueDate: '',
    notes: '',
  });
  const [clientProjects, setClientProjects] = useState([]);
  const [selectedPaymentAccountIds, setSelectedPaymentAccountIds] = useState([]);

  const [items, setItems] = useState([{ description: '', quantity: 1, rate: 0 }]);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [orgTax, setOrgTax] = useState(18);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isSuperAdmin) {
      organizationAPI.get().then((res) => {
        const orgs = res.data?.data || res.data || [];
        setOrganizations(Array.isArray(orgs) ? orgs : []);
      }).catch(() => {});
    } else {
      // Org admin: fetch clients for their org
      fetchClients();
      loadPaymentAccounts();
      // Load org tax
      if (user?.organizationId) {
        organizationAPI.getById(user.organizationId).then((res) => {
          const org = res.data?.data || res.data;
          if (org?.taxPercentage !== undefined) setOrgTax(org.taxPercentage);
        }).catch(() => {});
      }
    }
  }, [isSuperAdmin]);

  const loadPaymentAccounts = (orgId) => {
    const params = orgId ? { organizationId: orgId } : {};
    paymentAccountAPI.getAll(params).then((res) => {
      const data = res.data?.data || res.data || [];
      const accounts = Array.isArray(data) ? data : [];
      setPaymentAccounts(accounts);
      setSelectedPaymentAccountIds(accounts.map((a) => a._id));
    }).catch(() => {});
  };

  // Load projects for selected client
  useEffect(() => {
    if (!form.clientId) { setClientProjects([]); setForm((f) => ({ ...f, projectId: '' })); return; }
    projectAPI.getAll({ clientId: form.clientId }).then((res) => {
      const data = res.data?.data || res.data || [];
      setClientProjects(Array.isArray(data) ? data : []);
    }).catch(() => setClientProjects([]));
  }, [form.clientId]);

  const handleOrgChange = (orgId) => {
    setForm((f) => ({ ...f, organizationId: orgId, clientId: '', projectId: '' }));
    setSelectedPaymentAccountIds([]);
    setPaymentAccounts([]);
    if (!orgId) return;
    // Fetch clients for the selected org
    fetchClients({ organizationId: orgId });
    loadPaymentAccounts(orgId);
    // Fetch org tax
    organizationAPI.getById(orgId).then((res) => {
      const org = res.data?.data || res.data;
      if (org?.taxPercentage !== undefined) setOrgTax(org.taxPercentage);
    }).catch(() => {});
  };

  const updateField = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { description: '', quantity: 1, rate: 0 }]);
  const removeItem = (index) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };

  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0), 0);
  const taxAmount = (subtotal * orgTax) / 100;
  const total = subtotal + taxAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const orgId = isSuperAdmin ? form.organizationId : user?.organizationId;
    if (!orgId) { setError('Please select an organization.'); return; }
    if (!form.clientId) { setError('Please select a client.'); return; }
    if (items.some((i) => !i.description.trim())) { setError('All items must have a description.'); return; }
    if (paymentAccounts.length === 0) {
      toast.error('No payment accounts configured. Add one in Organization settings.');
      return;
    }

    const payload = {
      organizationId: orgId,
      clientId: form.clientId,
      projectId: form.projectId || undefined,
      purpose: form.purpose?.trim() || undefined,
      dueDate: form.dueDate || undefined,
      notes: form.notes || undefined,
      paymentAccountIds: selectedPaymentAccountIds.length ? selectedPaymentAccountIds : undefined,
      items: items.map((item) => ({
        description: item.description,
        quantity: parseFloat(item.quantity) || 1,
        rate: parseFloat(item.rate) || 0,
        amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0),
      })),
    };

    setBusy(true);
    try {
      const result = await createInvoice(payload);
      if (!result.success) {
        if (result.code === 'PLAN_LIMIT') {
          toast.error(`Free plan limit reached: max ${result.limit} invoices total. Upgrade to Pro for unlimited.`);
          navigate('/plan');
        } else {
          setError(result.error || 'Failed to create invoice.');
        }
        return;
      }

      const invoiceId = result.data._id;
      if (sendWhatsapp && invoiceId && waFeatures?.invoice?.isActive) {
        try {
          const res = await whatsappAddonAPI.sendInvoice(invoiceId);
          if (res.data?.success) {
            toast.success('Invoice sent via WhatsApp');
          } else {
            toast.error('Invoice saved — WhatsApp send failed');
          }
        } catch (err) {
          toast.error(err.response?.data?.error || 'Invoice saved — WhatsApp send failed');
        }
      }
      navigate(`/invoices/${invoiceId}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Header
        title="New Invoice"
        breadcrumbs={[{ label: 'Invoices', href: '/invoices' }, { label: 'New Invoice' }]}
        onMenuClick={onMenuClick}
      />

      <div className="grid xl:grid-cols-[1fr_360px] gap-6">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Superadmin: select org first */}
          {isSuperAdmin && (
            <SearchableSelect
              label="Organization"
              required
              value={form.organizationId}
              onChange={(val) => handleOrgChange(val)}
              placeholder="Search organization"
              options={organizations.map((o) => ({ value: o._id, label: o.name }))}
            />
          )}

          <SearchableSelect
            label="Client"
            required
            value={form.clientId}
            onChange={(val) => setForm((f) => ({ ...f, clientId: val }))}
            placeholder="Search client"
            options={clients.map((c) => ({
              value: c._id,
              label: c.name,
              meta: c.companyName || c.email || undefined,
            }))}
          />
          {form.clientId && (() => {
            const c = clients.find((cl) => cl._id === form.clientId);
            if (!c) return null;
            return (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 -mt-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">
                  {c.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                  {c.companyName && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.companyName}</p>}
                  {c.email && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{c.email}</p>}
                </div>
              </div>
            );
          })()}

          {/* Project selector — optional, filtered by client */}
          {form.clientId && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Project <span className="text-gray-400 font-normal text-xs">(optional)</span>
              </label>
              {clientProjects.length > 0 ? (
                <select
                  value={form.projectId}
                  onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 outline-none transition-all duration-150"
                >
                  <option value="">No project</option>
                  {clientProjects.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 py-2">
                  No projects found for this client
                </p>
              )}
            </div>
          )}

          {paymentAccounts.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Accounts</label>
              <div className="flex flex-wrap gap-2">
                {paymentAccounts.map((a) => {
                  const typeIcon = a.type === 'upi' ? 'lucide:smartphone' : a.type === 'qr' ? 'lucide:qr-code' : 'lucide:landmark';
                  const typeLabel = a.type === 'upi' ? 'UPI' : a.type === 'qr' ? 'QR' : 'Bank';
                  return (
                    <span key={a._id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm">
                      <Icon icon={typeIcon} className="w-3.5 h-3.5" />
                      <span className="font-medium">{a.accountName || 'Account'}</span>
                      <span className="text-xs opacity-75">({typeLabel})</span>
                    </span>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400">All payment accounts will appear on the invoice</p>
            </div>
          )}

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Line Items</label>
              <Button type="button" variant="ghost" size="sm" icon="lucide:plus" onClick={addItem}>
                Add Item
              </Button>
            </div>
            <div className="space-y-3">
              <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-1">
                <div className="col-span-5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description <span className="text-red-500">*</span></div>
                <div className="col-span-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qty <span className="text-red-500">*</span></div>
                <div className="col-span-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rate (₹) <span className="text-red-500">*</span></div>
                <div className="col-span-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</div>
                <div className="col-span-1" />
              </div>
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="sm:col-span-5">
                    <label className="sm:hidden block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description <span className="text-red-500">*</span></label>
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
                    <label className="sm:hidden block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Qty <span className="text-red-500">*</span></label>
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
                    <label className="sm:hidden block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rate (₹) <span className="text-red-500">*</span></label>
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

          {/* Totals */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="max-w-xs ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatINR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">GST ({orgTax}%)</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatINR(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-900 dark:text-gray-100">Total</span>
                <span className="text-gray-900 dark:text-gray-100">{formatINR(total)}</span>
              </div>
            </div>
          </div>

          {/* Purpose + Due Date — used in client notifications (email/WhatsApp) */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Invoice For"
              placeholder="e.g. Website Development"
              value={form.purpose}
              onChange={updateField('purpose')}
              maxLength={200}
            />
            <Input
              label="Payment Due By"
              type="date"
              value={form.dueDate}
              onChange={updateField('dueDate')}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <textarea
              rows={3}
              placeholder="Additional notes or payment terms..."
              value={form.notes}
              onChange={updateField('notes')}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-400 outline-none transition-all duration-150 resize-none"
            />
          </div>

          {waFeatures?.invoice?.isActive && form.clientId && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-900/10 cursor-pointer">
              <input
                type="checkbox"
                checked={sendWhatsapp}
                onChange={(e) => setSendWhatsapp(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="flex-1">
                <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <Icon icon="mdi:whatsapp" className="w-4 h-4" />
                  Also send invoice to client's WhatsApp
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">
                  Uses the client's phone number from the Clients page.
                </span>
              </span>
            </label>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" loading={busy || isLoading} disabled={busy || isLoading}>
              {busy && sendWhatsapp && waFeatures?.invoice?.isActive
                ? 'Sending via WhatsApp…'
                : busy
                  ? 'Saving invoice…'
                  : sendWhatsapp && waFeatures?.invoice?.isActive
                    ? 'Create & Send via WhatsApp'
                    : 'Create Invoice'}
            </Button>
            <Button variant="outline" type="button" onClick={() => navigate('/invoices')} disabled={busy}>Cancel</Button>
          </div>
        </form>
      </Card>

      {/* WhatsApp preview — only when addon is active */}
      {waFeatures?.invoice?.isActive && (
        <div className="xl:sticky xl:top-6 self-start">
          <WhatsappPreview
            clientName={clients.find((c) => c._id === form.clientId)?.name}
            purpose={form.purpose}
            dueDate={form.dueDate}
            invoiceNumber="auto-generated"
            orgName="Productivo"
          />
        </div>
      )}
      </div>
    </div>
  );
}

/* ───────────────────────────── WhatsApp preview ───────────────────────────── */

function WhatsappPreview({ clientName, purpose, dueDate, orgName }) {
  const displayName = clientName?.trim() || '{client name}';
  const displayPurpose = purpose?.trim() || '{invoice for}';
  const displayDate = dueDate
    ? new Date(dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : '{due date}';

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800 bg-[#e5ddd5] dark:bg-gray-800">
      {/* WhatsApp header */}
      <div className="bg-[#075e54] dark:bg-[#0a4a43] px-4 py-3 flex items-center gap-3">
        <Icon icon="mdi:whatsapp" className="w-5 h-5 text-white" />
        <div>
          <p className="text-sm font-semibold text-white">WhatsApp Preview</p>
          <p className="text-[11px] text-white/70">How your client will see it</p>
        </div>
      </div>

      {/* Chat body */}
      <div className="p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl rounded-tl-none shadow-sm p-3 max-w-[90%]">
          {/* PDF attachment pill */}
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 mb-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <Icon icon="lucide:file-text" className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">Invoice.pdf</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">PDF · attached</p>
            </div>
          </div>

          {/* Body text — mirrors WABridge template invoice_template_002 */}
          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">
            Hello <strong>{displayName}</strong>,{'\n\n'}
            Please find your invoice for <strong>{displayPurpose}</strong> attached.{'\n'}
            We kindly request you to review the details and process the payment by <strong>{displayDate}</strong>.{'\n\n'}
            If you have any questions or need any clarification, please feel free to reach out.{'\n\n'}
            We appreciate your business and look forward to working with you again.
          </p>

          {/* Footer */}
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">Sent via {orgName}</p>

          {/* Timestamp */}
          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-right mt-1">
            {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            <Icon icon="lucide:check-check" className="inline w-3 h-3 ml-1 text-[#34b7f1]" />
          </p>
        </div>

        {(!clientName?.trim() || !purpose?.trim() || !dueDate) && (
          <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400 text-center">
            Fill in Client, Invoice For, and Due Date to complete the preview.
          </p>
        )}
      </div>
    </div>
  );
}
