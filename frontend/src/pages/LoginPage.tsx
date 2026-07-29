import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { api } from '../lib/api';
import { getApiBaseUrl } from '../lib/config';
import { useTheme } from '../hooks/useTheme';

export default function LoginPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [isStudent, setIsStudent] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const accent = isStudent ? 'emerald' : 'violet';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isSignUp) {
        await api.post('/auth/register', {
          email,
          password,
          firstName,
          lastName,
          role: isStudent ? 'STUDENT' : 'FACULTY',
        });
        setMessage('Account created! You can now sign in.');
        setIsSignUp(false);
        setPassword('');
      } else {
        const res = await api.post('/auth/login', { email, password });
        const returnedRole: string = res.data.user.role;
        const expectedRole = isStudent ? 'STUDENT' : 'FACULTY';

        // Role mismatch — don't allow cross-portal login
        if (returnedRole !== expectedRole) {
          const correctPortal = returnedRole === 'STUDENT' ? 'Student' : 'Faculty';
          setError(
            `This account is registered as ${returnedRole}. Please use the "${correctPortal}" tab to sign in.`
          );
          setLoading(false);
          return;
        }

        localStorage.setItem('accessToken', res.data.accessToken);
        if (res.data.refreshToken) localStorage.setItem('refreshToken', res.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(res.data.user));

        if (returnedRole === 'STUDENT') navigate('/student');
        else if (returnedRole === 'FACULTY') navigate('/faculty');
        else navigate('/admin');
      }

    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const role = isStudent ? 'STUDENT' : 'FACULTY';
    window.location.href = `${getApiBaseUrl()}/auth/google?role=${role}`;
  };

  return (
    <main className={`min-h-screen flex items-center justify-center p-4 ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-neutral-950 text-white'}`}>
      <div className="relative w-full max-w-md">

        {/* Back and Theme Toggle */}
        <div className="absolute -top-12 left-0 right-0 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className={`inline-flex items-center gap-2 text-sm transition-colors ${theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-500 hover:text-white'}`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg border transition-colors ${theme === 'light' ? 'border-slate-300 text-slate-600' : 'border-neutral-700 text-neutral-400'}`}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${theme === 'light' ? (isStudent ? 'bg-emerald-100' : 'bg-violet-100') : (isStudent ? 'bg-emerald-500/15' : 'bg-violet-500/15')}`}>
            <span className={`text-xl font-bold ${isStudent ? 'text-emerald-500' : 'text-violet-500'}`}>P</span>
          </div>
          <h1 className={`mt-4 text-2xl font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            Welcome to Procto
          </h1>
          <p className={`mt-1.5 text-sm ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
            {isSignUp ? 'Create your account' : `Sign in to your ${isStudent ? 'exam session' : 'dashboard'}`}
          </p>
        </div>

        {/* Card */}
        <div className={`rounded-2xl border p-8 shadow-sm ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-neutral-800 bg-neutral-900/60'}`}>

          {/* Student / Faculty Toggle */}
          <div className="flex justify-center mb-8">
            <div className={`relative flex rounded-full p-1 ${theme === 'light' ? 'border border-slate-200 bg-slate-50' : 'border border-neutral-700 bg-neutral-900'}`}>
              <div className={`absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-full transition-all duration-300 ${isStudent ? 'left-1 bg-emerald-500' : 'left-[calc(50%+2px)] bg-violet-500'}`} />
              <button
                onClick={() => setIsStudent(true)}
                className={`relative z-10 px-6 py-2 text-sm font-medium rounded-full transition-colors ${isStudent ? 'text-black' : theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}
              >
                Student
              </button>
              <button
                onClick={() => setIsStudent(false)}
                className={`relative z-10 px-6 py-2 text-sm font-medium rounded-full transition-colors ${!isStudent ? 'text-white' : theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}
              >
                Faculty
              </button>
            </div>
          </div>

          {/* Error / Success messages */}
          {error && (
            <div className={`mb-5 rounded-lg px-4 py-3 text-sm ${theme === 'light' ? 'border border-red-300 bg-red-50 text-red-600' : 'border border-red-500/30 bg-red-500/10 text-red-400'}`}>
              {error}
            </div>
          )}
          {message && (
            <div className={`mb-5 rounded-lg px-4 py-3 text-sm ${theme === 'light' ? 'border border-emerald-300 bg-emerald-50 text-emerald-600' : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'}`}>
              {message}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    required
                    className={`w-full rounded-lg border px-4 py-2.5 outline-none text-sm focus:ring-2 ${accent === 'emerald' ? 'focus:ring-emerald-500/30' : 'focus:ring-violet-500/30'} ${theme === 'light' ? 'bg-white text-slate-900 border-slate-300' : 'bg-neutral-950 text-white border-neutral-700'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required
                    className={`w-full rounded-lg border px-4 py-2.5 outline-none text-sm focus:ring-2 ${accent === 'emerald' ? 'focus:ring-emerald-500/30' : 'focus:ring-violet-500/30'} ${theme === 'light' ? 'bg-white text-slate-900 border-slate-300' : 'bg-neutral-950 text-white border-neutral-700'}`}
                  />
                </div>
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-1.5 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                {isStudent ? 'Student Email' : 'Faculty Email'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isStudent ? 'student@university.edu' : 'faculty@university.edu'}
                required
                className={`w-full rounded-lg border px-4 py-2.5 outline-none focus:ring-2 ${accent === 'emerald' ? 'focus:ring-emerald-500/30' : 'focus:ring-violet-500/30'} ${theme === 'light' ? 'bg-white text-slate-900 border-slate-300' : 'bg-neutral-950 text-white border-neutral-700'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1.5 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className={`w-full rounded-lg border px-4 py-2.5 outline-none focus:ring-2 ${accent === 'emerald' ? 'focus:ring-emerald-500/30' : 'focus:ring-violet-500/30'} ${theme === 'light' ? 'bg-white text-slate-900 border-slate-300' : 'bg-neutral-950 text-white border-neutral-700'}`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-2 rounded-lg py-3 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${isStudent ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-violet-500 text-white hover:bg-violet-400'}`}
            >
              {loading
                ? (isSignUp ? 'Creating Account...' : 'Signing In...')
                : isSignUp ? 'Create Account' : isStudent ? 'Enter Exam Lobby' : 'Access Dashboard'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${theme === 'light' ? 'border-slate-300' : 'border-neutral-700'}`} />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className={`px-3 ${theme === 'light' ? 'bg-white text-slate-500' : 'bg-neutral-900 text-neutral-500'}`}>or continue with</span>
            </div>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition disabled:opacity-50 ${theme === 'light' ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'border-neutral-700 bg-neutral-900/60 text-neutral-300 hover:bg-neutral-800/60'}`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google
          </button>

          {/* Sign up / Sign in toggle */}
          <p className={`mt-6 text-center text-sm ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
              className={`font-medium transition-colors ${isStudent ? 'text-emerald-500 hover:text-emerald-400' : 'text-violet-500 hover:text-violet-400'}`}
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
