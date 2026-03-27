import { supabaseAdmin } from '../client';

export async function getMessages(
  conversationId: string,
  opts: { limit?: number; offset?: number } = {},
) {
  const { limit = 100, offset = 0 } = opts;

  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('sequence_index', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`getMessages: ${error.message}`);
  return data ?? [];
}

export async function appendMessages(
  conversationId: string,
  newMessages: {
    role: string;
    content?: string;
    toolName?: string;
    toolInput?: unknown;
    toolResult?: unknown;
    refImageUrl?: string;
    refImageIntent?: string;
  }[]
) {
  if (newMessages.length === 0) return [];

  // Get current max sequence_index
  const { data: existing } = await supabaseAdmin
    .from('messages')
    .select('sequence_index')
    .eq('conversation_id', conversationId)
    .order('sequence_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  const startIdx = (existing?.sequence_index ?? -1) + 1;

  const rows = newMessages.map((m, i) => ({
    conversation_id: conversationId,
    role: m.role,
    content: m.content ?? '',
    tool_name: m.toolName ?? null,
    tool_input: m.toolInput ?? null,
    tool_result: m.toolResult ?? null,
    sequence_index: startIdx + i,
    ref_image_url: m.refImageUrl ?? null,
    ref_image_intent: m.refImageIntent ?? null,
  }));

  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert(rows)
    .select();

  if (error) throw new Error(`appendMessages: ${error.message}`);
  return data ?? [];
}
