import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, Eye, Brain, Lock, Fingerprint, Cpu, Scan, Zap, ChevronRight, ArrowRight, Menu, X
} from 'lucide-react';
import ParticleField from '../components/ParticleField';
import GlitchText from '../components/GlitchText';

/* ── Data ─────────────────────────────────────────────────────── */
const features = [
    { icon: Eye, title: 'Visual Intelligence', desc: 'Real-time gaze tracking and face detection powered by BlazeFace neural networks running entirely in the browser.', accent: 'cyan' },
    { icon: Brain, title: 'Behavioral Analysis', desc: 'AI monitors tab-switching, window focus patterns, and browsing anomalies in real time.', accent: 'violet' },
    { icon: Lock, title: 'Secure Environment', desc: 'Locked-down session with tab-switch detection, copy-paste prevention, and right-click blocking.', accent: 'emerald' },
    { icon: Fingerprint, title: 'Identity Verification', desc: 'Role-based access ensures the right person — student or faculty — takes or administers the exam.', accent: 'pink' },
    { icon: Cpu, title: 'Edge Processing', desc: 'On-device ML inference via TensorFlow.js for real-time face analysis with zero server roundtrip.', accent: 'sky' },
    { icon: Scan, title: 'Anomaly Detection', desc: 'Multi-signal fusion detects suspicious patterns: no face, multiple faces, looking away — all classified by severity.', accent: 'amber' },
];

type AccentKey = 'cyan' | 'violet' | 'emerald' | 'pink' | 'sky' | 'amber';

const accentStyles: Record<AccentKey, { icon: string; border: string; glow: string }> = {
    cyan: { icon: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', border: 'hover:border-cyan-400/50', glow: 'hover:shadow-cyan-500/10' },
    violet: { icon: 'bg-violet-500/10 text-violet-400 border-violet-500/20', border: 'hover:border-violet-400/50', glow: 'hover:shadow-violet-500/10' },
    emerald: { icon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', border: 'hover:border-emerald-400/50', glow: 'hover:shadow-emerald-500/10' },
    pink: { icon: 'bg-pink-500/10 text-pink-400 border-pink-500/20', border: 'hover:border-pink-400/50', glow: 'hover:shadow-pink-500/10' },
    sky: { icon: 'bg-sky-500/10 text-sky-400 border-sky-500/20', border: 'hover:border-sky-400/50', glow: 'hover:shadow-sky-500/10' },
    amber: { icon: 'bg-amber-500/10 text-amber-400 border-amber-500/20', border: 'hover:border-amber-400/50', glow: 'hover:shadow-amber-500/10' },
};

const capabilities = [
    { title: 'Neuro-Sync Protocol', desc: 'Synchronizes face detection, tab-switch, and window-blur signals into a unified integrity score per session.' },
    { title: 'Visual-Lock Engine', desc: 'BlazeFace computer vision pipeline tracks face count and horizontal center to detect looking-away behavior.' },
    { title: 'Adaptive Cooldown AI', desc: 'Per-violation-type 10s cooldown + 2-cycle warmup prevents false positives during model initialization.' },
];

const marqueeItems = [
    'Neural Integrity', 'AI Proctoring', 'Real-Time Detection', 'Edge Computing',
    'Behavioral Analysis', 'Visual Lock', 'Anomaly Detection', 'BlazeFace TF.js',
];

/* ── Framer variants ──────────────────────────────────────────── */
const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
    }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };

/* ── Component ────────────────────────────────────────────────── */
export default function LandingPage() {
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrollPct, setScrollPct] = useState(0);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            const top = window.scrollY;
            const h = document.documentElement.scrollHeight - window.innerHeight;
            setScrollPct(h > 0 ? (top / h) * 100 : 0);
            setScrolled(top > 20);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="landing-root">
            <ParticleField />

            {/* Scroll progress */}
            <div className="landing-progress" style={{ width: `${scrollPct}%` }} />

            {/* ── NAVBAR ─────────────────────────────────────────────── */}
            <nav className={`landing-nav ${scrolled ? 'landing-nav--scrolled' : ''}`}>
                <div className="landing-nav__inner">
                    {/* Logo */}
                    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="landing-logo">
                        <div className="landing-logo__icon">
                            <Shield className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div className="landing-logo__text">
                            <span className="landing-logo__name">PROCTO</span>
                            <span className="landing-logo__sub">Neural Systems</span>
                        </div>
                    </button>

                    {/* Desktop links */}
                    <div className="landing-nav__links">
                        {['home', 'features', 'about'].map(s => (
                            <a key={s} href={`#${s}`} className="landing-nav__link">
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </a>
                        ))}
                    </div>

                    {/* CTAs */}
                    <div className="landing-nav__ctas">
                        <button onClick={() => navigate('/login')} className="landing-btn-primary">
                            Login
                        </button>
                    </div>

                    {/* Mobile toggle */}
                    <button className="landing-nav__toggle" onClick={() => setMobileOpen(v => !v)}>
                        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile menu */}
                <AnimatePresence>
                    {mobileOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="landing-mobile-menu"
                        >
                            {['home', 'features', 'about'].map(s => (
                                <a key={s} href={`#${s}`} className="landing-mobile-link" onClick={() => setMobileOpen(false)}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </a>
                            ))}
                            <button onClick={() => navigate('/login?tab=student')} className="landing-mobile-link text-cyan-400">Student Login</button>
                            <button onClick={() => navigate('/login?tab=faculty')} className="landing-mobile-link text-violet-400">Faculty Login</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* ── HERO ───────────────────────────────────────────────── */}
            <section id="home" className="landing-hero">
                <div className="landing-container landing-hero__grid">

                    {/* Left */}
                    <motion.div initial="hidden" animate="visible" variants={stagger} className="landing-hero__left">
                        <motion.div variants={fadeUp} custom={0} className="landing-badge">
                            <Zap className="w-3 h-3" />
                            Neural Integrity Systems v2.0 · Christ University MCA
                        </motion.div>

                        <motion.div variants={fadeUp} custom={1}>
                            <h1 className="landing-hero__h1">
                                <span className="landing-gradient-text">NEXT‑GEN</span>
                                <br />
                                <GlitchText className="landing-gradient-text--cyan">PROCTORING</GlitchText>
                            </h1>
                        </motion.div>

                        <motion.p variants={fadeUp} custom={2} className="landing-hero__desc">
                            AI-powered proctoring that ensures academic honesty through real-time
                            behavioral analysis, computer vision, and neural pattern recognition.
                        </motion.p>

                        <motion.div variants={fadeUp} custom={3} className="landing-hero__ctas">
                            <button onClick={() => navigate('/login?tab=faculty')} className="landing-btn-primary landing-btn-primary--lg">
                                Faculty Portal
                            </button>
                            <button onClick={() => navigate('/login?tab=student')} className="landing-btn-outline landing-btn-outline--lg">
                                Student Login <ArrowRight className="w-4 h-4" />
                            </button>
                        </motion.div>
                    </motion.div>

                    {/* Right – Live session card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: 40 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="landing-hero__card-wrap"
                    >
                        <div className="landing-session-card">
                            <div className="landing-session-card__glow" />
                            <div className="landing-session-card__inner">
                                <div className="landing-session-card__header">
                                    <span className="landing-session-card__label">Live session</span>
                                    <span className="landing-session-card__status">
                                        <span className="landing-session-card__dot" /> Monitoring
                                    </span>
                                </div>

                                <div className="landing-session-card__body">
                                    <div className="landing-session-card__row">
                                        <div>
                                            <p className="landing-session-card__sublabel">Session code</p>
                                            <p className="landing-session-card__code">PROCTO‑4821</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="landing-session-card__sublabel">Active students</p>
                                            <p className="landing-session-card__code">32</p>
                                        </div>
                                    </div>

                                    {/* QR decoration */}
                                    <div className="landing-session-card__qr-row">
                                        <div className="landing-session-card__qr-box">
                                            <div className="landing-session-card__qr-dots" />
                                        </div>
                                        <div className="landing-session-card__qr-steps">
                                            <p className="landing-session-card__sublabel">Join in 3 steps</p>
                                            <ol className="landing-session-card__steps">
                                                <li>1. Enter session code</li>
                                                <li>2. Verify camera</li>
                                                <li>3. Start exam securely</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>

                                <div className="landing-session-card__stats">
                                    {[
                                        { label: 'Anomalies', value: '0 flagged', color: 'text-amber-300' },
                                        { label: 'Focus', value: '96%', color: 'text-emerald-300' },
                                        { label: 'Integrity', value: 'Stable', color: 'text-cyan-300' },
                                    ].map(s => (
                                        <div key={s.label} className="landing-session-card__stat">
                                            <p className="landing-session-card__sublabel">{s.label}</p>
                                            <p className={`landing-session-card__stat-val ${s.color}`}>{s.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Orbs */}
                <div className="landing-orb landing-orb--tr" />
                <div className="landing-orb landing-orb--bl" />
            </section>

            {/* ── MARQUEE ────────────────────────────────────────────── */}
            <section className="landing-marquee-wrap">
                <div className="landing-marquee-track">
                    {[...marqueeItems, ...marqueeItems].map((item, i) => (
                        <span key={i} className="landing-marquee-item">
                            <span className="landing-marquee-dot" />
                            {item}
                        </span>
                    ))}
                </div>
            </section>

            {/* ── STATS ──────────────────────────────────────────────── */}
            <section className="landing-stats-wrap">
                <div className="landing-container">
                    <motion.div
                        className="landing-stats-grid"
                        initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={stagger}
                    >
                        {[
                            { value: '99.7%', label: 'Detection Accuracy' },
                            { value: '<50ms', label: 'Response Latency' },
                            { value: '10+', label: 'Event Types Tracked' },
                            { value: '24/7', label: 'System Uptime' },
                        ].map((s, i) => (
                            <motion.div key={s.label} variants={fadeUp} custom={i} className="landing-stat">
                                <p className="landing-stat__value">{s.value}</p>
                                <p className="landing-stat__label">{s.label}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── FEATURES GRID ──────────────────────────────────────── */}
            <section id="features" className="landing-section">
                <div className="landing-container">
                    <motion.div
                        className="landing-section__heading"
                        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    >
                        <span className="landing-eyebrow">Advanced Neural Modules</span>
                        <h2 className="landing-section__title">Powered by Intelligence</h2>
                    </motion.div>

                    <motion.div
                        className="landing-features-grid"
                        initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={stagger}
                    >
                        {features.map((f, i) => {
                            const c = accentStyles[f.accent as AccentKey];
                            return (
                                <motion.div key={f.title} variants={fadeUp} custom={i}
                                    className={`landing-feature-card ${c.border} ${c.glow}`}>
                                    <div className={`landing-feature-card__icon ${c.icon}`}>
                                        <f.icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="landing-feature-card__title">{f.title}</h3>
                                    <p className="landing-feature-card__desc">{f.desc}</p>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </div>
            </section>

            {/* ── ABOUT / CAPABILITIES ───────────────────────────────── */}
            <section id="about" className="landing-section landing-section--bordered">
                <div className="landing-container landing-about__grid">
                    {/* Left */}
                    <motion.div
                        initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                    >
                        <span className="landing-eyebrow">Core Architecture</span>
                        <h2 className="landing-section__title">Neural Protocols</h2>
                        <p className="landing-about__built">
                            Built for <span className="landing-gradient-text--cyan">Christ University MCA</span>
                        </p>
                        <p className="landing-about__body">
                            Multi-layered architecture combining TensorFlow.js edge inference with adaptive event
                            monitoring. Developed as part of the Software Project Development course.
                        </p>

                        <div className="landing-caps">
                            {capabilities.map((cap, i) => (
                                <motion.div key={cap.title} className="landing-cap"
                                    initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
                                    <h4 className="landing-cap__title">
                                        <ChevronRight className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                                        {cap.title}
                                    </h4>
                                    <p className="landing-cap__desc">{cap.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Right – System status panel */}
                    <motion.div
                        initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }} transition={{ delay: 0.2 }}
                    >
                        <div className="landing-sys-panel">
                            <div className="landing-sys-panel__glow" />
                            <div className="landing-sys-panel__comment">{'// SYSTEM STATUS'}</div>
                            <div className="landing-sys-panel__rows">
                                {[
                                    { name: 'face_detection', status: 'ACTIVE', color: 'text-emerald-400' },
                                    { name: 'tab_monitor', status: 'ACTIVE', color: 'text-emerald-400' },
                                    { name: 'blur_guard', status: 'ACTIVE', color: 'text-emerald-400' },
                                    { name: 'webcam_capture', status: 'ACTIVE', color: 'text-emerald-400' },
                                    { name: 'anomaly_detect', status: 'LEARNING', color: 'text-cyan-400' },
                                ].map(s => (
                                    <div key={s.name} className="landing-sys-panel__row">
                                        <span>{s.name}</span>
                                        <span className={s.color}>● {s.status}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="landing-sys-panel__score-wrap">
                                <div className="landing-sys-panel__score-row">
                                    <span className="landing-sys-panel__score-label">INTEGRITY SCORE</span>
                                    <span className="landing-sys-panel__score-val">98.7%</span>
                                </div>
                                <div className="landing-sys-panel__bar-bg">
                                    <motion.div
                                        className="landing-sys-panel__bar-fill"
                                        initial={{ width: 0 }}
                                        whileInView={{ width: '98.7%' }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1.5, ease: 'easeOut' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="landing-about-stats">
                            {[
                                { val: '99.9%', label: 'Uptime', color: 'text-cyan-400' },
                                { val: '10+', label: 'Event Types', color: 'text-violet-400' },
                                { val: '98%', label: 'Detection Rate', color: 'text-emerald-400' },
                            ].map(s => (
                                <div key={s.label} className="text-center">
                                    <p className={`text-3xl font-bold ${s.color}`}>{s.val}</p>
                                    <p className="text-sm text-slate-500 mt-1">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ── CTA ────────────────────────────────────────────────── */}
            <section className="landing-cta-wrap">
                <div className="landing-container text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ duration: 0.7 }}
                    >
                        <h2 className="landing-cta__title">
                            <GlitchText className="landing-gradient-text--cyan">JOIN THE NEURAL NETWORK</GlitchText>
                        </h2>
                        <p className="landing-cta__desc">
                            Whether you're a student or educator — there's a place for you in the PROCTO ecosystem.
                        </p>
                        <div className="landing-cta__btns">
                            <button onClick={() => navigate('/login?tab=student')} className="landing-btn-primary landing-btn-primary--lg">
                                Student Access
                            </button>
                            <button onClick={() => navigate('/login?tab=faculty')} className="landing-btn-outline landing-btn-outline--lg">
                                Faculty Portal <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                </div>
                <div className="landing-orb landing-orb--center" />
            </section>

            {/* ── FOOTER ─────────────────────────────────────────────── */}
            <footer className="landing-footer">
                <div className="landing-container">
                    <div className="landing-footer__grid">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Shield className="w-5 h-5 text-cyan-400" />
                                <span className="text-lg font-black tracking-tighter">PROCTO</span>
                            </div>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Neural Integrity Systems v2.0<br />
                                AI-powered exam proctoring.
                            </p>
                        </div>
                        {[
                            { title: 'Protocols', items: ['Neuro-Sync', 'Visual-Lock', 'Audio-Pulse', 'Edge-Hash'] },
                            { title: 'Support', items: ['Documentation', 'System Status', 'Privacy Policy'] },
                            { title: 'Project', items: ['GitHub', 'Christ University MCA', 'SPD Course'] },
                        ].map(col => (
                            <div key={col.title}>
                                <h5 className="landing-footer__col-title">{col.title}</h5>
                                <div className="space-y-2">
                                    {col.items.map(item => (
                                        <div key={item} className="text-sm text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer">{item}</div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="landing-footer__bottom">
                        <span>© {new Date().getFullYear()} PROCTO · Christ University MCA</span>
                        <span className="hidden sm:inline">Built with React · TypeScript · TensorFlow.js</span>
                    </div>
                </div>
            </footer>

            {/* Scanline overlay */}
            <div className="landing-scanlines" />
        </div>
    );
}
