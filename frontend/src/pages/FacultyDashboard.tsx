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

  const cardBg = theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-700/60 bg-slate-900/60';
  const muted = theme === 'light' ? 'text-slate-500' : 'text-slate-400';
  const heading = theme === 'light' ? 'text-slate-900' : 'text-slate-100';
  const totalStudents = courses.reduce((sum, c) => sum + c._count.enrollments, 0);
  const totalExams = courses.reduce((sum, c) => sum + c._count.exams, 0);

  return (
    <main className={`min-h-screen ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'}`}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: theme === 'light'
            ? { background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }
            : { background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155' },
        }}
      />

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6 sm:px-8">

        {/* ── HEADER ── */}
        <header className={`flex items-center justify-between border-b pb-4 ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
          <div className="flex items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${theme === 'light' ? 'bg-violet-100' : 'bg-violet-500/15'}`}>
              <span className="text-lg font-semibold text-violet-500">P</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">Procto</span>
              <span className={`text-xs ${muted}`}>Faculty Portal</span>
            </div>
          </div>

          <div className="relative flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg border transition-colors ${
                theme === 'light'
                  ? 'border-slate-300 text-slate-600 hover:text-violet-600'
                  : 'border-slate-700 text-slate-400 hover:text-violet-400'
              }`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setProfileOpen(v => !v)}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${theme === 'light' ? 'border-slate-300' : 'border-slate-700'}`}>
              <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center text-white font-semibold text-xs">
                {getInitials()}
              </div>
              <span className="hidden sm:inline text-sm font-medium">{getDisplayName()}</span>
              <svg className={`w-4 h-4 transition-transform ${muted} ${profileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 z-50">
                <div className={`rounded-lg border shadow-lg p-1 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-700 bg-slate-900'}`}>
                  <button onClick={() => { navigate('/proctor-dashboard'); setProfileOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md ${theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-slate-800'}`}>
                    Live Proctor
                  </button>
                  <button onClick={() => { navigate('/grading'); setProfileOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md ${theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-slate-800'}`}>
                    Grading
                  </button>
                  {user?.email && (
                    <div className={`px-3 py-2 text-xs truncate border-t mt-1 pt-2 ${muted} ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>{user.email}</div>
                  )}
                  <button onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-red-500 rounded-md hover:bg-red-500/10">
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ── OVERVIEW ── */}
        <section className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-semibold ${heading}`}>Welcome back, {getDisplayName()}</h1>
            <p className={`text-sm mt-0.5 ${muted}`}>
              {courses.length} course{courses.length !== 1 ? 's' : ''} · {totalStudents} student{totalStudents !== 1 ? 's' : ''} · {totalExams} exam{totalExams !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/proctor-dashboard')}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${theme === 'light' ? 'border-slate-300 hover:border-violet-400' : 'border-slate-700 hover:border-violet-500'}`}>
              Live Proctor
            </button>
            <button onClick={() => navigate('/grading')}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${theme === 'light' ? 'border-slate-300 hover:border-violet-400' : 'border-slate-700 hover:border-violet-500'}`}>
              Grading
            </button>
            <button onClick={() => setShowCreateModal(true)}
              className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 transition">
              + New Course
            </button>
          </div>
        </section>

        {/* ── COURSES ── */}
        <section className="mt-8 mb-8">
          <h2 className={`text-lg font-semibold mb-4 ${heading}`}>My Courses</h2>

          {courses.length === 0 ? (
            <div className={`rounded-xl border p-10 text-center ${cardBg}`}>
              <p className={`text-sm mb-4 ${muted}`}>Create your first course to get started.</p>
              <button onClick={() => setShowCreateModal(true)}
                className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 transition">
                Create Course
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map(course => (
                <div key={course.id}
                  className={`rounded-xl border overflow-hidden cursor-pointer transition hover:border-violet-400/50 ${cardBg}`}
                  onClick={() => navigate(`/course/${course.id}`)}>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className={`text-base font-semibold line-clamp-2 ${heading}`}>{course.name}</h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${theme === 'light' ? 'border-slate-300 bg-slate-100 text-slate-600' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                          {course.code}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); copyCode(course.code); }}
                          title="Copy code"
                          className={`text-xs hover:text-violet-400 transition-colors ${muted}`}>
                          Copy
                        </button>
                      </div>
                    </div>

                    {course.description && (
                      <p className={`text-xs line-clamp-2 mb-3 ${muted}`}>{course.description}</p>
                    )}

                    <div className={`flex gap-4 py-2.5 border-t border-b my-2.5 text-xs ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'} ${muted}`}>
                      <span><span className="font-semibold text-violet-400">{course._count.enrollments}</span> students</span>
                      <span><span className="font-semibold text-cyan-400">{course._count.exams}</span> exams</span>
                    </div>

                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => navigate(`/course/${course.id}`)}
                        className="flex-1 py-1.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition text-xs font-semibold">
                        Open
                      </button>
                      <button onClick={() => navigate(`/questions?courseId=${course.id}`)}
                        className="flex-1 py-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition text-xs font-semibold">
                        Questions
                      </button>
                      <button onClick={() => navigate(`/exams?courseId=${course.id}`)}
                        className="flex-1 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition text-xs font-semibold">
                        Exams
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── CREATE COURSE MODAL ── */}
      {showCreateModal && (
        <div className={`fixed inset-0 flex items-center justify-center p-4 z-50 ${theme === 'light' ? 'bg-slate-900/40' : 'bg-black/70'}`}>
          <div className={`rounded-xl border w-full max-w-md p-6 shadow-xl ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-700 bg-slate-900'}`}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className={`text-lg font-semibold ${heading}`}>Create New Course</h3>
                <p className={`text-sm mt-0.5 ${muted}`}>A unique code will be auto-generated</p>
              </div>
              <button onClick={() => setShowCreateModal(false)}
                className={`text-2xl leading-none ${muted}`}>×</button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${muted}`}>Course Name *</label>
                <input type="text" value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Introduction to Computer Science"
                  required
                  className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition ${theme === 'light' ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400' : 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-600'}`} />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${muted}`}>Description <span className={muted}>(optional)</span></label>
                <textarea value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description..."
                  rows={3}
                  className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition resize-none ${theme === 'light' ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400' : 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-600'}`} />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className={`flex-1 py-2.5 rounded-lg border transition text-sm ${theme === 'light' ? 'border-slate-300 hover:border-slate-400' : 'border-slate-700 hover:border-slate-500'}`}>
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 rounded-lg bg-violet-500 text-white font-semibold hover:bg-violet-400 transition disabled:opacity-50">
                  {loading ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
