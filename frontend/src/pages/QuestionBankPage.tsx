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
    if (!courseId) {
      toast.error('No course selected');
      navigate('/faculty');
      return;
    }
    fetchQuestions();
  }, [courseId, navigate]);

  const fetchQuestions = async () => {
    try {
      const response = await api.get(`/questions?courseId=${courseId}`);
      setQuestions(response.data.questions);
    } catch (error: any) {
      console.error('Fetch questions error:', error);
      toast.error('Failed to load questions');
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const content: any = {
        question: formData.question,
        explanation: formData.explanation || undefined,
      };

      // Add type-specific fields
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
      } else if (formData.type === 'ESSAY') {
        // No correct answer for essays
      }

      const payload = {
        courseId,
        type: formData.type,
        content,
        points: formData.points,
        difficulty: formData.difficulty,
        topicTags: formData.topicTags ? formData.topicTags.split(',').map(t => t.trim()) : [],
      };

      await api.post('/questions', payload);
      toast.success('Question created successfully!');
      setShowCreateModal(false);
      resetForm();
      fetchQuestions();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to create question';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'MULTIPLE_CHOICE',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      correctAnswers: [],
      points: 1,
      difficulty: 'MEDIUM',
      topicTags: '',
      explanation: '',
    });
  };

  const addOption = () => {
    setFormData({ ...formData, options: [...formData.options, ''] });
  };

  const removeOption = (index: number) => {
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const toggleCorrectAnswer = (option: string) => {
    const newAnswers = formData.correctAnswers.includes(option)
      ? formData.correctAnswers.filter(a => a !== option)
      : [...formData.correctAnswers, option];
    setFormData({ ...formData, correctAnswers: newAnswers });
  };

  const getQuestionTypeIcon = (type: string) => {
    const icons: any = {
      MULTIPLE_CHOICE: '⭕',
      MULTIPLE_SELECT: '☑️',
      TRUE_FALSE: '✓✗',
      SHORT_ANSWER: '✍️',
      ESSAY: '📝',
      FILL_BLANK: '___',
      NUMERICAL: '🔢',
      CODE: '💻',
    };
    return icons[type] || '❓';
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
            <h1 className="text-2xl font-bold text-blue-600">Question Bank</h1>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Questions</h2>
            <p className="text-gray-600">{questions.length} questions in this course</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            + Add Question
          </button>
        </div>

        {questions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">❓</div>
            <h3 className="text-xl font-semibold mb-2">No questions yet</h3>
            <p className="text-gray-600 mb-6">Create your first question to build your question bank</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Add Question
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={question.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{getQuestionTypeIcon(question.type)}</span>
                      <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {question.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded">
                        {question.points} {question.points === 1 ? 'point' : 'points'}
                      </span>
                      {question.difficulty && (
                        <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          {question.difficulty}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-900 font-medium mb-3">
                      {index + 1}. {question.content.question}
                    </p>
                    
                    {question.content.options && (
                      <div className="space-y-2 mb-3">
                        {question.content.options.map((option: string, i: number) => {
                          const isCorrect = Array.isArray(question.content.correctAnswer)
                            ? question.content.correctAnswer.includes(option)
                            : question.content.correctAnswer === option;
                          
                          return (
                            <div
                              key={i}
                              className={`text-sm px-3 py-2 rounded ${
                                isCorrect ? 'bg-green-50 text-green-700 font-medium' : 'bg-gray-50 text-gray-600'
                              }`}
                            >
                              {String.fromCharCode(65 + i)}. {option}
                              {isCorrect && ' ✓'}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {question.topicTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {question.topicTags.map((tag, i) => (
                          <span key={i} className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button className="text-blue-600 hover:text-blue-700 px-3 py-1 text-sm">
                      Edit
                    </button>
                    <button className="text-red-600 hover:text-red-700 px-3 py-1 text-sm">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Question Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-8 my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Create Question</h3>
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
            
            <form onSubmit={handleCreateQuestion} className="space-y-6">
              {/* Question Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MULTIPLE_CHOICE">Multiple Choice (Single Answer)</option>
                  <option value="MULTIPLE_SELECT">Multiple Select (Multiple Answers)</option>
                  <option value="TRUE_FALSE">True/False</option>
                  <option value="SHORT_ANSWER">Short Answer</option>
                  <option value="ESSAY">Essay (Manual Grading)</option>
                </select>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question *
                </label>
                <textarea
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter your question..."
                  required
                />
              </div>

              {/* Options for MCQ/Multiple Select */}
              {(formData.type === 'MULTIPLE_CHOICE' || formData.type === 'MULTIPLE_SELECT') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Options *
                  </label>
                  <div className="space-y-3">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <div className="flex items-center">
                          {formData.type === 'MULTIPLE_CHOICE' ? (
                            <input
                              type="radio"
                              name="correctAnswer"
                              checked={formData.correctAnswer === option}
                              onChange={() => setFormData({ ...formData, correctAnswer: option })}
                              className="mr-2"
                            />
                          ) : (
                            <input
                              type="checkbox"
                              checked={formData.correctAnswers.includes(option)}
                              onChange={() => toggleCorrectAnswer(option)}
                              className="mr-2"
                            />
                          )}
                        </div>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          required
                        />
                        {formData.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add Option
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    {formData.type === 'MULTIPLE_CHOICE' 
                      ? 'Select the radio button for the correct answer'
                      : 'Check all correct answers'}
                  </p>
                </div>
              )}

              {/* True/False */}
              {formData.type === 'TRUE_FALSE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correct Answer *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="trueFalse"
                        value="true"
                        checked={formData.correctAnswer === 'true'}
                        onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                        className="mr-2"
                        required
                      />
                      True
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="trueFalse"
                        value="false"
                        checked={formData.correctAnswer === 'false'}
                        onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                        className="mr-2"
                        required
                      />
                      False
                    </label>
                  </div>
                </div>
              )}

              {/* Short Answer */}
              {formData.type === 'SHORT_ANSWER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Answer *
                  </label>
                  <input
                    type="text"
                    value={formData.correctAnswer}
                    onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter the expected answer..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Grading will be case-insensitive
                  </p>
                </div>
              )}

              {/* Points and Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Points *
                  </label>
                  <input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0.5"
                    step="0.5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Topic Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.topicTags}
                  onChange={(e) => setFormData({ ...formData, topicTags: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., loops, arrays, algorithms"
                />
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Explanation (Optional)
                </label>
                <textarea
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Explain the correct answer..."
                />
              </div>

              {/* Submit */}
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
                  {loading ? 'Creating...' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
