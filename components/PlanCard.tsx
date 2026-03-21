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
      <div className="rounded-2xl border border-[#34d399]/30 bg-[#34d399]/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#34d399]/20 flex items-center justify-center shrink-0">
            <svg className="w-2.5 h-2.5 text-[#34d399]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold text-[#f0f0f5]">{appName}</span>
            <span className="text-xs text-[#6b7080] ml-2">Plan approved · Building now…</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Declined state ────────────────────────────────────────────────────────
  if (status === 'declined') {
    return (
      <div className="rounded-2xl border border-[#f87171]/30 bg-[#f87171]/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#f87171]/20 flex items-center justify-center shrink-0">
            <svg className="w-2.5 h-2.5 text-[#f87171]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span className="text-xs text-[#6b7080]">Plan declined — describe what you'd like instead</span>
        </div>
      </div>
    );
  }

  // ── Full plan pending approval ────────────────────────────────────────────
  return (
    <div
      className="rounded-2xl border border-[#818cf8]/20 bg-[#0f1117] p-5 space-y-4"
      style={{ boxShadow: '-2px 0 12px rgba(129,140,248,0.08)' }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: 'linear-gradient(135deg, rgba(129,140,248,0.2) 0%, rgba(99,102,241,0.1) 100%)', border: '1px solid rgba(129,140,248,0.2)' }}
        >
          <svg className="w-4.5 h-4.5 text-[#818cf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-[#f0f0f5]">{appName}</p>
          <p className="text-xs text-[#6b7080] mt-0.5 leading-relaxed">{description}</p>
          {(category || chosenTemplate || theme || navigationPattern) && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {category && (
                <span className="rounded-full border border-[#1f2133] bg-[#141620] px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-[#9fa6c3]">
                  {category}
                </span>
              )}
              {chosenTemplate && (
                <span className="rounded-full border border-[#818cf8]/25 bg-[#818cf8]/10 px-2 py-1 text-[10px] font-medium text-[#b5bbff]">
                  {chosenTemplate}
                </span>
              )}
              {theme && (
                <span className="rounded-full border border-[#1f2133] bg-[#141620] px-2 py-1 text-[10px] font-medium text-[#d2d5e2]">
                  {theme}
                </span>
              )}
              {navigationPattern && (
                <span className="rounded-full border border-[#1f2133] bg-[#141620] px-2 py-1 text-[10px] font-medium text-[#d2d5e2]">
                  {navigationPattern}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Features + Screens */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold text-[#3d4055] uppercase tracking-widest mb-2">Features</p>
          <div className="w-full h-px bg-[#1f2133] mb-2" />
          <ul className="space-y-1">
            {features.map((f, i) => (
              <li key={i} className="flex items-center gap-1.5 text-[11px] text-[#f0f0f5]/80">
                <svg className="w-3 h-3 text-[#34d399] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-[#3d4055] uppercase tracking-widest mb-2">Screens</p>
          <div className="w-full h-px bg-[#1f2133] mb-2" />
          <ul className="space-y-1">
            {screens.map((s, i) => (
              <li key={i} className="flex items-center gap-1.5 text-[11px] text-[#f0f0f5]/80">
                <svg className="w-3 h-3 text-[#818cf8] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Build steps */}
      <div>
        <p className="text-[10px] font-semibold text-[#3d4055] uppercase tracking-widest mb-2">Build plan</p>
        <div className="w-full h-px bg-[#1f2133] mb-3" />
        <div className="space-y-2">
          {buildSteps.map((step, i) => (
            <div key={step.id} className="flex items-start gap-2.5">
              <div className="w-4 h-4 rounded-full bg-[#141620] border border-[#1f2133] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[9px] text-[#6b7080] font-mono">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#f0f0f5]/80">{step.label}</p>
                {step.files.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {step.files.map((file) => (
                      <span
                        key={file}
                        className="bg-[#141620] border border-[#1f2133] font-mono text-[9px] text-[#6b7080] rounded px-1.5 py-0.5"
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

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onApprove}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-xs font-semibold transition-all"
          style={{
            background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
            boxShadow: '0 4px 12px rgba(129,140,248,0.25)',
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Approve & Build
        </button>
        <button
          onClick={onDecline}
          className="px-4 py-2 rounded-xl bg-[#141620] hover:bg-[#1e2030] border border-[#f87171]/30 text-[#f87171] hover:text-[#f87171] text-xs transition-colors"
        >
          Change plan
        </button>
      </div>
    </div>
  );
}
