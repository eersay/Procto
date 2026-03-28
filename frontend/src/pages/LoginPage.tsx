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
    <main className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${theme === 'light' ? 'bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 text-slate-900' : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100'}`}>

      {/* Ambient glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className={`absolute -left-40 top-0 h-80 w-80 rounded-full blur-3xl transition-colors duration-500 ${
          theme === 'light'
            ? isStudent ? 'bg-emerald-500/20' : 'bg-violet-500/20'
            : isStudent ? 'bg-emerald-500/30' : 'bg-violet-500/30'
        }`} />
        <div className={`absolute -right-32 bottom-0 h-72 w-72 rounded-full blur-3xl transition-colors duration-500 ${
          theme === 'light'
            ? isStudent ? 'bg-emerald-500/15' : 'bg-cyan-500/15'
            : isStudent ? 'bg-emerald-500/25' : 'bg-cyan-500/25'
        }`} />
        <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full blur-3xl transition-colors duration-500 ${
          theme === 'light'
            ? isStudent ? 'bg-emerald-500/10' : 'bg-violet-500/10'
            : isStudent ? 'bg-emerald-500/10' : 'bg-violet-500/10'
        }`} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Back and Theme Toggle */}
        <div className="absolute -top-12 left-0 right-0 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className={`inline-flex items-center gap-2 text-sm transition-colors group ${
              theme === 'light' ? 'text-slate-600 hover:text-cyan-600' : 'text-slate-500 hover:text-cyan-300'
            }`}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-all ${
              theme === 'light'
                ? 'bg-white/60 hover:bg-white/80 text-slate-600 hover:text-cyan-600 border border-slate-200'
                : 'bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-cyan-300 border border-slate-700'
            }`}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ring-1 shadow-lg transition-all duration-500 ${
            theme === 'light'
              ? `bg-white/80 ${isStudent ? 'ring-emerald-400/60 shadow-emerald-500/40' : 'ring-violet-400/60 shadow-violet-500/40'}`
              : `bg-slate-900/70 ${isStudent ? 'ring-emerald-400/40 shadow-emerald-500/30' : 'ring-violet-400/40 shadow-violet-500/30'}`
          }`}>
            <span className={`text-2xl font-bold transition-colors duration-500 ${isStudent ? 'text-emerald-400' : 'text-violet-400'}`}>P</span>
          </div>
          <h1 className={`mt-4 text-2xl font-semibold transition-colors ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
            Welcome to Procto
          </h1>
          <p className={`mt-1.5 text-sm transition-colors ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            {isSignUp ? 'Create your account' : `Sign in to your ${isStudent ? 'exam session' : 'dashboard'}`}
          </p>
        </div>

        {/* Card */}
        <div className="relative">
          {/* Glow border */}
          <div className={`absolute -inset-1 rounded-3xl opacity-60 blur-xl transition-all duration-500 ${
            theme === 'light'
              ? isStudent ? 'bg-gradient-to-tr from-emerald-500/20 via-emerald-500/10 to-emerald-500/20' : 'bg-gradient-to-tr from-violet-500/20 via-cyan-500/10 to-violet-500/20'
              : isStudent ? 'bg-gradient-to-tr from-emerald-500/30 via-emerald-500/10 to-emerald-500/30' : 'bg-gradient-to-tr from-violet-500/30 via-cyan-500/10 to-violet-500/30'
          }`} />

          <div className={`relative rounded-3xl p-8 shadow-2xl backdrop-blur-xl transition-all ${
            theme === 'light'
              ? 'border border-slate-200/80 bg-white/90'
              : 'border border-slate-700/80 bg-slate-900/90'
          }`}>

            {/* Student / Faculty Toggle */}
            <div className="flex justify-center mb-8">
              <div className={`relative flex rounded-full p-1 transition-colors ${
                theme === 'light' ? 'border border-slate-200 bg-slate-50/80' : 'border border-slate-700/60 bg-slate-900/80'
              }`}>
                <div className={`absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-full transition-all duration-300 ${isStudent ? 'left-1 bg-emerald-500' : 'left-[calc(50%+2px)] bg-violet-500'}`} />
                <button
                  onClick={() => setIsStudent(true)}
                  className={`relative z-10 px-6 py-2 text-sm font-medium rounded-full transition-colors duration-300 ${
                    isStudent
                      ? 'text-black'
                      : theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Student
                </button>
                <button
                  onClick={() => setIsStudent(false)}
                  className={`relative z-10 px-6 py-2 text-sm font-medium rounded-full transition-colors duration-300 ${
                    !isStudent
                      ? 'text-white'
                      : theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Faculty
                </button>
              </div>
            </div>

            {/* Error / Success messages */}
            {error && (
              <div className={`mb-5 rounded-xl px-4 py-3 text-sm transition-colors ${
                theme === 'light'
                  ? 'border border-red-400/40 bg-red-50 text-red-600'
                  : 'border border-red-500/30 bg-red-500/10 text-red-400'
              }`}>
                {error}
              </div>
            )}
            {message && (
              <div className={`mb-5 rounded-xl px-4 py-3 text-sm transition-colors ${
                theme === 'light'
                  ? 'border border-emerald-400/40 bg-emerald-50 text-emerald-600'
                  : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              }`}>
                {message}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name fields — only on sign up */}
              {isSignUp && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jane"
                      required
                       className={`w-full rounded-xl border px-4 py-3 outline-none text-sm transition-all duration-300 ${
                        theme === 'light'
                          ? 'bg-white text-slate-900 placeholder-slate-400 border-slate-300'
                          : 'bg-slate-950/60 text-slate-100 placeholder-slate-600 border-slate-700/60'
                      } ${isStudent ? 'focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20' : 'focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20'}`}
                    />
                  </div>
                  <div>
                     <label className={`block text-xs font-medium mb-1.5 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      required
                       className={`w-full rounded-xl border px-4 py-3 outline-none text-sm transition-all duration-300 ${
                        theme === 'light'
                          ? 'bg-white text-slate-900 placeholder-slate-400 border-slate-300'
                          : 'bg-slate-950/60 text-slate-100 placeholder-slate-600 border-slate-700/60'
                      } ${isStudent ? 'focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20' : 'focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20'}`}
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                  {isStudent ? 'Student Email' : 'Faculty Email'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isStudent ? 'student@university.edu' : 'faculty@university.edu'}
                  required
                  className={`w-full rounded-xl border px-4 py-3 outline-none transition-all duration-300 ${
                    theme === 'light'
                      ? 'bg-white text-slate-900 placeholder-slate-400 border-slate-300'
                      : 'bg-slate-950/60 text-slate-100 placeholder-slate-600 border-slate-700/60'
                  } ${isStudent ? 'focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20' : 'focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20'}`}
                />
              </div>

              {/* Password */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className={`w-full rounded-xl border px-4 py-3 outline-none transition-all duration-300 ${
                    theme === 'light'
                      ? 'bg-white text-slate-900 placeholder-slate-400 border-slate-300'
                      : 'bg-slate-950/60 text-slate-100 placeholder-slate-600 border-slate-700/60'
                  } ${isStudent ? 'focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20' : 'focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20'}`}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full mt-2 rounded-xl py-3.5 text-sm font-semibold shadow-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${isStudent ? 'bg-emerald-500 text-black shadow-emerald-500/30 hover:bg-emerald-400' : 'bg-violet-500 text-white shadow-violet-500/30 hover:bg-violet-400'}`}
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {isSignUp ? 'Creating Account...' : 'Signing In...'}
                  </span>
                ) : isSignUp ? 'Create Account' : isStudent ? 'Enter Exam Lobby' : 'Access Dashboard'}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${theme === 'light' ? 'border-slate-300' : 'border-slate-700/60'}`} />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className={`px-3 ${theme === 'light' ? 'bg-white text-slate-500' : 'bg-slate-900 text-slate-500'}`}>or continue with</span>
              </div>
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-2 gap-3">
              {/* Google */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm transition-all disabled:opacity-50 ${
                  theme === 'light'
                    ? 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                    : 'border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800/60'
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </button>

              {/* GitHub (placeholder — not wired to backend yet) */}
              <button
                disabled
                title="GitHub login coming soon"
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm cursor-not-allowed opacity-50 ${
                  theme === 'light'
                    ? 'border-slate-300 bg-slate-100 text-slate-500'
                    : 'border-slate-700/60 bg-slate-900/60 text-slate-500'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </button>
            </div>

            {/* Sign up / Sign in toggle */}
            <p className={`mt-6 text-center text-sm ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
                className={`font-medium transition-colors ${isStudent ? 'text-emerald-400 hover:text-emerald-300' : 'text-violet-400 hover:text-violet-300'}`}
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-8 text-center text-xs text-slate-600">
          Protected by Procto AI Proctoring System
        </p>
      </div>
    </main>
  );
}
