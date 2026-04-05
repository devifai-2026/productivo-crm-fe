import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import useAuthStore from '../store/authStore';
import { authAPI } from '../services/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function Login() {
  const [mode, setMode] = useState('password'); // 'password' | 'mpin' | 'biometric'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mpin, setMpin] = useState('');
  const [mpinError, setMpinError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [mpinEnabled, setMpinEnabled] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  // Check if MPIN is set up (stored in localStorage from previous login)
  useEffect(() => {
    const savedEmail = localStorage.getItem('last_login_email');
    const hasMpin = localStorage.getItem('mpin_enabled') === 'true';
    if (savedEmail) setEmail(savedEmail);
    if (hasMpin) setMpinEnabled(true);

    // Check WebAuthn (fingerprint/biometric) availability
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => setBiometricAvailable(available))
        .catch(() => {});
    }
  }, []);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      localStorage.setItem('last_login_email', email);
      navigate('/');
    }
  };

  const handleMpinLogin = async (e) => {
    e.preventDefault();
    setMpinError('');

    // First login with stored credentials to get token
    const savedEmail = localStorage.getItem('last_login_email');
    const savedToken = localStorage.getItem('token');

    if (!savedToken || !savedEmail) {
      setMpinError('Please login with password first to set up MPIN');
      setMode('password');
      return;
    }

    try {
      const res = await authAPI.verifyMpin({ mpin });
      if (res.data?.success) {
        navigate('/');
      }
    } catch (err) {
      setMpinError(err.response?.data?.error || 'Invalid MPIN');
    }
  };

  const handleBiometricLogin = async () => {
    try {
      // Use WebAuthn platform authenticator (fingerprint/face)
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
          allowCredentials: [],
        },
      });

      // If biometric passes, we trust the stored session
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        // Re-initialize with existing token
        await useAuthStore.getState().initialize();
        navigate('/');
      } else {
        setMode('password');
      }
    } catch (err) {
      // User cancelled or biometric failed — fall back to password
      console.warn('Biometric auth failed:', err.message);
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
            Welcome back
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
            Sign in to continue
          </p>
        </div>

        {/* Password Login */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4" noValidate>
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <Input
              label="Email"
              type="email"
              icon="lucide:mail"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError(); }}
              required
            />

            <div>
              <Input
                label="Password"
                type="password"
                icon="lucide:lock"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); }}
                required
              />
              <div className="flex justify-end mt-1.5">
                <Link to="/forgot-password" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" fullWidth size="lg" loading={isLoading} className="mt-2">
              Sign In
            </Button>
          </form>
        )}

        {/* MPIN Login */}
        {mode === 'mpin' && (
          <form onSubmit={handleMpinLogin} className="space-y-4">
            {mpinError && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{mpinError}</p>
              </div>
            )}

            <div className="text-center mb-2">
              <Icon icon="lucide:shield" className="w-10 h-10 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Enter your MPIN</p>
            </div>

            <Input
              type="password"
              placeholder="Enter 4-6 digit MPIN"
              value={mpin}
              onChange={(e) => { setMpin(e.target.value.replace(/\D/g, '').slice(0, 6)); setMpinError(''); }}
              maxLength={6}
              className="text-center text-2xl tracking-[0.5em]"
              required
            />

            <Button type="submit" fullWidth size="lg">
              Verify MPIN
            </Button>

            <button
              type="button"
              onClick={() => setMode('password')}
              className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-2"
            >
              Use password instead
            </button>
          </form>
        )}

        {/* Quick login options */}
        {mode === 'password' && (mpinEnabled || biometricAvailable) && (
          <div className="mt-6">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-gray-950 px-3 text-gray-400">or</span>
              </div>
            </div>

            <div className="flex gap-3">
              {mpinEnabled && (
                <button
                  type="button"
                  onClick={() => setMode('mpin')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Icon icon="lucide:shield" className="w-4 h-4" />
                  MPIN
                </button>
              )}

              {biometricAvailable && (
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Icon icon="lucide:fingerprint" className="w-4 h-4" />
                  Fingerprint
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
