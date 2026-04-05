import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { authAPI } from '../services/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [sending, setSending] = useState(false);
  const otpRefs = useRef([]);

  const { signupVerifyOtp, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setEmailError('');
    if (!email.trim() || !EMAIL_RE.test(email)) {
      setEmailError('Enter a valid email address');
      return;
    }
    setSending(true);
    try {
      await authAPI.signupRequestOtp({ email: email.toLowerCase().trim() });
      setStep('otp');
      toast.success('OTP sent to your email');
    } catch (err) {
      setEmailError(err.response?.data?.error || 'Failed to send OTP');
    }
    setSending(false);
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    setOtpError('');
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setOtpError('Enter the 6-digit OTP from your email');
      return;
    }
    const result = await signupVerifyOtp(email.toLowerCase().trim(), code);
    if (result.success) {
      toast.success('Welcome to Productivo!');
      navigate('/setup-org');
    } else {
      setOtpError(result.error || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center mx-auto mb-5">
            <Icon icon="lucide:zap" className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
            {step === 'email' ? 'Create free account' : 'Verify your email'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
            {step === 'email'
              ? 'No credit card required'
              : `We sent a 6-digit code to ${email}`}
          </p>
        </div>

        {/* Step 1: Email */}
        {step === 'email' && (
          <form onSubmit={handleRequestOtp} className="space-y-4" noValidate>
            <Input
              label="Email"
              type="email"
              icon="lucide:mail"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              error={emailError}
              autoFocus
              required
            />
            <Button type="submit" fullWidth size="lg" loading={sending}>
              Continue with Email
            </Button>
          </form>
        )}

        {/* Step 2: OTP */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-6" noValidate>
            <div>
              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className={`w-11 h-13 text-center text-xl font-bold rounded-xl border-2 outline-none transition-colors bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50
                      ${otpError
                        ? 'border-red-400 dark:border-red-500'
                        : digit
                          ? 'border-blue-500 dark:border-blue-400'
                          : 'border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400'
                      }`}
                    style={{ height: '52px' }}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              {otpError && (
                <p className="text-sm text-red-600 dark:text-red-400 text-center mt-2">{otpError}</p>
              )}
            </div>

            <Button type="submit" fullWidth size="lg" loading={isLoading}>
              Verify & Create Account
            </Button>

            <div className="text-center space-y-1">
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={sending}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Resend OTP'}
              </button>
              <p className="text-xs text-gray-400">
                or{' '}
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setOtpError(''); }}
                  className="text-gray-500 dark:text-gray-400 hover:underline"
                >
                  change email
                </button>
              </p>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
