import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { api } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '../hooks/useTheme';

interface Course {
  id: string; name: string; code: string; description: string | null;
  faculty: { firstName: string; lastName: string };
  _count: { enrollments: number; exams: number };
}

// ── small inline components ─────────────────────────────────────────────────

function ChevronRight({ cls = '' }: { cls?: string }) {
  return (
    <svg className={`w-5 h-5 ${cls}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ActionRow({
  icon, label, sub, accentFrom, accentText, onClick, theme,
}: {
  icon: React.ReactNode; label: string; sub: string;
  accentFrom: string; accentText: string; onClick: () => void;
  theme: 'light' | 'dark';
}) {
  return (
    <button onClick={onClick}
      className={`group relative w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-300 hover:border-${accentText}/50 ${
        theme === 'light'
          ? 'border-slate-200 bg-white hover:bg-slate-50'
          : 'border-slate-700/60 bg-slate-900/60 hover:bg-slate-800/60'
      }`}>
      <div className={`w-12 h-12 rounded-xl ${accentFrom} flex items-center justify-center group-hover:opacity-80 transition-opacity shrink-0`}>
        {icon}
      </div>
      <div className="flex-1">
        <h4 className={`text-base font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>{label}</h4>
        <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>{sub}</p>
      </div>
      <ChevronRight cls={`group-hover:translate-x-0.5 transition-all ${theme === 'light' ? 'text-slate-400 group-hover:text-slate-600' : 'text-slate-500 group-hover:text-slate-300'}`} />
    </button>
  );
}

// ── main component ──────────────────────────────────────────────────────────

export default function FacultyDashboard() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) { navigate('/login'); return; }
    setUser(JSON.parse(userData));
    fetchCourses();
  }, [navigate]);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      setCourses(res.data.courses);
    } catch { toast.error('Failed to load courses'); }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await api.post('/courses', formData);
      toast.success(`Course created! Code: ${res.data.course.code}`);
      setShowCreateModal(false); setFormData({ name: '', description: '' }); fetchCourses();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create course');
    } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { }
    localStorage.clear(); navigate('/login');
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Course code copied!');
  };

  const getInitials = () => {
    if (!user) return 'FC';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  };
  const getDisplayName = () => user ? `Prof. ${user.firstName} ${user.lastName}` : 'Faculty';

  if (!user) return (
    <div className={`min-h-screen flex items-center justify-center ${theme === 'light' ? 'bg-slate-50' : 'bg-slate-950'}`}>
      <div className="animate-spin h-8 w-8 border-2 border-violet-400 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <main className={`min-h-screen ${theme === 'light' ? 'bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900' : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100'}`}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: theme === 'light'
            ? { background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }
            : { background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155' },
        }}
      />

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-80 w-80 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-cyan-500/25 blur-3xl" />
      </div>
      <div className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage: theme === 'light'
            ? `repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(15,23,42,0.04) 2px,rgba(15,23,42,0.04) 4px)`
            : `repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(255,255,255,0.04) 2px,rgba(255,255,255,0.04) 4px)`,
        }}
      />

      <div className="relative mx-auto flex min-h-screen w-full flex-col px-6 py-8 sm:px-8 lg:px-12 xl:px-20 xl:py-12">

        {/* ── HEADER ── */}
        <header className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-cyan-400/40 shadow-lg shadow-cyan-500/30 ${theme === 'light' ? 'bg-white' : 'bg-slate-900/70'}`}>
              <span className="text-lg font-semibold tracking-tight text-cyan-300">P</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className={`text-sm font-semibold uppercase tracking-[0.18em] ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Procto</span>
              <span className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>Intelligent exam proctoring</span>
            </div>
          </div>

          {/* Profile dropdown */}
          <div className="relative flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg border transition-all ${
                theme === 'light'
                  ? 'bg-white border-slate-300 text-slate-600 hover:text-cyan-600'
                  : 'bg-slate-900/70 border-slate-700/60 text-slate-400 hover:text-cyan-300'
              }`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setProfileOpen(v => !v)}
              className={`flex items-center gap-3 rounded-full border px-3 py-1.5 hover:border-cyan-400/40 transition-all duration-300 ${theme === 'light' ? 'border-slate-300 bg-white' : 'border-slate-700/60 bg-slate-900/70'}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                {getInitials()}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className={`text-sm font-medium ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>{getDisplayName()}</span>
                <span className={`text-[0.65rem] ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>Faculty</span>
              </div>
              <svg className={`w-4 h-4 transition-transform ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'} ${profileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-52 z-50">
                <div className={`rounded-xl border backdrop-blur-xl shadow-xl p-2 ${theme === 'light' ? 'border-slate-300 bg-white/95' : 'border-slate-700/60 bg-slate-900/95'}`}>
                  <button onClick={() => { navigate('/proctor-dashboard'); setProfileOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:text-cyan-300 transition-colors ${theme === 'light' ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800/60'}`}>
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.898L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                    </svg>
                    Live Proctor
                  </button>
                  <button onClick={() => { navigate('/grading'); setProfileOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:text-cyan-300 transition-colors ${theme === 'light' ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800/60'}`}>
                    <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Grading
                  </button>
                  {user?.email && (
                    <div className={`px-3 py-2 text-xs truncate border-t mt-1 pt-2 ${theme === 'light' ? 'text-slate-500 border-slate-300' : 'text-slate-500 border-slate-700/60'}`}>{user.email}</div>
                  )}
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 rounded-lg hover:bg-red-500/10 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ── HERO + ACTION CARDS ── */}
        <section className="mt-12 flex flex-1 items-center justify-center lg:mt-16 xl:mt-20">
          <div className="flex w-full max-w-6xl flex-col gap-12 lg:flex-row lg:items-center">

            {/* Left: Hero text */}
            <div className="flex w-full flex-1 flex-col justify-center">
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs shadow-sm shadow-violet-500/30 backdrop-blur w-fit ${theme === 'light' ? 'border-slate-300 bg-white text-slate-700' : 'border-slate-700 bg-slate-900/70 text-slate-300'}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                Designed for Educators & Administrators
              </div>

              <h1 className={`mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl ${theme === 'light' ? 'text-slate-900' : 'text-slate-50'}`}>
                Administer{' '}
                <span className="bg-gradient-to-r from-violet-300 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  Secure Exams
                </span>{' '}
                with Confidence.
              </h1>

              <p className={`mt-5 max-w-2xl text-base sm:text-lg ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
                Create exams in minutes and monitor integrity with AI-powered insights. Get real-time alerts, detailed reports, and complete control over your assessments.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/40 hover:bg-violet-400 transition-all hover:scale-105">
                  + Create Course
                </button>
                <button onClick={() => navigate('/proctor-dashboard')}
                  className={`inline-flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-medium hover:border-cyan-400/40 hover:text-cyan-300 transition-all ${theme === 'light' ? 'border-slate-300 bg-white text-slate-700' : 'border-slate-600 bg-slate-900/70 text-slate-300'}`}>
                  🔴 Live Proctor
                </button>
              </div>

              <div className={`mt-5 flex flex-wrap gap-4 text-xs sm:text-sm ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                {[
                  { dot: 'bg-violet-400', text: 'AI-powered monitoring' },
                  { dot: 'bg-cyan-400', text: 'Instant violation alerts' },
                  { dot: 'bg-emerald-400', text: 'Comprehensive reports' },
                ].map(({ dot, text }) => (
                  <div key={text} className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                    {text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: quick-action card */}
            <div className="flex w-full flex-1 items-center justify-center">
              <div className="relative w-full max-w-md">
                <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-tr from-violet-500/40 via-purple-500/30 to-cyan-500/40 opacity-60 blur-xl" />
                <div className={`relative rounded-3xl border p-6 shadow-2xl backdrop-blur-xl sm:p-8 ${theme === 'light' ? 'border-slate-200 bg-white/90' : 'border-slate-700/80 bg-slate-900/80'}`}>
                  <div className="text-center mb-6">
                    <h3 className={`text-xl font-semibold mb-1 ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>Faculty Dashboard</h3>
                    <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Manage your classrooms and assessments</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <ActionRow
                      icon={<svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}
                      label="Create Course" sub="Set up a new course for your students"
                      accentFrom="bg-cyan-500/20" accentText="cyan-400" theme={theme}
                      onClick={() => setShowCreateModal(true)} />
                    <ActionRow
                      icon={<svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                      label="My Courses" sub="View and manage your existing courses"
                      accentFrom="bg-violet-500/20" accentText="violet-400" theme={theme}
                      onClick={() => document.getElementById('courses-section')?.scrollIntoView({ behavior: 'smooth' })} />
                    <ActionRow
                      icon={<svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.898L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>}
                      label="Live Proctor" sub="Monitor students in real-time"
                      accentFrom="bg-red-500/20" accentText="red-400" theme={theme}
                      onClick={() => navigate('/proctor-dashboard')} />
                    <ActionRow
                      icon={<svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                      label="Grading" sub="Review and finalize student grades"
                      accentFrom="bg-emerald-500/20" accentText="emerald-400" theme={theme}
                      onClick={() => navigate('/grading')} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── MY COURSES ── */}
        <section id="courses-section" className="mt-20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={`text-2xl font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>My Courses</h2>
              <p className={`text-sm mt-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>{courses.length} course{courses.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 hover:bg-violet-400 transition-all hover:scale-105">
              + New Course
            </button>
          </div>

          {courses.length === 0 ? (
            <div className={`rounded-2xl border backdrop-blur-sm p-16 text-center ${theme === 'light' ? 'border-slate-200 bg-white/90' : 'border-slate-700/60 bg-slate-900/60'}`}>
              <div className="text-5xl mb-4">📚</div>
              <h3 className={`font-semibold mb-2 ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>No courses yet</h3>
              <p className={`text-sm mb-6 ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>Create your first course to get started</p>
              <button onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 transition-all">
                + Create First Course
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.map(course => (
                <div key={course.id}
                  className={`group relative rounded-2xl border backdrop-blur-sm overflow-hidden hover:border-violet-400/50 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300 cursor-pointer ${theme === 'light' ? 'border-slate-200 bg-white/90' : 'border-slate-700/60 bg-slate-900/60'}`}
                  onClick={() => navigate(`/course/${course.id}`)}>

                  {/* Top accent */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500/0 via-violet-500/60 to-violet-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className={`text-base font-semibold group-hover:text-violet-300 transition-colors line-clamp-2 ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                        {course.name}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${theme === 'light' ? 'border-slate-300 bg-slate-100 text-slate-600' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                          {course.code}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); copyCode(course.code); }}
                          title="Copy code"
                          className={`hover:text-cyan-400 transition-colors text-sm ${theme === 'light' ? 'text-slate-500' : 'text-slate-600'}`}>
                          📋
                        </button>
                      </div>
                    </div>

                    {course.description && (
                      <p className={`text-xs line-clamp-2 mb-3 ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>{course.description}</p>
                    )}

                    <div className={`flex gap-4 py-3 border-t border-b my-3 text-xs ${theme === 'light' ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-500'}`}>
                      <span><span className="font-bold text-violet-400">{course._count.enrollments}</span> students</span>
                      <span><span className="font-bold text-cyan-400">{course._count.exams}</span> exams</span>
                    </div>

                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => navigate(`/course/${course.id}`)}
                        className="flex-1 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/20 transition text-xs font-semibold">
                        Open
                      </button>
                      <button onClick={() => navigate(`/questions?courseId=${course.id}`)}
                        className="flex-1 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 transition text-xs font-semibold">
                        Questions
                      </button>
                      <button onClick={() => navigate(`/exams?courseId=${course.id}`)}
                        className="flex-1 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 transition text-xs font-semibold">
                        Exams
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── FEATURE GRID ── */}
        <section className="mt-20 mb-12">
          <div className="text-center mb-10">
            <h2 className={`text-3xl font-semibold sm:text-4xl ${theme === 'light' ? 'text-slate-900' : 'text-slate-50'}`}>
              Why Faculty{' '}
              <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">Love Procto</span>
            </h2>
            <p className={`mt-3 max-w-2xl mx-auto ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Everything you need to conduct secure, fair, and efficient online assessments.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
                bg: 'bg-violet-500/20', border: 'hover:border-violet-400/50', glow: 'from-violet-500/10 to-cyan-500/10',
                title: 'Effortless Setup',
                desc: 'One-click exam generation. Create proctored assessments in under 60 seconds with our intuitive interface.',
              },
              {
                icon: <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
                bg: 'bg-cyan-500/20', border: 'hover:border-cyan-400/50', glow: 'from-cyan-500/10 to-violet-500/10',
                title: 'Live Proctoring',
                desc: 'Real-time violation alerts. AI monitors camera, audio, and screen for suspicious behavior instantly.',
              },
              {
                icon: <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
                bg: 'bg-emerald-500/20', border: 'hover:border-emerald-400/50', glow: 'from-emerald-500/10 to-cyan-500/10',
                title: 'Detailed Reports',
                desc: 'Instant evidence logs & grading. Download comprehensive integrity reports with timestamped incidents.',
              },
            ].map(({ icon, bg, border, glow, title, desc }) => (
              <div key={title}
                className={`group relative rounded-2xl border p-6 backdrop-blur-sm ${border} transition-all duration-300 ${theme === 'light' ? 'border-slate-200 bg-white/90' : 'border-slate-700/60 bg-slate-900/60'}`}>
                <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-br ${glow} opacity-0 group-hover:opacity-100 transition-opacity blur-xl`} />
                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4`}>{icon}</div>
                  <h3 className={`text-lg font-semibold mb-2 ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>{title}</h3>
                  <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className={`mt-8 flex items-center justify-between border-t pt-4 text-[0.7rem] sm:text-xs ${theme === 'light' ? 'border-slate-300 text-slate-500' : 'border-slate-800/80 text-slate-500'}`}>
          <span>© {new Date().getFullYear()} Procto. Built for secure online exams.</span>
          <span className="hidden sm:inline">Designed for performance · React · TypeScript</span>
        </footer>
      </div>

      {/* ── CREATE COURSE MODAL ── */}
      {showCreateModal && (
        <div className={`fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50 ${theme === 'light' ? 'bg-slate-900/40' : 'bg-black/70'}`}>
          <div className={`relative rounded-2xl border backdrop-blur-xl w-full max-w-md p-8 shadow-2xl ${theme === 'light' ? 'border-slate-300 bg-white/95' : 'border-slate-700/60 bg-slate-900/95'}`}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className={`text-xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Create New Course</h3>
                <p className={`text-sm mt-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>A unique code will be auto-generated</p>
              </div>
              <button onClick={() => setShowCreateModal(false)}
                className={`transition-colors text-2xl leading-none ${theme === 'light' ? 'text-slate-500 hover:text-slate-900' : 'text-slate-500 hover:text-white'}`}>×</button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Course Name *</label>
                <input type="text" value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Introduction to Computer Science"
                  required
                  className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition ${theme === 'light' ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400' : 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-600'}`} />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Description <span className={theme === 'light' ? 'text-slate-500' : 'text-slate-600'}>(optional)</span></label>
                <textarea value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description..."
                  rows={3}
                  className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition resize-none ${theme === 'light' ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400' : 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-600'}`} />
              </div>

              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
                <p className="text-xs text-violet-300">💡 A unique course code will be automatically generated for students to join.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className={`flex-1 py-3 rounded-xl border transition text-sm ${theme === 'light' ? 'border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}>
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-violet-500 text-white font-semibold hover:bg-violet-400 transition shadow-lg shadow-violet-500/30 disabled:opacity-50">
                  {loading ? 'Creating...' : 'Create Course →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
