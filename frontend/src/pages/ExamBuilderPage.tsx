import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';

interface Exam {
  id: string;
  title: string;
  durationMinutes: number;
  startAt: string;
  endAt: string;
  status: string;
  isPublished: boolean;
  _count: { examQuestions: number; examSessions: number };
}

interface Question {
  id: string;
  type: string;
  content: any;
  points: number;
  difficulty?: string;
  topicTags: string[];
}

// ── Shared dark-theme input class ────────────────────────────────────────────
const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-800/70 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/60 transition';
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5';

export default function ExamBuilderPage() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddQuestionsModal, setShowAddQuestionsModal] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    instructions: '',
    durationMinutes: 60,
    startAt: '',
    endAt: '',
    shuffleQuestions: true,
    shuffleChoices: true,
    maxAttempts: 1,
    passThreshold: 60,
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!courseId) { toast.error('No course selected'); navigate('/faculty'); return; }
    fetchExams();
    fetchQuestions();
  }, [courseId, navigate]);

  const fetchExams = async () => {
    try {
      const res = await api.get(`/exams?courseId=${courseId}`);
      setExams(res.data.exams);
    } catch { toast.error('Failed to load exams'); }
  };

  const fetchQuestions = async () => {
    try {
      const res = await api.get(`/questions?courseId=${courseId}`);
      setQuestions(res.data.questions);
    } catch { /* silent */ }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/exams', {
        courseId,
        title: formData.title,
        instructions: formData.instructions,
        durationMinutes: formData.durationMinutes,
        startAt: new Date(formData.startAt).toISOString(),
        endAt: new Date(formData.endAt).toISOString(),
        proctoringLevel: 'STANDARD',
        rules: {
          shuffleQuestions: formData.shuffleQuestions,
          shuffleChoices: formData.shuffleChoices,
          maxAttempts: formData.maxAttempts,
          negativeMarkingFactor: 0,
          passThreshold: formData.passThreshold,
          allowCalculator: false,
          allowFormulaSheet: false,
        },
      });
      toast.success('Exam created!');
      setShowCreateModal(false);
      resetForm();
      fetchExams();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create exam');
    } finally { setLoading(false); }
  };

  const handleAddQuestions = async () => {
    if (selectedQuestions.length === 0) { toast.error('Select at least one question'); return; }
    setLoading(true);
    try {
      await api.post(`/exams/${selectedExamId}/questions`, { questionIds: selectedQuestions });
      toast.success(`${selectedQuestions.length} question(s) added!`);
      setShowAddQuestionsModal(false);
      setSelectedQuestions([]);
      fetchExams();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add questions');
    } finally { setLoading(false); }
  };

  const handlePublishExam = async (examId: string) => {
    if (!window.confirm('Publish this exam? Students will be able to see it.')) return;
    try {
      await api.post(`/exams/${examId}/publish`);
      toast.success('Exam published!');
      fetchExams();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to publish exam');
    }
  };

  const resetForm = () => setFormData({
    title: '', instructions: '', durationMinutes: 60, startAt: '', endAt: '',
    shuffleQuestions: true, shuffleChoices: true, maxAttempts: 1, passThreshold: 60,
  });

  const toggleQuestion = (id: string) =>
    setSelectedQuestions(prev => prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]);

  const getStatus = (exam: Exam) => {
    if (!exam.isPublished) return { label: 'DRAFT', cls: 'border-slate-600 bg-slate-800 text-slate-400' };
    const now = new Date(), start = new Date(exam.startAt), end = new Date(exam.endAt);
    if (now < start) return { label: 'SCHEDULED', cls: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400' };
    if (now <= end) return { label: 'LIVE', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' };
    return { label: 'ENDED', cls: 'border-slate-600 bg-slate-800 text-slate-500' };
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <Toaster position="top-right" toastOptions={{ style: { background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155' } }} />

      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-6 py-8 sm:px-8">

        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900/70 ring-1 ring-cyan-400/40 shadow-lg shadow-cyan-500/30">
              <span className="text-lg font-semibold text-cyan-300">P</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Procto</p>
              <p className="text-[0.65rem] text-slate-600">Exam Builder</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/faculty')}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-300 transition-colors group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </header>

        {/* Title row */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Exams</h1>
            <p className="text-sm text-slate-500 mt-0.5">{exams.length} exam{exams.length !== 1 ? 's' : ''} in this course</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-cyan-500 transition-all"
          >
            <span className="text-base leading-none">+</span> Create Exam
          </button>
        </div>

        {/* Exam grid */}
        {exams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-16 text-center">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No exams yet</h3>
            <p className="text-sm text-slate-500 mb-6">Create your first exam to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-cyan-500 transition-all"
            >
              Create Exam
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {exams.map((exam) => {
              const { label, cls } = getStatus(exam);
              return (
                <div key={exam.id} className="rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm p-6 hover:border-slate-600/60 transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors leading-tight">{exam.title}</h3>
                    <span className={`ml-3 shrink-0 text-[0.6rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${cls}`}>{label}</span>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-md border border-violet-500/30 bg-violet-500/10 text-violet-400">
                      {exam.durationMinutes} min
                    </span>
                    <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                      {exam._count.examQuestions} questions
                    </span>
                    <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                      {exam._count.examSessions} submissions
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 mb-5">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">▶</span>
                      <span>Starts {new Date(exam.startAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">■</span>
                      <span>Ends {new Date(exam.endAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-slate-800">
                    <button
                      onClick={() => { setSelectedExamId(exam.id); setShowAddQuestionsModal(true); }}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800/60 py-2 text-xs font-semibold text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300 transition-all"
                    >
                      Add Questions
                    </button>
                    {!exam.isPublished && exam._count.examQuestions > 0 && (
                      <button
                        onClick={() => handlePublishExam(exam.id)}
                        className="flex-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 py-2 text-xs font-semibold text-white hover:from-emerald-500 hover:to-teal-500 transition-all shadow shadow-emerald-500/20"
                      >
                        Publish →
                      </button>
                    )}
                    {exam.isPublished && (
                      <div className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 text-center text-xs font-semibold text-emerald-400">
                        Published ✓
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Exam Modal ─────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl my-8 rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/60 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-100">Create New Exam</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="text-slate-500 hover:text-slate-300 text-2xl leading-none transition-colors">×</button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-5">
              <div>
                <label className={labelCls}>Exam Title *</label>
                <input type="text" value={formData.title} required placeholder="e.g., Midterm Exam"
                  onChange={e => setFormData({ ...formData, title: e.target.value })} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Instructions (optional)</label>
                <textarea value={formData.instructions} rows={3} placeholder="Special instructions for students..."
                  onChange={e => setFormData({ ...formData, instructions: e.target.value })} className={inputCls} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Duration (min) *</label>
                  <input type="number" min="1" required value={formData.durationMinutes}
                    onChange={e => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Max Attempts *</label>
                  <input type="number" min="1" max="5" required value={formData.maxAttempts}
                    onChange={e => setFormData({ ...formData, maxAttempts: parseInt(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Pass % *</label>
                  <input type="number" min="0" max="100" required value={formData.passThreshold}
                    onChange={e => setFormData({ ...formData, passThreshold: parseInt(e.target.value) })} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Start Date & Time *</label>
                  <input type="datetime-local" required value={formData.startAt}
                    onChange={e => setFormData({ ...formData, startAt: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>End Date & Time *</label>
                  <input type="datetime-local" required value={formData.endAt}
                    onChange={e => setFormData({ ...formData, endAt: e.target.value })} className={inputCls} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={formData.shuffleQuestions}
                    onChange={e => setFormData({ ...formData, shuffleQuestions: e.target.checked })}
                    className="w-4 h-4 accent-cyan-500" />
                  <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">Shuffle question order for each student</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={formData.shuffleChoices}
                    onChange={e => setFormData({ ...formData, shuffleChoices: e.target.checked })}
                    className="w-4 h-4 accent-cyan-500" />
                  <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">Shuffle answer choices in MCQs</span>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800/60 py-2.5 text-sm font-semibold text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 transition-all">
                  {loading ? 'Creating…' : 'Create Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Questions Modal ───────────────────────────────────────────── */}
      {showAddQuestionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl my-8 rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/60 max-h-[90vh] overflow-y-auto">
            {/* Sticky header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-5 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Add Questions to Exam</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="text-cyan-400 font-bold">{selectedQuestions.length}</span> selected
                </p>
              </div>
              <button onClick={() => { setShowAddQuestionsModal(false); setSelectedQuestions([]); }}
                className="text-slate-500 hover:text-slate-300 text-2xl leading-none transition-colors">×</button>
            </div>

            <div className="p-8">
              {questions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 mb-5">No questions yet. Create questions in the Question Bank first!</p>
                  <button onClick={() => navigate(`/questions?courseId=${courseId}`)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-violet-500 hover:to-cyan-500 transition-all">
                    Go to Question Bank →
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {questions.map((q) => {
                      const selected = selectedQuestions.includes(q.id);
                      return (
                        <div key={q.id} onClick={() => toggleQuestion(q.id)}
                          className={`rounded-xl border p-4 cursor-pointer transition-all ${selected
                            ? 'border-cyan-500/60 bg-cyan-500/10'
                            : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600'
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${selected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600'}`}>
                              {selected && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-violet-500/30 bg-violet-500/10 text-violet-400">
                                  {q.type.replace(/_/g, ' ')}
                                </span>
                                <span className="text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                                  {q.points} pts
                                </span>
                                {q.difficulty && (
                                  <span className="text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-600 bg-slate-800 text-slate-400">
                                    {q.difficulty}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-300 leading-snug">{q.content.question}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 sticky bottom-0 bg-slate-900 pt-4 border-t border-slate-800 -mx-8 px-8 pb-1">
                    <button onClick={() => { setShowAddQuestionsModal(false); setSelectedQuestions([]); }}
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-800/60 py-2.5 text-sm font-semibold text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-all">
                      Cancel
                    </button>
                    <button onClick={handleAddQuestions} disabled={loading || selectedQuestions.length === 0}
                      className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-cyan-500 disabled:opacity-40 transition-all">
                      {loading ? 'Adding…' : `Add ${selectedQuestions.length} Question(s)`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
