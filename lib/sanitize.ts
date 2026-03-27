/**
 * lib/sanitize.ts
 *
 * Defense-in-depth sanitization for user-supplied text before it is
 * interpolated into a system prompt. Strips the highest-signal prompt
 * injection patterns. The primary control is still the model's own
 * instruction-following, but this reduces noise.
 */
export function sanitizeForPrompt(text: string): string {
  return text
    .replace(/ignore\s+(all\s+)?(previous|above|prior)\s+instructions?/gi, '[redacted]')
    .replace(/system\s+prompt/gi, '[system]')
    .replace(/\[INST\]|\[\/INST\]/g, '')
    .replace(/#{4,}/g, '###')
    .trim();
}
