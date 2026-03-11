import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';
import { toCsv, downloadCsv, safeFilename } from '../lib/exportCsv';

interface ExamGroup {
    exam: { id: string; title: string; course: { name: string; code: string }; hasEssayQuestions: boolean };
    sessions: any[];
    totalSubmissions: number;
    pendingGrading: number;
    unpublished: number;
}

export default function GradingDashboardPage() {
    const [examGroups, setExamGroups] = useState<ExamGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => { fetchPending(); }, []);

    const fetchPending = async () => {
        try {
            const res = await api.get('/results/faculty/pending');
            setExamGroups(res.data.exams);
        } catch { toast.error('Failed to load grading queue'); }
        finally { setLoading(false); }
    };

    const handlePublishAll = async (examId: string, publish: boolean) => {
        try {
            await api.patch(`/results/faculty/exam/${examId}/publish-all`, { publish });
            toast.success(publish ? 'All results published!' : 'All results unpublished');
            fetchPending();
        } catch { toast.error('Failed to update publish status'); }
    };

    const exportExam = (group: ExamGroup) => {
        const rows = group.sessions.map((s: any) => ({
            'First Name': s.student?.firstName ?? '',
            'Last Name': s.student?.lastName ?? '',
            Email: s.student?.email ?? '',
            'Score': s.result?.totalScore?.toFixed(2) ?? 'Not graded',
            'Percentage (%)': s.result?.percentage?.toFixed(1) ?? '',
            'Pass/Fail': s.result ? (s.result.passStatus ? 'PASS' : 'FAIL') : 'Pending',
            'Published': s.result?.isPublished ? 'Yes' : 'No',
            'Violations': s._count?.suspiciousEvents ?? 0,
            'Submitted At': s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '',
        }));
        const fname = safeFilename(group.exam.course.code, group.exam.title, 'results');
        downloadCsv(toCsv(rows), fname);
        toast.success(`Exported ${rows.length} students`);
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-violet-400 border-t-transparent rounded-full" />
        </div>
    );

    const totalSubmissions = examGroups.reduce((s, g) => s + g.totalSubmissions, 0);
    const totalPending = examGroups.reduce((s, g) => s + g.pendingGrading, 0);
    const totalUnpublished = examGroups.reduce((s, g) => s + g.unpublished, 0);

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
            <Toaster position="top-right" toastOptions={{ style: { background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155' } }} />

            {/* Ambient glow */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -left-40 top-0 h-80 w-80 rounded-full bg-violet-500/25 blur-3xl" />
                <div className="absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
            </div>
            <div className="pointer-events-none fixed inset-0 opacity-[0.025]"
                style={{ backgroundImage: `repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(255,255,255,0.04) 2px,rgba(255,255,255,0.04) 4px)` }} />

            <div className="relative mx-auto w-full px-6 py-8 sm:px-8 lg:px-12 xl:px-20 xl:py-12">

                {/* Header */}
                <header className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900/70 ring-1 ring-cyan-400/40 shadow-lg shadow-cyan-500/30">
                            <span className="text-lg font-semibold tracking-tight text-cyan-300">P</span>
                        </div>
                        <div className="flex flex-col leading-tight">
                            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Procto</span>
                            <span className="text-xs text-slate-500">Grading Center</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {totalPending > 0 && (
                            <span className="text-xs px-3 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 font-medium">
                                {totalPending} pending
                            </span>
                        )}
                        <button onClick={() => navigate('/faculty')}
                            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-300 transition-colors group">
                            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Dashboard
                        </button>
                    </div>
                </header>

                {/* Page title */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-100">Grading Center</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Review and publish student exam results</p>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                        { label: 'Total Submissions', value: totalSubmissions, color: 'text-cyan-400', dot: 'bg-cyan-500' },
                        { label: 'Pending Grading', value: totalPending, color: 'text-yellow-400', dot: 'bg-yellow-500' },
                        { label: 'Unpublished', value: totalUnpublished, color: 'text-violet-400', dot: 'bg-violet-500' },
                    ].map(({ label, value, color, dot }) => (
                        <div key={label} className="rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm p-5">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                                <p className="text-xs text-slate-500">{label}</p>
                            </div>
                            <p className={`text-3xl font-bold ${color}`}>{value}</p>
                        </div>
                    ))}
                </div>

                {/* Exam groups */}
                {examGroups.length === 0 ? (
                    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm p-16 text-center">
                        <div className="text-5xl mb-4">🎉</div>
                        <h3 className="font-semibold text-slate-200 mb-2">All caught up!</h3>
                        <p className="text-sm text-slate-500">No submitted exams waiting for grading.</p>
                    </div>
                ) : (
                    <div className="space-y-6 pb-16">
                        {examGroups.map(group => (
                            <div key={group.exam.id}
                                className="rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm overflow-hidden">

                                {/* Exam header */}
                                <div className="px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-violet-500/10 via-transparent to-cyan-500/10">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-100">{group.exam.title}</h2>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                <span className="font-mono text-slate-600">{group.exam.course.code}</span>
                                                {' · '}{group.exam.course.name}
                                            </p>
                                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                                                <span>{group.totalSubmissions} submissions</span>
                                                {group.pendingGrading > 0 && (
                                                    <span className="text-yellow-400 font-medium">⏳ {group.pendingGrading} pending</span>
                                                )}
                                                {group.unpublished > 0 && (
                                                    <span className="text-violet-400 font-medium">🔒 {group.unpublished} unpublished</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {group.exam.hasEssayQuestions && (
                                                <span className="text-[0.65rem] px-2.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 font-medium">
                                                    ✍️ Essays
                                                </span>
                                            )}
                                            <button onClick={() => exportExam(group)}
                                                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 text-xs text-slate-400 hover:border-emerald-500/40 hover:text-emerald-300 transition-all">
                                                ⬇ Export CSV
                                            </button>
                                            <button onClick={() => navigate(`/analytics/${group.exam.id}`)}
                                                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 text-xs text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300 transition-all">
                                                📊 Analytics
                                            </button>
                                            <button onClick={() => handlePublishAll(group.exam.id, true)}
                                                className="px-3 py-1.5 rounded-lg bg-violet-500 text-white text-xs font-semibold hover:bg-violet-400 transition shadow-lg shadow-violet-500/20">
                                                📢 Publish All
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Student rows */}
                                <div className="divide-y divide-slate-800">
                                    {group.sessions.map((session: any) => {
                                        const isGraded = !!session.result?.finalizedAt;
                                        const isPublished = !!session.result?.isPublished;

                                        return (
                                            <div key={session.id}
                                                className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/30 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-300 shrink-0">
                                                        {session.student.firstName[0]}{session.student.lastName[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-200">
                                                            {session.student.firstName} {session.student.lastName}
                                                        </p>
                                                        <p className="text-xs text-slate-600">{session.student.email}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    {session.result ? (
                                                        <div className="text-right">
                                                            <p className={`text-base font-bold ${session.result.passStatus ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                {session.result.percentage.toFixed(1)}%
                                                            </p>
                                                            <p className="text-xs text-slate-600">{session.result.totalScore.toFixed(1)} pts</p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-yellow-400/80 font-medium">⏳ Ungraded</span>
                                                    )}

                                                    <div className="flex items-center gap-2">
                                                        {isGraded && (
                                                            <span className={`text-[0.65rem] px-2 py-0.5 rounded-full border font-medium ${isPublished
                                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                                : 'bg-slate-800 border-slate-700 text-slate-500'
                                                                }`}>
                                                                {isPublished ? '✅ Published' : '🔒 Draft'}
                                                            </span>
                                                        )}
                                                        {session._count.suspiciousEvents > 0 && (
                                                            <span className="text-[0.65rem] px-2 py-0.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 font-medium">
                                                                ⚠️ {session._count.suspiciousEvents} flags
                                                            </span>
                                                        )}
                                                    </div>

                                                    <button onClick={() => navigate(`/grade/${group.exam.id}/${session.id}`)}
                                                        className="px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/20 text-xs font-semibold transition-all hover:border-violet-500/40">
                                                        {isGraded ? 'Review' : 'Grade'} →
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <footer className="mt-8 flex items-center justify-between border-t border-slate-800/80 pt-4 text-[0.7rem] text-slate-600 sm:text-xs">
                    <span>© {new Date().getFullYear()} Procto. Built for secure online exams.</span>
                    <span className="hidden sm:inline">Designed for performance · React · TypeScript</span>
                </footer>
            </div>
        </main>
    );
}
