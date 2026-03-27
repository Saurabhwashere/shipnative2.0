import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getUserByClerkId } from '@/lib/db/queries/users';
import { getSnapshotWithFiles, deleteSnapshot } from '@/lib/db/queries/snapshots';
import { supabaseAdmin } from '@/lib/db/client';

type Params = { params: Promise<{ snapshotId: string }> };

async function verifyAccess(snapshotId: string, userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('snapshots')
    .select('projects!inner(user_id)')
    .eq('id', snapshotId)
    .maybeSingle();

  const project = (data as any)?.projects;
  return project?.user_id === userId;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { snapshotId } = await params;
  const user = await getUserByClerkId(clerkId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const ok = await verifyAccess(snapshotId, user.id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const data = await getSnapshotWithFiles(snapshotId);
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { snapshotId } = await params;
  const user = await getUserByClerkId(clerkId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const snapshot = await getSnapshotWithFiles(snapshotId);
  if (!snapshot) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const ok = await verifyAccess(snapshotId, user.id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await deleteSnapshot(snapshotId, snapshot.project_id);
  return NextResponse.json({ success: true });
}
