'use client';

import { ToolCallDisplay } from '@/lib/types';

const toolIcons: Record<string, string> = {
  writeFile: '📄',
  readFile: '📖',
  planProject: '🗺️',
};

const toolLabels: Record<string, (args: Record<string, any>) => string> = {
  writeFile: (args) => `Creating ${args.path ?? 'file'}...`,
  readFile: (args) => `Reading ${args.path ?? 'file'}...`,
  planProject: () => 'Planning project structure...',
};

interface ToolCallMessageProps {
  toolCall: ToolCallDisplay;
}

export default function ToolCallMessage({ toolCall }: ToolCallMessageProps) {
  const icon = toolIcons[toolCall.toolName] ?? '🔧';
  const label =
    toolLabels[toolCall.toolName]?.(toolCall.args) ??
    `${toolCall.toolName}(...)`;

  return (
    <div className="flex items-start gap-2 my-1">
      <div className="w-4 shrink-0" />
      <div className="flex items-center gap-2.5 bg-[#1e2029] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm max-w-[90%]">
        <span className="text-base leading-none">{icon}</span>
        <span className="text-[#8b8d97] font-mono text-xs flex-1 truncate">
          {label}
        </span>
        {toolCall.status === 'calling' && (
          <span className="shrink-0">
            <svg
              className="animate-spin h-3.5 w-3.5 text-[#7c83f7]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </span>
        )}
        {toolCall.status === 'complete' && (
          <svg
            className="h-3.5 w-3.5 text-[#43d9a2] shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
        {toolCall.status === 'error' && (
          <svg
            className="h-3.5 w-3.5 text-[#f06a6a] shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
