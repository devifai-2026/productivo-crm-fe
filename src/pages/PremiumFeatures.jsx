import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import useWhatsappAddonStore from '../store/whatsappAddonStore';
import { whatsappAddonAPI } from '../services/api';
import api from '../config/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

const FEATURES = [
  {
    id: 'invoice',
    icon: 'lucide:file-text',
    title: 'Send Invoice via WhatsApp',
    description: "Deliver invoices to your client's WhatsApp the moment they're created.",
    bullets: [
      'One-click send from Invoice page',
      'Uses your approved invoice_template',
      'Delivery confirmation tracked',
    ],
  },
  {
    id: 'task_reminder',
    icon: 'lucide:bell',
    title: 'Task Reminders via WhatsApp',
    description: 'Send WhatsApp reminders to assignees when a task is due or overdue.',
    bullets: [
      'Remind any assignee from Task Detail',
      'Includes project, due date, priority',
      'Works from desktop or mobile',
    ],
  },
  {
    id: 'meeting_invite',
    icon: 'lucide:calendar',
    title: 'Meeting Invites via WhatsApp',
    description: "Push meeting details and join links directly to every attendee's WhatsApp.",
    bullets: [
      'All attendees with a WA number notified',
      'Includes Meet link and agenda',
      'No email-only invites needed',
    ],
  },
];

function StatusPill({ isActive, expiresAt }) {
  if (isActive) {
    const exp = expiresAt ? new Date(expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 max-w-full">
        <Icon icon="lucide:check-circle" className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 truncate">
          Active{exp ? ` · until ${exp}` : ''}
        </span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
      <Icon icon="lucide:lock" className="w-3 h-3 text-gray-500 dark:text-gray-400 shrink-0" />
      <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">Locked</span>
    </div>
  );
}

function FeatureCard({ feature, status, onUnlock, price }) {
  const isActive = status?.isActive;
  return (
    <Card className="flex flex-col">
      {/* Status pill — in its own row so long "Active · until" text never collides with title */}
      <div className="flex justify-end mb-3">
        <StatusPill isActive={isActive} expiresAt={status?.expiresAt} />
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {/* Title + description — full width, no right padding hack */}
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-900/20">
            <Icon icon={feature.icon} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">{feature.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{feature.description}</p>
          </div>
        </div>

        <ul className="space-y-2 pl-1">
          {feature.bullets.map((b) => (
            <li key={b} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
              <Icon icon="lucide:check" className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
              {b}
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            <span className="text-lg font-bold text-gray-900 dark:text-gray-50">₹{price}</span>
            <span className="text-xs ml-1">/ year</span>
          </span>
          <button
            onClick={() => onUnlock(feature)}
            disabled={isActive}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 shadow-sm
              disabled:bg-emerald-50 disabled:text-emerald-700 disabled:cursor-default disabled:shadow-none
              dark:disabled:bg-emerald-900/20 dark:disabled:text-emerald-400
              enabled:bg-blue-600 enabled:hover:bg-blue-700 enabled:text-white enabled:hover:shadow-md"
          >
            {isActive ? (
              <>
                <Icon icon="lucide:check" className="w-4 h-4" />
                Unlocked
              </>
            ) : (
              <>
                <Icon icon="lucide:zap" className="w-4 h-4" />
                Unlock
              </>
            )}
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function PremiumFeatures({ onMenuClick }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { features, prices, fetch: fetchAddons } = useWhatsappAddonStore();
  const [searchParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selection, setSelection] = useState(null); // 'bundle' | feature id

  const isSuperadmin = user?.role === 'superadmin';
  const canPurchase = isSuperadmin;

  useEffect(() => {
    fetchAddons();
  }, [fetchAddons]);

  useEffect(() => {
    const pid = searchParams.get('pid');
    if (searchParams.get('addon') !== '1' || !pid) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/payments/verify?pid=${pid}`);
        const status = res.data?.status;
        if (cancelled) return;
        if (status === 'paid') {
          toast.success('Payment received — your add-ons are unlocked.');
          fetchAddons();
        } else if (status === 'pending') {
          toast('Payment still processing. Refresh in a minute.', { icon: '⏳' });
        } else if (status === 'failed') {
          toast.error('Payment was not completed.');
        }
      } catch {
        toast.error('Could not verify your payment. Contact support if charged.');
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams, fetchAddons]);

  const allUnlocked = features.invoice.isActive && features.task_reminder.isActive && features.meeting_invite.isActive;

  const openCheckout = (sel) => {
    if (!canPurchase) {
      toast.error('Only your superadmin can purchase add-ons.');
      return;
    }
    if (!user?.phoneNumber) {
      toast.error('Set your phone number in Settings → Profile first.');
      navigate('/settings');
      return;
    }
    setSelection(sel);
    setModalOpen(true);
  };

  const handlePay = async () => {
    setSubmitting(true);
    try {
      const featuresToBuy =
        selection === 'bundle'
          ? ['invoice', 'task_reminder', 'meeting_invite']
          : [selection];
      const res = await whatsappAddonAPI.initiatePurchase({ features: featuresToBuy });
      const url = res.data?.paymentUrl;
      if (!url) {
        toast.error('Payment URL not received. Please try again.');
        return;
      }
      window.location.href = url;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectionLabel =
    selection === 'bundle'
      ? 'All 3 Add-ons Bundle'
      : FEATURES.find((f) => f.id === selection)?.title || '';

  const selectionPrice =
    selection === 'bundle' ? prices.bundle : prices[selection] || prices.invoice;

  return (
    <div>
      <Header
        title="Premium Features"
        subtitle="Unlock WhatsApp automation with pay-as-you-go add-ons"
        onMenuClick={onMenuClick}
      />

      {/* Bundle card */}
      <div className="relative overflow-hidden rounded-2xl mb-8 bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-900 p-6 text-white">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="lucide:sparkles" className="w-4 h-4 opacity-90" />
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Best Value</span>
            </div>
            <h2 className="text-xl font-bold mb-1">Unlock All 3 WhatsApp Add-ons</h2>
            <p className="text-sm opacity-85 max-w-lg leading-relaxed">
              Invoices + Task Reminders + Meeting Invites — all active for 1 full year. Save ₹298 vs buying individually.
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            <div>
              <span className="text-3xl font-bold">₹{prices.bundle}</span>
              <span className="text-sm opacity-80 ml-1">/ year</span>
            </div>
            <button
              onClick={() => openCheckout('bundle')}
              disabled={allUnlocked}
              className="px-5 py-2.5 rounded-xl bg-white text-blue-700 font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-150
                disabled:bg-white/50 disabled:cursor-not-allowed"
            >
              {allUnlocked ? 'All Unlocked ✓' : 'Unlock Bundle — ₹1,199'}
            </button>
          </div>
        </div>
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -right-4 -bottom-10 w-28 h-28 rounded-full bg-white/10" />
      </div>

      {/* Individual feature cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {FEATURES.map((feature) => (
          <FeatureCard
            key={feature.id}
            feature={feature}
            status={features[feature.id]}
            price={prices[feature.id] || 499}
            onUnlock={(f) => openCheckout(f.id)}
          />
        ))}
      </div>

      {/* Checkout modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Unlock: ${selectionLabel}`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total</span>
            <span className="text-lg font-bold text-blue-700 dark:text-blue-400">₹{selectionPrice} / year</span>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            You'll be redirected to Cashfree to complete payment. The add-on activates automatically once payment is confirmed.
          </p>

          <div className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 space-y-1">
            <div className="text-xs text-gray-500 dark:text-gray-400">Billing details</div>
            <div className="text-sm text-gray-700 dark:text-gray-200"><strong>{user?.name}</strong></div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Phone: {user?.phoneNumber || '—'}</div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handlePay} loading={submitting} className="flex-1">
              <Icon icon="lucide:credit-card" className="w-4 h-4 mr-1.5" />
              Pay ₹{selectionPrice}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
