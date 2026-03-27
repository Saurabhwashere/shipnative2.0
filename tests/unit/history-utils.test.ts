import { describe, it, expect } from 'vitest';
import { trimMessages } from '../../lib/history-utils';

type UIMessage = {
  id: string;
  role: string;
  parts?: Array<{ type: string; text?: string }>;
};

function makeUser(id: string, text = 'hello'): UIMessage {
  return { id, role: 'user', parts: [{ type: 'text', text }] };
}

function makeAssistant(id: string, text = 'ok'): UIMessage {
  return { id, role: 'assistant', parts: [{ type: 'text', text }] };
}

// Builds N complete turns (user + assistant pairs)
function buildTurns(n: number): UIMessage[] {
  const msgs: UIMessage[] = [];
  for (let i = 0; i < n; i++) {
    msgs.push(makeUser(`u${i}`, `user message ${i}`));
    msgs.push(makeAssistant(`a${i}`, `assistant reply ${i}`));
  }
  return msgs;
}

// ── Under limit ────────────────────────────────────────────────────────────

describe('trimMessages – under limit', () => {
  it('returns empty array unchanged', () => {
    expect(trimMessages([])).toEqual([]);
  });

  it('returns single message unchanged', () => {
    const msgs = [makeUser('u1')];
    expect(trimMessages(msgs)).toEqual(msgs);
  });

  it('returns exactly 10 turns unchanged', () => {
    const msgs = buildTurns(10);
    const result = trimMessages(msgs);
    expect(result).toEqual(msgs);
    expect(result).toHaveLength(20);
  });

  it('returns 9 turns unchanged', () => {
    const msgs = buildTurns(9);
    const result = trimMessages(msgs);
    expect(result).toEqual(msgs);
  });
});

// ── Over limit ─────────────────────────────────────────────────────────────

describe('trimMessages – over limit', () => {
  it('trims 11 turns to MAX_TURNS result length', () => {
    const msgs = buildTurns(11);
    const result = trimMessages(msgs);
    // first turn (2) + trim marker (1) + trim ack (1) + last 9 turns (18) = 22
    expect(result).toHaveLength(22);
  });

  it('trims 20 turns correctly', () => {
    const msgs = buildTurns(20);
    const result = trimMessages(msgs);
    // first turn (2) + marker (1) + ack (1) + last 9 turns (18) = 22
    expect(result).toHaveLength(22);
  });

  it('keeps the first turn (original user request)', () => {
    const msgs = buildTurns(11);
    const result = trimMessages(msgs);
    // First message should be the very first user message
    expect(result[0].id).toBe('u0');
    expect(result[1].id).toBe('a0');
  });

  it('keeps the last 9 turns', () => {
    const msgs = buildTurns(11); // turns 0-10
    const result = trimMessages(msgs);
    // After first turn + marker + ack, we should have turns 2-10 (last 9)
    const userIds = result.map((m) => m.id).filter((id) => id.startsWith('u'));
    expect(userIds).toContain('u0');  // first turn
    expect(userIds).toContain('u2');  // start of last 9
    expect(userIds).toContain('u10'); // last turn
    expect(userIds).not.toContain('u1'); // trimmed middle
  });

  it('injects trim marker with correct text', () => {
    const msgs = buildTurns(11);
    const result = trimMessages(msgs);
    const marker = result.find((m) => m.id === '__trim_marker__');
    expect(marker).toBeDefined();
    expect(marker!.role).toBe('user');
    const text = marker!.parts?.[0]?.text ?? '';
    expect(text).toContain('earlier conversation turn');
    expect(text).toContain('omitted');
  });

  it('injects trim acknowledgement after marker', () => {
    const msgs = buildTurns(11);
    const result = trimMessages(msgs);
    const markerIdx = result.findIndex((m) => m.id === '__trim_marker__');
    const ack = result[markerIdx + 1];
    expect(ack.id).toBe('__trim_ack__');
    expect(ack.role).toBe('assistant');
  });

  it('trim marker count is singular for 1 trimmed turn', () => {
    const msgs = buildTurns(11); // 11 turns → trims 1
    const result = trimMessages(msgs);
    const marker = result.find((m) => m.id === '__trim_marker__');
    const text = marker!.parts?.[0]?.text ?? '';
    expect(text).toMatch(/1 earlier conversation turn[^s]/);
  });

  it('trim marker count is plural for multiple trimmed turns', () => {
    const msgs = buildTurns(15); // 15 turns → trims 5
    const result = trimMessages(msgs);
    const marker = result.find((m) => m.id === '__trim_marker__');
    const text = marker!.parts?.[0]?.text ?? '';
    expect(text).toMatch(/5 earlier conversation turns/);
  });

  it('never splits a turn — keeps assistant message paired with its user message', () => {
    const msgs = buildTurns(12);
    const result = trimMessages(msgs);
    // Verify every user message (except marker) is followed by its assistant reply
    for (let i = 0; i < result.length - 1; i++) {
      const curr = result[i];
      const next = result[i + 1];
      if (curr.role === 'user' && curr.id !== '__trim_marker__') {
        // The next message should be an assistant message (same turn) or the ack
        if (next.id !== '__trim_ack__') {
          const currNum = curr.id.replace('u', '');
          expect(next.id).toBe(`a${currNum}`);
        }
      }
    }
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────────

describe('trimMessages – edge cases', () => {
  it('handles messages with no parts gracefully', () => {
    const msgs: UIMessage[] = [
      { id: 'u1', role: 'user' },
      { id: 'a1', role: 'assistant' },
    ];
    expect(() => trimMessages(msgs)).not.toThrow();
  });

  it('handles assistant-only messages at start', () => {
    const msgs: UIMessage[] = [
      makeAssistant('a0'),
      ...buildTurns(11),
    ];
    // Should not throw — groups starting from first user msg
    expect(() => trimMessages(msgs)).not.toThrow();
  });
});
