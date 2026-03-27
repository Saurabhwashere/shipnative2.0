import { supabaseAdmin } from '../client';

export async function getOrCreateUser(data: {
  clerkId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}) {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        clerk_id: data.clerkId,
        email: data.email,
        display_name: data.displayName ?? null,
        avatar_url: data.avatarUrl ?? null,
      },
      { onConflict: 'clerk_id' }
    )
    .select()
    .single();

  if (error) throw new Error(`getOrCreateUser: ${error.message}`);
  return user;
}

export async function getUserByClerkId(clerkId: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .maybeSingle();

  if (error) throw new Error(`getUserByClerkId: ${error.message}`);
  return data;
}
