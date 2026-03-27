import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimiters } from '@/lib/rate-limit';
import { parseBody } from '@/lib/validation/parse';
import { UploadReferenceImageSchema } from '@/lib/validation/schemas';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const MIME_MAGIC: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header
};

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const rl = rateLimiters.upload.check(clerkId);
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(rl.resetInMs / 1000)) },
    });
  }

  // ── Validate request body ─────────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { data: input, error: validationError } = parseBody(UploadReferenceImageSchema, rawBody);
  if (validationError) return validationError;

  const { dataUrl, mimeType = 'image/jpeg', fileName: _fileName = 'image.jpg' } = input;

  // ── Decode buffer and enforce size limit ─────────────────────────────────
  const base64Data = dataUrl.split(',')[1];
  if (!base64Data) return NextResponse.json({ error: 'Invalid dataUrl' }, { status: 400 });

  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Image exceeds 5 MB limit' }, { status: 413 });
  }

  // ── Verify magic bytes match declared MIME type ───────────────────────────
  const magic = MIME_MAGIC[mimeType];
  if (magic && !magic.every((byte, i) => buffer[i] === byte)) {
    return NextResponse.json(
      { error: 'File content does not match declared MIME type' },
      { status: 400 },
    );
  }

  const ext = mimeType.split('/')[1] ?? 'jpg';
  const storagePath = `ref-images/${clerkId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('uploads')
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

  if (error) {
    console.error('Supabase storage upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const { data } = supabase.storage.from('uploads').getPublicUrl(storagePath);
  return NextResponse.json({ url: data.publicUrl });
}
