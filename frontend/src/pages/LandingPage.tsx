import { useNavigate } from 'react-router-dom';
import { Shield, Eye, Lock, BarChart3, Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const features = [
    { icon: Eye, title: 'Face Detection', desc: 'Real-time webcam monitoring flags missing faces, multiple faces, or a student looking away, powered by BlazeFace running in the browser.' },
    { icon: Lock, title: 'Session Integrity', desc: 'Tab switches, window blur, copy-paste, and right-click are detected and logged automatically during every exam session.' },
    { icon: BarChart3, title: 'Grading & Reports', desc: 'Auto-graded objective questions, manual grading for essays and code, and per-class analytics with CSV export.' },
];

export default function LandingPage() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const muted = theme === 'light' ? 'text-slate-500' : 'text-neutral-500';
    const heading = theme === 'light' ? 'text-slate-900' : 'text-white';

    return (
        <div className={`min-h-screen ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-neutral-950 text-white'}`}>
            <div className="mx-auto max-w-5xl px-6 py-6 sm:px-8">

                {/* ── NAV ── */}
                <header className={`flex items-center justify-between border-b pb-4 ${theme === 'light' ? 'border-slate-200' : 'border-neutral-800'}`}>
                    <div className="flex items-center gap-2">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${theme === 'light' ? 'bg-emerald-100' : 'bg-emerald-500/15'}`}>
                            <Shield className="w-4 h-4 text-emerald-500" />
                        </div>
                        <span className="text-sm font-semibold">Procto</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className={`p-2 rounded-lg border transition-colors ${theme === 'light' ? 'border-slate-300 text-slate-600 hover:text-emerald-600' : 'border-neutral-700 text-neutral-400 hover:text-emerald-400'}`}
                            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                        <button onClick={() => navigate('/login')}
                            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 transition">
                            Login
                        </button>
                    </div>
                </header>

                {/* ── HERO ── */}
                <section className="mt-16 mb-16 text-center">
                    <h1 className={`text-4xl sm:text-5xl font-bold tracking-tight ${heading}`}>
                        AI-powered exam proctoring
                    </h1>
                    <p className={`mt-4 max-w-xl mx-auto text-base sm:text-lg ${muted}`}>
                        Online exams with real-time integrity monitoring, automatic grading, and role-based
                        dashboards for students, faculty, and admins.
                    </p>
                    <div className="mt-8">
                        <button onClick={() => navigate('/login')}
                            className="rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition">
                            Get Started
                        </button>
                    </div>
                </section>

                {/* ── FEATURES ── */}
                <section className="mb-16">
                    <div className="grid sm:grid-cols-3 gap-5">
                        {features.map(({ icon: Icon, title, desc }) => (
                            <div key={title}
                                className={`rounded-xl border p-5 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-neutral-800 bg-neutral-900/60'}`}>
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${theme === 'light' ? 'bg-emerald-100' : 'bg-emerald-500/15'}`}>
                                    <Icon className="w-4 h-4 text-emerald-500" />
                                </div>
                                <h3 className={`text-sm font-semibold mb-1.5 ${heading}`}>{title}</h3>
                                <p className={`text-xs leading-relaxed ${muted}`}>{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── FOOTER ── */}
                <footer className={`flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-4 pb-8 text-xs ${theme === 'light' ? 'border-slate-200 text-slate-500' : 'border-neutral-800 text-neutral-600'}`}>
                    <span>© {new Date().getFullYear()} Procto · Christ University MCA</span>
                    <span>Software Project Development</span>
                </footer>
            </div>
        </div>
    );
}
