import { useEffect, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';
import { toCsv, downloadCsv, safeFilename } from '../lib/exportCsv';
import { Sun, Moon } from 'lucide-react';

interface ActiveSession {
  id: string; startedAt: string; status: string; timeElapsed: number; timeRemaining: number;
  student: { id: string; firstName: string; lastName: string; email: string };
  exam: { id: string; title: string; durationMinutes: number; course: { name: string; code: string } };
  suspiciousEvents: Array<{ id: string; type: string; severity: string; timestamp: string }>;
  _count: { suspiciousEvents: number; answers: number };
}

interface SessionDetails {
  id: string; startedAt: string; submittedAt: string | null; status: string;
  student: { firstName: string; lastName: string; email: string };
  exam: { title: string; durationMinutes: number };
  suspiciousEvents: Array<{ id: string; type: string; severity: string; timestamp: string }>;
  eventsSummary?: { high: number; medium: number; low: number };
}

const EVENT_ICONS: Record<string, string> = {
  TAB_SWITCH: '🔄', WINDOW_BLUR: '👁️', WEBCAM_DENIED: '📷',
  FACE_NOT_DETECTED: '👤', MULTIPLE_FACES: '👥', LOOKING_AWAY: '👀',
};
const getEventIcon = (type: string) => EVENT_ICONS[type] || '⚠️';

const severityCls: Record<string, string> = {
  HIGH: 'border-l-red-500 bg-red-500/5',
  MEDIUM: 'border-l-yellow-500 bg-yellow-500/5',
  LOW: 'border-l-cyan-500 bg-cyan-500/5',
};
const severityBadge: Record<string, string> = {
  HIGH: 'bg-red-500/10 border-red-500/30 text-red-400',
  MEDIUM: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  LOW: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
};

export default function ProctorDashboardPage() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const { theme, toggleTheme } = useTheme();
  const [selectedSession, setSelectedSession] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveSessions = async () => {
    try {
      const res = await api.get('/proctor/active-sessions');
      setSessions(res.data.sessions);
      setLoading(false);
    } catch (err: any) {
      if (err.response?.status === 401) navigate('/login');
    }
  };

  const fetchSessionDetails = async (sessionId: string) => {
    try {
      const res = await api.get(`/proctor/session/${sessionId}`);
      setSelectedSession({ ...res.data.session, eventsSummary: res.data.eventsSummary });
      setShowDetailsModal(true);
    } catch { toast.error('Failed to load session details'); }
  };

  const invalidateSession = async (sessionId: string) => {
    if (!window.confirm('Invalidate this exam session? The student will be marked as having violated exam rules.')) return;
    try {
      await api.post(`/proctor/session/${sessionId}/invalidate`);
      toast.success('Session invalidated successfully');
      setShowDetailsModal(false); fetchActiveSessions();
    } catch { toast.error('Failed to invalidate session'); }
  };

  const exportViolations = (session: SessionDetails) => {
    if (!session.suspiciousEvents.length) {
      toast('No violations to export', { icon: 'ℹ️' });
      return;
    }
    const rows = session.suspiciousEvents.map(ev => ({
      Timestamp: new Date(ev.timestamp).toLocaleString(),
      Type: ev.type.replace(/_/g, ' '),
      Severity: ev.severity,
      Student: `${session.student.firstName} ${session.student.lastName}`,
      Email: session.student.email,
      Exam: session.exam.title,
    }));
    const fname = safeFilename(
      session.student.lastName,
      session.student.firstName,
      session.exam.title,
      'violations'
    );
    downloadCsv(toCsv(rows), fname);
    toast.success(`Exported ${rows.length} violation(s)`);
  };

  if (loading) return (
    <div className={`min-h-screen ${theme === 'light' ? 'bg-slate-50' : 'bg-slate-950'} flex items-center justify-center`}>
      <div className={`animate-spin h-8 w-8 border-2 border-t-transparent rounded-full ${theme === 'light' ? 'border-cyan-600' : 'border-cyan-400'}`} />
    </div>
  );

  const highSevTotal = sessions.reduce((s, sess) => s + sess.suspiciousEvents.filter(e => e.severity === 'HIGH').length, 0);

  return (
    <main className={`min-h-screen ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'}`}>
      <Toaster position="top-right" toastOptions={{ style: theme === 'light' ? { background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' } : { background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155' } }} />

      <div className="relative mx-auto w-full px-6 py-8 sm:px-8 lg:px-12 xl:px-20 xl:py-12">

        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900/70 ring-1 ring-cyan-400/40 shadow-lg shadow-cyan-500/30">
              <span className="text-lg font-semibold tracking-tight text-cyan-300">P</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Procto</span>
              <span className="text-xs text-slate-500">Live Proctor</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className={`p-2 rounded-lg transition-colors ${theme === 'light' ? 'bg-white border border-slate-300 text-amber-600 hover:bg-slate-100' : 'bg-slate-800/70 border border-slate-700 text-slate-200 hover:bg-slate-700/70'}`}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              Auto-refresh · 10s
            </div>
            <button onClick={() => navigate('/faculty')}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-300 transition-colors group">
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </button>
          </div>
        </header>

        {/* Title row */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className={`text-2xl font-bold flex items-center gap-3 ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
              Live Proctor Dashboard
              {highSevTotal > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-medium animate-pulse">
                  🚨 {highSevTotal} HIGH
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-cyan-400">{sessions.length}</p>
            <p className="text-xs text-slate-600">active</p>
          </div>
        </div>

        {/* Sessions grid */}
        {sessions.length === 0 ? (
          <div className={`rounded-2xl border backdrop-blur-sm p-16 text-center ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-700/60 bg-slate-900/60'}`}>
            <div className="text-5xl mb-4">📊</div>
            <h3 className="font-semibold text-slate-200 mb-2">No Active Exam Sessions</h3>
            <p className="text-sm text-slate-500">Students currently taking exams will appear here</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 pb-16">
            {sessions.map(session => {
              const highSev = session.suspiciousEvents.filter(e => e.severity === 'HIGH').length;
              const totalEvents = session._count.suspiciousEvents;
              const riskCls = highSev > 0
                ? 'border-red-500/40 hover:border-red-500/60 hover:shadow-red-500/10'
                : totalEvents > 0
                  ? 'border-yellow-500/30 hover:border-yellow-500/50 hover:shadow-yellow-500/10'
                  : 'border-slate-700/60 hover:border-cyan-500/40 hover:shadow-cyan-500/10';
              const progress = Math.min((session.timeElapsed / session.exam.durationMinutes) * 100, 100);

              return (
                <div key={session.id} onClick={() => fetchSessionDetails(session.id)}
                  className={`group rounded-2xl border backdrop-blur-sm p-5 cursor-pointer hover:shadow-lg transition-all duration-300 ${theme === 'light' ? 'bg-white' : 'bg-slate-900/60'} ${riskCls}`}>

                  {/* Student */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/20 flex items-center justify-center font-bold text-violet-300 text-sm shrink-0">
                      {session.student.firstName[0]}{session.student.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-100 text-sm truncate">
                        {session.student.firstName} {session.student.lastName}
                      </h3>
                      <p className="text-xs text-slate-600 truncate">{session.student.email}</p>
                    </div>
                  </div>

                  {/* Exam */}
                  <div className="mb-4 pb-3 border-b border-slate-800">
                    <p className="text-sm font-semibold text-slate-200 mb-0.5">{session.exam.title}</p>
                    <p className="text-xs text-slate-600">{session.exam.course.name}</p>
                  </div>

                  {/* Time */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
                      <p className="text-[0.6rem] text-slate-600 mb-0.5">Elapsed</p>
                      <p className="text-base font-bold text-cyan-400">{session.timeElapsed} min</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
                      <p className="text-[0.6rem] text-slate-600 mb-0.5">Remaining</p>
                      <p className={`text-base font-bold ${session.timeRemaining < 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {session.timeRemaining} min
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[0.6rem] text-slate-600 mb-1.5">
                      <span>Time progress</span>
                      <span>{session._count.answers} answers</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all"
                        style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {/* Alert status */}
                  <div className={`rounded-xl border px-3 py-2.5 mb-4 ${highSev > 0
                    ? 'border-red-500/30 bg-red-500/10'
                    : totalEvents > 0
                      ? 'border-yellow-500/30 bg-yellow-500/10'
                      : 'border-emerald-500/30 bg-emerald-500/10'
                    }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">
                        {totalEvents === 0
                          ? <span className="text-emerald-400">✓ No Issues</span>
                          : <span className={highSev > 0 ? 'text-red-400' : 'text-yellow-400'}>⚠️ {totalEvents} event{totalEvents > 1 ? 's' : ''}</span>
                        }
                      </span>
                      {highSev > 0 && (
                        <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-red-500 text-white font-bold">
                          {highSev} HIGH
                        </span>
                      )}
                    </div>
                    {session.suspiciousEvents.length > 0 && (
                      <div className="space-y-0.5 mt-1">
                        {session.suspiciousEvents.slice(0, 2).map(e => (
                          <div key={e.id} className="flex items-center gap-1.5 text-[0.6rem] text-slate-500">
                            <span>{getEventIcon(e.type)}</span>
                            <span>{e.type.replace(/_/g, ' ')}</span>
                          </div>
                        ))}
                        {session.suspiciousEvents.length > 2 && (
                          <p className="text-[0.6rem] text-slate-600 italic">+{session.suspiciousEvents.length - 2} more…</p>
                        )}
                      </div>
                    )}
                  </div>

                  <button className="w-full py-2 rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-300 text-xs font-semibold hover:bg-violet-500/20 hover:border-violet-500/40 transition-all group-hover:shadow-lg">
                    View Details →
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <footer className={`mt-8 flex items-center justify-between border-t pt-4 text-[0.7rem] sm:text-xs ${theme === 'light' ? 'border-slate-200 text-slate-500' : 'border-slate-800/80 text-slate-600'}`}>
          <span>© {new Date().getFullYear()} Procto. Built for secure online exams.</span>
          <span className="hidden sm:inline">Designed for performance · React · TypeScript</span>
        </footer>
      </div>

      {/* Session Details Modal */}
      {showDetailsModal && selectedSession && (
        <div className={`fixed inset-0 ${theme === 'light' ? 'bg-slate-900/40' : 'bg-black/70'} backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto`}>
          <div className={`relative rounded-2xl border backdrop-blur-xl w-full max-w-4xl my-8 shadow-2xl overflow-hidden ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-700/60 bg-slate-900/95'}`}>

            {/* Modal header */}
            <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-100">
                  {selectedSession.student.firstName} {selectedSession.student.lastName}
                </h2>
                <p className="text-sm text-slate-400">{selectedSession.exam.title}</p>
                <p className="text-xs text-slate-600 mt-0.5">{selectedSession.student.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportViolations(selectedSession)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 text-xs text-slate-400 hover:border-emerald-500/40 hover:text-emerald-300 transition-all"
                >
                  ⬇ Export Violations CSV
                </button>
                <button onClick={() => setShowDetailsModal(false)}
                  className="text-slate-500 hover:text-white transition-colors text-2xl leading-none">×</button>
              </div>
            </div>

            {/* Violation summary */}
            <div className="px-6 py-5 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Violation Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'High Severity', value: selectedSession.eventsSummary?.high || 0, cls: 'text-red-400', dot: 'bg-red-400' },
                  { label: 'Medium Severity', value: selectedSession.eventsSummary?.medium || 0, cls: 'text-yellow-400', dot: 'bg-yellow-400' },
                  { label: 'Low Severity', value: selectedSession.eventsSummary?.low || 0, cls: 'text-cyan-400', dot: 'bg-cyan-400' },
                ].map(({ label, value, cls, dot }) => (
                  <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center">
                    <p className={`text-3xl font-bold ${cls}`}>{value}</p>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                      <p className="text-xs text-slate-500">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Event timeline */}
            <div className="px-6 py-5 max-h-80 overflow-y-auto">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Event Timeline</h3>
              {selectedSession.suspiciousEvents.length === 0 ? (
                <p className="text-center text-slate-600 py-8">No suspicious events detected ✓</p>
              ) : (
                <div className="space-y-3">
                  {selectedSession.suspiciousEvents.map(event => (
                    <div key={event.id}
                      className={`rounded-xl border border-l-4 border-slate-800 p-4 ${severityCls[event.severity] || 'border-l-slate-600 bg-slate-800/30'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getEventIcon(event.type)}</span>
                          <div>
                            <p className="text-sm font-semibold text-slate-200">{event.type.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-slate-600">{new Date(event.timestamp).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <span className={`text-[0.65rem] px-2 py-0.5 rounded-full border font-semibold ${severityBadge[event.severity] || 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                          {event.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-5 border-t border-slate-800 flex gap-3">
              <button onClick={() => setShowDetailsModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition text-sm">
                Close
              </button>
              {selectedSession.status === 'ACTIVE' && (
                <button onClick={() => invalidateSession(selectedSession.id)}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-500 transition shadow-lg shadow-red-600/20">
                  🚫 Invalidate Exam
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
