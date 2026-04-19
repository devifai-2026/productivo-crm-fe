import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import useWhatsappAddonStore from '../store/whatsappAddonStore';
import { authAPI, whatsappAddonAPI } from '../services/api';
import api from '../config/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';

const ADDON_META = {
  invoice: { label: 'Invoice via WhatsApp', icon: 'lucide:file-text' },
  task_reminder: { label: 'Task Reminders via WhatsApp', icon: 'lucide:bell' },
  meeting_invite: { label: 'Meeting Invites via WhatsApp', icon: 'lucide:calendar' },
};

const FREE_FEATURES = [
  { label: '3 clients (lifetime)',                   icon: 'lucide:users',          included: true },
  { label: '5 projects (lifetime)',                  icon: 'lucide:folder',         included: true },
  { label: '3 invoices (lifetime)',                  icon: 'lucide:file-text',      included: true },
  { label: 'Unlimited tasks',                        icon: 'lucide:check-circle',   included: true },
  { label: '10 team members (lifetime, incl. you)', icon: 'lucide:user-plus',      included: true },
  { label: 'View & manage users',                    icon: 'lucide:shield',         included: true },
  { label: 'Meetings & calendar',                    icon: 'lucide:video',          included: false },
  { label: 'WhatsApp CRM',                           icon: 'lucide:message-circle', included: false },
  { label: 'Sub-organisations',                      icon: 'lucide:building-2',     included: false },
  { label: 'Activity logs',                          icon: 'lucide:activity',       included: false },
  { label: 'Mobile app access',                      icon: 'lucide:smartphone',     included: false },
  { label: 'Priority support',                       icon: 'lucide:headphones',     included: false },
];

const PRO_FEATURES = [
  { label: 'Unlimited clients',                      icon: 'lucide:users',          included: true },
  { label: 'Unlimited projects',                     icon: 'lucide:folder',         included: true },
  { label: 'Unlimited invoices',                     icon: 'lucide:file-text',      included: true },
  { label: 'Unlimited tasks',                        icon: 'lucide:check-circle',   included: true },
  { label: 'Unlimited team members',                 icon: 'lucide:user-plus',      included: true },
  { label: 'Meetings & calendar',                    icon: 'lucide:video',          included: true },
  { label: 'WhatsApp CRM',                           icon: 'lucide:message-circle', included: true },
  { label: 'Sub-organisations',                      icon: 'lucide:building-2',     included: true },
  { label: 'Activity logs',                          icon: 'lucide:activity',       included: true },
  { label: 'Mobile app access',                      icon: 'lucide:smartphone',     included: true },
  { label: 'Priority support',                       icon: 'lucide:headphones',     included: true },
];

function UsageBar({ label, current, limit, icon }) {
  const isUnlimited = limit === null || limit === undefined || !isFinite(limit);
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((current / limit) * 100));
  const isWarning = pct >= 80;
  const isFull = pct >= 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon icon={icon} className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        </div>
        <span className={`text-xs font-semibold ${isFull ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>
          {isUnlimited ? `${current} / ∞` : `${current} / ${limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function MyPlan({ onMenuClick }) {
  const { user, subscriptionPlan, signupVerifyOtp } = useAuthStore();
  const { features: waFeatures, fetch: fetchAddons } = useWhatsappAddonStore();
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: '' });
  const [formErrors, setFormErrors] = useState({});
  const [waLogs, setWaLogs] = useState([]);

  useEffect(() => {
    fetchSub();
    fetchAddons();
    whatsappAddonAPI.getLogs({ limit: 10 }).then((r) => setWaLogs(r.data?.data || [])).catch(() => {});
  }, []);

  const fetchSub = async () => {
    setLoading(true);
    try {
      const res = await api.get('/subscription');
      setSub(res.data?.data || res.data);
    } catch {
      setSub(null);
    }
    setLoading(false);
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleUpgrade = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setUpgrading(true);
    try {
      const res = await api.post('/subscription/upgrade', form);
      const { paymentUrl } = res.data;
      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        toast.error('Could not get payment link. Please try again.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to initiate upgrade');
    }
    setUpgrading(false);
  };

  const isFree = !sub || sub.plan === 'free';
  const isPro = sub?.plan === 'pro' || sub?.plan === 'enterprise';

  const field = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (formErrors[k]) setFormErrors((f) => ({ ...f, [k]: '' }));
  };

  if (loading) {
    return (
      <div>
        <Header title="My Plan" onMenuClick={onMenuClick} />
        <div className="flex justify-center py-24"><Spinner size="lg" /></div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="My Plan"
        subtitle={isFree ? 'Starter (Free)' : `Pro — expires ${sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}`}
        onMenuClick={onMenuClick}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: current plan + usage */}
        <div className="lg:col-span-2 space-y-5">

          {/* Plan badge */}
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
                  ${isFree ? 'bg-gray-100 dark:bg-gray-800' : 'bg-violet-100 dark:bg-violet-900/30'}`}>
                  <Icon
                    icon={isFree ? 'lucide:zap' : 'lucide:crown'}
                    className={`w-6 h-6 ${isFree ? 'text-gray-500' : 'text-violet-600 dark:text-violet-400'}`}
                  />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-50">
                    {isFree ? 'Starter Plan' : 'Pro Plan'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isFree
                      ? 'Free forever — upgrade anytime'
                      : `Active · Renews ${sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}`}
                  </p>
                </div>
              </div>
              {isFree && (
                <Button onClick={() => setUpgradeModal(true)} size="sm">
                  <Icon icon="lucide:arrow-up-circle" className="w-4 h-4 mr-1.5" />
                  Upgrade to Pro
                </Button>
              )}
              {isPro && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold">
                  <Icon icon="lucide:check-circle" className="w-3.5 h-3.5" /> Active
                </span>
              )}
            </div>
          </Card>

          {/* Usage */}
          {sub?.usage && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Current Usage</h3>
              <div className="space-y-4">
                <UsageBar label="Team members" current={sub.usage.users} limit={isFree ? sub.limits?.users : null} icon="lucide:users" />
                <UsageBar label="Clients" current={sub.usage.clients} limit={isFree ? sub.limits?.clients : null} icon="lucide:briefcase" />
                <UsageBar label="Active projects" current={sub.usage.projects} limit={isFree ? sub.limits?.projects : null} icon="lucide:folder" />
                <UsageBar label="Invoices (total)" current={sub.usage.invoices} limit={isFree ? sub.limits?.invoices : null} icon="lucide:file-text" />
              </div>
            </Card>
          )}

          {/* What's included */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {isFree ? 'Free Plan — Full Feature List' : 'Pro Plan — Full Feature List'}
            </h3>
            <ul className="space-y-2.5">
              {(isFree ? FREE_FEATURES : PRO_FEATURES).map((f) => (
                <li key={f.label} className="flex items-center gap-2.5 text-sm">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${f.included ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/20'}`}>
                    <Icon
                      icon={f.included ? 'lucide:check' : 'lucide:x'}
                      className={`w-3 h-3 ${f.included ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
                    />
                  </div>
                  <Icon icon={f.icon} className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className={f.included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}>
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* WhatsApp Add-ons */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">WhatsApp Add-ons</h3>
              <button
                onClick={() => navigate('/premium')}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Manage →
              </button>
            </div>
            <div className="space-y-2.5">
              {Object.entries(ADDON_META).map(([key, meta]) => {
                const active = waFeatures?.[key]?.isActive;
                const exp = waFeatures?.[key]?.expiresAt;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Icon icon={meta.icon} className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{meta.label}</p>
                        {active && exp && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Until {new Date(exp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                    {active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                        <Icon icon="lucide:check-circle" className="w-3 h-3" /> Unlocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-semibold">
                        <Icon icon="lucide:lock" className="w-3 h-3" /> Locked
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* WhatsApp usage log */}
          {waLogs.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Recent WhatsApp Sends
              </h3>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {waLogs.map((log) => (
                  <li key={log._id} className="py-2.5 flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${log.success ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                      <Icon
                        icon={log.success ? 'mdi:whatsapp' : 'lucide:alert-circle'}
                        className={`w-3.5 h-3.5 ${log.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{log.subject || '—'}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        to {log.to || '—'}
                        {log.userEmail ? ` · by ${log.userEmail}` : ''}
                        {' · '}
                        {new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {!log.success && log.errorMsg && (
                        <p className="text-xs text-red-500 truncate">{log.errorMsg}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Right: upgrade CTA or pro perks */}
        <div>
          {isFree ? (
            <Card className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white border-0 sticky top-6">
              <div className="flex items-center gap-2 mb-1">
                <Icon icon="lucide:crown" className="w-4 h-4 opacity-80" />
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">Pro Plan</span>
              </div>
              <p className="text-2xl font-extrabold mt-1 mb-0.5">₹1499 <span className="text-sm font-normal opacity-70">/ year</span></p>
              <p className="text-xs opacity-70 mb-4">No seat fees. Everything unlocked.</p>

              <ul className="space-y-2 mb-6">
                {PRO_FEATURES.slice(0, 6).map((f) => (
                  <li key={f.label} className="flex items-center gap-2 text-sm opacity-90">
                    <Icon icon="lucide:check-circle" className="w-3.5 h-3.5 shrink-0 opacity-80" />
                    {f.label}
                  </li>
                ))}
                <li className="text-xs opacity-60 pl-5">+ more...</li>
              </ul>

              <button
                onClick={() => setUpgradeModal(true)}
                className="w-full py-3 rounded-xl bg-white text-violet-700 font-bold text-sm hover:bg-violet-50 transition-colors"
              >
                Upgrade Now — ₹1499/yr
              </button>
            </Card>
          ) : (
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Icon icon="lucide:crown" className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">You're on Pro</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">All features unlocked</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your Pro plan expires on{' '}
                <strong className="text-gray-700 dark:text-gray-300">
                  {sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                </strong>. To renew, contact us at{' '}
                <a href="mailto:support@productivo.in" className="text-blue-600 dark:text-blue-400 hover:underline">
                  support@productivo.in
                </a>
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Upgrade Modal */}
      <Modal isOpen={upgradeModal} onClose={() => setUpgradeModal(false)} title="Upgrade to Pro — ₹1499/year" size="sm">
        <form onSubmit={handleUpgrade} className="space-y-4">
          <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-sm text-violet-700 dark:text-violet-300">
            You'll be redirected to our secure payment gateway. Your plan activates instantly after payment.
          </div>

          <Input
            label="Full Name"
            placeholder="Your name"
            value={form.name}
            onChange={field('name')}
            error={formErrors.name}
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={field('email')}
            error={formErrors.email}
            required
          />
          <Input
            label="Phone / WhatsApp"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={field('phone')}
            error={formErrors.phone}
            required
          />

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setUpgradeModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={upgrading} className="flex-1 bg-violet-600 hover:bg-violet-700">
              <Icon icon="lucide:credit-card" className="w-4 h-4 mr-1.5" />
              Pay ₹1499
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
