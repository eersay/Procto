import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

type Tab = 'announcements' | 'exams' | 'roster' | 'performance' | 'grades' | 'settings';

interface Announcement {
    id: string; title: string; body: string; isPinned: boolean; createdAt: string;
    author: { firstName: string; lastName: string };
}
interface Exam {
    id: string; title: string; startAt: string; endAt: string; durationMinutes: number;
    isPublished: boolean; status: string; _count: { examQuestions: number };
}
interface RosterEntry {
    id: string; enrolledAt: string;
    student: { id: string; firstName: string; lastName: string; email: string };
}
interface GradeEntry {
    id: string; submittedAt: string;
    exam: { id: string; title: string };
    result: { totalScore: number; percentage: number; passStatus: boolean; isPublished: boolean } | null;
}

// ─── role-aware theme tokens ─────────────────────────────────────────────────
// Faculty: violet/cyan  |  Student: emerald
function makeTheme(faculty: boolean, isLight: boolean) {
    if (faculty && isLight) return {
        bg: 'bg-gradient-to-br from-slate-100 via-white to-slate-100',
        glowL: 'bg-violet-300/20',
        glowR: 'bg-cyan-300/20',
        ring: 'ring-cyan-500/30',
        shadow: 'shadow-cyan-300/20',
        logo: 'text-cyan-700',
        subtitle: 'Faculty Portal',
        badge: 'border-violet-300 bg-violet-50 text-violet-700',
        badgeDot: 'bg-violet-500',
        badgeLabel: 'Faculty View',
        cardBorder: 'border-slate-200',
        cardGlow: 'from-violet-300/30 via-transparent to-cyan-300/30',
        accent: 'text-cyan-700',
        iconAccent: 'text-cyan-700',
        cta: 'bg-violet-600 hover:bg-violet-500 shadow-violet-400/30 text-white',
        tabActive: 'border-violet-600 text-violet-700',
        avatar: 'from-violet-600 to-cyan-600',
        avatarSm: 'from-violet-100 to-cyan-100 border-violet-300 text-violet-700',
        btnPrimary: 'bg-violet-600 hover:bg-violet-500 shadow-violet-400/30 text-white',
        btnSecondary: 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900',
        toastBg: '#ffffff',
        toastBorder: '#cbd5e1',
        inputFocus: 'focus:ring-violet-500/40 focus:border-violet-500/40',
        hoverBorder: 'hover:border-violet-400/60',
        infoBox: 'border-violet-200 bg-violet-50 text-violet-700',
    };
    if (faculty) return {
        bg: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',
        glowL: 'bg-violet-500/25',
        glowR: 'bg-cyan-500/20',
        ring: 'ring-cyan-400/40',
        shadow: 'shadow-cyan-500/30',
        logo: 'text-cyan-300',
        subtitle: 'Faculty Portal',
        badge: 'border-violet-500/40 bg-violet-500/10 text-violet-400',
        badgeDot: 'bg-violet-400',
        badgeLabel: 'Faculty View',
        cardBorder: 'border-violet-500/30',
        cardGlow: 'from-violet-500/20 via-transparent to-cyan-500/20',
        accent: 'text-cyan-400',
        iconAccent: 'text-cyan-400',
        cta: 'bg-violet-500 hover:bg-violet-400 shadow-violet-500/30 text-white',
        tabActive: 'border-violet-500 text-violet-400',
        avatar: 'from-violet-500 to-cyan-500',
        avatarSm: 'from-violet-500/20 to-cyan-500/20 border-violet-500/20 text-violet-300',
        btnPrimary: 'bg-violet-500 hover:bg-violet-400 shadow-violet-500/30 text-white',
        btnSecondary: 'border-neutral-700 bg-neutral-800/60 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200',
        toastBg: '#0f172a',
        toastBorder: '#334155',
        inputFocus: 'focus:ring-violet-500/40 focus:border-violet-500/40',
        hoverBorder: 'hover:border-violet-400/50',
        infoBox: 'border-violet-500/20 bg-violet-500/5 text-violet-300',
    };
    if (isLight) return {
        bg: 'bg-gradient-to-br from-slate-100 via-white to-slate-100',
        glowL: 'bg-emerald-300/20',
        glowR: 'bg-emerald-300/15',
        ring: 'ring-emerald-500/40',
        shadow: 'shadow-emerald-300/20',
        logo: 'text-emerald-700',
        subtitle: 'Student Portal',
        badge: 'border-emerald-300 bg-emerald-50 text-emerald-700',
        badgeDot: 'bg-emerald-500',
        badgeLabel: 'Student View',
        cardBorder: 'border-slate-200',
        cardGlow: 'from-emerald-300/30 via-transparent to-emerald-300/30',
        accent: 'text-emerald-700',
        iconAccent: 'text-emerald-700',
        cta: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-400/30 text-white',
        tabActive: 'border-emerald-600 text-emerald-700',
        avatar: 'from-emerald-600 to-teal-600',
        avatarSm: 'from-emerald-100 to-teal-100 border-emerald-300 text-emerald-700',
        btnPrimary: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-400/30 text-white',
        btnSecondary: 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900',
        toastBg: '#ffffff',
        toastBorder: '#cbd5e1',
        inputFocus: 'focus:ring-emerald-500/40 focus:border-emerald-500/40',
        hoverBorder: 'hover:border-emerald-500/50',
        infoBox: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
    return {
        bg: 'bg-neutral-950',
        glowL: 'bg-emerald-500/20',
        glowR: 'bg-emerald-500/15',
        ring: 'ring-emerald-500/40',
        shadow: 'shadow-emerald-500/20',
        logo: 'text-emerald-400',
        subtitle: 'Student Portal',
        badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
        badgeDot: 'bg-emerald-400',
        badgeLabel: 'Student View',
        cardBorder: 'border-emerald-500/30',
        cardGlow: 'from-emerald-500/20 via-transparent to-emerald-500/20',
        accent: 'text-emerald-400',
        iconAccent: 'text-emerald-400',
        cta: 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30 text-black',
        tabActive: 'border-emerald-500 text-emerald-400',
        avatar: 'from-emerald-500 to-teal-500',
        avatarSm: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/20 text-emerald-400',
        btnPrimary: 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30 text-black',
        btnSecondary: 'border-neutral-700 bg-neutral-800/60 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200',
        toastBg: '#171717',
        toastBorder: '#374151',
        inputFocus: 'focus:ring-emerald-500/40 focus:border-emerald-500/40',
        hoverBorder: 'hover:border-emerald-500/50',
        infoBox: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300',
    };
}

export default function CourseDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const userRaw = localStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const role: string = user?.role || 'STUDENT';
    const isFaculty = role === 'FACULTY' || role === 'ADMIN';
    const { theme, toggleTheme } = useTheme();
    const t = makeTheme(isFaculty, theme === 'light');

    const [course, setCourse] = useState<any>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [roster, setRoster] = useState<RosterEntry[]>([]);
    const [myGrades, setMyGrades] = useState<GradeEntry[]>([]);
    const [performance, setPerformance] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('announcements');

    const [showAnnounceForm, setShowAnnounceForm] = useState(false);
    const [announceTitle, setAnnounceTitle] = useState('');
    const [announceBody, setAnnounceBody] = useState('');
    const [announcePinned, setAnnouncePinned] = useState(false);
    const [posting, setPosting] = useState(false);
    const [showDropConfirm, setShowDropConfirm] = useState(false);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        if (id) fetchDetail();
    }, [id]);

    const fetchDetail = async () => {
        try {
            const res = await api.get(`/courses/${id}/detail`);
            setCourse(res.data.course);
            setAnnouncements(res.data.announcements || []);
            setExams(res.data.exams || []);
            setRoster(res.data.roster || []);
            setMyGrades(res.data.myGrades || []);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to load course');
            navigate(-1);
        } finally { setLoading(false); }
    };

    const fetchPerformance = async () => {
        if (performance) return;
        try {
            const res = await api.get(`/courses/${id}/performance`);
            setPerformance(res.data);
        } catch { toast.error('Failed to load performance data'); }
    };

    const handlePostAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault(); setPosting(true);
        try {
            const res = await api.post(`/courses/${id}/announcements`, { title: announceTitle, body: announceBody, isPinned: announcePinned });
            setAnnouncements([res.data.announcement, ...announcements]);
            setAnnounceTitle(''); setAnnounceBody(''); setAnnouncePinned(false); setShowAnnounceForm(false);
            toast.success('Announcement posted!');
        } catch { toast.error('Failed to post announcement'); } finally { setPosting(false); }
    };

    const handleDeleteAnnouncement = async (aId: string) => {
        try {
            await api.delete(`/courses/${id}/announcements/${aId}`);
            setAnnouncements(announcements.filter(a => a.id !== aId));
            toast.success('Announcement deleted');
        } catch { toast.error('Failed to delete announcement'); }
    };

    const handleRemoveStudent = async (studentId: string) => {
        try {
            await api.delete(`/courses/${id}/students/${studentId}`);
            setRoster(roster.filter(r => r.student.id !== studentId));
            toast.success('Student removed');
        } catch { toast.error('Failed to remove student'); }
    };

    const handleDropCourse = async () => {
        try {
            await api.post('/courses/drop', { courseId: id });
            toast.success('You have dropped this course');
            navigate('/my-courses');
        } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to drop course'); }
    };

    if (loading) return (
        <div className={`min-h-screen ${t.bg} flex items-center justify-center`}>
            <div className={`animate-spin h-8 w-8 border-2 border-t-transparent rounded-full ${isFaculty ? 'border-violet-400' : 'border-emerald-400'}`} />
        </div>
    );

    const now = new Date();
    const facultyTabs: { id: Tab; label: string; icon: string }[] = [
        { id: 'announcements', label: 'Announcements', icon: '📢' },
        { id: 'exams', label: 'Exams', icon: '📝' },
        { id: 'roster', label: 'Roster', icon: '👥' },
        { id: 'performance', label: 'Performance', icon: '📊' },
    ];
    const studentTabs: { id: Tab; label: string; icon: string }[] = [
        { id: 'announcements', label: 'Announcements', icon: '📢' },
        { id: 'exams', label: 'Exams', icon: '📅' },
        { id: 'grades', label: 'My Grades', icon: '📈' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
    ];
    const tabs = isFaculty ? facultyTabs : studentTabs;
    const getInitials = () => `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();

    return (
        <main className={`min-h-screen ${t.bg} ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            <Toaster position="top-right" toastOptions={{ style: { background: t.toastBg, color: theme === 'light' ? '#0f172a' : '#fff', border: `1px solid ${t.toastBorder}` } }} />

            {/* Ambient Glow */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className={`absolute -left-40 top-20 h-96 w-96 rounded-full ${t.glowL} blur-3xl`} />
                <div className={`absolute -right-32 bottom-20 h-80 w-80 rounded-full ${t.glowR} blur-3xl`} />
            </div>
            <div className="pointer-events-none fixed inset-0 opacity-[0.025]"
                style={{ backgroundImage: `repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(255,255,255,0.04) 2px,rgba(255,255,255,0.04) 4px)` }} />

            <div className="relative mx-auto w-full px-6 py-8 sm:px-8 lg:px-12 xl:px-20 xl:py-12">

                {/* ── HEADER ── */}
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900/70 ring-1 ${t.ring} shadow-lg ${t.shadow}`}>
                            <span className={`text-lg font-semibold tracking-tight ${t.logo}`}>P</span>
                        </div>
                        <div className="flex flex-col leading-tight">
                            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Procto</span>
                            <span className="text-xs text-slate-500">{t.subtitle}</span>
                        </div>
                    </div>

                    {/* Profile */}
                    <div className="flex items-center gap-3">
                        <button onClick={toggleTheme} className={`p-2 rounded-lg transition-colors ${theme === 'light' ? 'bg-white border border-slate-300 text-amber-600 hover:bg-slate-100' : 'bg-slate-800/70 border border-slate-700 text-slate-200 hover:bg-slate-700/70'}`}>
                            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                        </button>
                        <div className="relative group">
                            <button className={`flex items-center gap-3 rounded-full border px-3 py-1.5 transition-all duration-300 ${theme === 'light' ? 'border-slate-300 bg-white' : 'border-slate-700/60 bg-slate-900/70'}`}>
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${t.avatar} flex items-center justify-center text-white font-semibold text-sm`}>
                                {getInitials()}
                            </div>
                            <div className="hidden sm:flex flex-col items-start leading-tight">
                                <span className={`text-sm font-medium ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>{user?.firstName || user?.email}</span>
                                <span className={`text-[0.65rem] ${theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>{isFaculty ? 'Faculty' : 'Student'}</span>
                            </div>
                            <svg className="w-4 h-4 text-slate-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            </button>
                            <div className="absolute right-0 mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <div className={`rounded-xl border backdrop-blur-xl shadow-xl p-2 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-700/60 bg-slate-900/95'}`}>
                                {user?.email && (
                                    <div className={`px-3 py-2 text-xs truncate border-b mb-1 pb-2 ${theme === 'light' ? 'text-slate-600 border-slate-200' : 'text-slate-500 border-slate-700/60'}`}>{user.email}</div>
                                )}
                                <button onClick={() => { localStorage.clear(); navigate('/login'); }}
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

                {/* Back */}
                <button onClick={() => navigate(isFaculty ? '/faculty' : '/my-courses')}
                    className={`inline-flex items-center gap-2 text-sm text-slate-500 hover:${t.accent} transition-colors mt-8 group`}>
                    <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to {isFaculty ? 'dashboard' : 'my courses'}
                </button>

                {/* ── COURSE HEADER CARD ── */}
                <section className="mt-6">
                    <div className="relative">
                        <div className={`absolute -inset-1 rounded-3xl bg-gradient-to-r ${t.cardGlow} opacity-60 blur-xl`} />
                        <div className={`relative rounded-3xl border ${t.cardBorder} ${theme === 'light' ? 'bg-white' : 'bg-slate-900/90'} p-6 sm:p-8 backdrop-blur-xl shadow-2xl`}>
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full border ${t.badge} px-3 py-1 text-xs font-medium`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${t.badgeDot}`} />
                                            {t.badgeLabel}
                                        </span>
                                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-mono ${theme === 'light' ? 'border-slate-300 bg-slate-100 text-slate-700' : 'border-slate-700/60 bg-slate-800/60 text-slate-400'}`}>
                                            {course?.code}
                                        </span>
                                    </div>
                                    <h1 className={`text-2xl sm:text-3xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{course?.name}</h1>
                                    <div className={`mt-2 flex flex-wrap items-center gap-4 text-sm ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                                        <span className="flex items-center gap-1.5">
                                            <svg className={`w-4 h-4 ${t.iconAccent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            Prof. {course?.faculty?.firstName} {course?.faculty?.lastName}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <svg className={`w-4 h-4 ${t.iconAccent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                                            </svg>
                                            {course?._count?.enrollments} students
                                        </span>
                                    </div>
                                    {course?.description && (
                                        <p className={`mt-3 text-sm max-w-2xl ${theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>{course.description}</p>
                                    )}
                                </div>
                                {isFaculty && (
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => navigate(`/exams?courseId=${id}`)}
                                            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-lg ${t.cta} transition-all hover:scale-105`}>
                                            + New Exam
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── TABS ── */}
                <div className={`mt-8 flex gap-1 border-b overflow-x-auto ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
                    {tabs.map(tab => (
                        <button key={tab.id}
                            onClick={() => { setActiveTab(tab.id); if (tab.id === 'performance') fetchPerformance(); }}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all -mb-px ${activeTab === tab.id ? t.tabActive : theme === 'light' ? 'border-transparent text-slate-500 hover:text-slate-700' : 'border-transparent text-slate-500 hover:text-slate-300'
                                }`}>
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── TAB CONTENT ── */}
                <div className="mt-6 pb-16">

                    {/* ANNOUNCEMENTS */}
                    {activeTab === 'announcements' && (
                        <div className="space-y-4">
                            {isFaculty && (
                                <div className="flex justify-end">
                                    <button onClick={() => setShowAnnounceForm(!showAnnounceForm)}
                                        className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-lg ${t.cta} transition-all`}>
                                        + New Announcement
                                    </button>
                                </div>
                            )}

                            {showAnnounceForm && (
                                <form onSubmit={handlePostAnnouncement}
                                    className={`rounded-2xl border ${t.cardBorder} ${theme === 'light' ? 'bg-white' : 'bg-slate-900/80'} backdrop-blur-sm p-6 space-y-4`}>
                                    <h3 className={`font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>New Announcement</h3>
                                    <input type="text" value={announceTitle} onChange={e => setAnnounceTitle(e.target.value)}
                                        placeholder="Title" required
                                        className={`w-full px-4 py-2.5 rounded-xl border ${theme === 'light' ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400' : 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-600'} focus:outline-none focus:ring-2 ${t.inputFocus} transition`} />
                                    <textarea value={announceBody} onChange={e => setAnnounceBody(e.target.value)}
                                        placeholder="Write your announcement here..." required rows={4}
                                        className={`w-full px-4 py-2.5 rounded-xl border ${theme === 'light' ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400' : 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-600'} focus:outline-none focus:ring-2 ${t.inputFocus} transition resize-none`} />
                                    <div className="flex items-center justify-between">
                                        <label className={`flex items-center gap-2 text-sm cursor-pointer ${theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>
                                            <input type="checkbox" checked={announcePinned} onChange={e => setAnnouncePinned(e.target.checked)}
                                                className="rounded" />
                                            📌 Pin this
                                        </label>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setShowAnnounceForm(false)}
                                                className={`px-4 py-2 rounded-xl border transition text-sm ${theme === 'light' ? 'border-slate-300 text-slate-700 hover:text-slate-900' : 'border-slate-700 text-slate-400 hover:text-white'}`}>Cancel</button>
                                            <button type="submit" disabled={posting}
                                                className={`px-4 py-2 rounded-xl font-semibold text-sm transition disabled:opacity-50 ${t.cta}`}>
                                                {posting ? 'Posting...' : 'Post'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            )}

                            {announcements.length === 0 ? (
                                <EmptyState icon="📢" title="No announcements yet" sub={isFaculty ? 'Post an update for your students' : 'Check back soon'} />
                            ) : (
                                announcements.map(a => (
                                    <div key={a.id}
                                        className={`rounded-2xl border bg-slate-900/60 backdrop-blur-sm p-5 transition-all hover:shadow-lg ${a.isPinned ? 'border-amber-500/40 hover:border-amber-500/60 hover:shadow-amber-500/10' : 'border-slate-700/60 hover:border-slate-600/60'
                                            }`}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {a.isPinned && (
                                                        <span className="text-[0.65rem] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">📌 Pinned</span>
                                                    )}
                                                    <h3 className="font-semibold text-white">{a.title}</h3>
                                                </div>
                                                <p className="text-xs text-slate-500 mb-3">
                                                    {a.author.firstName} {a.author.lastName} · {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                                <p className="text-sm text-slate-400 whitespace-pre-wrap">{a.body}</p>
                                            </div>
                                            {isFaculty && (
                                                <button onClick={() => handleDeleteAnnouncement(a.id)}
                                                    className="text-slate-700 hover:text-red-400 transition text-lg shrink-0">🗑</button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* EXAMS */}
                    {activeTab === 'exams' && (
                        <div className="space-y-4">
                            {exams.length === 0 ? (
                                <EmptyState icon="📝" title="No exams scheduled" sub={isFaculty ? 'Create the first exam for this course' : 'No exams yet'}>
                                    {isFaculty && (
                                        <button onClick={() => navigate(`/exams?courseId=${id}`)}
                                            className={`mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold ${t.cta} transition`}>
                                            Create First Exam
                                        </button>
                                    )}
                                </EmptyState>
                            ) : (
                                exams.map(exam => {
                                    const started = new Date(exam.startAt) <= now;
                                    const ended = new Date(exam.endAt) < now;
                                    const available = exam.isPublished && started && !ended;
                                    const statusLabel = ended ? 'Ended' : available ? 'Live' : 'Upcoming';
                                    const statusCls = ended
                                        ? 'bg-slate-800 text-slate-500 border-slate-700'
                                        : available
                                            ? isFaculty
                                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                            : 'bg-blue-500/10 text-blue-400 border-blue-500/30';
                                    const liveBorder = available
                                        ? isFaculty ? 'border-cyan-500/30 hover:border-cyan-500/50 hover:shadow-cyan-500/10'
                                            : 'border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-emerald-500/10'
                                        : 'border-slate-700/60 hover:border-slate-600/60';

                                    return (
                                        <div key={exam.id}
                                            className={`relative rounded-2xl border bg-slate-900/60 backdrop-blur-sm p-5 transition-all hover:shadow-lg ${liveBorder}`}>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold text-white">{exam.title}</h3>
                                                        <span className={`text-[0.65rem] font-medium px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusCls}`}>
                                                            {statusLabel}
                                                        </span>
                                                        {!exam.isPublished && isFaculty && (
                                                            <span className="text-[0.65rem] px-2 py-0.5 bg-slate-800 text-slate-500 rounded-full border border-slate-700">Draft</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 mb-1">{exam._count.examQuestions} questions · {exam.durationMinutes} min</p>
                                                    <p className="text-xs text-slate-600">{new Date(exam.startAt).toLocaleString()} → {new Date(exam.endAt).toLocaleString()}</p>
                                                </div>
                                                <div className="shrink-0">
                                                    {isFaculty ? (
                                                        <button onClick={() => navigate(`/exams?courseId=${id}`)}
                                                            className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm text-slate-400 hover:border-slate-600 hover:text-slate-200 transition">
                                                            Manage →
                                                        </button>
                                                    ) : available ? (
                                                        <button onClick={() => navigate(`/exam-preflight/${exam.id}`)}
                                                            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-lg ${t.cta} transition-all hover:scale-105`}>
                                                            Take Exam →
                                                        </button>
                                                    ) : ended ? (
                                                        <span className="text-xs text-slate-600">Closed</span>
                                                    ) : (
                                                        <span className="text-xs text-blue-400">Not started yet</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* ROSTER (Faculty) */}
                    {activeTab === 'roster' && isFaculty && (
                        <div>
                            {roster.length === 0 ? (
                                <EmptyState icon="👥" title="No students enrolled"
                                    sub={<>Share code <code className={`font-mono ${t.accent}`}>{course?.code}</code> with students</>} />
                            ) : (
                                <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
                                    <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                                        <span className="text-sm text-slate-400">{roster.length} enrolled students</span>
                                    </div>
                                    <div className="divide-y divide-slate-800">
                                        {roster.map(r => (
                                            <div key={r.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${t.avatarSm} flex items-center justify-center text-xs font-bold`}>
                                                        {r.student.firstName[0]}{r.student.lastName[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">{r.student.firstName} {r.student.lastName}</p>
                                                        <p className="text-xs text-slate-500">{r.student.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs text-slate-600">{new Date(r.enrolledAt).toLocaleDateString()}</span>
                                                    <button onClick={() => { if (confirm(`Remove ${r.student.firstName} from this course?`)) handleRemoveStudent(r.student.id); }}
                                                        className="text-xs text-slate-600 hover:text-red-400 transition px-2 py-1 rounded-lg hover:bg-red-500/10">
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PERFORMANCE (Faculty) */}
                    {activeTab === 'performance' && isFaculty && (
                        <div>
                            {!performance ? (
                                <EmptyState icon="⏳" title="Loading performance data..." sub="Please wait" />
                            ) : performance.students.length === 0 ? (
                                <EmptyState icon="📊" title="No data yet" sub="Performance data will appear after students submit exams" />
                            ) : (
                                <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="border-b border-slate-800">
                                            <tr>
                                                <th className="px-5 py-3.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-900/80">Student</th>
                                                {performance.exams.map((e: any) => (
                                                    <th key={e.id} className="px-4 py-3.5 text-center text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[120px]">
                                                        <span className="block truncate max-w-[100px]">{e.title}</span>
                                                    </th>
                                                ))}
                                                <th className="px-4 py-3.5 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Avg</th>
                                                <th className="px-4 py-3.5 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Progress</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {performance.students.map((s: any) => (
                                                <tr key={s.student.id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-5 py-3.5 sticky left-0 bg-slate-900/80">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${t.avatarSm} flex items-center justify-center text-xs font-bold shrink-0`}>
                                                                {s.student.firstName[0]}{s.student.lastName[0]}
                                                            </div>
                                                            <span className="text-sm text-white whitespace-nowrap">{s.student.firstName} {s.student.lastName}</span>
                                                        </div>
                                                    </td>
                                                    {s.scores.map((score: any) => (
                                                        <td key={score.examId} className="px-4 py-3.5 text-center">
                                                            {score.submitted ? (
                                                                <span className={`font-semibold ${score.passStatus ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                    {score.percentage?.toFixed(1)}%
                                                                </span>
                                                            ) : <span className="text-slate-700">—</span>}
                                                        </td>
                                                    ))}
                                                    <td className="px-4 py-3.5 text-center font-bold">
                                                        {s.avgScore !== null ? (
                                                            <span className={s.avgScore >= 60 ? 'text-emerald-400' : 'text-red-400'}>{s.avgScore}%</span>
                                                        ) : <span className="text-slate-700">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center text-xs text-slate-500">{s.examsSubmitted}/{s.examsTotal}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* MY GRADES (Student) */}
                    {activeTab === 'grades' && !isFaculty && (
                        <div className="space-y-3">
                            {myGrades.length === 0 ? (
                                <EmptyState icon="📈" title="No grades yet" sub="Your scores will appear here after you complete exams" />
                            ) : (
                                myGrades.map(g => (
                                    <div key={g.id}
                                        className="rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm p-5 flex items-center justify-between hover:border-slate-600/60 transition-all">
                                        <div>
                                            <h3 className="font-semibold text-white">{g.exam.title}</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">Submitted {new Date(g.submittedAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            {g.result ? (
                                                g.result.isPublished ? (
                                                    <div className="flex items-center gap-3">
                                                        <div>
                                                            <p className={`text-2xl font-bold ${g.result.passStatus ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                {g.result.percentage.toFixed(1)}%
                                                            </p>
                                                            <p className="text-xs text-slate-500">{g.result.totalScore.toFixed(1)} pts</p>
                                                        </div>
                                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${g.result.passStatus
                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                                : 'bg-red-500/10 text-red-400 border-red-500/30'
                                                            }`}>
                                                            {g.result.passStatus ? '✓ PASSED' : '✗ FAILED'}
                                                        </span>
                                                    </div>
                                                ) : <span className="text-sm text-slate-500 italic">🔒 Pending review</span>
                                            ) : <span className="text-sm text-yellow-400/80">⏳ Awaiting grades</span>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* SETTINGS (Student) */}
                    {activeTab === 'settings' && !isFaculty && (
                        <div className="max-w-lg">
                            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 backdrop-blur-sm p-6">
                                <h3 className="font-semibold text-red-400 mb-1">Danger Zone</h3>
                                <p className="text-sm text-slate-500 mb-5">Once you drop this course, you will lose access to all content, announcements, and exams.</p>
                                {showDropConfirm ? (
                                    <div className="space-y-3">
                                        <p className="text-sm text-red-300">Are you sure you want to drop <strong className="text-white">{course?.name}</strong>?</p>
                                        <div className="flex gap-3">
                                            <button onClick={() => setShowDropConfirm(false)}
                                                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white transition text-sm">Cancel</button>
                                            <button onClick={handleDropCourse}
                                                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-500 transition">
                                                Yes, Drop Course
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setShowDropConfirm(true)}
                                        className="px-5 py-2.5 rounded-xl border-2 border-red-500/50 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition">
                                        Drop This Course
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── FOOTER ── */}
                <footer className="flex items-center justify-between border-t border-slate-800/80 pt-4 text-[0.7rem] text-slate-600 sm:text-xs">
                    <span>© {new Date().getFullYear()} Procto. Built for secure online exams.</span>
                    <span className="hidden sm:inline">Designed for performance · React · TypeScript</span>
                </footer>
            </div>
        </main>
    );
}

function EmptyState({ icon, title, sub, children }: { icon: string; title: string; sub: React.ReactNode; children?: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm p-12 text-center">
            <div className="text-4xl mb-3">{icon}</div>
            <p className="font-medium text-slate-300 mb-1">{title}</p>
            <p className="text-sm text-slate-600">{sub}</p>
            {children}
        </div>
    );
}
