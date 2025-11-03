import { supabase } from "@/lib/supabase";

export async function logActivity(action: string, meta: any = {}) {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    
    if (!user) {
      console.warn('No user found, skipping activity log');
      return;
    }
    
    await supabase.from("user_activity").insert({
      user_id: user.id,
      action,
      meta,
      created_at: new Date().toISOString(),
    });
    
    console.log('Activity logged:', action, meta);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

