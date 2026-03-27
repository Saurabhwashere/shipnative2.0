import { type ZodSchema } from 'zod';
import { NextResponse } from 'next/server';

type ParseSuccess<T> = { data: T; error: null };
type ParseFailure = { data: null; error: NextResponse };

export function parseBody<T>(
  schema: ZodSchema<T>,
  body: unknown,
): ParseSuccess<T> | ParseFailure {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 },
      ),
    };
  }
  return { data: result.data, error: null };
}
