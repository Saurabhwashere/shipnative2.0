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

  // ── Collapsed summary after submit ───────────────────────────────────────
  if (submitted && submittedAnswers) {
    return (
      <div className="rounded-2xl border border-[#818cf8]/20 bg-[#818cf8]/5 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 rounded-full bg-[#34d399]/20 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-[#34d399]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-[11px] text-[#818cf8] font-medium uppercase tracking-wider">Questions answered</span>
        </div>
        <div className="space-y-1">
          {questions.map((q) => (
            <div key={q.id} className="flex gap-2 text-xs">
              <span className="text-[#6b7080] shrink-0">{q.question}</span>
              <span className="text-[#f0f0f5] font-medium truncate">{submittedAnswers[q.id]}</span>
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
      className="rounded-2xl border border-[#2e3148] bg-[#0f1117] overflow-hidden flex flex-col"
      style={{ maxHeight: 480, boxShadow: '0 4px 24px rgba(0,0,0,0.4), -2px 0 12px rgba(129,140,248,0.06)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f2133] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full border border-[#818cf8]/40 flex items-center justify-center">
            <span className="text-[10px] font-bold text-[#818cf8]">?</span>
          </div>
          <span className="text-[12px] font-semibold text-[#f0f0f5]">Questions</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {questions.map((q) => {
              const ans = answers[q.id];
              const filled = ans && (ans !== '__custom__' || (customInputs[q.id] ?? '').trim().length > 0);
              return (
                <div
                  key={q.id}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: filled ? 'var(--color-accent)' : 'var(--color-border-bright)' }}
                />
              );
            })}
          </div>
          <span className="text-[11px] text-[#6b7080] font-mono">
            {answeredCount}/{total}
          </span>
        </div>
      </div>

      {/* Scrollable questions list */}
      <div className="overflow-y-auto flex-1 px-4 py-3 space-y-5" style={{ scrollbarWidth: 'none' }}>
        {questions.map((q, qi) => (
          <div key={q.id}>
            {/* Question text */}
            <p className="text-[13px] text-[#f0f0f5] font-medium leading-snug mb-2.5">
              <span className="text-[#3d4055] mr-2 text-[11px] font-mono">{qi + 1}.</span>
              {q.question}
            </p>

            {/* Options */}
            <div className="space-y-1.5">
              {q.options.map((opt, i) => {
                const isSelected = answers[q.id] === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleOptionClick(q.id, opt.value)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-[#818cf8]/10 border-[#818cf8]/50 text-[#f0f0f5]'
                        : 'bg-[#141620] border-[#1f2133] text-[--color-text-dim] hover:border-[#2e3148] hover:text-[#f0f0f5] hover:bg-[#191b28]'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center border transition-colors"
                      style={{
                        background: isSelected ? 'var(--color-accent)' : 'transparent',
                        borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border-bright)',
                      }}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <span className="text-[12px] leading-snug">{opt.label}</span>
                    {isSelected && (
                      <svg className="w-3.5 h-3.5 text-[#818cf8] ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}

              {/* Custom option */}
              {q.allowCustom && (
                <button
                  onClick={() => handleOptionClick(q.id, '__custom__')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    customActive[q.id]
                      ? 'bg-[#818cf8]/10 border-[#818cf8]/50 text-[#f0f0f5]'
                      : 'bg-[#141620] border-[#1f2133] text-[--color-text-dim] hover:border-[#2e3148] hover:text-[#f0f0f5] hover:bg-[#191b28]'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center border transition-colors"
                    style={{
                      background: customActive[q.id] ? 'var(--color-accent)' : 'transparent',
                      borderColor: customActive[q.id] ? 'var(--color-accent)' : 'var(--color-border-bright)',
                    }}
                  >
                    {customActive[q.id] && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="text-[12px]">Other…</span>
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
                className="mt-2 w-full bg-[#141620] border border-[#1f2133] rounded-xl px-3 py-2 text-xs text-[#f0f0f5] placeholder-[#3d4055] outline-none focus:border-[#818cf8]/50 transition-colors"
                autoFocus
              />
            )}

            {/* Divider between questions */}
            {qi < total - 1 && <div className="mt-5 border-t border-[#1a1c28]" />}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[#1f2133] shrink-0">
        <button
          onClick={() => onSubmit({})}
          className="text-[12px] text-[#6b7080] hover:text-[#f0f0f5] transition-colors px-2 py-1"
        >
          Skip
        </button>
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: allAnswered ? 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)' : '#1f2133',
            color: allAnswered ? 'white' : '#3d4055',
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
