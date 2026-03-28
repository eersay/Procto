import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

interface Breakdown {
    questionNumber: number;
    question: {
        id: string;
        type: string;
        content: any;
        points: number;
    };
    studentAnswer: any;
    autoScore: number;
    manualScore: number | null;
    finalScore: number;
    maxPoints: number;
}

interface Answer {
    id: string;
    questionId: string;
    autoScore: number;
    manualScore: number | null;
    question: { type: string; points: number };
}

export default function GradeSessionPage() {
    const { sessionId } = useParams<{ examId: string; sessionId: string }>();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const [session, setSession] = useState<any>(null);
    const [result, setResult] = useState<any>(null);
    const [breakdown, setBreakdown] = useState<Breakdown[]>([]);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [manualScores, setManualScores] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (sessionId) fetchData();
    }, [sessionId]);

    const fetchData = async () => {
        try {
            const resultRes = await api.get(`/results/${sessionId}`);
            setSession(resultRes.data.session);
            setResult(resultRes.data.result);
            setBreakdown(resultRes.data.breakdown);

            // Extract answers from the session data (included in getResultById)
            const answerList: Answer[] = (resultRes.data.session.answers || []).map((a: any) => ({
                id: a.id,
                questionId: a.questionId,
                autoScore: a.autoScore ?? 0,
                manualScore: a.manualScore ?? null,
                question: a.question,
            }));
            setAnswers(answerList);

            // Pre-fill existing manual scores
            const existing: Record<string, number> = {};
            for (const a of answerList) {
                if (a.manualScore != null) existing[a.id] = a.manualScore;
            }
            setManualScores(existing);
        } catch {
            toast.error('Failed to load session data');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (finalize: boolean) => {
        setSaving(true);
        const scores = Object.entries(manualScores).map(([answerId, manualScore]) => ({
            answerId,
            manualScore,
        }));

        try {
            const res = await api.post(`/results/faculty/session/${sessionId}/grade`, {
                scores,
                finalize,
            });
            setResult(res.data.result);
            toast.success(res.data.message);
        } catch {
            toast.error('Failed to save grades');
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async (publish: boolean) => {
        try {
            await api.patch(`/results/faculty/session/${sessionId}/publish`, { publish });
            setResult((prev: any) => ({ ...prev, isPublished: publish }));
            toast.success(publish ? 'Result published to student' : 'Result unpublished');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to update publish status');
        }
    };

    const getAnswerForQuestion = (questionId: string) =>
        answers.find((a) => a.questionId === questionId);

    const renderStudentAnswer = (bd: Breakdown) => {
        const { question, studentAnswer } = bd;
        if (studentAnswer === null || studentAnswer === undefined) {
            return <span className="text-gray-400 italic">No answer submitted</span>;
        }
        if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
            const opts = question.content?.options || [];
            const opt = opts.find((o: any) => o.id === studentAnswer || o.label === studentAnswer);
            return <span className="font-medium">{opt?.text || studentAnswer}</span>;
        }
        if (question.type === 'MULTIPLE_SELECT') {
            const opts = question.content?.options || [];
            const selected = Array.isArray(studentAnswer) ? studentAnswer : [];
            return (
                <ul className="list-disc list-inside">
                    {selected.map((id: string, i: number) => {
                        const opt = opts.find((o: any) => o.id === id || o.label === id);
                        return <li key={i}>{opt?.text || id}</li>;
                    })}
                </ul>
            );
        }
        return <p className="whitespace-pre-wrap">{String(studentAnswer)}</p>;
    };

    if (loading) {
        return (
            <div className={`min-h-screen ${theme === 'light' ? 'bg-gray-50' : 'bg-slate-950'} flex items-center justify-center`}>
                <div className="text-center">
                    <div className="text-6xl mb-4 animate-pulse">✍️</div>
                    <p className={`text-xl ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>Loading session...</p>
                </div>
            </div>
        );
    }

    const needsManualGrading = breakdown.some(
        (b) => (b.question.type === 'ESSAY' || b.question.type === 'CODE') && b.manualScore === null
    );

    return (
        <div className={`min-h-screen ${theme === 'light' ? 'bg-gray-50' : 'bg-slate-950 text-slate-100'}`}>
            <Toaster position="top-right" toastOptions={{ style: theme === 'light' ? { background: '#ffffff', color: '#0f172a', border: '1px solid #d1d5db' } : { background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155' } }} />

            {/* Top Bar */}
            <nav className={`shadow-sm border-b sticky top-0 z-10 ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-slate-900 border-slate-800'}`}>
                <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(`/grading`)} className={`text-sm ${theme === 'light' ? 'text-gray-500 hover:text-gray-800' : 'text-slate-400 hover:text-slate-100'}`}>
                            ← Back
                        </button>
                        {session && (
                            <div>
                                <p className={`font-bold ${theme === 'light' ? 'text-gray-900' : 'text-slate-100'}`}>
                                    {session.student.firstName} {session.student.lastName}
                                </p>
                                <p className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>{session.exam.title}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={toggleTheme} className={`p-2 rounded-lg transition-colors ${theme === 'light' ? 'bg-white border border-slate-300 text-amber-600 hover:bg-slate-100' : 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700'}`}>
                            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                        </button>
                        {/* Publish toggle */}
                        {result && (
                            <button
                                onClick={() => handlePublish(!result.isPublished)}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${result.isPublished
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {result.isPublished ? '✅ Published' : '🔒 Unpublished'} — Click to toggle
                            </button>
                        )}
                        <button
                            disabled={saving}
                            onClick={() => handleSave(false)}
                            className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-semibold transition disabled:opacity-50"
                        >
                            Save Draft
                        </button>
                        <button
                            disabled={saving}
                            onClick={() => handleSave(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save & Finalize'}
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid grid-cols-3 gap-6">
                    {/* Left sidebar — summary */}
                    <div className="col-span-1 space-y-4">
                        {/* Student info */}
                        {session && (
                            <div className={`rounded-xl shadow p-5 ${theme === 'light' ? 'bg-white' : 'bg-slate-900 border border-slate-800'}`}>
                                <h3 className={`font-bold mb-3 ${theme === 'light' ? 'text-gray-800' : 'text-slate-200'}`}>Student Info</h3>
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 mb-3">
                                    {session.student.firstName[0]}{session.student.lastName[0]}
                                </div>
                                <p className="font-semibold">{session.student.firstName} {session.student.lastName}</p>
                                <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>{session.student.email}</p>
                                <div className={`mt-3 pt-3 border-t text-sm ${theme === 'light' ? 'border-gray-200' : 'border-slate-800'}`}>
                                    <p className={theme === 'light' ? 'text-gray-500' : 'text-slate-400'}>Submitted</p>
                                    <p className="font-medium">{new Date(session.submittedAt).toLocaleString()}</p>
                                </div>
                                {session._count?.suspiciousEvents > 0 && (
                                    <div className={`mt-3 pt-3 border-t ${theme === 'light' ? 'border-gray-200' : 'border-slate-800'}`}>
                                        <p className="text-red-600 text-sm font-semibold">
                                            ⚠️ {session._count.suspiciousEvents} suspicious events
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Score summary */}
                        {result && (
                            <div className={`rounded-xl shadow p-5 ${theme === 'light' ? 'bg-white' : 'bg-slate-900 border border-slate-800'}`}>
                                <h3 className={`font-bold mb-3 ${theme === 'light' ? 'text-gray-800' : 'text-slate-200'}`}>Score Summary</h3>
                                <p className={`text-4xl font-bold mb-1 ${result.passStatus ? 'text-green-600' : 'text-red-600'}`}>
                                    {result.percentage.toFixed(1)}%
                                </p>
                                <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>{result.totalScore.toFixed(1)} points</p>
                                <span className={`mt-2 inline-block px-3 py-1 rounded-full text-sm font-semibold ${result.passStatus ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    {result.passStatus ? '✓ PASSED' : '✗ FAILED'}
                                </span>
                                {needsManualGrading && (
                                    <p className="mt-3 text-xs text-yellow-600 font-medium">
                                        ⚠️ Some essay questions still need manual scores
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right — question breakdown */}
                    <div className="col-span-2 space-y-4">
                        {breakdown.map((bd) => {
                            const answer = getAnswerForQuestion(bd.question.id);
                            const isManual = bd.question.type === 'ESSAY' || bd.question.type === 'CODE';
                            const currentScore = answer ? (manualScores[answer.id] ?? answer.manualScore ?? null) : null;

                            return (
                                <div
                                    key={bd.questionNumber}
                                    className={`${theme === 'light' ? 'bg-white border-gray-100' : 'bg-slate-900 border-slate-800'} rounded-xl shadow p-6 ${isManual && currentScore === null ? 'border-2 border-yellow-300' : 'border'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                                {bd.questionNumber}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded font-semibold ${isManual ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {bd.question.type.replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-sm text-gray-500">{bd.maxPoints} pts</span>
                                        </div>
                                        <div className="text-right">
                                            {isManual ? (
                                                <span className="text-sm text-gray-500">Manual grading required</span>
                                            ) : (
                                                <span className={`text-lg font-bold ${bd.autoScore >= bd.maxPoints ? 'text-green-600' : bd.autoScore > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                    {bd.autoScore}/{bd.maxPoints}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Question text */}
                                    <div className="mb-4">
                                        <p className="text-xs text-gray-400 uppercase mb-1">Question</p>
                                        <p className="text-gray-800">{bd.question.content?.text || bd.question.content?.question}</p>
                                    </div>

                                    {/* Correct answer (for objective) */}
                                    {!isManual && bd.question.content?.correctAnswer && (
                                        <div className="mb-4 bg-green-50 p-3 rounded-lg">
                                            <p className="text-xs text-green-600 font-semibold mb-1">Correct Answer</p>
                                            <p className="text-green-800 text-sm">{String(bd.question.content.correctAnswer)}</p>
                                        </div>
                                    )}

                                    {/* Student answer */}
                                    <div className="mb-4 bg-gray-50 p-3 rounded-lg">
                                        <p className="text-xs text-gray-400 uppercase mb-1">Student Answer</p>
                                        <div className="text-gray-800 text-sm">{renderStudentAnswer(bd)}</div>
                                    </div>

                                    {/* Manual score input */}
                                    {isManual && answer && (
                                        <div className="flex items-center gap-3 mt-4 pt-4 border-t">
                                            <label className="text-sm font-semibold text-gray-700">Score:</label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={bd.maxPoints}
                                                step={0.5}
                                                value={currentScore ?? ''}
                                                onChange={(e) =>
                                                    setManualScores((prev) => ({
                                                        ...prev,
                                                        [answer.id]: parseFloat(e.target.value) || 0,
                                                    }))
                                                }
                                                className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-center font-bold focus:outline-none focus:border-blue-500"
                                                placeholder="0"
                                            />
                                            <span className="text-sm text-gray-500">/ {bd.maxPoints}</span>
                                            {currentScore !== null && (
                                                <span className={`text-sm font-semibold ${currentScore >= bd.maxPoints ? 'text-green-600' : currentScore > 0 ? 'text-yellow-600' : 'text-red-600'
                                                    }`}>
                                                    {Math.round((currentScore / bd.maxPoints) * 100)}%
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
