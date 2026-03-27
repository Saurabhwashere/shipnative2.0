import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/db/queries/users';

export async function POST() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
  const displayName = `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() || undefined;
  const avatarUrl = clerkUser.imageUrl ?? undefined;

  const user = await getOrCreateUser({ clerkId, email, displayName, avatarUrl });
  return NextResponse.json(user);
}
