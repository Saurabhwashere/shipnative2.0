import { NextRequest, NextResponse } from 'next/server';
import { getProjectByPublicSlug } from '@/lib/db/queries/projects';
import { getProjectFiles } from '@/lib/db/queries/files';
import { rateLimiters } from '@/lib/rate-limit';

type Params = { params: Promise<{ publicSlug: string }> };

// Public route — no auth required
export async function GET(req: NextRequest, { params }: Params) {
  // Rate limit by IP to prevent bulk scraping
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous';
  const rl = rateLimiters.api.check(`share:${ip}`);
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(rl.resetInMs / 1000)) },
    });
  }

  const { publicSlug } = await params;
  const project = await getProjectByPublicSlug(publicSlug);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const files = await getProjectFiles(project.id);
  return NextResponse.json({
    id: project.id,
    name: project.name,
    description: project.description,
    category: project.category,
    theme: project.theme,
    createdAt: project.createdAt,
    files: files.map((f) => ({ path: f.path, content: f.content })),
  });
}
