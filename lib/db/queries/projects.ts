import { supabaseAdmin } from '../client';

export async function createProject(data: {
  userId: string;
  name?: string;
  templateKey?: string;
  category?: string;
  theme?: string;
  navPattern?: string;
}) {
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .insert({
      user_id: data.userId,
      name: data.name ?? 'Untitled App',
      template_key: data.templateKey ?? null,
      category: data.category ?? null,
      theme: data.theme ?? null,
      nav_pattern: data.navPattern ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`createProject: ${error.message}`);
  return project;
}

export async function getProject(projectId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(`getProject: ${error.message}`);
  return data;
}

export async function listProjects(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`listProjects: ${error.message}`);
  return data ?? [];
}

export async function updateProject(
  projectId: string,
  userId: string,
  data: Partial<{
    name: string;
    description: string;
    isPublic: boolean;
    publicSlug: string;
    theme: string;
    category: string;
    navPattern: string;
  }>
) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description;
  if (data.isPublic !== undefined) patch.is_public = data.isPublic;
  if (data.publicSlug !== undefined) patch.public_slug = data.publicSlug;
  if (data.theme !== undefined) patch.theme = data.theme;
  if (data.category !== undefined) patch.category = data.category;
  if (data.navPattern !== undefined) patch.nav_pattern = data.navPattern;

  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .update(patch)
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) throw new Error(`updateProject: ${error.message}`);
  return project;
}

export async function softDeleteProject(projectId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) throw new Error(`softDeleteProject: ${error.message}`);
  return data;
}

export async function getProjectByPublicSlug(slug: string) {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('public_slug', slug)
    .eq('is_public', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(`getProjectByPublicSlug: ${error.message}`);
  return data;
}
