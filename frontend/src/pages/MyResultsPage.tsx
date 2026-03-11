import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';

interface CompletedExam {
  id: string; submittedAt: string; status: string;
  exam: {
    id: string; title: string; durationMinutes: number;
    course: { name: string; code: string };
  };
  result: { totalScore: number; percentage: number; passStatus: boolean; finalizedAt: string | null } | null;
  _count: { suspiciousEvents: number };
}

export default function MyResultsPage() {
  const [results, setResults] = useState<CompletedExam[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchResults(); }, []);

  const fetchResults = async () => {
    try {
      const res = await api.get('/results/my-results');
      setResults(res.data.results);
    } catch (err: any) {
      console.error('Fetch results error:', err);
      toast.error('Failed to load results');
    } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const graded = results.filter(r => r.result);
  const passedCount = graded.filter(r => r.result?.passStatus).length;
  const failedCount = graded.filter(r => r.result?.passStatus === false).length;
  const avgScore = graded.length > 0
    ? graded.reduce((s, r) => s + (r.result?.percentage || 0), 0) / graded.length
    : 0;

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
        </header>

        {/* Back + title */}
        <button onClick={() => navigate('/student')}
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-emerald-400 transition-colors mt-8 group">
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to dashboard
        </button>

        <div className="mt-4">
          <h1 className="text-2xl font-bold text-white">My Results</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{results.length} exam{results.length !== 1 ? 's' : ''} completed</p>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Exams', value: results.length, color: 'text-white' },
            { label: 'Passed', value: passedCount, color: 'text-emerald-400' },
            { label: 'Failed', value: failedCount, color: 'text-red-400' },
            { label: 'Average Score', value: `${avgScore.toFixed(1)}%`, color: avgScore >= 60 ? 'text-emerald-400' : 'text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-sm p-5">
              <p className="text-xs text-neutral-500 mb-1">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Results list */}
        <section className="mt-8 pb-16">
          {results.length === 0 ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-sm p-16 text-center">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="font-semibold text-neutral-200 mb-2">No results yet</h3>
              <p className="text-sm text-neutral-600">Complete exams to see your results here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map(exam => (
                <button key={exam.id} onClick={() => navigate(`/result/${exam.id}`)}
                  className="group w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-sm p-5 text-left hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-base font-semibold text-white group-hover:text-emerald-400 transition-colors">
                          {exam.exam.title}
                        </h3>
                        {exam.status === 'INVALIDATED' && (
                          <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-medium">
                            INVALIDATED
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-neutral-500 mb-2">
                        {exam.exam.course.name}
                        <span className="inline-block mx-1.5 font-mono text-neutral-600">·</span>
                        <span className="font-mono text-neutral-600">{exam.exam.course.code}</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600">
                        <span>📅 {new Date(exam.submittedAt).toLocaleString()}</span>
                        <span>⏱ {exam.exam.durationMinutes} min</span>
                        {exam._count.suspiciousEvents > 0 && (
                          <span className="text-yellow-500/80">⚠️ {exam._count.suspiciousEvents} event(s)</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {exam.result && exam.result.finalizedAt ? (
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`text-3xl font-bold ${exam.result.passStatus ? 'text-emerald-400' : 'text-red-400'}`}>
                            {exam.result.percentage.toFixed(1)}%
                          </span>
                          <span className={`text-[0.65rem] px-2.5 py-0.5 rounded-full font-medium border ${exam.result.passStatus
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                            }`}>
                            {exam.result.passStatus ? '✓ PASSED' : '✗ FAILED'}
                          </span>
                          <span className="text-xs text-neutral-600">{exam.result.totalScore} pts</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-medium">
                            ⏳ Pending
                          </span>
                          <span className="text-[0.65rem] text-neutral-600">Awaiting grading</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-800 flex justify-end">
                    <span className="text-xs text-neutral-600 group-hover:text-emerald-400 transition-colors">
                      View Details →
                    </span>
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
    </main>
  );
}
