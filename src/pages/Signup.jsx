import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_CHECKS = [
  { re: /.{8,}/, label: 'At least 8 characters' },
  { re: /[A-Z]/, label: 'One uppercase letter' },
  { re: /[0-9]/, label: 'One number' },
];

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Full name is required';
  else if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  if (!form.email) errors.email = 'Email is required';
  else if (!EMAIL_RE.test(form.email)) errors.email = 'Enter a valid email address';
  if (!form.password) errors.password = 'Password is required';
  else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters';
  if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your password';
  else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match';
  return errors;
}

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const { signup, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const updateField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const result = await signup({ name: form.name.trim(), email: form.email.toLowerCase(), password: form.password });
    if (result.success) {
      toast.success('Account created! Welcome aboard.');
      navigate('/');
    } else {
      toast.error(result.error || 'Sign up failed');
    }
  };

  const strength = PASSWORD_CHECKS.filter((c) => c.re.test(form.password)).length;
  const strengthColor = ['bg-red-400', 'bg-amber-400', 'bg-emerald-500'][strength - 1] || 'bg-gray-200 dark:bg-gray-700';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/25">
            <Icon icon="lucide:zap" className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">Create your account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">Get started with Productivo</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-start gap-2.5">
              <Icon icon="lucide:alert-circle" className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Full Name"
              icon="lucide:user"
              placeholder="John Smith"
              value={form.name}
              onChange={updateField('name')}
              error={errors.name}
            />
            <Input
              label="Email"
              type="email"
              icon="lucide:mail"
              placeholder="you@example.com"
              value={form.email}
              onChange={updateField('email')}
              error={errors.email}
            />
            <div>
              <Input
                label="Password"
                type="password"
                icon="lucide:lock"
                placeholder="Create a strong password"
                value={form.password}
                onChange={updateField('password')}
                error={errors.password}
              />
              {form.password && (
                <div className="mt-2 space-y-1.5">
                  {/* Strength bar */}
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? strengthColor : 'bg-gray-200 dark:bg-gray-700'}`} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PASSWORD_CHECKS.map((c) => (
                      <span key={c.label} className={`text-xs flex items-center gap-1 ${c.re.test(form.password) ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        <Icon icon={c.re.test(form.password) ? 'lucide:check' : 'lucide:x'} className="w-3 h-3" />
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Input
              label="Confirm Password"
              type="password"
              icon="lucide:lock"
              placeholder="Repeat your password"
              value={form.confirmPassword}
              onChange={updateField('confirmPassword')}
              error={errors.confirmPassword}
            />

            <Button type="submit" fullWidth size="lg" loading={isLoading} className="mt-2">
              Create Account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
