'use client';

interface BuildStep {
  id: string;
  label: string;
  files: string[];
}

interface BuildProgressProps {
  buildSteps: BuildStep[];
  writtenFiles: string[];
  isStreaming: boolean;
}

export default function BuildProgress({ buildSteps, writtenFiles, isStreaming }: BuildProgressProps) {
  if (!buildSteps.length) return null;

  // Determine which steps are done based on files written
  const completedSteps = buildSteps.filter((step) =>
    step.files.length === 0 || step.files.some((f) => writtenFiles.includes(f)),
  );
  const completedCount = completedSteps.length;
  const totalCount = buildSteps.length;
  const allDone = completedCount === totalCount && !isStreaming;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Find the currently active step (first step with files not yet written)
  const activeStepIndex = buildSteps.findIndex(
    (step) => step.files.length > 0 && !step.files.some((f) => writtenFiles.includes(f)),
  );

  return (
    <div className="rounded-2xl border border-[#1f2133] bg-[#0f1117] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {allDone ? (
            <div className="w-4 h-4 rounded-full bg-[#34d399]/20 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-[#34d399]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div
              className="w-4 h-4 rounded-full border-2 border-[#1f2133] border-t-white animate-spin"
            />
          )}
          <span className="text-[11px] font-semibold text-[#f0f0f5]">
            {allDone
              ? 'Build complete'
              : `Building ${buildSteps[activeStepIndex]?.label ?? '…'}`}
          </span>
        </div>
        <span className="text-[10px] text-[#6b7080]">
          {completedCount} / {totalCount} steps
        </span>
      </div>

      {/* Progress bar with gradient */}
      <div className="w-full h-1 rounded-full bg-[#1f2133] overflow-hidden">
        <div
          className="h-full rounded-full relative overflow-hidden transition-all duration-500"
          style={{
            width: `${progressPct}%`,
            background: 'linear-gradient(90deg, #ffffff 0%, #34d399 100%)',
          }}
        >
          {/* Shimmer on active */}
          {!allDone && (
            <div
              className="absolute inset-y-0 w-1/4 animate-shimmer"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }}
            />
          )}
        </div>
      </div>

      {/* Steps list */}
      <div className="space-y-1.5">
        {buildSteps.map((step, i) => {
          const isDone = completedSteps.includes(step);
          const isActive = i === activeStepIndex;
          return (
            <div key={step.id} className="flex items-center gap-2">
              {/* Status node */}
              <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                {isDone ? (
                  <div className="w-5 h-5 rounded-full bg-[#34d399]/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-[#34d399]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : isActive ? (
                  <div
                    className="w-5 h-5 rounded-full bg-white animate-pulse flex items-center justify-center"
                    style={{ boxShadow: '0 0 0 4px rgba(255,255,255,0.15)' }}
                  >
                    <div className="w-2 h-2 rounded-full bg-white/70" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full bg-[#1f2133]" />
                )}
              </div>
              {/* Label */}
              <span
                className={`text-[11px] truncate flex-1 ${
                  isDone
                    ? 'text-[--color-text-dim]'
                    : isActive
                    ? 'text-[#f0f0f5] font-medium'
                    : 'text-[#3d4055]'
                }`}
              >
                {step.label}
              </span>
              {/* File chip — first filename when active, else file count */}
              {step.files.length > 0 && (
                <span className="ml-auto text-[9px] font-mono bg-[#141620] border border-[#1f2133] rounded px-1.5 py-0.5 shrink-0 truncate max-w-[80px]"
                  style={{ color: isActive ? 'rgba(255,255,255,0.7)' : '#3d4055' }}
                >
                  {isActive ? step.files[0] : `${step.files.length} file${step.files.length !== 1 ? 's' : ''}`}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
