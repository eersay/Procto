import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { api } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '../hooks/useTheme';

interface Question {
  id: string;
  type: string;
  content: any;
  points: number;
  difficulty?: string;
  topicTags: string[];
  createdAt: string;
}

const inputBaseCls =
  'w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/60 transition';
const labelBaseCls = 'block text-xs font-semibold uppercase tracking-wider mb-1.5';

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
  const { theme, toggleTheme } = useTheme();
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

  // ── AI Generate State ────────────────────────────────────────────────────
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiForm, setAIForm] = useState({
    topic: '',
    questionTypes: ['MULTIPLE_CHOICE'] as string[],
    difficulty: 'MEDIUM',
    count: 5,
  });
  const [aiLoading, setAILoading] = useState(false);
  const [aiPreview, setAIPreview] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  const AI_TYPES = [
    { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
    { value: 'MULTIPLE_SELECT', label: 'Multiple Select' },
    { value: 'TRUE_FALSE', label: 'True / False' },
    { value: 'SHORT_ANSWER', label: 'Short Answer' },
    { value: 'FILL_BLANK', label: 'Fill in the Blank' },
    { value: 'NUMERICAL', label: 'Numerical' },
  ];

  const toggleAIType = (t: string) =>
    setAIForm(f => ({
      ...f,
      questionTypes: f.questionTypes.includes(t)
        ? f.questionTypes.filter(x => x !== t)
        : [...f.questionTypes, t],
    }));

  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    setAILoading(true);
    setAIPreview([]);
    setSelected(new Set());
    try {
      const res = await api.post('/questions/ai-generate', {
        courseId,
        topic: aiForm.topic.trim(),
        count: aiForm.count,
        questionTypes: aiForm.questionTypes,
        difficulty: aiForm.difficulty,
      });
      const qs: any[] = res.data.questions;
      setAIPreview(qs);
      setSelected(new Set(qs.map((_, i) => i)));
      toast.success(`Generated ${qs.length} question${qs.length !== 1 ? 's' : ''}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'AI generation failed. Please try again.');
    } finally {
      setAILoading(false);
    }
  };

  const handleImportSelected = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    try {
      const toImport = aiPreview.filter((_, i) => selected.has(i));
      await api.post('/questions/import', { courseId, questions: toImport });
      toast.success(`${toImport.length} question${toImport.length !== 1 ? 's' : ''} imported!`);
      setShowAIModal(false);
      setAIPreview([]);
      setSelected(new Set());
      setAIForm({ topic: '', questionTypes: ['MULTIPLE_CHOICE'], difficulty: 'MEDIUM', count: 5 });
      fetchQuestions();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

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
      } else if (formData.type === 'SHORT_ANSWER' || formData.type === 'FILL_BLANK') {
        content.correctAnswer = formData.correctAnswer;
        content.caseInsensitive = true;
      } else if (formData.type === 'NUMERICAL') {
        content.correctAnswer = parseFloat(formData.correctAnswer);
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

  const inputCls = `${inputBaseCls} ${
    theme === 'light'
      ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'
      : 'border-slate-700 bg-slate-800/70 text-slate-200 placeholder-slate-500'
  }`;
  const labelCls = `${labelBaseCls} ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`;

  return (
    <main className={`min-h-screen ${theme === 'light' ? 'bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900' : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100'}`}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: theme === 'light'
            ? { background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }
            : { background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155' },
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl px-6 py-8 sm:px-8">

        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-cyan-400/40 shadow-lg shadow-cyan-500/30 ${theme === 'light' ? 'bg-white' : 'bg-slate-900/70'}`}>
              <span className="text-lg font-semibold text-cyan-300">P</span>
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Procto</p>
              <p className={`text-[0.65rem] ${theme === 'light' ? 'text-slate-500' : 'text-slate-600'}`}>Question Bank</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg border transition-all ${
                theme === 'light'
                  ? 'bg-white border-slate-300 text-slate-600 hover:text-cyan-600'
                  : 'bg-slate-900/70 border-slate-700/60 text-slate-400 hover:text-cyan-300'
              }`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => navigate('/faculty')}
              className={`inline-flex items-center gap-2 text-sm transition-colors group ${theme === 'light' ? 'text-slate-600 hover:text-cyan-600' : 'text-slate-500 hover:text-cyan-300'}`}>
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>
        </header>

        {/* Title row */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className={`text-2xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>Questions</h1>
            <p className="text-sm text-slate-500 mt-0.5">{questions.length} question{questions.length !== 1 ? 's' : ''} in this course</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAIModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-5 py-2.5 text-sm font-semibold text-violet-300 hover:bg-violet-500/20 hover:border-violet-400/60 hover:text-violet-200 transition-all">
              ✨ AI Generate
            </button>
            <button onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-cyan-500 transition-all">
              <span className="text-base leading-none">+</span> Add Question
            </button>
          </div>
        </div>

        {/* Question list */}
        {questions.length === 0 ? (
          <div className={`rounded-2xl border border-dashed p-16 text-center ${theme === 'light' ? 'border-slate-300 bg-white/80' : 'border-slate-700 bg-slate-900/40'}`}>
            <div className="text-5xl mb-4">❓</div>
            <h3 className={`text-lg font-semibold mb-2 ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>No questions yet</h3>
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
                <div key={q.id} className={`rounded-2xl border backdrop-blur-sm p-6 transition-all group ${theme === 'light' ? 'border-slate-200 bg-white/90 hover:border-slate-300' : 'border-slate-700/60 bg-slate-900/60 hover:border-slate-600/60'}`}>
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
                      <p className={`text-sm font-medium leading-snug mb-3 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
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
                                : theme === 'light'
                                  ? 'bg-slate-100 border border-slate-300 text-slate-600'
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
                      <button className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${theme === 'light' ? 'border-slate-300 bg-slate-100 text-slate-600 hover:border-cyan-500/40 hover:text-cyan-600' : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300'}`}>
                        Edit
                      </button>
                      <button className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${theme === 'light' ? 'border-slate-300 bg-slate-100 text-slate-600 hover:border-red-500/40 hover:text-red-500' : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-red-500/40 hover:text-red-400'}`}>
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
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm ${theme === 'light' ? 'bg-slate-900/40' : 'bg-black/70'}`}>
          <div className={`relative w-full max-w-3xl my-8 rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto ${theme === 'light' ? 'border-slate-300 bg-white' : 'border-slate-700/60 bg-slate-900 shadow-black/60'}`}>

            {/* Sticky header */}
            <div className={`sticky top-0 z-10 flex items-center justify-between px-8 py-5 border-b backdrop-blur-sm ${theme === 'light' ? 'border-slate-200 bg-white/95' : 'border-slate-800 bg-slate-900/95'}`}>
              <h2 className={`text-lg font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>Create Question</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }}
                className={`text-2xl leading-none transition-colors ${theme === 'light' ? 'text-slate-500 hover:text-slate-800' : 'text-slate-500 hover:text-slate-300'}`}>×</button>
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
                  <option value="FILL_BLANK">Fill in the Blank</option>
                  <option value="NUMERICAL">Numerical</option>
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
                      <label key={val} className={`flex items-center gap-2 cursor-pointer text-sm ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                        <input type="radio" name="trueFalse" value={val} required className="accent-cyan-500"
                          checked={formData.correctAnswer === val}
                          onChange={e => setFormData({ ...formData, correctAnswer: e.target.value })} />
                        {val.charAt(0).toUpperCase() + val.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Text / Number answers */}
              {(formData.type === 'SHORT_ANSWER' || formData.type === 'FILL_BLANK' || formData.type === 'NUMERICAL') && (
                <div>
                  <label className={labelCls}>Expected Answer *</label>
                  <input type={formData.type === 'NUMERICAL' ? "number" : "text"} step={formData.type === 'NUMERICAL' ? "any" : undefined} required placeholder="Enter the expected answer…" value={formData.correctAnswer}
                    onChange={e => setFormData({ ...formData, correctAnswer: e.target.value })} className={inputCls} />
                  {formData.type !== 'NUMERICAL' && <p className={`text-[0.65rem] mt-1 ${theme === 'light' ? 'text-slate-500' : 'text-slate-600'}`}>Grading is case-insensitive</p>}
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
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-all ${theme === 'light' ? 'border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-400 hover:text-slate-900' : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}>
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

      {/* ── AI Generate Modal ─────────────────────────────────────────────── */}
      {showAIModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm ${theme === 'light' ? 'bg-slate-900/40' : 'bg-black/70'}`}>
          <div className={`relative w-full max-w-3xl my-8 rounded-2xl border shadow-2xl max-h-[92vh] overflow-y-auto ${theme === 'light' ? 'border-slate-300 bg-white' : 'border-slate-700/60 bg-slate-900 shadow-black/60'}`}>

            {/* Header */}
            <div className={`sticky top-0 z-10 flex items-center justify-between px-8 py-5 border-b backdrop-blur-sm ${theme === 'light' ? 'border-slate-200 bg-white/95' : 'border-slate-800 bg-slate-900/95'}`}>
              <div>
                <h2 className={`text-lg font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>✨ AI Question Generator</h2>
                <p className="text-xs text-slate-500 mt-0.5">Powered by Google Gemini</p>
              </div>
              <button onClick={() => { setShowAIModal(false); setAIPreview([]); setSelected(new Set()); }}
                className={`text-2xl leading-none transition-colors ${theme === 'light' ? 'text-slate-500 hover:text-slate-800' : 'text-slate-500 hover:text-slate-300'}`}>×</button>
            </div>

            <div className="p-8 space-y-6">

              {/* Generation form */}
              <form onSubmit={handleAIGenerate} className="space-y-5">
                {/* Topic */}
                <div>
                  <label className={labelCls}>Topic *</label>
                  <input
                    type="text" required
                    placeholder="e.g. Binary Search Trees, Photosynthesis, World War II…"
                    value={aiForm.topic}
                    onChange={e => setAIForm(f => ({ ...f, topic: e.target.value }))}
                    className={inputCls}
                  />
                </div>

                {/* Question Types */}
                <div>
                  <label className={labelCls}>Question Types * <span className="text-slate-600 normal-case tracking-normal">(select one or more)</span></label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {AI_TYPES.map(t => (
                      <label key={t.value}
                        className={`flex items-center gap-2.5 cursor-pointer rounded-lg border px-3 py-2 text-sm transition-all ${
                          aiForm.questionTypes.includes(t.value)
                            ? 'border-violet-500/60 bg-violet-500/10 text-violet-300'
                            : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                        }`}>
                        <input
                          type="checkbox"
                          className="accent-violet-500 w-3.5 h-3.5"
                          checked={aiForm.questionTypes.includes(t.value)}
                          onChange={() => toggleAIType(t.value)}
                        />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Difficulty + Count */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Difficulty</label>
                    <select value={aiForm.difficulty} onChange={e => setAIForm(f => ({ ...f, difficulty: e.target.value }))} className={inputCls}>
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Number of Questions (1–20)</label>
                    <div className={`flex items-center w-full rounded-lg border p-1 ${theme === 'light' ? 'border-slate-300 bg-slate-100' : 'border-slate-700 bg-slate-800/70'}`}>
                      <button
                        type="button"
                        onClick={() => setAIForm(f => ({ ...f, count: Math.max(1, f.count - 1) }))}
                        className={`flex items-center justify-center w-8 h-8 rounded shrink-0 transition-colors ${theme === 'light' ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-700/50 hover:bg-slate-600/60 text-slate-300'}`}
                        disabled={aiForm.count <= 1}
                      >
                        <span className="text-lg leading-none mb-0.5">−</span>
                      </button>
                      <div className={`flex-1 text-center font-semibold ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                        {aiForm.count}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAIForm(f => ({ ...f, count: Math.min(20, f.count + 1) }))}
                        className={`flex items-center justify-center w-8 h-8 rounded shrink-0 transition-colors ${theme === 'light' ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-700/50 hover:bg-slate-600/60 text-slate-300'}`}
                        disabled={aiForm.count >= 20}
                      >
                        <span className="text-lg leading-none mb-0.5">+</span>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={aiLoading || aiForm.questionTypes.length === 0}
                  className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {aiLoading ? (
                    <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Generating…</>
                  ) : '✨ Generate Questions'}
                </button>
              </form>

              {/* Preview panel */}
              {aiPreview.length > 0 && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>Preview — {aiPreview.length} generated</h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelected(new Set(aiPreview.map((_, i) => i)))}
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                        Select All
                      </button>
                      <span className="text-slate-700">·</span>
                      <button
                        type="button"
                        onClick={() => setSelected(new Set())}
                        className="text-xs text-slate-500 hover:text-slate-400 transition-colors">
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
                    {aiPreview.map((q, i) => (
                      <label key={i}
                        className={`flex items-start gap-3 cursor-pointer rounded-xl border p-4 transition-all ${
                          selected.has(i)
                            ? 'border-violet-500/40 bg-violet-500/5'
                            : 'border-slate-700/60 bg-slate-900/40 opacity-60'
                        }`}>
                        <input
                          type="checkbox"
                          className="accent-violet-500 mt-0.5 w-4 h-4 shrink-0"
                          checked={selected.has(i)}
                          onChange={() => setSelected(s => {
                            const next = new Set(s);
                            next.has(i) ? next.delete(i) : next.add(i);
                            return next;
                          })}
                        />
                        <div className="flex-1 min-w-0">
                          {/* Badges */}
                          <div className="flex flex-wrap gap-1.5 mb-1.5">
                            <span className="text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-violet-500/30 bg-violet-500/10 text-violet-400">
                              {(q.type || '').replace(/_/g, ' ')}
                            </span>
                            {q.difficulty && (
                              <span className={`text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${DIFF_COLORS[q.difficulty] ?? 'border-slate-600 bg-slate-800 text-slate-400'}`}>
                                {q.difficulty}
                              </span>
                            )}
                            <span className="text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                              {q.points ?? 1} pt{(q.points ?? 1) !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {/* Question */}
                          <p className={`text-sm leading-snug mb-2 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>{q.content?.question}</p>
                          {/* Options */}
                          {Array.isArray(q.content?.options) && q.content.options.length > 0 && (
                            <div className="grid sm:grid-cols-2 gap-1 mb-2">
                              {q.content.options.map((opt: string, oi: number) => {
                                const isCorrect = Array.isArray(q.content.correctAnswer)
                                  ? q.content.correctAnswer.includes(opt)
                                  : q.content.correctAnswer === opt;
                                return (
                                  <div key={oi} className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
                                    isCorrect
                                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                                      : theme === 'light'
                                        ? 'bg-slate-100 border border-slate-300 text-slate-600'
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
                          {/* Correct answer (non-MCQ) */}
                          {!Array.isArray(q.content?.options) && q.content?.correctAnswer !== undefined && (
                            <p className="text-xs text-emerald-400">✓ {String(q.content.correctAnswer)}</p>
                          )}
                          {/* Explanation */}
                          {q.content?.explanation && (
                            <p className="text-xs text-slate-500 mt-1.5 italic">💡 {q.content.explanation}</p>
                          )}
                          {/* Tags */}
                          {Array.isArray(q.topicTags) && q.topicTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {q.topicTags.map((tag: string, ti: number) => (
                                <span key={ti} className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-400">#{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Import action */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setShowAIModal(false); setAIPreview([]); setSelected(new Set()); }}
                      className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-all ${theme === 'light' ? 'border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-400 hover:text-slate-900' : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleImportSelected}
                      disabled={importing || selected.size === 0}
                      className="flex-[2] rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 transition-all">
                      {importing ? 'Importing…' : `Add ${selected.size} Selected to Bank`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
