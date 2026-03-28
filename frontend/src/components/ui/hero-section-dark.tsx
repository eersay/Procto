import { motion } from 'framer-motion';
import { Zap, ArrowRight } from 'lucide-react';
import GlitchText from '../GlitchText';

interface GridOptions {
  angle?: number;
  cellSize?: number;
  opacity?: number;
  lightLineColor?: string;
  darkLineColor?: string;
}

interface HeroSectionProps {
  title: string;
  subtitle: {
    regular: string;
    gradient: string;
  };
  description: string;
  ctaText: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
  gridOptions?: GridOptions;
}

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export function HeroSection({
  title,
  subtitle,
  description,
  ctaText,
  ctaOnClick,
  gridOptions = {},
}: HeroSectionProps) {
  const {
    angle = 65,
    cellSize = 60,
    opacity = 0.3,
    lightLineColor = '#e2e8f0',
    darkLineColor = '#1e293b',
  } = gridOptions;

  return (
    <section id="home" className="landing-hero">
      <div className="landing-container landing-hero__grid">
        {/* Left */}
        <motion.div initial="hidden" animate="visible" variants={stagger} className="landing-hero__left">
          <motion.div variants={fadeUp} custom={0} className="landing-badge">
            <Zap className="w-3 h-3" />
            {title}
          </motion.div>

          <motion.div variants={fadeUp} custom={1}>
            <h1 className="landing-hero__h1">
              <span className="landing-gradient-text">{subtitle.regular}</span>
              <br />
              <span className="landing-gradient-text--cyan">{subtitle.gradient}</span>
            </h1>
          </motion.div>

          <motion.p variants={fadeUp} custom={2} className="landing-hero__desc">
            {description}
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="landing-hero__ctas">
            <button onClick={ctaOnClick} className="landing-btn-primary landing-btn-primary--lg">
              {ctaText}
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
  );
}
