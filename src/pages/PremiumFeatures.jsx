import { useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { enquiryAPI } from '../services/api';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const PREMIUM_FEATURES = [
  {
    id: 'whatsapp_invoice',
    icon: 'lucide:file-text',
    title: 'Send Invoice via WhatsApp',
    description:
      'Automatically send generated invoices directly to your client\'s WhatsApp. One click — PDF delivered instantly.',
    bullets: [
      'Auto-send on invoice creation',
      'Instant PDF delivery to client',
      'Delivery confirmation tracking',
    ],
  },
  {
    id: 'whatsapp_task_reminder',
    icon: 'lucide:bell',
    title: 'Task Reminders via WhatsApp',
    description:
      'Send automated WhatsApp reminders to assignees when tasks are due or overdue. Keep your team on track.',
    bullets: [
      'Due-date reminders to assignees',
      'Overdue task escalation alerts',
      'Custom reminder timing',
    ],
  },
  {
    id: 'whatsapp_meeting_invite',
    icon: 'lucide:calendar',
    title: 'Meeting Invites via WhatsApp',
    description:
      'Share meeting details, agenda, and join links directly to attendees\' WhatsApp. No email needed.',
    bullets: [
      'Instant invite to all attendees',
      'Meeting agenda in message',
      'Join link included automatically',
    ],
  },
];

function LockedFeatureCard({ feature, onUnlock }) {
  return (
    <Card className="relative overflow-hidden flex flex-col">
      {/* Premium badge */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Icon icon="lucide:lock" className="w-3 h-3 text-blue-600 dark:text-blue-400" />
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Add-on</span>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {/* Icon + title */}
        <div className="flex items-start gap-4 pr-20">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-900/20">
            <Icon icon={feature.icon} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
              {feature.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              {feature.description}
            </p>
          </div>
        </div>

        {/* Bullets */}
        <ul className="space-y-2 pl-1">
          {feature.bullets.map((b) => (
            <li key={b} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
              <Icon icon="lucide:check" className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
              {b}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={() => onUnlock(feature)}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl mt-auto
            bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500
            text-white text-sm font-semibold transition-all duration-150 shadow-sm hover:shadow-md"
        >
          <Icon icon="lucide:zap" className="w-4 h-4" />
          Unlock This Feature
        </button>
      </div>
    </Card>
  );
}

export default function PremiumFeatures({ onMenuClick }) {
  const { user } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    description: '',
  });

  const handleUnlock = (feature) => {
    setSelectedFeature(feature);
    setSubmitted(false);
    setForm({
      fullName: user?.name || '',
      email: user?.email || '',
      phone: '',
      description: '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.phone || !form.description) {
      toast.error('Please fill in all fields');
      return;
    }
    setSubmitting(true);
    try {
      await enquiryAPI.submitPremium({
        ...form,
        featureInterest: selectedFeature ? [selectedFeature.id] : [],
        orgName: user?.organizationId?.name || '',
      });
      setSubmitted(true);
    } catch {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div>
      <Header
        title="Premium Features"
        subtitle="Supercharge your workflow with WhatsApp automation"
        onMenuClick={onMenuClick}
      />

      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl mb-8 bg-blue-600 dark:bg-blue-700 p-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Icon icon="lucide:zap" className="w-4 h-4 opacity-90" />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Paid Add-on</span>
          </div>
          <h2 className="text-xl font-bold mb-1">WhatsApp Business Automation</h2>
          <p className="text-sm opacity-80 max-w-md leading-relaxed">
            These are paid add-ons on top of your current plan. Fill the interest form and our team will contact you with pricing and activation details.
          </p>
        </div>
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -right-4 -bottom-10 w-28 h-28 rounded-full bg-white/10" />
      </div>

      {/* Feature cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {PREMIUM_FEATURES.map((feature) => (
          <LockedFeatureCard key={feature.id} feature={feature} onUnlock={handleUnlock} />
        ))}
      </div>

      {/* Enquiry modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={submitted ? 'Request Sent!' : `Unlock: ${selectedFeature?.title || ''}`}
      >
        {submitted ? (
          <div className="flex flex-col items-center text-center py-4 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <Icon icon="lucide:check-circle" className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-1">
                We've received your request!
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Our team will reach out to <strong>{form.email}</strong> within 24–48 hours with pricing and activation details.
              </p>
            </div>
            <Button onClick={() => setModalOpen(false)} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {selectedFeature && (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20">
                <Icon icon={selectedFeature.icon} className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedFeature.title}
                </p>
              </div>
            )}

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Fill in your details and we'll get back to you with pricing and next steps.
            </p>

            <Input
              label="Full Name"
              placeholder="Your name"
              value={form.fullName}
              onChange={field('fullName')}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={field('email')}
              required
            />
            <Input
              label="Phone / WhatsApp"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={field('phone')}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Tell us about your use case
              </label>
              <textarea
                rows={3}
                placeholder="How many clients do you send invoices to? How large is your team?"
                value={form.description}
                onChange={field('description')}
                required
                className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-900 px-3 py-2.5
                  text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500
                  outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" loading={submitting} className="flex-1">
                <Icon icon="lucide:send" className="w-4 h-4 mr-1.5" />
                Send Request
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
