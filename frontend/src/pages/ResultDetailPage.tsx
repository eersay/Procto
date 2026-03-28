import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { api } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '../hooks/useTheme';

interface QuestionBreakdown {
  questionNumber: number;
  question: { id: string; type: string; content: any; points: number };
  studentAnswer: any;
  autoScore: number;
  manualScore: number | null;
  finalScore: number;
  maxPoints: number;
}

interface ResultDetail {
  session: any;
  result: { totalScore: number; percentage: number; passStatus: boolean; finalizedAt: string | null } | null;
  breakdown: QuestionBreakdown[];
}

export default function ResultDetailPage() {
  const { theme, toggleTheme } = useTheme();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [result, setResult] = useState<ResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId) return;
    api.get(`/results/${sessionId}`)
      .then(r => setResult(r.data))
      .catch(err => { console.error(err); toast.error('Failed to load result'); })
      .finally(() => setLoading(false));
  }, [sessionId]);

  const renderAnswer = (breakdown: QuestionBreakdown) => {
    const { question, studentAnswer } = breakdown;
    if (!studentAnswer) return <span className={theme === 'light' ? 'text-slate-500 italic' : 'text-neutral-600 italic'}>Not answered</span>;
    switch (question.type) {
      case 'MULTIPLE_CHOICE': case 'TRUE_FALSE': case 'SHORT_ANSWER':
        return <span className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{studentAnswer}</span>;
      case 'MULTIPLE_SELECT':
        return <div className="space-y-1">{Array.isArray(studentAnswer) && studentAnswer.map((a: string, i: number) => <div key={i} className={theme === 'light' ? 'text-slate-900' : 'text-white'}>• {a}</div>)}</div>;
      case 'ESSAY':
        return <div className={`rounded-lg p-3 text-sm max-h-32 overflow-y-auto ${theme === 'light' ? 'bg-slate-100 text-slate-700' : 'bg-neutral-950/60 text-neutral-300'}`}>{studentAnswer}</div>;
      default:
        return <span className={theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}>{JSON.stringify(studentAnswer)}</span>;
    }
  };

  const renderCorrectAnswer = (breakdown: QuestionBreakdown) => {
    const correctAnswer = breakdown.question.content.correctAnswer;
    if (!correctAnswer || breakdown.question.type === 'ESSAY') return null;
    return (
      <div className="mt-2 text-sm">
        <span className="text-neutral-500">Correct answer: </span>
        <span className="font-semibold text-emerald-400">{Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer}</span>
      </div>
    );
  };

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${theme === 'light' ? 'bg-slate-50' : 'bg-neutral-950'}`}>
      <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
    </div>
  );

  if (!result || !result.result) return (
    <div className={`min-h-screen flex items-center justify-center ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-neutral-950 text-white'}`}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>
      <div className="relative text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-700 flex items-center justify-center mb-6 text-3xl">⏳</div>
        <h2 className="text-2xl font-bold mb-2">Result Pending</h2>
        <p className={`mb-6 ${theme === 'light' ? 'text-slate-500' : 'text-neutral-500'}`}>Your exam is being graded. Check back later!</p>
        <button onClick={() => navigate('/my-results')}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition">
          ← Back to Results
        </button>
      </div>
    </div>
  );

  const { session, result: examResult, breakdown } = result;
  const totalPoints = breakdown.reduce((s, b) => s + b.maxPoints, 0);
  const correctCount = breakdown.filter(b => b.finalScore === b.maxPoints && b.maxPoints > 0).length;
  const incorrectCount = breakdown.filter(b => b.finalScore === 0 && b.studentAnswer).length;
  const unansweredCount = breakdown.filter(b => !b.studentAnswer).length;

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

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -right-32 bottom-20 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />
      </div>
      <div className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage: theme === 'light'
            ? `repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(15,23,42,0.05) 2px,rgba(15,23,42,0.05) 4px)`
            : `repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(255,255,255,0.04) 2px,rgba(255,255,255,0.04) 4px)`,
        }} />

      <div className="relative mx-auto w-full px-6 py-8 sm:px-8 lg:px-12 xl:px-16 xl:py-12 max-w-5xl">

        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-500/20 ${theme === 'light' ? 'bg-white' : 'bg-neutral-900'}`}>
              <span className="text-lg font-semibold tracking-tight text-emerald-400">P</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className={`text-sm font-semibold uppercase tracking-[0.18em] ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>Procto</span>
              <span className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-neutral-600'}`}>Exam Results</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg border transition-all ${
                theme === 'light'
                  ? 'bg-white border-slate-300 text-slate-600 hover:text-emerald-600'
                  : 'bg-neutral-900/70 border-neutral-700/60 text-neutral-400 hover:text-emerald-400'
              }`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => navigate('/my-results')}
              className={`inline-flex items-center gap-2 text-sm transition-colors group ${theme === 'light' ? 'text-slate-500 hover:text-emerald-600' : 'text-neutral-500 hover:text-emerald-400'}`}>
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All Results
            </button>
          </div>
        </header>

        {/* Score Hero Card */}
        <div className="relative mb-8">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-transparent to-emerald-500/20 opacity-60 blur-xl" />
          <div className={`relative rounded-3xl border border-emerald-500/30 backdrop-blur-xl shadow-2xl p-8 ${theme === 'light' ? 'bg-white/95' : 'bg-neutral-900/90'}`}>
            <div className="text-center mb-8">
              <h1 className={`text-2xl sm:text-3xl font-bold mb-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{session.exam.title}</h1>
              <p className="text-neutral-500">{session.exam.course.name}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Score */}
              <div className={`rounded-2xl border p-6 text-center ${theme === 'light' ? 'border-slate-300 bg-slate-50' : 'border-neutral-800 bg-neutral-950/60'}`}>
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Your Score</p>
                <p className={`text-6xl font-bold mb-1 ${examResult.passStatus ? 'text-emerald-400' : 'text-red-400'}`}>
                  {examResult.percentage.toFixed(1)}%
                </p>
                <p className="text-sm text-neutral-500">{examResult.totalScore} / {totalPoints} points</p>
              </div>

              {/* Pass/Fail */}
              <div className={`rounded-2xl border p-6 flex flex-col items-center justify-center ${theme === 'light' ? 'border-slate-300 bg-slate-50' : 'border-neutral-800 bg-neutral-950/60'}`}>
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-4">Result</p>
                <span className={`text-2xl font-bold px-8 py-3 rounded-2xl border ${examResult.passStatus
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/40 text-red-400'
                  }`}>
                  {examResult.passStatus ? '✓ PASSED' : '✗ FAILED'}
                </span>
              </div>
            </div>

            {/* Mini stats */}
            <div className={`grid grid-cols-3 gap-4 pt-6 border-t ${theme === 'light' ? 'border-slate-200' : 'border-neutral-800'}`}>
              {[
                { label: 'Correct', value: correctCount, color: 'text-emerald-400' },
                { label: 'Incorrect', value: incorrectCount, color: 'text-red-400' },
                { label: 'Unanswered', value: unansweredCount, color: 'text-neutral-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-neutral-600 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Question Breakdown */}
        <h2 className={`text-lg font-semibold mb-4 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Question Breakdown</h2>
        <div className="space-y-4 pb-16">
          {breakdown.map(item => {
            const isCorrect = item.finalScore === item.maxPoints && item.maxPoints > 0;
            const isPartial = item.finalScore > 0 && item.finalScore < item.maxPoints;
            const borderColor = isCorrect ? 'border-l-emerald-500' : isPartial ? 'border-l-yellow-500' : 'border-l-red-500/60';
            const scoreColor = isCorrect ? 'text-emerald-400' : isPartial ? 'text-yellow-400' : 'text-red-400';

            return (
              <div key={item.question.id}
                className={`rounded-2xl border border-l-4 backdrop-blur-sm p-5 ${theme === 'light' ? 'border-slate-300 bg-white/90' : 'border-neutral-800 bg-neutral-900/60'} ${borderColor}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Q{item.questionNumber}</span>
                      <span className={`text-[0.65rem] px-2 py-0.5 rounded-full border uppercase tracking-wider ${theme === 'light' ? 'border-slate-300 bg-slate-100 text-slate-500' : 'border-neutral-700 bg-neutral-800 text-neutral-500'}`}>
                        {item.question.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className={`text-sm ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>{item.question.content.question}</p>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <div className={`text-xl font-bold ${scoreColor}`}>{item.finalScore} / {item.maxPoints}</div>
                    <div className="text-xs text-neutral-600">pts</div>
                  </div>
                </div>

                {/* MCQ Options */}
                {item.question.content.options && (
                  <div className="mt-3 space-y-2">
                    {item.question.content.options.map((option: string, idx: number) => {
                      const isStudentPick = Array.isArray(item.studentAnswer) ? item.studentAnswer.includes(option) : item.studentAnswer === option;
                      const isCorrectOpt = Array.isArray(item.question.content.correctAnswer) ? item.question.content.correctAnswer.includes(option) : item.question.content.correctAnswer === option;
                      const cls = isCorrectOpt && isStudentPick ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                        : isCorrectOpt ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400'
                          : isStudentPick ? 'border-red-500/60 bg-red-500/10 text-red-300'
                            : theme === 'light'
                              ? 'border-slate-300 bg-slate-50 text-slate-600'
                              : 'border-neutral-800 bg-neutral-950/40 text-neutral-500';
                      return (
                        <div key={idx} className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm ${cls}`}>
                          <span className="font-mono font-bold shrink-0">{String.fromCharCode(65 + idx)}.</span>
                          <span className="flex-1">{option}</span>
                          {isCorrectOpt && <span className="text-emerald-400 text-xs font-semibold shrink-0">✓ Correct</span>}
                          {isStudentPick && !isCorrectOpt && <span className="text-red-400 text-xs font-semibold shrink-0">✗ Yours</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Non-MCQ answer */}
                {!item.question.content.options && (
                  <div className="mt-3">
                    <p className="text-xs text-neutral-500 mb-1.5">Your Answer:</p>
                    <div className={`p-3 rounded-xl border text-sm ${isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                      {renderAnswer(item)}
                    </div>
                    {renderCorrectAnswer(item)}
                  </div>
                )}

                {/* Explanation */}
                {item.question.content.explanation && (
                  <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                    <p className="text-xs font-semibold text-blue-400 mb-1">💡 Explanation</p>
                    <p className="text-xs text-blue-300/80">{item.question.content.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <footer className={`flex items-center justify-between border-t pt-4 text-[0.7rem] sm:text-xs ${theme === 'light' ? 'border-slate-300 text-slate-500' : 'border-neutral-800 text-neutral-600'}`}>
          <span>© {new Date().getFullYear()} Procto. Built for secure online exams.</span>
          <span className="hidden sm:inline">Designed for performance · React · TypeScript</span>
        </footer>
      </div>
    </main>
  );
}
