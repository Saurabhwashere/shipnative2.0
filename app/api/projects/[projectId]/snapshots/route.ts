import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getUserByClerkId } from '@/lib/db/queries/users';
import { getProject } from '@/lib/db/queries/projects';
import { createSnapshot, listSnapshots } from '@/lib/db/queries/snapshots';
import { parseBody } from '@/lib/validation/parse';
import { CreateSnapshotSchema } from '@/lib/validation/schemas';

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;
  const user = await getUserByClerkId(clerkId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const project = await getProject(projectId, user.id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const data = await listSnapshots(projectId);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;
  const user = await getUserByClerkId(clerkId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const project = await getProject(projectId, user.id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const rawBody = await req.json().catch(() => ({}));
  const { data: input, error: validationError } = parseBody(CreateSnapshotSchema, rawBody);
  if (validationError) return validationError;

  const { label, files, conversationId, triggeredBy } = input;
  const snapshot = await createSnapshot(projectId, label, files, { conversationId, triggeredBy });
  return NextResponse.json(snapshot, { status: 201 });
}
