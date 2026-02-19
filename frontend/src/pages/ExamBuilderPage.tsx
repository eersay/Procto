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
  _count: {
    examQuestions: number;
    examSessions: number;
  };
}

interface Question {
  id: string;
  type: string;
  content: any;
  points: number;
  difficulty?: string;
  topicTags: string[];
}

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
    if (!courseId) {
      toast.error('No course selected');
      navigate('/faculty');
      return;
    }
    fetchExams();
    fetchQuestions();
  }, [courseId, navigate]);

  const fetchExams = async () => {
    try {
      const response = await api.get(`/exams?courseId=${courseId}`);
      setExams(response.data.exams);
    } catch (error: any) {
      console.error('Fetch exams error:', error);
      toast.error('Failed to load exams');
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await api.get(`/questions?courseId=${courseId}`);
      setQuestions(response.data.questions);
    } catch (error: any) {
      console.error('Fetch questions error:', error);
    }
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

      toast.success('Exam created successfully!');
      setShowCreateModal(false);
      resetForm();
      fetchExams();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to create exam';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestions = async () => {
    if (selectedQuestions.length === 0) {
      toast.error('Please select at least one question');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/exams/${selectedExamId}/questions`, {
        questionIds: selectedQuestions,
      });

      toast.success(`${selectedQuestions.length} question(s) added to exam!`);
      setShowAddQuestionsModal(false);
      setSelectedQuestions([]);
      fetchExams();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to add questions';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishExam = async (examId: string) => {
    if (!window.confirm('Publish this exam? Students will be able to see it.')) {
      return;
    }

    try {
      await api.post(`/exams/${examId}/publish`);
      toast.success('Exam published successfully!');
      fetchExams();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to publish exam';
      toast.error(message);
    }
  };

  const resetForm = () => {
    setFormData({
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
  };

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const getStatusColor = (exam: Exam) => {
    if (!exam.isPublished) return 'bg-gray-100 text-gray-700';
    const now = new Date();
    const start = new Date(exam.startAt);
    const end = new Date(exam.endAt);
    
    if (now < start) return 'bg-blue-100 text-blue-700';
    if (now >= start && now <= end) return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (exam: Exam) => {
    if (!exam.isPublished) return 'DRAFT';
    const now = new Date();
    const start = new Date(exam.startAt);
    const end = new Date(exam.endAt);
    
    if (now < start) return 'SCHEDULED';
    if (now >= start && now <= end) return 'ACTIVE';
    return 'COMPLETED';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/faculty')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-blue-600">Exam Builder</h1>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Exams</h2>
            <p className="text-gray-600">{exams.length} exams in this course</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            + Create Exam
          </button>
        </div>

        {exams.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">No exams yet</h3>
            <p className="text-gray-600 mb-6">Create your first exam to test students</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Create Exam
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {exams.map((exam) => (
              <div key={exam.id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{exam.title}</h3>
                    <div className="flex gap-2 mb-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${getStatusColor(exam)}`}>
                        {getStatusText(exam)}
                      </span>
                      <span className="text-xs font-semibold px-2 py-1 bg-purple-100 text-purple-700 rounded">
                        {exam.durationMinutes} min
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>Start: {new Date(exam.startAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🏁</span>
                    <span>End: {new Date(exam.endAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-3 border-t border-b mb-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold text-blue-600">{exam._count.examQuestions}</span> questions
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold text-green-600">{exam._count.examSessions}</span> submissions
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedExamId(exam.id);
                      setShowAddQuestionsModal(true);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm"
                  >
                    Add Questions
                  </button>
                  
                  {!exam.isPublished && exam._count.examQuestions > 0 && (
                    <button
                      onClick={() => handlePublishExam(exam.id)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                    >
                      Publish
                    </button>
                  )}
                  
                  {exam.isPublished && (
                    <button
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg cursor-not-allowed text-sm"
                      disabled
                    >
                      Published ✓
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8 my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Create New Exam</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateExam} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Midterm Exam"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructions (Optional)
                </label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Special instructions for students..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (min) *
                  </label>
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Attempts *
                  </label>
                  <input
                    type="number"
                    value={formData.maxAttempts}
                    onChange={(e) => setFormData({ ...formData, maxAttempts: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pass % *
                  </label>
                  <input
                    type="number"
                    value={formData.passThreshold}
                    onChange={(e) => setFormData({ ...formData, passThreshold: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startAt}
                    onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endAt}
                    onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.shuffleQuestions}
                    onChange={(e) => setFormData({ ...formData, shuffleQuestions: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Shuffle question order for each student</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.shuffleChoices}
                    onChange={(e) => setFormData({ ...formData, shuffleChoices: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Shuffle answer choices in MCQs</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {loading ? 'Creating...' : 'Create Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Questions Modal */}
      {showAddQuestionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-8 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pb-4">
              <h3 className="text-2xl font-bold">Add Questions to Exam</h3>
              <button
                onClick={() => {
                  setShowAddQuestionsModal(false);
                  setSelectedQuestions([]);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">No questions available. Create questions first!</p>
                <button
                  onClick={() => navigate(`/questions?courseId=${courseId}`)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go to Question Bank
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  Selected: <span className="font-semibold text-blue-600">{selectedQuestions.length}</span> questions
                </div>

                <div className="space-y-3 mb-6">
                  {questions.map((question) => (
                    <div
                      key={question.id}
                      onClick={() => toggleQuestionSelection(question.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                        selectedQuestions.includes(question.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedQuestions.includes(question.id)}
                          onChange={() => toggleQuestionSelection(question.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              {question.type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded">
                              {question.points} pts
                            </span>
                            {question.difficulty && (
                              <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                {question.difficulty}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-900 text-sm">{question.content.question}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4 sticky bottom-0 bg-white border-t">
                  <button
                    onClick={() => {
                      setShowAddQuestionsModal(false);
                      setSelectedQuestions([]);
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddQuestions}
                    disabled={loading || selectedQuestions.length === 0}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {loading ? 'Adding...' : `Add ${selectedQuestions.length} Question(s)`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
