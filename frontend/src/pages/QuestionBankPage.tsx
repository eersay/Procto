import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';

interface Question {
  id: string;
  type: string;
  content: any;
  points: number;
  difficulty?: string;
  topicTags: string[];
  createdAt: string;
}

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-800/70 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/60 transition';
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5';

const TYPE_ICONS: Record<string, string> = {
  MULTIPLE_CHOICE: '⭕', MULTIPLE_SELECT: '☑️', TRUE_FALSE: '⇄',
  SHORT_ANSWER: '✍️', ESSAY: '📝', FILL_BLANK: '___', NUMERICAL: '🔢', CODE: '💻',
};

const DIFF_COLORS: Record<string, string> = {
  EASY: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  MEDIUM: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  HARD: 'border-red-500/30 bg-red-500/10 text-red-400',
};

export default function QuestionBankPage() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'MULTIPLE_CHOICE',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    correctAnswers: [] as string[],
    points: 1,
    difficulty: 'MEDIUM',
    topicTags: '',
    explanation: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!courseId) { toast.error('No course selected'); navigate('/faculty'); return; }
    fetchQuestions();
  }, [courseId, navigate]);

  const fetchQuestions = async () => {
    try {
      const res = await api.get(`/questions?courseId=${courseId}`);
      setQuestions(res.data.questions);
    } catch { toast.error('Failed to load questions'); }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const content: any = { question: formData.question, explanation: formData.explanation || undefined };
      if (formData.type === 'MULTIPLE_CHOICE') {
        content.options = formData.options.filter(o => o.trim());
        content.correctAnswer = formData.correctAnswer;
      } else if (formData.type === 'MULTIPLE_SELECT') {
        content.options = formData.options.filter(o => o.trim());
        content.correctAnswer = formData.correctAnswers;
      } else if (formData.type === 'TRUE_FALSE') {
        content.correctAnswer = formData.correctAnswer;
      } else if (formData.type === 'SHORT_ANSWER') {
        content.correctAnswer = formData.correctAnswer;
        content.caseInsensitive = true;
      }

      await api.post('/questions', {
        courseId,
        type: formData.type,
        content,
        points: formData.points,
        difficulty: formData.difficulty,
        topicTags: formData.topicTags ? formData.topicTags.split(',').map(t => t.trim()) : [],
      });
      toast.success('Question created!');
      setShowCreateModal(false);
      resetForm();
      fetchQuestions();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create question');
    } finally { setLoading(false); }
  };

  const resetForm = () => setFormData({
    type: 'MULTIPLE_CHOICE', question: '', options: ['', '', '', ''],
    correctAnswer: '', correctAnswers: [], points: 1, difficulty: 'MEDIUM', topicTags: '', explanation: '',
  });

  const addOption = () => setFormData({ ...formData, options: [...formData.options, ''] });
  const removeOption = (i: number) => setFormData({ ...formData, options: formData.options.filter((_, idx) => idx !== i) });
  const updateOption = (i: number, v: string) => {
    const opts = [...formData.options]; opts[i] = v;
    setFormData({ ...formData, options: opts });
  };
  const toggleCorrect = (opt: string) => {
    const answers = formData.correctAnswers.includes(opt)
      ? formData.correctAnswers.filter(a => a !== opt)
      : [...formData.correctAnswers, opt];
    setFormData({ ...formData, correctAnswers: answers });
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
              <p className="text-[0.65rem] text-slate-600">Question Bank</p>
            </div>
          </div>
          <button onClick={() => navigate('/faculty')}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-300 transition-colors group">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </header>

        {/* Title row */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Questions</h1>
            <p className="text-sm text-slate-500 mt-0.5">{questions.length} question{questions.length !== 1 ? 's' : ''} in this course</p>
          </div>
          <button onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-cyan-500 transition-all">
            <span className="text-base leading-none">+</span> Add Question
          </button>
        </div>

        {/* Question list */}
        {questions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-16 text-center">
            <div className="text-5xl mb-4">❓</div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No questions yet</h3>
            <p className="text-sm text-slate-500 mb-6">Create your first question to build your question bank</p>
            <button onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-cyan-500 transition-all">
              Add Question
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, i) => {
              const isManual = q.type === 'ESSAY' || q.type === 'CODE';
              return (
                <div key={q.id} className="rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm p-6 hover:border-slate-600/60 transition-all group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-lg">{TYPE_ICONS[q.type] || '❓'}</span>
                        <span className={`text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${isManual ? 'border-orange-500/30 bg-orange-500/10 text-orange-400' : 'border-violet-500/30 bg-violet-500/10 text-violet-400'}`}>
                          {q.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                          {q.points} {q.points === 1 ? 'pt' : 'pts'}
                        </span>
                        {q.difficulty && (
                          <span className={`text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${DIFF_COLORS[q.difficulty] ?? 'border-slate-600 bg-slate-800 text-slate-400'}`}>
                            {q.difficulty}
                          </span>
                        )}
                      </div>

                      {/* Question text */}
                      <p className="text-sm font-medium text-slate-200 leading-snug mb-3">
                        <span className="text-slate-500 mr-1">{i + 1}.</span>
                        {q.content.question}
                      </p>

                      {/* Options */}
                      {q.content.options && (
                        <div className="grid sm:grid-cols-2 gap-1.5 mb-3">
                          {q.content.options.map((opt: string, oi: number) => {
                            const isCorrect = Array.isArray(q.content.correctAnswer)
                              ? q.content.correctAnswer.includes(opt)
                              : q.content.correctAnswer === opt;
                            return (
                              <div key={oi} className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 ${isCorrect
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                                : 'bg-slate-800/60 border border-slate-700/60 text-slate-400'
                                }`}>
                                <span className="font-bold text-[0.6rem]">{String.fromCharCode(65 + oi)}</span>
                                <span className="truncate">{opt}</span>
                                {isCorrect && <span className="ml-auto text-emerald-400">✓</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Tags */}
                      {q.topicTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {q.topicTags.map((tag, ti) => (
                            <span key={ti} className="text-[0.6rem] font-semibold px-2 py-0.5 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-400">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 text-xs font-semibold text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300 transition-all">
                        Edit
                      </button>
                      <button className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 text-xs font-semibold text-slate-400 hover:border-red-500/40 hover:text-red-400 transition-all">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Question Modal ─────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl my-8 rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/60 max-h-[90vh] overflow-y-auto">

            {/* Sticky header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-5 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
              <h2 className="text-lg font-bold text-slate-100">Create Question</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="text-slate-500 hover:text-slate-300 text-2xl leading-none transition-colors">×</button>
            </div>

            <form onSubmit={handleCreateQuestion} className="p-8 space-y-6">

              {/* Type */}
              <div>
                <label className={labelCls}>Question Type *</label>
                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className={inputCls}>
                  <option value="MULTIPLE_CHOICE">Multiple Choice (Single Answer)</option>
                  <option value="MULTIPLE_SELECT">Multiple Select (Multiple Answers)</option>
                  <option value="TRUE_FALSE">True / False</option>
                  <option value="SHORT_ANSWER">Short Answer</option>
                  <option value="ESSAY">Essay (Manual Grading)</option>
                </select>
              </div>

              {/* Question text */}
              <div>
                <label className={labelCls}>Question *</label>
                <textarea value={formData.question} rows={3} required placeholder="Enter your question…"
                  onChange={e => setFormData({ ...formData, question: e.target.value })} className={inputCls} />
              </div>

              {/* MCQ / Multi-select options */}
              {(formData.type === 'MULTIPLE_CHOICE' || formData.type === 'MULTIPLE_SELECT') && (
                <div>
                  <label className={labelCls}>
                    Options * &nbsp;
                    <span className="text-slate-600 normal-case tracking-normal">
                      — {formData.type === 'MULTIPLE_CHOICE' ? 'select one correct answer' : 'check all correct answers'}
                    </span>
                  </label>
                  <div className="space-y-2">
                    {formData.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {formData.type === 'MULTIPLE_CHOICE' ? (
                          <input type="radio" name="correctAnswer" className="accent-cyan-500"
                            checked={formData.correctAnswer === opt}
                            onChange={() => setFormData({ ...formData, correctAnswer: opt })} />
                        ) : (
                          <input type="checkbox" className="accent-cyan-500 w-4 h-4"
                            checked={formData.correctAnswers.includes(opt)}
                            onChange={() => toggleCorrect(opt)} />
                        )}
                        <input type="text" value={opt} required placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                          onChange={e => updateOption(idx, e.target.value)} className={inputCls} />
                        {formData.options.length > 2 && (
                          <button type="button" onClick={() => removeOption(idx)}
                            className="px-2.5 py-2 rounded-lg border border-slate-700 text-slate-500 hover:border-red-500/40 hover:text-red-400 text-xs transition-all">✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addOption}
                    className="mt-2.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">+ Add Option</button>
                </div>
              )}

              {/* True / False */}
              {formData.type === 'TRUE_FALSE' && (
                <div>
                  <label className={labelCls}>Correct Answer *</label>
                  <div className="flex gap-4">
                    {['true', 'false'].map(val => (
                      <label key={val} className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                        <input type="radio" name="trueFalse" value={val} required className="accent-cyan-500"
                          checked={formData.correctAnswer === val}
                          onChange={e => setFormData({ ...formData, correctAnswer: e.target.value })} />
                        {val.charAt(0).toUpperCase() + val.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Short answer */}
              {formData.type === 'SHORT_ANSWER' && (
                <div>
                  <label className={labelCls}>Expected Answer *</label>
                  <input type="text" required placeholder="Enter the expected answer…" value={formData.correctAnswer}
                    onChange={e => setFormData({ ...formData, correctAnswer: e.target.value })} className={inputCls} />
                  <p className="text-[0.65rem] text-slate-600 mt-1">Grading is case-insensitive</p>
                </div>
              )}

              {/* Points + Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Points *</label>
                  <input type="number" required min="0.5" step="0.5" value={formData.points}
                    onChange={e => setFormData({ ...formData, points: parseFloat(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Difficulty</label>
                  <select value={formData.difficulty} onChange={e => setFormData({ ...formData, difficulty: e.target.value })} className={inputCls}>
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className={labelCls}>Topic Tags <span className="text-slate-600 normal-case tracking-normal">(comma-separated)</span></label>
                <input type="text" value={formData.topicTags} placeholder="e.g., loops, arrays, algorithms"
                  onChange={e => setFormData({ ...formData, topicTags: e.target.value })} className={inputCls} />
              </div>

              {/* Explanation */}
              <div>
                <label className={labelCls}>Explanation <span className="text-slate-600 normal-case tracking-normal">(optional)</span></label>
                <textarea value={formData.explanation} rows={2} placeholder="Explain the correct answer…"
                  onChange={e => setFormData({ ...formData, explanation: e.target.value })} className={inputCls} />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800/60 py-2.5 text-sm font-semibold text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 transition-all">
                  {loading ? 'Creating…' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
