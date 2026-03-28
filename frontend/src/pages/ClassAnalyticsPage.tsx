import { useEffect, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';
import { toCsv, downloadCsv, safeFilename } from '../lib/exportCsv';
import { Sun, Moon } from 'lucide-react';

interface Analytics {
    exam: { id: string; title: string; course: { name: string; code: string } };
    totalSubmissions: number;
    gradedCount: number;
    avgScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
    scoreDistribution: { range: string; count: number }[];
    questionStats: {
        questionNumber: number;
        type: string;
        maxPoints: number;
        avgScore: number;
        fullCreditCount: number;
        attemptCount: number;
        fullCreditPct: number;
    }[];
}

export default function ClassAnalyticsPage() {
    const { examId } = useParams<{ examId: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<Analytics | null>(null);
    const { theme, toggleTheme } = useTheme();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (examId) fetchAnalytics();
    }, [examId]);

    const fetchAnalytics = async () => {
        try {
            const res = await api.get(`/results/faculty/exam/${examId}/analytics`);
            setData(res.data);
        } catch {
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    const exportSummary = () => {
        if (!data) return;
        const rows = [{
            Exam: data.exam.title,
            Course: `${data.exam.course.name} (${data.exam.course.code})`,
            'Total Submissions': data.totalSubmissions,
            'Graded': data.gradedCount,
            'Avg Score (%)': data.avgScore,
            'Highest (%)': data.highestScore,
            'Lowest (%)': data.lowestScore,
            'Pass Rate (%)': data.passRate,
        }];
        downloadCsv(toCsv(rows), safeFilename(data.exam.title, 'summary'));
        toast.success('Summary exported');
    };

    const exportQuestions = () => {
        if (!data) return;
        const rows = data.questionStats.map(q => ({
            'Q#': `Q${q.questionNumber}`,
            Type: q.type.replace(/_/g, ' '),
            'Max Points': q.maxPoints,
            'Avg Score': q.avgScore,
            Attempts: q.attemptCount,
            'Full Credit Count': q.fullCreditCount,
            'Full Credit (%)': q.fullCreditPct,
        }));
        downloadCsv(toCsv(rows), safeFilename(data.exam.title, 'question_breakdown'));
        toast.success('Question breakdown exported');
    };

    if (loading) {
        return (
            <div className={`min-h-screen ${theme === 'light' ? 'bg-gradient-to-br from-slate-100 via-white to-slate-100' : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'} flex items-center justify-center`}>
                <div className="text-center">
                    <div className="text-6xl mb-4 animate-pulse">📊</div>
                    <p className={`text-lg ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Crunching the numbers…</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const maxBucketCount = Math.max(...data.scoreDistribution.map((b) => b.count), 1);
    const passCount = Math.round((data.passRate / 100) * data.gradedCount);
    const failCount = data.gradedCount - passCount;

    const statCards = [
        { label: 'Submissions', value: data.totalSubmissions, color: 'text-cyan-400', dot: 'bg-cyan-400', glow: 'shadow-cyan-500/20' },
        { label: 'Graded', value: data.gradedCount, color: 'text-violet-400', dot: 'bg-violet-400', glow: 'shadow-violet-500/20' },
        { label: 'Avg Score', value: `${data.avgScore}%`, color: 'text-yellow-400', dot: 'bg-yellow-400', glow: 'shadow-yellow-500/20' },
        { label: 'Highest', value: `${data.highestScore}%`, color: 'text-emerald-400', dot: 'bg-emerald-400', glow: 'shadow-emerald-500/20' },
        { label: 'Lowest', value: `${data.lowestScore}%`, color: 'text-red-400', dot: 'bg-red-400', glow: 'shadow-red-500/20' },
        { label: 'Pass Rate', value: `${data.passRate}%`, color: data.passRate >= 60 ? 'text-emerald-400' : 'text-orange-400', dot: data.passRate >= 60 ? 'bg-emerald-400' : 'bg-orange-400', glow: 'shadow-emerald-500/20' },
    ];

    return (
        <main className={`min-h-screen ${theme === 'light' ? 'bg-gradient-to-br from-slate-100 via-white to-slate-100 text-slate-900' : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100'}`}>
            <Toaster position="top-right" toastOptions={{ style: theme === 'light' ? { background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' } : { background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155' } }} />

            {/* Ambient glows */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -left-40 top-0 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
                <div className="absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
                <div className="absolute left-1/3 top-1/2 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
            </div>
            <div className="pointer-events-none fixed inset-0 opacity-[0.025]"
                style={{ backgroundImage: `repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(255,255,255,0.04) 2px,rgba(255,255,255,0.04) 4px)` }} />

            <div className="relative mx-auto w-full max-w-6xl px-6 py-8 sm:px-8 xl:py-12">

                {/* Header */}
                <header className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900/70 ring-1 ring-cyan-400/40 shadow-lg shadow-cyan-500/30">
                            <span className="text-lg font-semibold tracking-tight text-cyan-300">P</span>
                        </div>
                        <div className="flex flex-col leading-tight">
                            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Procto</span>
                            <span className="text-xs text-slate-500">Class Analytics</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={toggleTheme} className={`p-2 rounded-lg transition-colors ${theme === 'light' ? 'bg-white border border-slate-300 text-amber-600 hover:bg-slate-100' : 'bg-slate-800/70 border border-slate-700 text-slate-200 hover:bg-slate-700/70'}`}>
                            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                        </button>
                        <button
                            onClick={exportSummary}
                            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 text-xs font-semibold text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300 transition-all"
                        >
                            ⬇ Summary CSV
                        </button>
                        <button
                            onClick={exportQuestions}
                            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 text-xs font-semibold text-slate-400 hover:border-violet-500/40 hover:text-violet-300 transition-all"
                        >
                            ⬇ Questions CSV
                        </button>
                        <button
                            onClick={() => navigate('/grading')}
                            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-300 transition-colors group"
                        >
                            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back
                        </button>
                    </div>
                </header>

                {/* Exam identity */}
                <div className="mb-8">
                    <h1 className={`text-2xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>{data.exam.title}</h1>
                    <p className="text-sm text-slate-500 mt-0.5">{data.exam.course.name} · <span className="font-mono text-slate-600">{data.exam.course.code}</span></p>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    {statCards.map((stat) => (
                        <div key={stat.label} className={`rounded-2xl border backdrop-blur-sm p-4 text-center transition-all ${theme === 'light' ? 'border-slate-200 bg-white hover:border-slate-300' : 'border-slate-700/60 bg-slate-900/60 hover:border-slate-600/60'}`}>
                            <div className={`flex items-center justify-center gap-1.5 mb-2`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${stat.dot}`} />
                                <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-500">{stat.label}</p>
                            </div>
                            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Charts row */}
                <div className="grid lg:grid-cols-2 gap-6 mb-8">

                    {/* Score Distribution */}
                    <div className={`rounded-2xl border backdrop-blur-sm p-6 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-700/60 bg-slate-900/60'}`}>
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-5">Score Distribution</h2>
                        {data.gradedCount === 0 ? (
                            <p className="text-center text-slate-600 py-12">No graded submissions yet</p>
                        ) : (
                            <div className="space-y-3">
                                {data.scoreDistribution.map((bucket) => {
                                    const pct = (bucket.count / maxBucketCount) * 100;
                                    return (
                                        <div key={bucket.range} className="flex items-center gap-3">
                                            <span className="text-xs text-slate-500 w-14 text-right font-mono">{bucket.range}</span>
                                            <div className="flex-1 bg-slate-800 rounded-full h-5 overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                                                    style={{ width: `${pct}%` }}
                                                >
                                                    {bucket.count > 0 && (
                                                        <span className="text-white text-[0.6rem] font-bold">{bucket.count}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-xs text-slate-600 w-5 text-right">{bucket.count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Pass / Fail donut */}
                    <div className={`rounded-2xl border backdrop-blur-sm p-6 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-700/60 bg-slate-900/60'}`}>
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-5">Pass / Fail Split</h2>
                        {data.gradedCount === 0 ? (
                            <p className="text-center text-slate-600 py-12">No graded submissions yet</p>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-6 py-2">
                                {/* SVG donut */}
                                <div className="relative w-36 h-36">
                                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                        {/* Track */}
                                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#1e293b" strokeWidth="4" />
                                        {/* Fail arc (full background in red) */}
                                        <circle cx="18" cy="18" r="15.915" fill="none"
                                            stroke="#ef4444" strokeWidth="4"
                                            strokeDasharray="100 0"
                                            strokeLinecap="round"
                                        />
                                        {/* Pass arc (overlays fail) */}
                                        <circle cx="18" cy="18" r="15.915" fill="none"
                                            stroke="url(#passGrad)" strokeWidth="4"
                                            strokeDasharray={`${data.passRate} ${100 - data.passRate}`}
                                            strokeLinecap="round"
                                        />
                                        <defs>
                                            <linearGradient id="passGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#34d399" />
                                                <stop offset="100%" stopColor="#06b6d4" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className={`text-2xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>{data.passRate}%</span>
                                        <span className="text-[0.6rem] text-slate-500 uppercase tracking-wider">pass rate</span>
                                    </div>
                                </div>
                                <div className="flex gap-8">
                                    <div className="text-center">
                                        <div className="flex items-center gap-1.5 justify-center mb-1">
                                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                            <p className="text-xs font-semibold text-slate-300">Passed</p>
                                        </div>
                                        <p className="text-xl font-bold text-emerald-400">{passCount}</p>
                                        <p className="text-[0.65rem] text-slate-600">students</p>
                                    </div>
                                    <div className="w-px bg-slate-800" />
                                    <div className="text-center">
                                        <div className="flex items-center gap-1.5 justify-center mb-1">
                                            <span className="h-2 w-2 rounded-full bg-red-400" />
                                            <p className="text-xs font-semibold text-slate-300">Failed</p>
                                        </div>
                                        <p className="text-xl font-bold text-red-400">{failCount}</p>
                                        <p className="text-[0.65rem] text-slate-600">students</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Per-question table */}
                <div className={`rounded-2xl border backdrop-blur-sm overflow-hidden mb-16 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-700/60 bg-slate-900/60'}`}>
                    <div className="px-6 py-5 border-b border-slate-800">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Per-Question Performance</h2>
                        <p className="text-xs text-slate-600 mt-0.5">How students performed on each question</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-800">
                                    {['Q#', 'Type', 'Max Pts', 'Avg Score', 'Attempts', 'Full Credit', 'Performance'].map((h, i) => (
                                        <th key={h} className={`px-5 py-3 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-500 ${i >= 2 && i <= 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.questionStats.map((q, i) => {
                                    const perfColor = q.fullCreditPct >= 70 ? 'bg-emerald-500' : q.fullCreditPct >= 40 ? 'bg-yellow-500' : 'bg-red-500';
                                    const textColor = q.fullCreditPct >= 70 ? 'text-emerald-400' : q.fullCreditPct >= 40 ? 'text-yellow-400' : 'text-red-400';
                                    const isManual = q.type === 'ESSAY' || q.type === 'CODE';
                                    return (
                                        <tr key={q.questionNumber}
                                            className={`border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-900/30'}`}>
                                            <td className="px-5 py-3.5 font-bold text-cyan-400 font-mono">Q{q.questionNumber}</td>
                                            <td className="px-5 py-3.5">
                                                <span className={`px-2 py-0.5 rounded-md text-[0.65rem] font-semibold border ${isManual
                                                    ? 'border-orange-500/30 bg-orange-500/10 text-orange-400'
                                                    : 'border-violet-500/30 bg-violet-500/10 text-violet-400'
                                                    }`}>
                                                    {q.type.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right text-slate-400 font-mono">{q.maxPoints}</td>
                                            <td className="px-5 py-3.5 text-right font-bold text-slate-200">{q.avgScore}</td>
                                            <td className="px-5 py-3.5 text-right text-slate-500">{q.attemptCount}</td>
                                            <td className="px-5 py-3.5 text-right">
                                                <span className={`font-bold ${textColor}`}>{q.fullCreditPct}%</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="w-28 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-500 ${perfColor}`}
                                                        style={{ width: `${q.fullCreditPct}%` }} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {data.questionStats.length === 0 && (
                            <p className="text-center text-slate-600 py-10">No question data available</p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <footer className={`flex items-center justify-between border-t pt-4 text-[0.65rem] ${theme === 'light' ? 'border-slate-200 text-slate-500' : 'border-slate-800/80 text-slate-700'}`}>
                    <span>© {new Date().getFullYear()} Procto. Built for secure online exams.</span>
                    <span className="hidden sm:inline">Designed for performance · React · TypeScript</span>
                </footer>
            </div>
        </main>
    );
}
