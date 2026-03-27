import { supabaseAdmin } from '../client';

export async function createSnapshot(
  projectId: string,
  label: string,
  files: { path: string; content: string }[],
  opts?: { conversationId?: string; triggeredBy?: 'user' | 'auto' }
) {
  const { data: snapshot, error } = await supabaseAdmin
    .from('snapshots')
    .insert({
      project_id: projectId,
      label,
      file_count: files.length,
      conversation_id: opts?.conversationId ?? null,
      triggered_by: opts?.triggeredBy ?? 'user',
    })
    .select()
    .single();

  if (error) throw new Error(`createSnapshot: ${error.message}`);

  if (files.length > 0) {
    const fileRows = files.map((f) => ({
      snapshot_id: snapshot.id,
      path: f.path,
      content: f.content,
    }));
    const { error: fileError } = await supabaseAdmin
      .from('snapshot_files')
      .insert(fileRows);
    if (fileError) throw new Error(`createSnapshot files: ${fileError.message}`);
  }

  return snapshot;
}

export async function listSnapshots(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from('snapshots')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`listSnapshots: ${error.message}`);
  return data ?? [];
}

export async function getSnapshotWithFiles(snapshotId: string) {
  const { data: snapshot, error } = await supabaseAdmin
    .from('snapshots')
    .select('*')
    .eq('id', snapshotId)
    .maybeSingle();

  if (error) throw new Error(`getSnapshotWithFiles: ${error.message}`);
  if (!snapshot) return null;

  const { data: files, error: fileError } = await supabaseAdmin
    .from('snapshot_files')
    .select('*')
    .eq('snapshot_id', snapshotId);

  if (fileError) throw new Error(`getSnapshotWithFiles files: ${fileError.message}`);

  return { ...snapshot, files: files ?? [] };
}

export async function deleteSnapshot(snapshotId: string, projectId: string) {
  const { error } = await supabaseAdmin
    .from('snapshots')
    .delete()
    .eq('id', snapshotId)
    .eq('project_id', projectId);

  if (error) throw new Error(`deleteSnapshot: ${error.message}`);
}
