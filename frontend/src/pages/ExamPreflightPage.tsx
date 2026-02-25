import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';

interface Exam {
  id: string; title: string; durationMinutes: number;
  course: { name: string };
  _count: { examQuestions: number };
}

function CheckRow({
  icon, passed, title, sub, action, actionLabel,
}: {
  icon: string; passed: boolean; title: string; sub: string;
  action?: () => void; actionLabel?: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 transition-all ${passed ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-neutral-800 bg-neutral-900/60'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border ${passed ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-neutral-700 bg-neutral-800'}`}>
            {passed ? '✓' : icon}
          </div>
          <div>
            <p className={`font-semibold text-sm ${passed ? 'text-emerald-400' : 'text-white'}`}>{title}</p>
            <p className="text-xs text-neutral-500">{sub}</p>
          </div>
        </div>
        {passed ? (
          <span className="text-xs font-semibold text-emerald-400 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">Passed</span>
        ) : action ? (
          <button onClick={action}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-300 hover:border-emerald-500/40 hover:text-emerald-400 transition-all">
            {actionLabel}
          </button>
        ) : (
          <span className="text-xs text-neutral-600">Checking…</span>
        )}
      </div>
    </div>
  );
}

export default function ExamPreflightPage() {
  const { examId } = useParams<{ examId: string }>();
  const [exam, setExam] = useState<Exam | null>(null);
  const [webcamGranted, setWebcamGranted] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [browserCheck, setBrowserCheck] = useState(false);
  const [fullscreenCheck, setFullscreenCheck] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!examId) return;
    api.get(`/exams/${examId}`)
      .then(r => setExam(r.data.exam))
      .catch(() => { toast.error('Failed to load exam'); navigate('/student'); });
    const ua = navigator.userAgent, v = navigator.vendor;
    if (/Chrome/.test(ua) && /Google Inc/.test(v) || /Edg/.test(ua) || /Firefox/.test(ua)) setBrowserCheck(true);
  }, [examId]);

  useEffect(() => {
    if (webcamStream && videoRef.current) videoRef.current.srcObject = webcamStream;
  }, [webcamStream]);

  useEffect(() => {
    return () => { webcamStream?.getTracks().forEach(t => t.stop()); };
  }, [webcamStream]);

  const requestWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
      setWebcamStream(stream); setWebcamGranted(true);
      toast.success('Webcam access granted!');
    } catch { toast.error('Webcam access denied. Please allow camera access to continue.'); }
  };

  const testFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setFullscreenCheck(true);
      toast.success('Full-screen test successful!');
      setTimeout(() => { if (document.fullscreenElement) document.exitFullscreen(); }, 1000);
    } catch { toast.error('Full-screen mode not supported'); }
  };

  const startExam = async () => {
    if (!webcamGranted) { toast.error('Please enable webcam access'); return; }
    try { await document.documentElement.requestFullscreen(); } catch { }
    navigate(`/take-exam/${examId}`);
  };

  if (!exam) return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
    </div>
  );

  const allChecksPassed = webcamGranted && browserCheck;

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <Toaster position="top-right" toastOptions={{ style: { background: '#171717', color: '#fff', border: '1px solid #374151' } }} />

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -right-32 bottom-20 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-emerald-500/5 blur-3xl" />
      </div>
      <div className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{ backgroundImage: `repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(255,255,255,0.04) 2px,rgba(255,255,255,0.04) 4px)` }} />

      <div className="relative mx-auto w-full px-6 py-8 sm:px-8 max-w-2xl xl:py-12">

        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-500/20">
              <span className="text-lg font-semibold tracking-tight text-emerald-400">P</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-400">Procto</span>
              <span className="text-xs text-neutral-600">Exam Preflight</span>
            </div>
          </div>
          <button onClick={() => navigate('/student')}
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-emerald-400 transition-colors group">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </button>
        </header>

        {/* Exam info card */}
        <div className="relative mb-6">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-transparent to-emerald-500/20 opacity-60 blur-xl" />
          <div className="relative rounded-3xl border border-emerald-500/30 bg-neutral-900/90 backdrop-blur-xl shadow-2xl p-7 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-800 border border-neutral-700 text-3xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-white mb-1">{exam.title}</h1>
            <p className="text-neutral-500 text-sm mb-6">{exam.course.name}</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Duration', value: `${exam.durationMinutes} min` },
                { label: 'Questions', value: exam._count.examQuestions },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-neutral-800 bg-neutral-950/60 py-3 px-4">
                  <p className="text-xs text-neutral-500 mb-0.5">{label}</p>
                  <p className="text-xl font-bold text-emerald-400">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System checks */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">System Requirements</h2>
          <div className="space-y-3">
            <CheckRow icon="🌐" passed={browserCheck} title="Supported Browser" sub="Chrome, Edge, or Firefox required" />
            <CheckRow icon="📷" passed={webcamGranted} title="Webcam Access" sub="Required for proctoring"
              action={requestWebcam} actionLabel="Enable Webcam" />
            <CheckRow icon="🖥" passed={fullscreenCheck} title="Full-Screen Mode" sub="Exam will run in full-screen"
              action={testFullscreen} actionLabel="Test Full-Screen" />
          </div>
        </div>

        {/* Webcam preview */}
        {webcamGranted && (
          <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-neutral-800 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-xs text-neutral-500">Live webcam preview</span>
            </div>
            <video ref={videoRef} autoPlay playsInline muted
              className="w-full max-h-56 object-cover bg-neutral-950" />
          </div>
        )}

        {/* Instructions */}
        <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h3 className="text-sm font-semibold text-amber-400 mb-3">⚠️ Important Instructions</h3>
          <ul className="space-y-1.5">
            {[
              'Do not switch tabs or minimize the browser during the exam',
              'Keep your face visible in the webcam at all times',
              'Do not use any external resources unless permitted',
              'The exam will auto-submit when time runs out',
              'All activity is being monitored and recorded',
            ].map(item => (
              <li key={item} className="flex items-start gap-2 text-xs text-amber-200/70">
                <span className="mt-0.5 shrink-0 h-1.5 w-1.5 rounded-full bg-amber-400/60" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Start button */}
        <button onClick={startExam} disabled={!allChecksPassed}
          className={`w-full py-4 rounded-2xl font-semibold text-base transition-all ${allChecksPassed
              ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/40 hover:scale-[1.02]'
              : 'bg-neutral-800 text-neutral-600 cursor-not-allowed border border-neutral-700'
            }`}>
          {allChecksPassed ? 'Start Exam →' : 'Complete System Checks First'}
        </button>

        {/* Footer */}
        <footer className="mt-8 flex items-center justify-between border-t border-neutral-800 pt-4 text-[0.7rem] text-neutral-600 sm:text-xs">
          <span>© {new Date().getFullYear()} Procto. Built for secure online exams.</span>
          <span className="hidden sm:inline">Designed for performance · React · TypeScript</span>
        </footer>
      </div>
    </main>
  );
}
