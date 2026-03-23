'use client';

interface BuildStep {
  id: string;
  label: string;
  files: string[];
}

interface PlanCardProps {
  appName: string;
  description: string;
  category?: string;
  chosenTemplate?: string;
  theme?: string;
  navigationPattern?: string;
  features: string[];
  screens: string[];
  buildSteps: BuildStep[];
  onApprove: () => void;
  onDecline: () => void;
  status: 'pending' | 'approved' | 'declined';
}

const glassBase = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.13)',
  backdropFilter: 'blur(48px) saturate(200%) brightness(1.05)',
  WebkitBackdropFilter: 'blur(48px) saturate(200%) brightness(1.05)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.1)',
} as React.CSSProperties;

export default function PlanCard({
  appName,
  description,
  category,
  chosenTemplate,
  theme,
  navigationPattern,
  features,
  screens,
  buildSteps,
  onApprove,
  onDecline,
  status,
}: PlanCardProps) {
  // ── Approved collapsed state ──────────────────────────────────────────────
  if (status === 'approved') {
    return (
      <div className="rounded-[20px] px-4 py-3 relative overflow-hidden" style={glassBase}>
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.5), transparent)' }} />
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.3)' }}>
            <svg className="w-2.5 h-2.5 text-[#34d399]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold text-white/90">{appName}</span>
            <span className="text-xs text-white/40 ml-2">Plan approved · Building now…</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Declined state ────────────────────────────────────────────────────────
  if (status === 'declined') {
    return (
      <div className="rounded-[20px] px-4 py-3 relative overflow-hidden" style={glassBase}>
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(248,113,113,0.4), transparent)' }} />
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.3)' }}>
            <svg className="w-2.5 h-2.5 text-[#f87171]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span className="text-xs text-white/40">Plan declined — describe what you'd like instead</span>
        </div>
      </div>
    );
  }

  // ── Full plan pending approval ────────────────────────────────────────────
  return (
    <div className="rounded-[28px] overflow-hidden relative" style={glassBase}>
      {/* Top specular highlight */}
      <div className="absolute inset-x-0 top-0 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 40%, rgba(255,255,255,0.5) 60%, transparent 100%)' }} />
      <div className="absolute inset-x-0 top-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)' }} />

      <div className="p-5 space-y-5 relative">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-white/95">{appName}</p>
            <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{description}</p>
            {(category || chosenTemplate || theme || navigationPattern) && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {[category, chosenTemplate, theme, navigationPattern].filter(Boolean).map((tag, i) => (
                  <span
                    key={i}
                    className="rounded-full px-2.5 py-1 text-[10px] font-medium tracking-wide"
                    style={{
                      background: i === 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)',
                      border: i === 1 ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.1)',
                      color: i === 1 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />

        {/* Features + Screens */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-2.5">Features</p>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} className="mb-3" />
            <ul className="space-y-2">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-[11px] text-white/70">
                  <svg className="w-3 h-3 text-[#34d399] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-2.5">Screens</p>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} className="mb-3" />
            <ul className="space-y-2">
              {screens.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-[11px] text-white/70">
                  <svg className="w-3 h-3 text-white/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />

        {/* Build steps */}
        <div>
          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-3">Build Plan</p>
          <div className="space-y-3">
            {buildSteps.map((step, i) => (
              <div key={step.id} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
                  }}
                >
                  <span className="text-[9px] text-white/50 font-mono">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white/75">{step.label}</p>
                  {step.files.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {step.files.map((file) => (
                        <span
                          key={file}
                          className="font-mono text-[9px] rounded-md px-1.5 py-0.5"
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.4)',
                          }}
                        >
                          {file}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons footer */}
      <div
        className="flex items-center gap-2.5 px-5 py-4 relative"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.08)' }}
      >
        <div className="absolute inset-x-0 bottom-0 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />

        <button
          onClick={onApprove}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[13px] font-semibold transition-all"
          style={{
            background: 'rgba(255,255,255,0.93)',
            color: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 0 20px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Approve & Build
        </button>

        <button
          onClick={onDecline}
          className="px-4 py-2.5 rounded-2xl text-[13px] font-medium transition-all"
          style={{
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.25)',
            color: 'rgba(248,113,113,0.85)',
            boxShadow: 'inset 0 1px 0 rgba(248,113,113,0.1)',
          }}
        >
          Change plan
        </button>
      </div>
    </div>
  );
}
