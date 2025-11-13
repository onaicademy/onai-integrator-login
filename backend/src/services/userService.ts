import { supabase } from '../config/supabase';

export async function syncUser(data: {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
}) {
  try {
    const { data: result, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          avatar_url: data.avatar_url,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to sync user: ${error.message}`);
    }

    return result;
  } catch (error) {
    console.error('User sync error:', error);
    throw error;
  }
}

export async function updateLastLogin(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update last login: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Last login update error:', error);
    throw error;
  }
}

