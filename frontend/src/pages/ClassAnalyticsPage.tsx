import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';

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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4 animate-pulse">📊</div>
                    <p className="text-xl text-gray-600">Crunching the numbers...</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const maxBucketCount = Math.max(...data.scoreDistribution.map((b) => b.count), 1);

    return (
        <div className="min-h-screen bg-gray-50">
            <Toaster position="top-right" />

            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/grading')} className="text-gray-500 hover:text-gray-800 text-sm">
                            ← Back to Grading
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">📊 Class Analytics</h1>
                            <p className="text-sm text-gray-500">{data.exam.title} · {data.exam.course.code}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(`/grading`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition"
                    >
                        Grade Students →
                    </button>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-4 py-8">
                {/* Stats cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    {[
                        { label: 'Submissions', value: data.totalSubmissions, color: 'blue' },
                        { label: 'Graded', value: data.gradedCount, color: 'indigo' },
                        { label: 'Avg Score', value: `${data.avgScore}%`, color: 'yellow' },
                        { label: 'Highest', value: `${data.highestScore}%`, color: 'green' },
                        { label: 'Lowest', value: `${data.lowestScore}%`, color: 'red' },
                        { label: 'Pass Rate', value: `${data.passRate}%`, color: 'emerald' },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-white rounded-xl shadow p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                            <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid lg:grid-cols-2 gap-6 mb-8">
                    {/* Score Distribution */}
                    <div className="bg-white rounded-xl shadow p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-6">Score Distribution</h2>
                        {data.gradedCount === 0 ? (
                            <p className="text-center text-gray-400 py-8">No graded submissions yet</p>
                        ) : (
                            <div className="space-y-3">
                                {data.scoreDistribution.map((bucket) => (
                                    <div key={bucket.range} className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500 w-16 text-right">{bucket.range}</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                                                style={{ width: `${(bucket.count / maxBucketCount) * 100}%` }}
                                            >
                                                {bucket.count > 0 && (
                                                    <span className="text-white text-xs font-bold">{bucket.count}</span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-400 w-6">{bucket.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pass / Fail donut */}
                    <div className="bg-white rounded-xl shadow p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-6">Pass / Fail Split</h2>
                        {data.gradedCount === 0 ? (
                            <p className="text-center text-gray-400 py-8">No graded submissions yet</p>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-6">
                                <div className="relative w-40 h-40">
                                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#fee2e2" strokeWidth="3.5" />
                                        <circle
                                            cx="18" cy="18" r="15.915" fill="none"
                                            stroke="#22c55e" strokeWidth="3.5"
                                            strokeDasharray={`${data.passRate} ${100 - data.passRate}`}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-2xl font-bold text-gray-800">{data.passRate}%</span>
                                    </div>
                                </div>
                                <div className="flex gap-8">
                                    <div className="text-center">
                                        <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-1" />
                                        <p className="text-sm font-semibold">Passed</p>
                                        <p className="text-gray-500 text-xs">{Math.round((data.passRate / 100) * data.gradedCount)} students</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-3 h-3 bg-red-200 rounded-full mx-auto mb-1" />
                                        <p className="text-sm font-semibold">Failed</p>
                                        <p className="text-gray-500 text-xs">{Math.round(((100 - data.passRate) / 100) * data.gradedCount)} students</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Per-question table */}
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <div className="p-6 border-b">
                        <h2 className="text-lg font-bold text-gray-800">Per-Question Performance</h2>
                        <p className="text-sm text-gray-500 mt-1">How students performed on each question</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-6 py-3 text-left">Q#</th>
                                    <th className="px-6 py-3 text-left">Type</th>
                                    <th className="px-6 py-3 text-right">Max Pts</th>
                                    <th className="px-6 py-3 text-right">Avg Score</th>
                                    <th className="px-6 py-3 text-right">Attempts</th>
                                    <th className="px-6 py-3 text-right">Full Credit</th>
                                    <th className="px-6 py-3 text-left">Performance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.questionStats.map((q) => (
                                    <tr key={q.questionNumber} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-bold text-gray-700">Q{q.questionNumber}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${q.type === 'ESSAY' || q.type === 'CODE'
                                                    ? 'bg-orange-100 text-orange-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {q.type.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-600">{q.maxPoints}</td>
                                        <td className="px-6 py-4 text-right font-semibold">{q.avgScore}</td>
                                        <td className="px-6 py-4 text-right text-gray-600">{q.attemptCount}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-semibold ${q.fullCreditPct >= 70 ? 'text-green-600' : q.fullCreditPct >= 40 ? 'text-yellow-600' : 'text-red-600'
                                                }`}>
                                                {q.fullCreditPct}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="w-32 bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${q.fullCreditPct >= 70 ? 'bg-green-500' : q.fullCreditPct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}
                                                    style={{ width: `${q.fullCreditPct}%` }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {data.questionStats.length === 0 && (
                            <p className="text-center text-gray-400 py-8">No question data available</p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
