import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getUserByClerkId } from '@/lib/db/queries/users';
import { createProject, listProjects } from '@/lib/db/queries/projects';
import { parseBody } from '@/lib/validation/parse';
import { CreateProjectSchema } from '@/lib/validation/schemas';

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUserByClerkId(clerkId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const data = await listProjects(user.id);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUserByClerkId(clerkId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const rawBody = await req.json().catch(() => ({}));
  const { data: input, error: validationError } = parseBody(CreateProjectSchema, rawBody);
  if (validationError) return validationError;

  const { name, templateKey, category, theme, navPattern } = input;

  const project = await createProject({
    userId: user.id,
    name: name ?? 'Untitled App',
    templateKey,
    category,
    theme,
    navPattern,
  });

  return NextResponse.json(project, { status: 201 });
}
