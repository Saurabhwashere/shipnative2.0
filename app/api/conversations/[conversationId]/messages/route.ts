import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getUserByClerkId } from '@/lib/db/queries/users';
import { getMessages, appendMessages } from '@/lib/db/queries/messages';
import { supabaseAdmin } from '@/lib/db/client';
import { parseBody } from '@/lib/validation/parse';
import { AppendMessagesSchema } from '@/lib/validation/schemas';

type Params = { params: Promise<{ conversationId: string }> };

async function verifyAccess(conversationId: string, userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('conversations')
    .select('projects!inner(user_id)')
    .eq('id', conversationId)
    .maybeSingle();

  const project = (data as any)?.projects;
  return project?.user_id === userId;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { conversationId } = await params;
  const user = await getUserByClerkId(clerkId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const ok = await verifyAccess(conversationId, user.id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10), 0);

  const data = await getMessages(conversationId, { limit, offset });
  return NextResponse.json({ messages: data, limit, offset });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { conversationId } = await params;
  const user = await getUserByClerkId(clerkId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const ok = await verifyAccess(conversationId, user.id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const rawBody = await req.json().catch(() => ({}));
  const { data: input, error: validationError } = parseBody(AppendMessagesSchema, rawBody);
  if (validationError) return validationError;

  const saved = await appendMessages(conversationId, input.messages);
  return NextResponse.json(saved, { status: 201 });
}
