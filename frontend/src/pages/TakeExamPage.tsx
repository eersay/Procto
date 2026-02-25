import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';

interface Question {
  id: string;
  orderIndex: number;
  question: {
    id: string;
    type: string;
    content: any;
    points: number;
  };
}

interface Exam {
  id: string;
  title: string;
  instructions: string | null;
  durationMinutes: number;
  startAt: string;
  endAt: string;
  course: {
    name: string;
  };
  examQuestions: Question[];
}

interface Answer {
  questionId: string;
  response: any;
}

export default function TakeExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const location = useLocation();
  const [exam, setExam] = useState<Exam | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submittedRef = useRef(false); // mirror of submitted for use inside closures
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [suspiciousEvents, setSuspiciousEvents] = useState<string[]>([]);
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Ref so event handlers always read the current sessionId (avoids stale closure)
  const sessionIdRef = useRef<string | null>(null);
  // Queue for events that fire before session has started (race condition fix)
  const pendingEventsRef = useRef<Array<{ type: string; description: string }>>([]);
  // Guard against React StrictMode double-invoking the session-init effect
  const startedRef = useRef(false);
  // Stable refs for event handlers — prevents stale-closure issues across re-renders
  const visibilityHandlerRef = useRef<() => void>(() => { });
  const blurHandlerRef = useRef<() => void>(() => { });
  // Debounce WINDOW_BLUR so rapid OS-level focus changes don't flood events
  const lastBlurRef = useRef<number>(0);

  // ── EFFECT 1: stable event listener registration (separate from session init)
  // Using stable wrapper refs means React StrictMode double-cleanup never kills the listeners.
  useEffect(() => {
    const onVisibilityChange = () => visibilityHandlerRef.current();
    const onWindowBlur = () => blurHandlerRef.current();

    // Block tab close / page refresh
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (submittedRef.current) return;
      e.preventDefault();
      e.returnValue = 'Your exam is in progress. Leaving will be flagged as a violation!';
      return e.returnValue;
    };

    // Auto-terminate via sendBeacon when page actually unloads (fire-and-forget)
    const API_BASE = 'http://localhost:4000/api/v1';
    const onPageHide = () => {
      const sid = sessionIdRef.current;
      if (!sid || submittedRef.current) return;
      const token = localStorage.getItem('accessToken') || '';
      const blob = new Blob([JSON.stringify({ token })], { type: 'application/json' });
      navigator.sendBeacon(`${API_BASE}/exam-sessions/${sid}/terminate`, blob);
    };

    // Intercept browser Back button — push a dummy state so popstate fires
    // instead of actually navigating away (works with BrowserRouter)
    window.history.pushState(null, '', window.location.href);
    const onPopState = () => {
      if (submittedRef.current) return;
      // Re-push so they can't keep pressing Back
      window.history.pushState(null, '', window.location.href);
      toast.error('⚠️ You cannot leave during an exam!', { id: 'back-blocked' });
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('popstate', onPopState);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('popstate', onPopState);
    };
  }, []); // Empty deps — runs once regardless of StrictMode

  // ── EFFECT 2: one-time session + webcam init (guarded against StrictMode double-fire)
  useEffect(() => {
    if (!examId) return;
    if (startedRef.current) return;
    startedRef.current = true;

    // Get webcam stream from location state or request new one
    const stream = location.state?.webcamStream;
    if (stream) {
      setWebcamStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } else {
      requestWebcam();
    }

    loadExamAndStartSession();

    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
    };
  }, [examId]);

  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  useEffect(() => {
    if (!sessionId) return;

    const autoSave = setInterval(() => {
      saveAnswers();
    }, 30000);

    return () => clearInterval(autoSave);
  }, [sessionId, answers]);

  // Start webcam capture every 30 seconds
  useEffect(() => {
    if (!sessionId || !webcamStream) return;

    // Capture immediately
    captureWebcamSnapshot();

    // Then capture every 30 seconds
    captureIntervalRef.current = setInterval(() => {
      captureWebcamSnapshot();
    }, 30000);

    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
    };
  }, [sessionId, webcamStream]);

  const requestWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      setWebcamStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Webcam error:', error);
      toast.error('Webcam access required. Exam will be terminated.');
      logSuspiciousEvent('WEBCAM_DENIED', 'Student denied webcam access');
      setTimeout(() => navigate('/student'), 3000);
    }
  };

  // Keep handler refs up-to-date every render so stable wrappers always call latest logic
  visibilityHandlerRef.current = () => {
    if (document.hidden) {
      console.log('[Proctor] TAB_SWITCH detected at', new Date().toISOString());
      logSuspiciousEvent('TAB_SWITCH', 'Student switched tabs or minimized window');
      toast.error('⚠️ Tab switch detected!', { id: 'tab-switch' });
    }
  };

  blurHandlerRef.current = () => {
    // Debounce: skip if a blur fired within the last 2 seconds
    const now = Date.now();
    if (now - lastBlurRef.current < 2000) return;
    lastBlurRef.current = now;
    console.log('[Proctor] WINDOW_BLUR detected at', new Date().toISOString());
    logSuspiciousEvent('WINDOW_BLUR', 'Browser window lost focus');
  };

  const captureWebcamSnapshot = async () => {
    const currentSessionId = sessionIdRef.current;
    if (!videoRef.current || !canvasRef.current || !currentSessionId) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    // Send to backend
    try {
      await api.post(`/exam-sessions/${currentSessionId}/webcam-capture`, {
        imageData,
        timestamp: new Date().toISOString(),
      });

      console.log('Webcam snapshot captured');
    } catch (error) {
      console.error('Failed to upload webcam snapshot:', error);
    }
  };

  const sendEvent = async (sessionId: string, type: string, description: string) => {
    try {
      await api.post(`/exam-sessions/${sessionId}/suspicious-event`, {
        type,
        description,
        timestamp: new Date().toISOString(),
      });
      console.log('[Proctor] Event recorded:', type);
    } catch (error: any) {
      console.error('[Proctor] Failed to record event:', type,
        error.response?.status, error.response?.data);
    }
  };

  const logSuspiciousEvent = (type: string, description: string) => {
    setSuspiciousEvents((prev) => [...prev, type]);

    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) {
      // Session not ready yet — queue and flush when session starts
      console.log('[Proctor] Queuing event (session not ready):', type);
      pendingEventsRef.current.push({ type, description });
      return;
    }

    sendEvent(currentSessionId, type, description);
  };

  const loadExamAndStartSession = async () => {
    try {
      const examResponse = await api.get(`/exams/${examId}`);
      const examData = examResponse.data.exam;
      setExam(examData);

      const sessionResponse = await api.post(`/exam-sessions`, {
        examId: examId,
      });

      const newSessionId = sessionResponse.data.session.id;
      sessionIdRef.current = newSessionId;
      setSessionId(newSessionId);
      setTimeRemaining(examData.durationMinutes * 60);

      // Flush any events that fired before session was ready
      if (pendingEventsRef.current.length > 0) {
        const queued = pendingEventsRef.current.splice(0);
        queued.forEach(({ type, description }) => sendEvent(newSessionId, type, description));
      }

      toast.success('Exam started! Good luck!');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to load exam';
      toast.error(message);
      setTimeout(() => navigate('/student'), 2000);
    }
  };

  const saveAnswers = async () => {
    if (!sessionId) return;

    try {
      await api.post(`/exam-sessions/${sessionId}/answers`, {
        answers: Object.entries(answers).map(([questionId, response]) => ({
          questionId,
          response,
        })),
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleAutoSubmit = async () => {
    toast.error('Time is up! Submitting exam...');
    await submitExam();
  };

  const submitExam = async () => {
    if (!sessionId) return;

    setSubmitting(true);
    try {
      await saveAnswers();
      await api.post(`/exam-sessions/${sessionId}/submit`);

      submittedRef.current = true;
      setSubmitted(true); // Unlock navigation guards (ref is checked by closures, state by JSX)

      // Stop webcam
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }

      // Exit fullscreen
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }

      toast.success('Exam submitted successfully!');
      setTimeout(() => navigate('/student'), 2000);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to submit exam';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (!exam) return 'text-gray-600';
    const totalSeconds = exam.durationMinutes * 60;
    const percentage = (timeRemaining / totalSeconds) * 100;

    if (percentage > 50) return 'text-green-600';
    if (percentage > 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderQuestion = (question: Question) => {
    const q = question.question;
    const currentAnswer = answers[q.id];

    switch (q.type) {
      case 'MULTIPLE_CHOICE':
        return (
          <div className="space-y-3">
            {q.content.options.map((option: string, index: number) => (
              <label
                key={index}
                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition ${currentAnswer === option
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  className="mt-1"
                />
                <span className="flex-1">
                  {String.fromCharCode(65 + index)}. {option}
                </span>
              </label>
            ))}
          </div>
        );

      case 'MULTIPLE_SELECT':
        return (
          <div className="space-y-3">
            {q.content.options.map((option: string, index: number) => {
              const selectedOptions = currentAnswer || [];
              return (
                <label
                  key={index}
                  className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition ${selectedOptions.includes(option)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option)}
                    onChange={(e) => {
                      const newSelection = e.target.checked
                        ? [...selectedOptions, option]
                        : selectedOptions.filter((o: string) => o !== option);
                      handleAnswerChange(q.id, newSelection);
                    }}
                    className="mt-1"
                  />
                  <span className="flex-1">
                    {String.fromCharCode(65 + index)}. {option}
                  </span>
                </label>
              );
            })}
          </div>
        );

      case 'TRUE_FALSE':
        return (
          <div className="space-y-3">
            {['true', 'false'].map((option) => (
              <label
                key={option}
                className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition ${currentAnswer === option
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                />
                <span className="flex-1 capitalize font-medium">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'SHORT_ANSWER':
        return (
          <input
            type="text"
            value={currentAnswer || ''}
            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Type your answer..."
          />
        );

      case 'ESSAY':
        return (
          <textarea
            value={currentAnswer || ''}
            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={8}
            placeholder="Write your answer here..."
          />
        );

      default:
        return <p className="text-gray-500">Question type not supported</p>;
    }
  };

  if (!exam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = exam.examQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / exam.examQuestions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Hidden webcam feed and canvas for snapshots */}
      <video
        ref={videoRef}
        autoPlay
        muted
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Bar */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{exam.title}</h1>
            <p className="text-sm text-gray-600">{exam.course.name}</p>
          </div>

          <div className="flex items-center gap-6">
            {/* Monitoring indicators */}
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Webcam Active
              </span>
              {suspiciousEvents.length > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  {suspiciousEvents.length} Event{suspiciousEvents.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-600">Time Remaining</p>
              <p className={`text-2xl font-bold ${getTimeColor()}`}>
                {formatTime(timeRemaining)}
              </p>
            </div>

            <button
              onClick={() => setShowSubmitConfirm(true)}
              disabled={submitting}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:bg-gray-300"
            >
              Submit Exam
            </button>
          </div>
        </div>

        <div className="w-full bg-gray-200 h-1">
          <div
            className="bg-blue-600 h-1 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-1">
            <div className="bg-white rounded-lg shadow p-4 sticky top-24">
              <h3 className="font-bold mb-4">Questions</h3>
              <div className="space-y-2 mb-4">
                <div className="text-sm text-gray-600">
                  Answered: {answeredCount} / {exam.examQuestions.length}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {exam.examQuestions.map((q, index) => {
                  const isAnswered = !!answers[q.question.id];
                  const isCurrent = index === currentQuestionIndex;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`aspect-square rounded-lg text-sm font-semibold transition ${isCurrent
                        ? 'bg-blue-600 text-white'
                        : isAnswered
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="col-span-3">
            <div className="bg-white rounded-lg shadow p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm font-semibold px-3 py-1 bg-blue-100 text-blue-700 rounded">
                      Question {currentQuestionIndex + 1} of {exam.examQuestions.length}
                    </span>
                    <span className="text-sm font-semibold px-3 py-1 bg-green-100 text-green-700 rounded">
                      {currentQuestion.question.points} {currentQuestion.question.points === 1 ? 'point' : 'points'}
                    </span>
                    <span className="text-sm font-semibold px-3 py-1 bg-gray-100 text-gray-700 rounded">
                      {currentQuestion.question.type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    {currentQuestion.question.content.question}
                  </h2>
                </div>
              </div>

              <div className="mb-8">
                {renderQuestion(currentQuestion)}
              </div>

              <div className="flex justify-between items-center pt-6 border-t">
                <button
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>

                <div className="text-sm text-gray-500">
                  {answers[currentQuestion.question.id] ? (
                    <span className="text-green-600 font-medium">✓ Answered</span>
                  ) : (
                    <span className="text-gray-400">Not answered</span>
                  )}
                </div>

                <button
                  onClick={() => setCurrentQuestionIndex((prev) => Math.min(exam.examQuestions.length - 1, prev + 1))}
                  disabled={currentQuestionIndex === exam.examQuestions.length - 1}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
            <h3 className="text-2xl font-bold mb-4">Submit Exam?</h3>
            <p className="text-gray-600 mb-6">
              You have answered <span className="font-bold text-blue-600">{answeredCount}</span> out of{' '}
              <span className="font-bold">{exam.examQuestions.length}</span> questions.
            </p>
            {answeredCount < exam.examQuestions.length && (
              <p className="text-yellow-600 mb-6 text-sm">
                ⚠️ You have {exam.examQuestions.length - answeredCount} unanswered question(s).
              </p>
            )}
            {suspiciousEvents.length > 0 && (
              <p className="text-red-600 mb-6 text-sm">
                ⚠️ {suspiciousEvents.length} suspicious event(s) detected during your exam.
              </p>
            )}
            <p className="text-gray-600 mb-6">
              Are you sure you want to submit? You cannot change your answers after submission.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSubmitConfirm(false);
                  submitExam();
                }}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
              >
                {submitting ? 'Submitting...' : 'Submit Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
