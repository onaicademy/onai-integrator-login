/**
 * Admin Tripwire Students Proxy
 *
 * Allows Main Platform admins to access Tripwire students data
 * WITHOUT requiring Tripwire JWT token.
 *
 * Uses Main Platform JWT + service role key to access Tripwire DB.
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Tripwire Supabase client (using service role key)
const tripwireUrl = process.env.SUPABASE_TRIPWIRE_URL || process.env.TRIPWIRE_SUPABASE_URL;
const tripwireServiceKey = process.env.SUPABASE_TRIPWIRE_SERVICE_KEY || process.env.TRIPWIRE_SERVICE_ROLE_KEY;

if (!tripwireUrl || !tripwireServiceKey) {
  console.error('❌ [Admin Tripwire Students] Missing Tripwire Supabase credentials');
  throw new Error('Missing SUPABASE_TRIPWIRE_URL or SUPABASE_TRIPWIRE_SERVICE_KEY');
}

const tripwireSupabase = createClient(tripwireUrl, tripwireServiceKey);

console.log('✅ [Admin Tripwire Students] Proxy initialized');

/**
 * GET /api/admin/tripwire-students
 * Get all Tripwire students (for Main Platform admins)
 *
 * Auth: Main Platform JWT (must be admin role)
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    const userRole = (req as any).user?.role;
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
        currentRole: userRole
      });
    }

    console.log('📊 [Admin Tripwire Students] Fetching Tripwire students for Main platform admin');

    // 🚫 EXCLUDED EMAILS (admin + sales managers)
    const EXCLUDED_EMAILS = [
      'smmmcwin@gmail.com',       // Admin (Alexander CEO)
      'rakhat@onaiacademy.kz',    // Sales Manager 1
      'amina@onaiacademy.kz',     // Sales Manager 2
      'aselya@onaiacademy.kz',    // Sales Manager 3
      'ayaulym@onaiacademy.kz',   // Sales Manager 4
    ];

    // ✅ ШАГ 0: Получить user_id для исключенных пользователей
    const { data: excludedUsersData } = await tripwireSupabase
      .from('tripwire_users')
      .select('user_id')
      .in('email', EXCLUDED_EMAILS)
      .not('user_id', 'is', null);

    const excludedUserIds = excludedUsersData?.map(u => u.user_id) || [];

    // ✅ ШАГ 1: Получить всех студентов Tripwire из tripwire_user_profile (ИСКЛЮЧАЯ админов и sales)
    let profileQuery = tripwireSupabase
      .from('tripwire_user_profile')
      .select('user_id, modules_completed, total_modules, completion_percentage, created_at, updated_at');

    // 🔒 Исключаем админов и sales
    if (excludedUserIds.length > 0) {
      profileQuery = profileQuery.not('user_id', 'in', `(${excludedUserIds.join(',')})`);
    }

    const { data: tripwireProfiles, error: profileError } = await profileQuery;

    if (profileError) throw profileError;

    if (!tripwireProfiles || tripwireProfiles.length === 0) {
      return res.json({ students: [] });
    }

    // ✅ ШАГ 2: Получить информацию о пользователях из tripwire_users
    const userIds = tripwireProfiles.map(p => p.user_id);

    const { data: tripwireUsers, error: tripwireUsersError } = await tripwireSupabase
      .from('tripwire_users')
      .select('user_id, email, full_name, created_at')
      .in('user_id', userIds);

    if (tripwireUsersError) {
      console.error('❌ Error fetching tripwire_users:', tripwireUsersError);
      throw tripwireUsersError;
    }

    // ✅ ШАГ 2.5: Получить телефоны из основной БД users (если есть)
    const { data: usersWithPhone } = await tripwireSupabase
      .from('users')
      .select('id, phone')
      .in('id', userIds);

    // Создаем Map для быстрого доступа к телефонам
    const phoneMap = new Map<string, string | null>();
    usersWithPhone?.forEach(u => {
      phoneMap.set(u.id, u.phone);
    });

    if (!tripwireUsers || tripwireUsers.length === 0) {
      console.log('⚠️  No tripwire_users found for userIds:', userIds.length);
      return res.json({ students: [] });
    }

    // ✅ ШАГ 3: Получить последнюю активность из tripwire_progress
    const { data: progressActivities, error: progressError } = await tripwireSupabase
      .from('tripwire_progress')
      .select('tripwire_user_id, updated_at')
      .in('tripwire_user_id', userIds)
      .order('updated_at', { ascending: false });

    if (progressError) throw progressError;

    // Группируем по user_id и берем самую последнюю активность
    const lastActivityMap = new Map<string, string>();
    progressActivities?.forEach(p => {
      if (!lastActivityMap.has(p.tripwire_user_id)) {
        lastActivityMap.set(p.tripwire_user_id, p.updated_at);
      }
    });

    // ✅ ШАГ 4: Объединить данные
    const studentsWithProgress = tripwireUsers.map(user => {
      const profile = tripwireProfiles.find(p => p.user_id === user.user_id);
      const lastActivity = lastActivityMap.get(user.user_id) || profile?.updated_at || null;
      const phone = phoneMap.get(user.user_id) || null;

      return {
        id: user.user_id,
        email: user.email || 'N/A',
        full_name: user.full_name || null,
        phone_number: phone,
        created_at: user.created_at || new Date().toISOString(),
        total_modules: profile?.total_modules || 0,
        completed_modules: profile?.modules_completed || 0,
        progress_percent: Math.round(profile?.completion_percentage || 0),
        enrolled_at: profile?.created_at || null,
        last_sign_in_at: lastActivity
      };
    });

    // ✅ Сортируем по дате регистрации (сначала новые)
    studentsWithProgress.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    console.log(`✅ [Admin Tripwire Students] Returning ${studentsWithProgress.length} students`);

    res.json({ students: studentsWithProgress });
  } catch (error: any) {
    console.error('❌ [Admin Tripwire Students] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

export default router;
