import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_CHECKS = [
  { re: /.{8,}/, label: 'At least 8 characters' },
  { re: /[A-Z]/, label: 'One uppercase letter' },
  { re: /[0-9]/, label: 'One number' },
];

// Step 1: Enter email
function EmailStep({ onNext }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required'); return; }
    if (!EMAIL_RE.test(email)) { setError('Enter a valid email address'); return; }
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email: email.toLowerCase().trim() });
      toast.success('OTP sent! Check your inbox.');
      onNext(email.toLowerCase().trim());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="text-center mb-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mx-auto mb-4">
          <Icon icon="lucide:mail" className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Find your account</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter your email and we'll send a 4-digit OTP</p>
      </div>
      <Input
        label="Email Address"
        type="email"
        icon="lucide:mail"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setError(''); }}
        error={error}
      />
      <Button type="submit" fullWidth size="lg" loading={loading}>Send OTP</Button>
    </form>
  );
}

// Step 2: Enter OTP
function OtpStep({ email, onNext, onBack }) {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputs = useRef([]);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    setError('');
    if (val && i < 3) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (text.length === 4) {
      setOtp(text.split(''));
      inputs.current[3]?.focus();
    }
    e.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 4) { setError('Please enter the 4-digit OTP'); return; }
    setLoading(true);
    try {
      await authAPI.verifyOtp({ email, otp: code });
      toast.success('OTP verified!');
      onNext(code);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authAPI.forgotPassword({ email });
      toast.success('New OTP sent!');
      setOtp(['', '', '', '']);
      setError('');
      inputs.current[0]?.focus();
    } catch {
      toast.error('Failed to resend. Please try again.');
    }
    setResending(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="text-center mb-2">
        <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mx-auto mb-4">
          <Icon icon="lucide:shield-check" className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Enter OTP</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          We sent a 4-digit code to <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>
        </p>
      </div>

      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {otp.map((d, i) => (
          <input
            key={i}
            ref={(el) => (inputs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`w-11 h-12 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all
              bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
              ${d ? 'border-blue-500 dark:border-blue-400' : 'border-gray-200 dark:border-gray-700'}
              ${error ? 'border-red-400 dark:border-red-500' : ''}
              focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20`}
          />
        ))}
      </div>
      {error && <p className="text-center text-sm text-red-500 dark:text-red-400">{error}</p>}

      <Button type="submit" fullWidth size="lg" loading={loading}>Verify OTP</Button>

      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1">
          <Icon icon="lucide:arrow-left" className="w-3.5 h-3.5" /> Back
        </button>
        <button type="button" onClick={handleResend} disabled={resending} className="text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50">
          {resending ? 'Sending…' : 'Resend OTP'}
        </button>
      </div>
    </form>
  );
}

// Step 3: New password
function ResetStep({ email, otp, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!password) errs.password = 'Password is required';
    else if (password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (!confirm) errs.confirm = 'Please confirm your password';
    else if (password !== confirm) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await authAPI.resetPassword({ email, otp, newPassword: password });
      toast.success('Password reset successfully!');
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed. Please try again.');
    }
    setLoading(false);
  };

  const strength = PASSWORD_CHECKS.filter((c) => c.re.test(password)).length;
  const strengthColor = ['bg-red-400', 'bg-amber-400', 'bg-emerald-500'][strength - 1] || 'bg-gray-200 dark:bg-gray-700';

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="text-center mb-2">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-4">
          <Icon icon="lucide:lock" className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Set new password</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Choose a strong password for your account</p>
      </div>
      <div>
        <Input
          label="New Password"
          type="password"
          icon="lucide:lock"
          placeholder="Create a strong password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: '' })); }}
          error={errors.password}
        />
        {password && (
          <div className="mt-2 space-y-1.5">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? strengthColor : 'bg-gray-200 dark:bg-gray-700'}`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {PASSWORD_CHECKS.map((c) => (
                <span key={c.label} className={`text-xs flex items-center gap-1 ${c.re.test(password) ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  <Icon icon={c.re.test(password) ? 'lucide:check' : 'lucide:x'} className="w-3 h-3" /> {c.label}
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
        value={confirm}
        onChange={(e) => { setConfirm(e.target.value); if (errors.confirm) setErrors((p) => ({ ...p, confirm: '' })); }}
        error={errors.confirm}
      />
      <Button type="submit" fullWidth size="lg" loading={loading}>Reset Password</Button>
    </form>
  );
}

// Step 4: Success
function SuccessStep({ onLogin }) {
  return (
    <div className="text-center space-y-5">
      <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto">
        <Icon icon="lucide:check-circle" className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Password reset!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your password has been updated. You can now sign in.</p>
      </div>
      <Button fullWidth size="lg" onClick={onLogin} icon="lucide:log-in">Sign In</Button>
    </div>
  );
}

const STEPS = ['email', 'otp', 'reset', 'done'];

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [verifiedOtp, setVerifiedOtp] = useState('');

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/25">
            <Icon icon="lucide:zap" className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">Forgot password?</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">We'll send a 4-digit OTP to your email</p>
        </div>

        {/* Progress dots */}
        {step !== 'done' && (
          <div className="flex justify-center gap-2 mb-6">
            {['email', 'otp', 'reset'].map((s, i) => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${i <= stepIndex ? 'bg-blue-600 dark:bg-blue-400 w-8' : 'bg-gray-200 dark:bg-gray-700 w-4'}`} />
            ))}
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
          {step === 'email' && (
            <EmailStep onNext={(em) => { setEmail(em); setStep('otp'); }} />
          )}
          {step === 'otp' && (
            <OtpStep email={email} onNext={(code) => { setVerifiedOtp(code); setStep('reset'); }} onBack={() => setStep('email')} />
          )}
          {step === 'reset' && (
            <ResetStep email={email} otp={verifiedOtp} onDone={() => setStep('done')} />
          )}
          {step === 'done' && (
            <SuccessStep onLogin={() => navigate('/login')} />
          )}
        </div>

        {step !== 'done' && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Remember your password?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
