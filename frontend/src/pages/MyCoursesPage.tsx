import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';

interface Course {
    id: string; name: string; code: string; description: string | null;
    isActive: boolean;
    faculty: { firstName: string; lastName: string };
    _count: { enrollments: number; exams: number };
}

export default function MyCoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [courseCode, setCourseCode] = useState('');
    const [enrolling, setEnrolling] = useState(false);
    const [showEnroll, setShowEnroll] = useState(false);
    const navigate = useNavigate();

    useEffect(() => { fetchCourses(); }, []);

    const fetchCourses = async () => {
        try {
            const res = await api.get('/courses');
            setCourses(res.data.courses);
        } catch { toast.error('Failed to load courses'); }
        finally { setLoading(false); }
    };

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!courseCode.trim()) return;
        setEnrolling(true);
        try {
            const res = await api.post('/courses/enroll', { courseCode: courseCode.trim() });
            toast.success(`Joined "${res.data.course.name}"!`);
            setCourseCode(''); setShowEnroll(false); fetchCourses();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Invalid course code');
        } finally { setEnrolling(false); }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-neutral-950 text-white">
            <Toaster position="top-right" toastOptions={{ style: { background: '#171717', color: '#fff', border: '1px solid #374151' } }} />

            {/* Ambient glow */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
                <div className="absolute -right-32 bottom-20 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />
            </div>
            <div className="pointer-events-none fixed inset-0 opacity-[0.025]"
                style={{ backgroundImage: `repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(255,255,255,0.04) 2px,rgba(255,255,255,0.04) 4px)` }} />

            <div className="relative mx-auto w-full px-6 py-8 sm:px-8 lg:px-12 xl:px-20 xl:py-12">

                {/* Header */}
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
                    <button onClick={() => setShowEnroll(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition-all hover:scale-105">
                        + Join Course
                    </button>
                </header>

                {/* Back + title */}
                <button onClick={() => navigate('/student')}
                    className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-emerald-400 transition-colors mt-8 group">
                    <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to dashboard
                </button>

                <div className="mt-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">My Courses</h1>
                        <p className="text-sm text-neutral-500 mt-0.5">{courses.length} enrolled</p>
                    </div>
                </div>

                {/* Course Grid */}
                <section className="mt-8 pb-16">
                    {courses.length === 0 ? (
                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-sm p-16 text-center">
                            <div className="text-5xl mb-4">🎓</div>
                            <h3 className="font-semibold text-neutral-200 mb-2">No courses yet</h3>
                            <p className="text-sm text-neutral-600 mb-6">Join a course using the code from your faculty</p>
                            <button onClick={() => setShowEnroll(true)}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-all">
                                + Join Your First Course
                            </button>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {courses.map(course => (
                                <button key={course.id} onClick={() => navigate(`/course/${course.id}`)}
                                    className="group relative rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-sm p-6 text-left hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 overflow-hidden">

                                    {/* Hover gradient */}
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    {/* Top accent bar */}
                                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500/60 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="relative">
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <h3 className="text-base font-semibold text-white group-hover:text-emerald-400 transition-colors line-clamp-2">
                                                {course.name}
                                            </h3>
                                            <span className="shrink-0 text-xs font-mono px-2 py-0.5 rounded-full border border-neutral-700 bg-neutral-800 text-neutral-400">
                                                {course.code}
                                            </span>
                                        </div>

                                        <p className="text-xs text-neutral-500 mb-1">
                                            Prof. {course.faculty.firstName} {course.faculty.lastName}
                                        </p>

                                        {course.description && (
                                            <p className="text-xs text-neutral-600 mt-2 line-clamp-2">{course.description}</p>
                                        )}

                                        <div className="flex gap-4 mt-4 pt-4 border-t border-neutral-800 text-xs text-neutral-500">
                                            <span className="flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5 text-emerald-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                                                </svg>
                                                {course._count.enrollments} students
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5 text-emerald-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                {course._count.exams} exams
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                {/* Footer */}
                <footer className="flex items-center justify-between border-t border-neutral-800 pt-4 text-[0.7rem] text-neutral-600 sm:text-xs">
                    <span>© {new Date().getFullYear()} Procto. Built for secure online exams.</span>
                    <span className="hidden sm:inline">Designed for performance · React · TypeScript</span>
                </footer>
            </div>

            {/* Join Course Modal */}
            {showEnroll && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="relative rounded-2xl border border-neutral-700/60 bg-neutral-900/95 backdrop-blur-xl w-full max-w-md p-8 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-white">Join a Course</h3>
                                <p className="text-sm text-neutral-500 mt-0.5">Enter the code from your faculty</p>
                            </div>
                            <button onClick={() => setShowEnroll(false)}
                                className="text-neutral-500 hover:text-white transition-colors text-2xl leading-none">×</button>
                        </div>
                        <form onSubmit={handleEnroll} className="space-y-4">
                            <input
                                type="text"
                                value={courseCode}
                                onChange={e => setCourseCode(e.target.value.toUpperCase())}
                                placeholder="CS101-XY9"
                                className="w-full px-4 py-3 rounded-xl border border-neutral-700 bg-neutral-950 text-white text-center font-mono text-lg tracking-widest placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
                                required autoFocus
                            />
                            <p className="text-xs text-neutral-600 text-center">Ask your faculty for the course code</p>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowEnroll(false)}
                                    className="flex-1 py-3 rounded-xl border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 transition text-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={enrolling}
                                    className="flex-1 py-3 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {enrolling ? 'Joining...' : 'Join Course →'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
