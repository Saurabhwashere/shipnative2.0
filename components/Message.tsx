'use client';

import { ChatMessage } from '@/lib/types';
import ToolCallMessage from './ToolCallMessage';

interface MessageProps {
  message: ChatMessage;
}

function formatTime(ts: number) {
  // ts === 0 means a placeholder/example message with no meaningful time
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Message({ message }: MessageProps) {
  if (message.toolCall) {
    return <ToolCallMessage toolCall={message.toolCall} />;
  }

  const isUser = message.role === 'user';

  return (
    <div
      className={`flex gap-2 animate-fade-in ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end mb-1`}
    >
      {!isUser && (
        <div className="shrink-0 w-6 h-6 rounded-full bg-[#7c83f7] flex items-center justify-center mb-0.5">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 3a1 1 0 110 2 1 1 0 010-2zm0 4a1 1 0 011 1v4a1 1 0 11-2 0v-4a1 1 0 011-1z" />
          </svg>
        </div>
      )}
      <div className={`max-w-[78%] flex flex-col gap-0.5 ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? 'bg-[#5865f2] text-white rounded-br-sm'
              : 'bg-[#1e2029] text-[#e4e4e8] rounded-bl-sm border border-[#2a2d3a]'
          }`}
        >
          {message.content}
        </div>
        {formatTime(message.timestamp) && (
          <span className="text-[10px] text-[#8b8d97] px-1">{formatTime(message.timestamp)}</span>
        )}
      </div>
    </div>
  );
}
