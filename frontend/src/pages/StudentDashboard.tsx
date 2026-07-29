import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { api } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';
import NotificationBell from '../components/NotificationBell';
import { useTheme } from '../hooks/useTheme';

interface Course {
  id: string; name: string; code: string; description: string | null;
  faculty: { firstName: string; lastName: string; };
  _count: { enrollments: number; };
}
interface Exam {
  id: string; title: string; courseId: string; durationMinutes: number;
  startAt: string; endAt: string;
  course: { name: string; code: string; };
  _count: { examQuestions: number; };
}
interface CompletedExam {
  id: string; submittedAt: string; status: string;
  exam: { title: string; course: { name: string; code: string; }; };
  result: { totalScore: number; percentage: number; passStatus: boolean; finalizedAt: string | null; } | null;
  _count: { suspiciousEvents: number; };
}

export default function StudentDashboard() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [completedExams, setCompletedExams] = useState<CompletedExam[]>([]);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) { navigate('/login'); return; }
    setUser(JSON.parse(userData));
    fetchCourses();
    fetchResults();
  }, [navigate]);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      const courses = response.data.courses;
      setEnrolledCourses(courses);
      const examPromises = courses.map((c: Course) =>
        api.get(`/exams?courseId=${c.id}`).catch(() => ({ data: { exams: [] } }))
      );
      const examResponses = await Promise.all(examPromises);
      const allExams = examResponses.flatMap((res, idx) =>
        res.data.exams.map((exam: any) => ({
          ...exam,
          course: { name: courses[idx].name, code: courses[idx].code },
        }))
      );
      setUpcomingExams(allExams.filter((e: Exam) => new Date(e.endAt) > new Date()));
    } catch (err) { console.error('Fetch courses error:', err); }
  };

  const fetchResults = async () => {
    try {
      const r = await api.get('/results/my-results');
      setCompletedExams(r.data.results);
    } catch (err) { console.error('Fetch results error:', err); }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const r = await api.post('/courses/enroll', { courseCode });
      toast.success(`Enrolled in ${r.data.course.name}!`);
      setShowEnrollModal(false); setCourseCode(''); fetchCourses();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Enrollment failed');
    } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { }
    localStorage.clear(); navigate('/login');
  };

  const getExamStatus = (exam: Exam) => {
    const now = new Date(), start = new Date(exam.startAt), end = new Date(exam.endAt);
    if (now < start) return {
      label: 'UPCOMING',
      canTake: false,
      color: theme === 'light'
        ? 'text-blue-700 border-blue-300 bg-blue-50'
        : 'text-blue-400 border-blue-400/40 bg-blue-400/10',
    };
    if (now >= start && now <= end) return {
      label: 'LIVE',
      canTake: true,
      color: theme === 'light'
        ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
        : 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10',
    };
    return {
      label: 'ENDED',
      canTake: false,
      color: theme === 'light'
        ? 'text-slate-600 border-slate-300 bg-slate-100'
        : 'text-neutral-500 border-neutral-700 bg-neutral-800/40',
    };
  };

  const getInitials = () => {
    if (!user) return '?';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  };

  const getDisplayName = () => {
    if (!user) return 'Student';
    if (user.firstName) return user.firstName;
    return user.email?.split('@')[0] || 'Student';
  };

  if (!user) return (
    <div className={`min-h-screen flex items-center justify-center ${theme === 'light' ? 'bg-slate-50' : 'bg-neutral-950'}`}>
      <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
    </div>
  );

  const activeExam = upcomingExams.find(e => getExamStatus(e).canTake);
  const cardBg = theme === 'light' ? 'border-slate-200 bg-white' : 'border-neutral-800 bg-neutral-900/60';
  const muted = theme === 'light' ? 'text-slate-500' : 'text-neutral-500';
  const heading = theme === 'light' ? 'text-slate-900' : 'text-white';

  return (
    <main className={`min-h-screen ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-neutral-950 text-white'}`}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: theme === 'light'
            ? { background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }
            : { background: '#171717', color: '#fff', border: '1px solid #374151' },
        }}
      />

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6 sm:px-8">

        {/* ── HEADER ── */}
        <header className={`flex items-center justify-between border-b pb-4 ${theme === 'light' ? 'border-slate-200' : 'border-neutral-800'}`}>
          <div className="flex items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${theme === 'light' ? 'bg-emerald-100' : 'bg-emerald-500/15'}`}>
              <span className="text-lg font-semibold text-emerald-500">P</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">Procto</span>
              <span className={`text-xs ${muted}`}>Student Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg border transition-colors ${
                theme === 'light'
                  ? 'border-slate-300 text-slate-600 hover:text-emerald-600'
                  : 'border-neutral-700 text-neutral-400 hover:text-emerald-400'
              }`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <NotificationBell />

            <div className="relative group">
              <button className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${theme === 'light' ? 'border-slate-300' : 'border-neutral-700'}`}>
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white font-semibold text-xs">
                  {getInitials()}
                </div>
                <span className="hidden sm:inline text-sm font-medium">{getDisplayName()}</span>
                <svg className={`w-4 h-4 ${muted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className="absolute right-0 mt-1 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
                <div className={`rounded-lg border shadow-lg p-1 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-neutral-700 bg-neutral-900'}`}>
                  <button onClick={() => navigate('/my-courses')}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md ${theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-neutral-800'}`}>
                    My Courses
                  </button>
                  <button onClick={() => navigate('/my-results')}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md ${theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-neutral-800'}`}>
                    My Results
                  </button>
                  {user?.email && (
                    <div className={`px-3 py-2 text-xs truncate border-t mt-1 pt-2 ${muted} ${theme === 'light' ? 'border-slate-200' : 'border-neutral-800'}`}>
                      {user.email}
                    </div>
                  )}
                  <button onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-red-500 rounded-md hover:bg-red-500/10">
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── OVERVIEW ── */}
        <section className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-semibold ${heading}`}>Welcome back, {getDisplayName()}</h1>
            <p className={`text-sm mt-0.5 ${muted}`}>
              {enrolledCourses.length} course{enrolledCourses.length !== 1 ? 's' : ''} · {upcomingExams.length} upcoming exam{upcomingExams.length !== 1 ? 's' : ''} · {completedExams.length} completed
            </p>
          </div>
          <div className="flex gap-3">
            {activeExam && (
              <button onClick={() => navigate(`/exam-preflight/${activeExam.id}`)}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 transition">
                Enter Exam: {activeExam.title}
              </button>
            )}
            <button onClick={() => setShowEnrollModal(true)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${theme === 'light' ? 'border-slate-300 hover:border-emerald-400' : 'border-neutral-700 hover:border-emerald-500'}`}>
              Join Course
            </button>
          </div>
        </section>

        {/* ── UPCOMING EXAMS ── */}
        {upcomingExams.length > 0 && (
          <section className="mt-8">
            <h2 className={`text-lg font-semibold mb-4 ${heading}`}>Upcoming Exams</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingExams.map(exam => {
                const status = getExamStatus(exam);
                return (
                  <div key={exam.id} className={`rounded-xl border p-4 ${cardBg}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold truncate ${heading}`}>{exam.title}</h4>
                        <p className={`text-xs mt-0.5 ${muted}`}>{exam.course.name}</p>
                      </div>
                      <span className={`ml-2 flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className={`flex gap-4 text-xs mb-3 ${muted}`}>
                      <span>{exam.durationMinutes} min</span>
                      <span>{exam._count.examQuestions} questions</span>
                    </div>
                    <div className={`text-xs mb-3 ${muted}`}>
                      Start: {new Date(exam.startAt).toLocaleString()}
                    </div>
                    {status.canTake ? (
                      <button onClick={() => navigate(`/exam-preflight/${exam.id}`)}
                        className="w-full py-2 rounded-lg bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 transition">
                        Enter Exam
                      </button>
                    ) : (
                      <div className={`w-full py-2 rounded-lg text-center text-sm font-medium border ${status.color}`}>
                        {status.label === 'UPCOMING' ? 'Not Yet Available' : 'Exam Ended'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── COURSES ── */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${heading}`}>My Courses</h2>
            <button onClick={() => navigate('/my-courses')} className="text-sm text-emerald-500 hover:text-emerald-400">
              View All
            </button>
          </div>
          {enrolledCourses.length === 0 ? (
            <div className={`rounded-xl border p-10 text-center ${cardBg}`}>
              <p className={`text-sm mb-4 ${muted}`}>You haven't joined any courses yet.</p>
              <button onClick={() => setShowEnrollModal(true)}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 transition">
                Join a Course
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrolledCourses.slice(0, 6).map(course => (
                <button key={course.id} onClick={() => navigate(`/course/${course.id}`)}
                  className={`rounded-xl border p-4 text-left transition hover:border-emerald-400/50 ${cardBg}`}>
                  <h4 className={`font-semibold truncate ${heading}`}>{course.name}</h4>
                  <p className={`text-xs mt-0.5 ${muted}`}>{course.code}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── RESULTS ── */}
        {completedExams.length > 0 && (
          <section className="mt-8 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${heading}`}>Recent Results</h2>
              <button onClick={() => navigate('/my-results')} className="text-sm text-emerald-500 hover:text-emerald-400">
                View All
              </button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {completedExams.slice(0, 4).map(session => (
                <button key={session.id} onClick={() => navigate(`/result/${session.id}`)}
                  className={`rounded-xl border p-4 text-left transition hover:border-emerald-400/50 ${cardBg}`}>
                  <h4 className={`font-semibold text-sm mb-1 truncate ${heading}`}>{session.exam.title}</h4>
                  <p className={`text-xs mb-3 truncate ${muted}`}>{session.exam.course.name}</p>
                  {session.result ? (
                    <>
                      <div className={`text-2xl font-bold mb-1 ${session.result.passStatus ? 'text-emerald-500' : 'text-red-500'}`}>
                        {session.result.percentage.toFixed(1)}%
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${session.result.passStatus ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}>
                        {session.result.passStatus ? 'Passed' : 'Failed'}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/30">
                      Pending
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── ENROLL MODAL ── */}
      {showEnrollModal && (
        <div className={`fixed inset-0 flex items-center justify-center p-4 z-50 ${theme === 'light' ? 'bg-slate-900/40' : 'bg-black/70'}`}>
          <div className={`rounded-xl border w-full max-w-md p-6 shadow-xl ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-neutral-700 bg-neutral-900'}`}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className={`text-lg font-semibold ${heading}`}>Join Classroom</h3>
                <p className={`text-sm mt-0.5 ${muted}`}>Enter the code from your instructor</p>
              </div>
              <button onClick={() => { setShowEnrollModal(false); setCourseCode(''); }}
                className={`text-2xl leading-none ${muted}`}>
                ×
              </button>
            </div>
            <form onSubmit={handleEnroll} className="space-y-4">
              <input
                type="text"
                value={courseCode}
                onChange={e => setCourseCode(e.target.value.toUpperCase())}
                className={`w-full px-4 py-3 rounded-lg border text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                  theme === 'light'
                    ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400'
                    : 'border-neutral-700 bg-neutral-950 text-white placeholder:text-neutral-600'
                }`}
                placeholder="ABC-DEFG-HIJ"
                maxLength={20}
                required
                autoFocus
              />
              <div className="flex gap-3 pt-1">
                <button type="button"
                  onClick={() => { setShowEnrollModal(false); setCourseCode(''); }}
                  className={`flex-1 py-2.5 rounded-lg border transition ${theme === 'light' ? 'border-slate-300 hover:border-slate-400' : 'border-neutral-700 hover:border-neutral-500'}`}>
                  Cancel
                </button>
                <button type="submit" disabled={loading || !courseCode}
                  className="flex-1 py-2.5 rounded-lg bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Joining...' : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
