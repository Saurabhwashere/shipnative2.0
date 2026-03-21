import { http, HttpResponse } from 'msw';

// Default /api/chat handler — returns a minimal SSE stream with an askQuestions tool call
export const defaultChatHandler = http.post('/api/chat', () => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Minimal Vercel AI SDK UIMessageStreamResponse format
      const lines = [
        `f:{"messageId":"msg-1"}\n`,
        `0:"Thinking..."\n`,
        `e:{"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":10},"isContinued":false}\n`,
        `d:{"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":10}}\n`,
      ];
      for (const line of lines) {
        controller.enqueue(encoder.encode(line));
      }
      controller.close();
    },
  });
  return new HttpResponse(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
});

export const handlers = [defaultChatHandler];
