import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getUserByClerkId } from '@/lib/db/queries/users';
import { getProject } from '@/lib/db/queries/projects';
import { getProjectFiles, upsertProjectFiles, deleteProjectFile } from '@/lib/db/queries/files';
import { parseBody } from '@/lib/validation/parse';
import { UpsertFilesSchema } from '@/lib/validation/schemas';

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;
  const user = await getUserByClerkId(clerkId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const project = await getProject(projectId, user.id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const files = await getProjectFiles(projectId);
  return NextResponse.json(files);
}

// Bulk upsert — called after each AI turn with full VFS state
export async function PUT(req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;
  const user = await getUserByClerkId(clerkId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const project = await getProject(projectId, user.id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const rawBody = await req.json().catch(() => ({}));
  const { data: input, error: validationError } = parseBody(UpsertFilesSchema, rawBody);
  if (validationError) return validationError;

  await upsertProjectFiles(projectId, input.files);
  return NextResponse.json({ success: true });
}

// Delete a single file: DELETE /api/projects/[projectId]/files?path=screens/Home.jsx
export async function DELETE(req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;
  const user = await getUserByClerkId(clerkId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const project = await getProject(projectId, user.id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const path = new URL(req.url).searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

  await deleteProjectFile(projectId, path);
  return NextResponse.json({ success: true });
}
