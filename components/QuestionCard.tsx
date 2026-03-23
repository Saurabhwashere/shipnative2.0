'use client';

import { useState } from 'react';

interface Option {
  label: string;
  value: string;
}

interface Question {
  id: string;
  question: string;
  options: Option[];
  allowCustom: boolean;
}

interface QuestionCardProps {
  questions: Question[];
  onSubmit: (answers: Record<string, string>) => void;
  submitted?: boolean;
  answers?: Record<string, string>;
}

export default function QuestionCard({ questions, onSubmit, submitted = false, answers: submittedAnswers }: QuestionCardProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [customActive, setCustomActive] = useState<Record<string, boolean>>({});

  const total = questions.length;

  const allAnswered = questions.every((q) => {
    const ans = answers[q.id];
    if (!ans) return false;
    if (ans === '__custom__') return (customInputs[q.id] ?? '').trim().length > 0;
    return true;
  });

  function handleOptionClick(qId: string, value: string) {
    if (submitted) return;
    if (value === '__custom__') {
      setCustomActive((prev) => ({ ...prev, [qId]: true }));
      setAnswers((prev) => ({ ...prev, [qId]: '__custom__' }));
    } else {
      setCustomActive((prev) => ({ ...prev, [qId]: false }));
      setAnswers((prev) => ({ ...prev, [qId]: value }));
    }
  }

  function handleSubmit() {
    if (!allAnswered || submitted) return;
    const resolved: Record<string, string> = {};
    for (const q of questions) {
      const ans = answers[q.id];
      resolved[q.id] = ans === '__custom__' ? (customInputs[q.id] ?? '') : ans;
    }
    onSubmit(resolved);
  }

  // ── Collapsed summary after submit ────────────────────────────────────────
  if (submitted && submittedAnswers) {
    return (
      <div
        className="rounded-2xl px-4 py-3 overflow-hidden relative"
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.13)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          boxShadow: '0 2px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.3)' }}>
            <svg className="w-2.5 h-2.5 text-[#34d399]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-[11px] text-white/70 font-medium uppercase tracking-wider">Questions answered</span>
        </div>
        <div className="space-y-1">
          {questions.map((q) => (
            <div key={q.id} className="flex gap-2 text-xs">
              <span className="text-white/30 shrink-0">{q.question}</span>
              <span className="text-white/80 font-medium truncate">{submittedAnswers[q.id]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const answeredCount = questions.filter((q) => {
    const ans = answers[q.id];
    if (!ans) return false;
    if (ans === '__custom__') return (customInputs[q.id] ?? '').trim().length > 0;
    return true;
  }).length;

  return (
    <div
      className="rounded-[28px] overflow-hidden flex flex-col relative"
      style={{
        maxHeight: 480,
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.14)',
        backdropFilter: 'blur(48px) saturate(200%) brightness(1.05)',
        WebkitBackdropFilter: 'blur(48px) saturate(200%) brightness(1.05)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.1)',
      }}
    >
      {/* Specular highlight — simulates light hitting glass surface */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 40%, rgba(255,255,255,0.5) 60%, transparent 100%)' }}
      />
      <div
        className="absolute inset-x-0 top-0 h-16 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)' }}
      />

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0 relative"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            <span className="text-[10px] font-bold text-white/80">?</span>
          </div>
          <span className="text-[13px] font-semibold text-white/90">Questions</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1">
            {questions.map((q) => {
              const ans = answers[q.id];
              const filled = ans && (ans !== '__custom__' || (customInputs[q.id] ?? '').trim().length > 0);
              return (
                <div
                  key={q.id}
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{
                    background: filled ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
                    boxShadow: filled ? '0 0 6px rgba(255,255,255,0.5)' : 'none',
                  }}
                />
              );
            })}
          </div>
          <span className="text-[11px] text-white/35 font-mono tabular-nums">
            {answeredCount}/{total}
          </span>
        </div>
      </div>

      {/* Scrollable questions list */}
      <div className="overflow-y-auto flex-1 px-5 py-5 space-y-8" style={{ scrollbarWidth: 'none' }}>
        {questions.map((q, qi) => (
          <div key={q.id}>
            {/* Question text */}
            <p className="text-[13px] text-white/85 font-medium leading-snug mb-4">
              <span className="text-white/25 mr-2 text-[11px] font-mono">{qi + 1}.</span>
              {q.question}
            </p>

            {/* Options */}
            <div className="space-y-2.5">
              {q.options.map((opt) => {
                const isSelected = answers[q.id] === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleOptionClick(q.id, opt.value)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-all duration-200"
                    style={{
                      background: isSelected
                        ? 'rgba(255,255,255,0.15)'
                        : 'rgba(255,255,255,0.05)',
                      border: isSelected
                        ? '1px solid rgba(255,255,255,0.3)'
                        : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: isSelected
                        ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.15)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                    }}
                  >
                    {/* Radio circle */}
                    <span
                      className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center transition-all duration-200"
                      style={{
                        background: isSelected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.08)',
                        border: isSelected ? '1px solid rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.2)',
                        boxShadow: isSelected ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
                      }}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-black/60" />}
                    </span>
                    <span
                      className="text-[12px] leading-snug transition-colors duration-200"
                      style={{ color: isSelected ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)' }}
                    >
                      {opt.label}
                    </span>
                    {isSelected && (
                      <svg className="w-3.5 h-3.5 text-white/70 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}

              {/* Custom "Other…" option */}
              {q.allowCustom && (
                <button
                  onClick={() => handleOptionClick(q.id, '__custom__')}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-all duration-200"
                  style={{
                    background: customActive[q.id] ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                    border: customActive[q.id] ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: customActive[q.id]
                      ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.15)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center transition-all duration-200"
                    style={{
                      background: customActive[q.id] ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.08)',
                      border: customActive[q.id] ? '1px solid rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.2)',
                      boxShadow: customActive[q.id] ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
                    }}
                  >
                    {customActive[q.id] && <span className="w-1.5 h-1.5 rounded-full bg-black/60" />}
                  </span>
                  <span
                    className="text-[12px] transition-colors duration-200"
                    style={{ color: customActive[q.id] ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)' }}
                  >
                    Other…
                  </span>
                </button>
              )}
            </div>

            {/* Custom text input */}
            {customActive[q.id] && (
              <input
                type="text"
                placeholder="Type your answer…"
                value={customInputs[q.id] ?? ''}
                onChange={(e) => setCustomInputs((prev) => ({ ...prev, [q.id]: e.target.value }))}
                className="mt-2 w-full rounded-2xl px-3.5 py-2.5 text-xs text-white/90 placeholder-white/25 outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(8px)',
                }}
                autoFocus
              />
            )}

            {/* Divider */}
            {qi < total - 1 && (
              <div className="mt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0 relative"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(0,0,0,0.08)',
        }}
      >
        {/* Bottom specular */}
        <div
          className="absolute inset-x-0 bottom-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }}
        />
        <button
          onClick={() => onSubmit({})}
          className="text-[12px] text-white/30 hover:text-white/60 transition-colors px-2 py-1"
        >
          Skip
        </button>
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[12px] font-semibold transition-all duration-200 disabled:cursor-not-allowed"
          style={{
            background: allAnswered
              ? 'rgba(255,255,255,0.92)'
              : 'rgba(255,255,255,0.08)',
            color: allAnswered ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.2)',
            border: allAnswered ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: allAnswered ? '0 0 16px rgba(255,255,255,0.2), inset 0 1px 0 rgba(255,255,255,0.8)' : 'none',
          }}
        >
          Submit
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
