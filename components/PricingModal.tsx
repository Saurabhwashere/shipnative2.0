'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
}

const FREE_FEATURES = [
  '5 credits',
  'React Native preview',
  'Public projects',
];

const PRO_FEATURES = [
  '100 credits / month',
  'Download project files',
  'Private projects',
  'Priority support',
];

// Light orange accent
const ORANGE = '#fb923c';
const ORANGE_DARK = '#ea7215';

function Check() {
  return (
    <svg className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none">
      <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PricingModal({ open, onClose }: PricingModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-2xl rounded-3xl p-8 pointer-events-auto"
              style={{
                background: 'rgba(22,22,28,0.98)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
              }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Header */}
              <div className="text-center mb-8">
                <h2
                  className="text-4xl text-white mb-2"
                  style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
                >
                  Choose your plan.
                </h2>
                <p className="text-base text-white/45" style={{ fontFamily: 'var(--font-body)' }}>
                  From first idea to shipped app.
                </p>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Free */}
                <div
                  className="rounded-2xl p-6 flex flex-col"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="mb-5">
                    <h3
                      className="text-2xl font-bold text-white mb-1"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      Free
                    </h3>
                    <p className="text-sm text-white/40 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
                      Try it out, no card needed.
                    </p>
                    <div className="flex items-end gap-1">
                      <span
                        className="text-5xl font-bold text-white"
                        style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em' }}
                      >
                        $0
                      </span>
                    </div>
                  </div>

                  <ul className="flex flex-col gap-3 mb-8 flex-1">
                    {FREE_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-base text-white/60" style={{ fontFamily: 'var(--font-body)' }}>
                        <Check />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    disabled
                    className="w-full py-3 rounded-xl text-base font-semibold text-white/40 cursor-default"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Current Plan
                  </button>
                </div>

                {/* Pro */}
                <div
                  className="rounded-2xl p-6 flex flex-col relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #1f1510 0%, #1a1208 100%)',
                    border: '1px solid rgba(251,146,60,0.25)',
                    boxShadow: `0 0 0 1px rgba(251,146,60,0.12), 0 8px 32px rgba(251,146,60,0.1)`,
                  }}
                >
                  {/* Subtle glow top-right */}
                  <div
                    className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.15) 0%, transparent 70%)' }}
                  />

                  <div className="mb-5 relative">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className="text-2xl font-bold text-white"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        Pro
                      </h3>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(251,146,60,0.18)', color: ORANGE }}
                      >
                        POPULAR
                      </span>
                    </div>
                    <p className="text-sm text-white/40 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
                      Everything you need to ship.
                    </p>
                    <div className="flex items-end gap-1">
                      <span
                        className="text-5xl font-bold text-white"
                        style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em' }}
                      >
                        $15
                      </span>
                      <span className="text-white/40 text-base mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                        /mo
                      </span>
                    </div>
                  </div>

                  <ul className="flex flex-col gap-3 mb-8 flex-1 relative">
                    {PRO_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-base text-white/80" style={{ fontFamily: 'var(--font-body)' }}>
                        <span style={{ color: ORANGE }}><Check /></span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    className="relative w-full py-3 rounded-xl text-base font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{
                      background: `linear-gradient(135deg, ${ORANGE} 0%, ${ORANGE_DARK} 100%)`,
                      fontFamily: 'var(--font-body)',
                      boxShadow: '0 4px 16px rgba(251,146,60,0.35)',
                    }}
                  >
                    Upgrade to Pro
                  </button>
                </div>
              </div>

              {/* Footer note */}
              <p className="text-center text-sm text-white/25 mt-6" style={{ fontFamily: 'var(--font-body)' }}>
                Credits reset monthly. Cancel anytime.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
