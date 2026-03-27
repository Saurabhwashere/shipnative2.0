import { supabaseAdmin } from '../client';

export async function createConversation(data: { projectId: string; title?: string }) {
  // Deactivate previous active conversations
  await supabaseAdmin
    .from('conversations')
    .update({ is_active: false })
    .eq('project_id', data.projectId)
    .eq('is_active', true);

  const { data: conversation, error } = await supabaseAdmin
    .from('conversations')
    .insert({ project_id: data.projectId, title: data.title ?? null, is_active: true })
    .select()
    .single();

  if (error) throw new Error(`createConversation: ${error.message}`);
  return conversation;
}

export async function getActiveConversation(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`getActiveConversation: ${error.message}`);
  return data;
}

export async function listConversations(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`listConversations: ${error.message}`);
  return data ?? [];
}

export async function updateConversation(
  conversationId: string,
  data: Partial<{ phase: string; title: string; isActive: boolean }>
) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.phase !== undefined) patch.phase = data.phase;
  if (data.title !== undefined) patch.title = data.title;
  if (data.isActive !== undefined) patch.is_active = data.isActive;

  const { data: conv, error } = await supabaseAdmin
    .from('conversations')
    .update(patch)
    .eq('id', conversationId)
    .select()
    .maybeSingle();

  if (error) throw new Error(`updateConversation: ${error.message}`);
  return conv;
}
