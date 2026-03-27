import { supabaseAdmin } from '../client';

export async function getProjectFiles(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from('project_files')
    .select('*')
    .eq('project_id', projectId);

  if (error) throw new Error(`getProjectFiles: ${error.message}`);
  return data ?? [];
}

export async function upsertProjectFiles(
  projectId: string,
  files: { path: string; content: string; lastWrittenBy?: 'ai' | 'user' }[]
) {
  if (files.length === 0) return;

  const rows = files.map((f) => ({
    project_id: projectId,
    path: f.path,
    content: f.content,
    size_bytes: Buffer.byteLength(f.content, 'utf8'),
    last_written_by: f.lastWrittenBy ?? 'ai',
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from('project_files')
    .upsert(rows, { onConflict: 'project_id,path' });

  if (error) throw new Error(`upsertProjectFiles: ${error.message}`);
}

export async function deleteProjectFile(projectId: string, path: string) {
  const { error } = await supabaseAdmin
    .from('project_files')
    .delete()
    .eq('project_id', projectId)
    .eq('path', path);

  if (error) throw new Error(`deleteProjectFile: ${error.message}`);
}
