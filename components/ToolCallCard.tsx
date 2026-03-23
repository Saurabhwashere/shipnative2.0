'use client';

import { useState } from 'react';
import type { DynamicToolUIPart } from 'ai';
import QuestionCard from './QuestionCard';
import PlanCard from './PlanCard';

interface ToolCallCardProps {
  part: DynamicToolUIPart;
  onSend?: (text: string) => void;
}

// ── State helper ──────────────────────────────────────────────────────────────
type VisualState = 'streaming' | 'running' | 'done' | 'error';

function toVisual(state: DynamicToolUIPart['state']): VisualState {
  if (state === 'input-streaming') return 'streaming';
  if (state === 'input-available') return 'running';
  if (state === 'output-available') return 'done';
  return 'error';
}

// ── Shared icon components ────────────────────────────────────────────────────
function Spinner({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className} text-current`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function Check({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={`${className} text-[--color-green-bright]`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ErrorX({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={`${className} text-[#f06a6a]`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ── Loading shimmer for tool cards ────────────────────────────────────────────
function ThinkingDots({ color = 'var(--color-accent)' }: { color?: string }) {
  return (
    <span className="flex gap-1 items-center">
      <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: color, animationDelay: '0ms' }} />
      <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: color, animationDelay: '150ms' }} />
      <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: color, animationDelay: '300ms' }} />
    </span>
  );
}

// ── askQuestions card ─────────────────────────────────────────────────────────
function AskQuestionsCard({ part, onSend }: { part: DynamicToolUIPart; onSend?: (text: string) => void }) {
  const visual = toVisual(part.state);
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, string> | null>(null);

  const input = part.input as {
    questions?: Array<{
      id: string;
      question: string;
      options: Array<{ label: string; value: string }>;
      allowCustom: boolean;
    }>;
  } | undefined;

  const questions = input?.questions ?? [];

  function handleSubmit(answers: Record<string, string>) {
    setSubmittedAnswers(answers);
    if (!onSend) return;

    if (Object.keys(answers).length === 0) {
      // Skipped
      onSend('Skip the questions and go straight to proposing a plan based on what I described.');
    } else {
      const parts = questions
        .map((q) => `${q.question}: ${answers[q.id] ?? ''}`)
        .filter((s) => s);
      onSend(`Here are my answers:\n${parts.join('\n')}\n\nNow please propose a plan.`);
    }
  }

  // Still streaming input — show loading card
  if (visual === 'streaming') {
    return (
      <div className="flex items-start gap-2 my-1.5 animate-fade-in">
        <div className="w-4 shrink-0" />
        <div
          className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2 max-w-[90%]"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.09)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <svg className="w-3.5 h-3.5 shrink-0 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-white/50">Thinking of questions…</span>
          <ThinkingDots color="rgba(255,255,255,0.35)" />
        </div>
      </div>
    );
  }

  // Input available or done — show interactive card (questions are in the input args)
  return (
    <div className="flex items-start gap-2 my-1.5 animate-fade-in">
      <div className="w-4 shrink-0" />
      <div className="flex-1 max-w-[90%]">
        {questions.length > 0 ? (
          <QuestionCard
            questions={questions}
            onSubmit={handleSubmit}
            submitted={submittedAnswers !== null}
            answers={submittedAnswers ?? undefined}
          />
        ) : (
          <div
            className="flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs text-white/40"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <Check />
            Questions ready
          </div>
        )}
      </div>
    </div>
  );
}

// ── proposePlan card ──────────────────────────────────────────────────────────
function ProposePlanCard({ part, onSend }: { part: DynamicToolUIPart; onSend?: (text: string) => void }) {
  const visual = toVisual(part.state);
  const [status, setStatus] = useState<'pending' | 'approved' | 'declined'>('pending');

  const input = part.input as {
    appName?: string;
    description?: string;
    category?: string;
    chosenTemplate?: string;
    theme?: string;
    navigationPattern?: string;
    features?: string[];
    screens?: string[];
    buildSteps?: Array<{ id: string; label: string; files: string[] }>;
  } | undefined;

  function handleApprove() {
    setStatus('approved');
    onSend?.('Plan approved. Please proceed with building the app.');
  }

  function handleDecline() {
    setStatus('declined');
    onSend?.('I\'d like to change the plan. ');
  }

  // Still streaming input
  if (visual === 'streaming') {
    return (
      <div className="flex items-start gap-2 my-1.5 animate-fade-in">
        <div className="w-4 shrink-0" />
        <div
          className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2 max-w-[90%]"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.09)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <svg className="w-3.5 h-3.5 shrink-0 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-xs text-white/50">Building a plan…</span>
          <ThinkingDots color="rgba(255,255,255,0.35)" />
        </div>
      </div>
    );
  }

  // Input available or done — show the plan card
  return (
    <div className="flex items-start gap-2 my-1.5 animate-fade-in">
      <div className="w-4 shrink-0" />
      <div className="flex-1 max-w-[90%]">
        <PlanCard
          appName={input?.appName ?? 'App'}
          description={input?.description ?? ''}
          category={input?.category}
          chosenTemplate={input?.chosenTemplate}
          theme={input?.theme}
          navigationPattern={input?.navigationPattern}
          features={input?.features ?? []}
          screens={input?.screens ?? []}
          buildSteps={input?.buildSteps ?? []}
          onApprove={handleApprove}
          onDecline={handleDecline}
          status={status}
        />
      </div>
    </div>
  );
}

// ── writeFile card ────────────────────────────────────────────────────────────
function WriteFileCard({ part }: { part: DynamicToolUIPart }) {
  const visual = toVisual(part.state);
  const input = part.input as { path?: string; code?: string; description?: string } | undefined;
  const path = input?.path ? input.path.replace(/^\/+/, '') : '';
  const description = input?.description;
  const lineCount = input?.code ? input.code.split('\n').length : 0;

  function handleClick() {
    if (path) {
      window.dispatchEvent(new CustomEvent('open-file-in-editor', { detail: { path } }));
    }
  }

  return (
    <div className="flex items-start gap-2 my-1.5 animate-fade-in">
      <div className="w-4 shrink-0" />
      <button
        onClick={handleClick}
        disabled={!path}
        className="flex-1 max-w-[90%] text-left rounded-2xl overflow-hidden transition-all disabled:pointer-events-none"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
        }}
      >
        <div className="flex items-center gap-2.5 px-3 py-2">
          <svg className="w-3.5 h-3.5 shrink-0 text-[--color-green-bright]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-[#e4e4e8] text-xs font-mono flex-1 truncate">
            {path ? `/${path}` : 'Writing file…'}
          </span>
          <span className="shrink-0">
            {visual === 'done' && (
              <span className="flex items-center gap-1.5">
                {lineCount > 0 && (
                  <span className="text-[10px] text-[--color-text-body]">{lineCount} lines</span>
                )}
                <Check />
              </span>
            )}
            {visual === 'error' && <ErrorX />}
            {(visual === 'streaming' || visual === 'running') && (
              <Spinner className="w-3.5 h-3.5 text-[--color-green-bright]" />
            )}
          </span>
        </div>
        {description && (
          <p className="px-3 pb-2 text-[10px] text-[--color-text-body] leading-relaxed truncate">
            {description}
          </p>
        )}
        {visual === 'done' && path && (
          <p className="px-3 pb-2 text-[9px] text-[--color-accent]/50">Click to open in editor →</p>
        )}
      </button>
    </div>
  );
}

// ── fixError card ─────────────────────────────────────────────────────────────
function FixErrorCard({ part }: { part: DynamicToolUIPart }) {
  const visual = toVisual(part.state);
  const input = part.input as { filePath?: string; explanation?: string } | undefined;
  const filePath = input?.filePath ? input.filePath.replace(/^\/+/, '') : '';
  const explanation = input?.explanation;

  return (
    <div className="flex items-start gap-2 my-1.5 animate-fade-in">
      <div className="w-4 shrink-0" />
      <div
        className="flex-1 max-w-[90%] rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
        }}
      >
        <div className="flex items-center gap-2.5 px-3 py-2">
          <svg className="w-3.5 h-3.5 shrink-0 text-[--color-amber-tool]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[#e4e4e8] text-xs font-mono flex-1 truncate">
            {filePath ? `Fixing /${filePath}` : 'Fixing error…'}
          </span>
          <span className="shrink-0">
            {visual === 'done' && <Check />}
            {visual === 'error' && <ErrorX />}
            {(visual === 'streaming' || visual === 'running') && (
              <Spinner className="w-3.5 h-3.5 text-[--color-amber-tool]" />
            )}
          </span>
        </div>
        {explanation && (
          <p className="px-3 pb-2 text-[10px] text-[--color-text-body] leading-relaxed">
            {explanation}
          </p>
        )}
      </div>
    </div>
  );
}

// ── readFile card ─────────────────────────────────────────────────────────────
function ReadFileCard({ part }: { part: DynamicToolUIPart }) {
  const visual = toVisual(part.state);
  const input = part.input as { path?: string } | undefined;
  const path = input?.path ? input.path.replace(/^\/+/, '') : '';

  return (
    <div className="flex items-start gap-2 my-1 animate-fade-in">
      <div className="w-4 shrink-0" />
      <div
        className="flex items-center gap-2 rounded-2xl px-3 py-1.5 max-w-[90%]"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <svg className="w-3 h-3 shrink-0 text-[#4a4a5a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span className="text-[--color-text-body] font-mono text-[10px] flex-1 truncate">
          {path ? `Reading /${path}` : 'Reading file…'}
        </span>
        {visual === 'done' && <Check className="w-3 h-3" />}
        {(visual === 'streaming' || visual === 'running') && (
          <Spinner className="w-3 h-3 text-[#4a4a5a]" />
        )}
      </div>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function ToolCallCard({ part, onSend }: ToolCallCardProps) {
  switch (part.toolName) {
    case 'askQuestions':
      return <AskQuestionsCard part={part} onSend={onSend} />;
    case 'proposePlan':
      return <ProposePlanCard part={part} onSend={onSend} />;
    case 'writeFile':
      return <WriteFileCard part={part} />;
    case 'fixError':
      return <FixErrorCard part={part} />;
    case 'readFile':
      return <ReadFileCard part={part} />;
    default:
      return (
        <div className="flex items-start gap-2 my-1 animate-fade-in">
          <div className="w-4 shrink-0" />
          <div
            className="flex items-center gap-2 rounded-2xl px-3 py-1.5 text-[10px] text-white/30 font-mono max-w-[90%]"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(20px)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {part.toolName}(…)
          </div>
        </div>
      );
  }
}
