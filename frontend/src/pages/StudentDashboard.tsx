import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';
import NotificationBell from '../components/NotificationBell';

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
    if (now < start) return { label: 'UPCOMING', canTake: false, color: 'text-blue-400 border-blue-400/40 bg-blue-400/10' };
    if (now >= start && now <= end) return { label: 'LIVE', canTake: true, color: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10' };
    return { label: 'ENDED', canTake: false, color: 'text-neutral-500 border-neutral-700 bg-neutral-800/40' };
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
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
    </div>
  );

  const activeExam = upcomingExams.find(e => getExamStatus(e).canTake);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <Toaster position="top-right" toastOptions={{ style: { background: '#171717', color: '#fff', border: '1px solid #374151' } }} />

      {/* Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -right-32 bottom-20 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      {/* Carbon fibre pattern */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{ backgroundImage: `repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(255,255,255,0.04) 2px,rgba(255,255,255,0.04) 4px)` }} />

      <div className="relative mx-auto flex min-h-screen w-full flex-col px-6 py-8 sm:px-8 lg:px-12 xl:px-20 xl:py-12">

        {/* ── HEADER ── */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-500/20">
              <span className="text-lg font-semibold tracking-tight text-emerald-400">P</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-400">Procto</span>
              <span className="text-xs text-neutral-600">Student Portal</span>
            </div>
          </div>

          {/* Notification Bell + Profile dropdown */}
          <div className="flex items-center gap-3">
            <NotificationBell />

            {/* Profile dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-3 rounded-full border border-neutral-700/60 bg-neutral-900/70 px-3 py-1.5 hover:border-emerald-400/40 transition-all duration-300">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-semibold text-sm">
                  {getInitials()}
                </div>
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium text-neutral-200">{getDisplayName()}</span>
                  <span className="text-[0.65rem] text-neutral-500">Student</span>
                </div>
                <svg className="w-4 h-4 text-neutral-400 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className="absolute right-0 mt-2 w-52 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="rounded-xl border border-neutral-700/60 bg-neutral-900/95 backdrop-blur-xl shadow-xl p-2">
                  <button onClick={() => navigate('/my-courses')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 rounded-lg hover:bg-neutral-800/60 hover:text-emerald-400 transition-colors">
                    📚 My Courses
                  </button>
                  <button onClick={() => navigate('/my-results')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 rounded-lg hover:bg-neutral-800/60 hover:text-emerald-400 transition-colors">
                    📊 My Results
                  </button>
                  {user?.email && (
                    <div className="px-3 py-2 text-xs text-neutral-500 truncate border-t border-neutral-700/60 mt-1 pt-2">
                      {user.email}
                    </div>
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
            </div>
          </div>
        </header>

        {/* ── HERO ── */}
        <section className="mt-12 flex flex-1 items-center justify-center lg:mt-16">
          <div className="flex w-full max-w-6xl flex-col gap-12 lg:flex-row lg:items-center">

            {/* Left: Text */}
            <div className="flex w-full flex-1 flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-xs text-neutral-400 shadow-sm backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                High-Performance Exam Environment
              </div>

              <h1 className="mt-6 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Focus.{' '}
                <span className="text-emerald-400">Speed.</span>{' '}
                <br className="hidden sm:block" />
                Integrity.
              </h1>

              <p className="mt-5 max-w-xl text-base text-neutral-400 sm:text-lg">
                Join your exam session instantly. No distractions, just performance. Your path to success starts here.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                {activeExam ? (
                  <button onClick={() => navigate(`/exam-preflight/${activeExam.id}`)}
                    className="group inline-flex items-center justify-center rounded-full bg-emerald-500 px-8 py-3.5 text-base font-semibold text-black shadow-lg shadow-emerald-500/40 transition-all hover:bg-emerald-400 hover:scale-105">
                    Enter Exam Lobby
                    <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                  </button>
                ) : (
                  <button onClick={() => setShowEnrollModal(true)}
                    className="group inline-flex items-center justify-center rounded-full bg-emerald-500 px-8 py-3.5 text-base font-semibold text-black shadow-lg shadow-emerald-500/40 transition-all hover:bg-emerald-400 hover:scale-105">
                    Join a Course
                    <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                  </button>
                )}
                <button onClick={() => navigate('/my-results')}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-6 py-3.5 text-sm text-neutral-300 hover:border-emerald-400/50 hover:text-emerald-400 transition-all">
                  View Results
                </button>
              </div>

              <div className="mt-8 flex flex-wrap gap-6 text-xs text-neutral-500 sm:text-sm">
                {[
                  { label: `${enrolledCourses.length} Enrolled Courses` },
                  { label: `${upcomingExams.length} Upcoming Exams` },
                  { label: `${completedExams.length} Completed` },
                ].map(({ label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Quick Action Card */}
            <div className="flex w-full flex-1 items-center justify-center">
              <div className="relative w-full max-w-md lg:max-w-xl">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-emerald-500/30 via-emerald-500/10 to-emerald-500/30 opacity-60 blur-xl" />
                <div className="relative rounded-3xl border border-emerald-500/30 bg-neutral-900/90 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
                  <div className="flex items-center justify-between text-xs mb-5">
                    <span className="uppercase tracking-[0.16em] text-neutral-500">Student Hub</span>
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse" />
                      Online
                    </span>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        icon: (
                          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        ),
                        title: 'Join Classroom',
                        sub: 'Enter a class code to enroll',
                        action: () => setShowEnrollModal(true),
                      },
                      {
                        icon: (
                          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        ),
                        title: activeExam ? `Take: ${activeExam.title}` : 'No Active Exam',
                        sub: activeExam ? `${activeExam.course.name} · ${activeExam.durationMinutes} min` : 'Check back when an exam is live',
                        action: () => activeExam && navigate(`/exam-preflight/${activeExam.id}`),
                      },
                      {
                        icon: (
                          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        ),
                        title: 'My Courses',
                        sub: `${enrolledCourses.length} course${enrolledCourses.length !== 1 ? 's' : ''} enrolled`,
                        action: () => navigate('/my-courses'),
                      },
                    ].map(({ icon, title, sub, action }) => (
                      <button key={title} onClick={action}
                        className="w-full flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 hover:border-emerald-500/50 hover:bg-neutral-900/80 transition-all group text-left">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors flex-shrink-0">
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors truncate">{title}</p>
                          <p className="text-xs text-neutral-500 truncate">{sub}</p>
                        </div>
                        <svg className="w-5 h-5 text-neutral-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── UPCOMING EXAMS ── */}
        {upcomingExams.length > 0 && (
          <section className="mt-20">
            <h2 className="text-2xl font-bold mb-6 text-white">Upcoming Exams</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingExams.map(exam => {
                const status = getExamStatus(exam);
                return (
                  <div key={exam.id}
                    className="group relative rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all backdrop-blur-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">{exam.title}</h4>
                        <p className="text-xs text-neutral-500 mt-0.5">{exam.course.name}</p>
                      </div>
                      <span className={`ml-2 flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-neutral-500 mb-4">
                      <span>⏱ {exam.durationMinutes} min</span>
                      <span>📝 {exam._count.examQuestions} questions</span>
                    </div>
                    <div className="text-xs text-neutral-600 mb-4">
                      <div>Start: {new Date(exam.startAt).toLocaleString()}</div>
                    </div>
                    {status.canTake ? (
                      <button onClick={() => navigate(`/exam-preflight/${exam.id}`)}
                        className="w-full py-2 rounded-lg bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/30">
                        Enter Exam →
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

        {/* ── RECENT RESULTS ── */}
        {completedExams.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Recent Results</h2>
              <button onClick={() => navigate('/my-results')}
                className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
                View All →
              </button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {completedExams.slice(0, 4).map(session => (
                <button key={session.id} onClick={() => navigate(`/result/${session.id}`)}
                  className="group rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all text-left">
                  <h4 className="font-semibold text-white text-sm mb-1 truncate">{session.exam.title}</h4>
                  <p className="text-xs text-neutral-500 mb-4 truncate">{session.exam.course.name}</p>
                  {session.result ? (
                    <>
                      <div className={`text-3xl font-bold mb-1 ${session.result.passStatus ? 'text-emerald-400' : 'text-red-400'}`}>
                        {session.result.percentage.toFixed(1)}%
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${session.result.passStatus ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/30' : 'bg-red-400/10 text-red-400 border border-red-400/30'}`}>
                        {session.result.passStatus ? '✓ PASSED' : '✗ FAILED'}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/30">
                      ⏳ Pending
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── FEATURE GRID ── */}
        <section className="mt-20 mb-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Built for <span className="text-emerald-400">Performance</span>
            </h2>
            <p className="mt-3 text-neutral-500 max-w-2xl mx-auto">
              Everything you need for a seamless, focused exam experience.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: '📱', title: 'Mobile Ready', desc: 'Take exams on any device. Fully responsive interface optimized for phones, tablets, and desktops.' },
              { icon: '🖥', title: 'Distraction-Free', desc: 'Full-screen focus mode enabled. No interruptions, no notifications — just you and your exam.' },
              { icon: '⚡', title: 'Instant Results', desc: 'Get your performance analytics immediately after submission with detailed score breakdown.' },
            ].map(({ icon, title, desc }) => (
              <div key={title}
                className="group relative rounded-2xl border border-emerald-500/30 bg-neutral-900/60 p-6 backdrop-blur-sm hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors text-2xl">
                    {icon}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                  <p className="text-sm text-neutral-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="mt-8 flex items-center justify-between border-t border-neutral-800 pt-4 text-[0.7rem] text-neutral-600 sm:text-xs">
          <span>© {new Date().getFullYear()} Procto. Built for secure online exams.</span>
          <span className="hidden sm:inline">Designed for performance · React · TypeScript</span>
        </footer>
      </div>

      {/* ── ENROLL MODAL ── */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="relative rounded-2xl border border-neutral-700/60 bg-neutral-900/95 backdrop-blur-xl w-full max-w-md p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Join Classroom</h3>
                <p className="text-sm text-neutral-500 mt-0.5">Enter the code from your instructor</p>
              </div>
              <button onClick={() => { setShowEnrollModal(false); setCourseCode(''); }}
                className="text-neutral-500 hover:text-white transition-colors text-2xl leading-none">
                ×
              </button>
            </div>
            <form onSubmit={handleEnroll} className="space-y-4">
              <input
                type="text"
                value={courseCode}
                onChange={e => setCourseCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl border border-neutral-700 bg-neutral-950 text-white text-center font-mono text-lg tracking-widest placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
                placeholder="ABC-DEFG-HIJ"
                maxLength={20}
                required
                autoFocus
              />
              <div className="flex gap-3 pt-2">
                <button type="button"
                  onClick={() => { setShowEnrollModal(false); setCourseCode(''); }}
                  className="flex-1 py-3 rounded-xl border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 transition">
                  Cancel
                </button>
                <button type="submit" disabled={loading || !courseCode}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Joining...' : 'Join →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
