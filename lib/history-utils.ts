/**
 * Trims conversation history to keep the context window lean.
 *
 * Strategy:
 * - Keep the first message (original user request — important for context)
 * - Keep the last N turns
 * - Inject a separator so the model knows earlier history was trimmed
 *
 * "Turn" = one user message + the assistant response(s) that follow it.
 * We never split a turn mid-way — tool call / result pairs stay together.
 */

type UIPart = {
  type: string;
  text?: string;
  toolName?: string;
  [key: string]: unknown;
};

type UIMessage = {
  id: string;
  role: string;
  parts?: UIPart[];
  content?: string | UIPart[];
  [key: string]: unknown;
};

const MAX_TURNS = 10; // keep last 10 user→assistant exchanges (~20 messages)

export function trimMessages(messages: UIMessage[]): UIMessage[] {
  if (messages.length === 0) return messages;

  // Group messages into turns: each turn starts with a user message
  const turns: UIMessage[][] = [];
  let currentTurn: UIMessage[] = [];

  for (const msg of messages) {
    if (msg.role === 'user' && currentTurn.length > 0) {
      turns.push(currentTurn);
      currentTurn = [];
    }
    currentTurn.push(msg);
  }
  if (currentTurn.length > 0) turns.push(currentTurn);

  // If within limit, return as-is
  if (turns.length <= MAX_TURNS) return messages;

  // Keep first turn (original request) + last MAX_TURNS-1 turns
  const firstTurn = turns[0];
  const recentTurns = turns.slice(-(MAX_TURNS - 1));
  const trimmedCount = turns.length - MAX_TURNS;

  // Inject a synthetic user message marking the trim point
  const trimMarker: UIMessage = {
    id: '__trim_marker__',
    role: 'user',
    parts: [
      {
        type: 'text',
        text: `[System: ${trimmedCount} earlier conversation turn${trimmedCount > 1 ? 's' : ''} were omitted to save context. The current project files are provided in full above.]`,
      },
    ],
  };

  // Synthetic assistant acknowledgement (keeps message pair valid)
  const trimAck: UIMessage = {
    id: '__trim_ack__',
    role: 'assistant',
    parts: [{ type: 'text', text: 'Understood. Continuing from current project state.' }],
  };

  return [
    ...firstTurn,
    trimMarker,
    trimAck,
    ...recentTurns.flat(),
  ];
}
