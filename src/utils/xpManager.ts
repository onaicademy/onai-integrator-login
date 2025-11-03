import { supabase } from "@/lib/supabase";

export async function addXP(points: number, reason: string) {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    
    if (!user) {
      console.warn('No user found, skipping XP add');
      return 0;
    }
    
    // Get current user data
    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("xp, level")
      .eq("id", user.id)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Failed to fetch user XP:', fetchError);
      return 0;
    }
    
    const currentXP = userData?.xp || 0;
    const currentLevel = userData?.level || 1;
    const newXP = currentXP + points;
    
    // Calculate if level should increase (every 100 XP = 1 level)
    const newLevel = Math.floor(newXP / 100) + 1;
    const levelUp = newLevel > currentLevel;
    
    // Update user XP and level
    const { error: updateError } = await supabase
      .from("users")
      .update({
        xp: newXP,
        level: newLevel,
      })
      .eq("id", user.id);
    
    if (updateError) {
      console.error('Failed to update user XP:', updateError);
      return 0;
    }
    
    // Log activity
    await supabase.from("user_activity").insert({
      user_id: user.id,
      action: "add_xp",
      meta: { reason, points, new_xp: newXP, level_up: levelUp },
      created_at: new Date().toISOString(),
    });
    
    if (levelUp) {
      // Log level up separately
      await supabase.from("user_activity").insert({
        user_id: user.id,
        action: "level_up",
        meta: { level: newLevel, xp: newXP },
        created_at: new Date().toISOString(),
      });
      
      console.log(`🎉 Level up! New level: ${newLevel}`);
    }
    
    console.log(`✅ Added ${points} XP (${reason}). Total: ${newXP}`);
    return newXP;
  } catch (error) {
    console.error('Failed to add XP:', error);
    return 0;
  }
}

export async function getUserXP(): Promise<{ xp: number; level: number } | null> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    
    if (!user) return null;
    
    const { data, error } = await supabase
      .from("users")
      .select("xp, level")
      .eq("id", user.id)
      .single();
    
    if (error) {
      console.error('Failed to get user XP:', error);
      return { xp: 0, level: 1 };
    }
    
    return { xp: data?.xp || 0, level: data?.level || 1 };
  } catch (error) {
    console.error('Failed to get user XP:', error);
    return { xp: 0, level: 1 };
  }
}

