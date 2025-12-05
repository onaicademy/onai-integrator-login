/**
 * ============================================
 * TRIPWIRE SERVICE V2 - DIRECT DB PATTERN
 * ============================================
 * 
 * Architecture: 90% Direct Query Builder + 10% Strategic RPC
 * Based on: Perplexity Research (2025-12-05)
 * 
 * Features:
 * - ✅ ACID транзакции через pg.Pool
 * - ✅ Автоматическое открытие модулей
 * - ✅ Честный трекинг видео (80% правило)
 * - ✅ Автоматическая выдача сертификатов
 * - ✅ RPC для статистики (PostgreSQL агрегация)
 * - ✅ Error handling + Rollback + Retry logic
 */

import { PoolClient } from 'pg';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { tripwirePool } from '../config/tripwire-pool';
import { withTransaction } from '../utils/transaction';

// ============================================
// TYPES
// ============================================

interface CreateTripwireUserData {
  email: string;
  full_name: string;
  password: string;
  granted_by: string; // Sales Manager ID
  manager_name: string;
}

interface CompleteLessonData {
  user_id: string;
  lesson_id: number;
  module_id: number;
}

interface VideoSegment {
  start: number;
  end: number;
}

// ============================================
// CONFIGURATION
// ============================================

const supabaseUrl = process.env.TRIPWIRE_SUPABASE_URL!;
const supabaseServiceKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing TRIPWIRE_SUPABASE_URL or TRIPWIRE_SERVICE_ROLE_KEY');
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`
    }
  }
});

// ============================================
// 1. CREATE TRIPWIRE USER (с ACID транзакцией)
// ============================================

export async function createTripwireUser(data: CreateTripwireUserData) {
  const { email, full_name, password, granted_by, manager_name } = data;

  // Step 1: Создаём пользователя в auth.users (вне транзакции)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: {
      full_name: full_name,
      role: 'student'
    }
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create auth user: ${authError?.message || 'No user returned'}`);
  }

  const userId = authData.user.id;
  console.log(`✅ [TripwireService] Auth user created: ${userId}`);

  // Step 2: Инициализируем все таблицы в транзакции
  try {
    await withTransaction(
      tripwirePool,
      async (client) => {
        // 2.1. Insert into public.users
        await client.query(
          `INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
           VALUES ($1, $2, $3, 'student', NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
          [userId, email, full_name]
        );

        // 2.2. Insert into tripwire_users
        await client.query(
          `INSERT INTO public.tripwire_users 
           (user_id, email, full_name, granted_by, manager_name, status, modules_completed, price, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'active', 0, 5000, NOW(), NOW())`,
          [userId, email, full_name, granted_by, manager_name]
        );

        // 2.3. Insert into tripwire_user_profile
        await client.query(
          `INSERT INTO public.tripwire_user_profile 
           (user_id, total_modules, modules_completed, completion_percentage, certificate_issued, created_at, updated_at)
           VALUES ($1, 3, 0, 0, false, NOW(), NOW())`,
          [userId]
        );

        // 2.4. Unlock Module 16 (первый модуль)
        await client.query(
          `INSERT INTO public.module_unlocks (user_id, module_id, unlocked_at)
           VALUES ($1, 16, NOW())`,
          [userId]
        );

        // 2.5. Create progress for Module 16, Lesson 67
        await client.query(
          `INSERT INTO public.student_progress 
           (user_id, module_id, lesson_id, status, created_at, updated_at)
           VALUES ($1, 16, 67, 'not_started', NOW(), NOW())`,
          [userId]
        );

        // 2.6. Initialize video tracking for Lesson 67
        await client.query(
          `INSERT INTO public.video_tracking 
           (user_id, lesson_id, watched_segments, total_watched_seconds, video_duration_seconds, watch_percentage, last_position_seconds, is_qualified_for_completion, created_at, updated_at)
           VALUES ($1, 67, '[]'::jsonb, 0, 0, 0, 0, false, NOW(), NOW())`,
          [userId]
        );

        // 2.7. Initialize user statistics
        await client.query(
          `INSERT INTO public.user_statistics (user_id, lessons_completed, total_time_spent, created_at, updated_at)
           VALUES ($1, 0, 0, NOW(), NOW())`,
          [userId]
        );

        // 2.8. Create achievements (4 достижения для Tripwire)
        const achievements = [
          'first_module_complete',
          'second_module_complete',
          'third_module_complete',
          'tripwire_graduate'
        ];

        for (const achievementId of achievements) {
          await client.query(
            `INSERT INTO public.user_achievements 
             (user_id, achievement_id, current_value, required_value, is_completed, created_at, updated_at)
             VALUES ($1, $2, 0, ${achievementId === 'tripwire_graduate' ? 3 : 1}, false, NOW(), NOW())`,
            [userId, achievementId]
          );
        }

        // 2.9. Log activity for Sales Manager
        await client.query(
          `INSERT INTO public.sales_activity_log (manager_id, action_type, target_user_id, details, created_at)
           VALUES ($1, 'user_created', $2, $3::jsonb, NOW())`,
          [
            granted_by,
            userId,
            JSON.stringify({ email, full_name, price: 5000 })
          ]
        );

        console.log(`✅ [TripwireService] All tables initialized for ${email}`);
      },
      'READ COMMITTED' // Isolation level
    );

    return {
      success: true,
      user_id: userId,
      email: email,
      message: 'Tripwire user created successfully (Direct DB v2)'
    };

  } catch (dbError: any) {
    console.error('❌ [TripwireService] Database transaction failed:', dbError);

    // Rollback: удаляем auth user если DB операции провалились
    try {
      await supabase.auth.admin.deleteUser(userId);
      console.log(`🔄 [TripwireService] Rolled back auth user: ${userId}`);
    } catch (cleanupError) {
      console.error('⚠️ [TripwireService] Failed to cleanup auth user:', cleanupError);
    }

    throw new Error(`Database operation failed: ${dbError.message}`);
  }
}

// ============================================
// 2. COMPLETE LESSON (с автоматическим открытием следующего модуля)
// ============================================

export async function completeLesson(data: CompleteLessonData) {
  const { user_id, lesson_id, module_id } = data;

  return withTransaction(
    tripwirePool,
    async (client) => {
      // Step 1: Проверяем что видео просмотрено на 80%+
      const videoCheck = await client.query(
        `SELECT is_qualified_for_completion FROM public.video_tracking 
         WHERE user_id = $1 AND lesson_id = $2`,
        [user_id, lesson_id]
      );

      if (!videoCheck.rows[0]?.is_qualified_for_completion) {
        throw new Error('Video not watched enough (need 80%+ to complete lesson)');
      }

      // Step 2: Update student_progress to 'completed'
      await client.query(
        `UPDATE public.student_progress 
         SET status = 'completed', completed_at = NOW(), updated_at = NOW()
         WHERE user_id = $1 AND lesson_id = $2`,
        [user_id, lesson_id]
      );

      // Step 3: Update tripwire_users.modules_completed
      const progressResult = await client.query(
        `UPDATE public.tripwire_users 
         SET modules_completed = modules_completed + 1, updated_at = NOW()
         WHERE user_id = $1
         RETURNING modules_completed`,
        [user_id]
      );

      const modulesCompleted = progressResult.rows[0].modules_completed;

      // Step 4: Update tripwire_user_profile
      await client.query(
        `UPDATE public.tripwire_user_profile 
         SET modules_completed = $2, 
             completion_percentage = ($2::NUMERIC / 3 * 100), 
             updated_at = NOW()
         WHERE user_id = $1`,
        [user_id, modulesCompleted]
      );

      // Step 5: Update user_statistics
      await client.query(
        `UPDATE public.user_statistics 
         SET lessons_completed = lessons_completed + 1, updated_at = NOW()
         WHERE user_id = $1`,
        [user_id]
      );

      // Step 6: Update achievement for this module
      const achievementMap: Record<number, string> = {
        16: 'first_module_complete',
        17: 'second_module_complete',
        18: 'third_module_complete'
      };

      if (achievementMap[module_id]) {
        await client.query(
          `UPDATE public.user_achievements 
           SET current_value = required_value, 
               is_completed = true, 
               completed_at = NOW(), 
               updated_at = NOW()
           WHERE user_id = $1 AND achievement_id = $2`,
          [user_id, achievementMap[module_id]]
        );
      }

      // Step 7: Unlock next module + create progress records
      let nextModuleUnlocked = false;
      if (module_id === 16) {
        await unlockNextModuleInternal(client, user_id, 17, 68);
        nextModuleUnlocked = true;
      } else if (module_id === 17) {
        await unlockNextModuleInternal(client, user_id, 18, 69);
        nextModuleUnlocked = true;
      } else if (module_id === 18) {
        await issueCertificateInternal(client, user_id);
      }

      console.log(`✅ [TripwireService] Lesson ${lesson_id} completed for user ${user_id}`);

      return {
        success: true,
        modules_completed: modulesCompleted,
        next_module_unlocked: nextModuleUnlocked,
        certificate_issued: module_id === 18
      };
    },
    'REPEATABLE READ' // Higher isolation для complex updates
  );
}

// ============================================
// 3. UNLOCK NEXT MODULE (internal helper)
// ============================================

async function unlockNextModuleInternal(
  client: PoolClient,
  user_id: string,
  module_id: number,
  lesson_id: number
) {
  // Step 1: Insert into module_unlocks
  await client.query(
    `INSERT INTO public.module_unlocks (user_id, module_id, unlocked_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id, module_id) DO NOTHING`,
    [user_id, module_id]
  );

  // Step 2: Create progress for new lesson
  await client.query(
    `INSERT INTO public.student_progress (user_id, module_id, lesson_id, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'not_started', NOW(), NOW())
     ON CONFLICT (user_id, lesson_id) DO NOTHING`,
    [user_id, module_id, lesson_id]
  );

  // Step 3: Initialize video tracking
  await client.query(
    `INSERT INTO public.video_tracking 
     (user_id, lesson_id, watched_segments, total_watched_seconds, video_duration_seconds, watch_percentage, last_position_seconds, is_qualified_for_completion, created_at, updated_at)
     VALUES ($1, $2, '[]'::jsonb, 0, 0, 0, 0, false, NOW(), NOW())
     ON CONFLICT (user_id, lesson_id) DO NOTHING`,
    [user_id, lesson_id]
  );

  console.log(`✅ [TripwireService] Module ${module_id} unlocked for user ${user_id}`);
}

// ============================================
// 4. ISSUE CERTIFICATE (internal helper)
// ============================================

async function issueCertificateInternal(client: PoolClient, user_id: string) {
  // Generate certificate URL (можно заменить на реальную логику)
  const certificateUrl = `https://onai.academy/certificates/tripwire/${user_id}`;

  // Step 1: Update tripwire_user_profile
  await client.query(
    `UPDATE public.tripwire_user_profile 
     SET certificate_issued = true, 
         certificate_url = $2, 
         updated_at = NOW()
     WHERE user_id = $1`,
    [user_id, certificateUrl]
  );

  // Step 2: Update tripwire_users status to 'completed'
  await client.query(
    `UPDATE public.tripwire_users 
     SET status = 'completed', updated_at = NOW()
     WHERE user_id = $1`,
    [user_id]
  );

  // Step 3: Complete 'tripwire_graduate' achievement
  await client.query(
    `UPDATE public.user_achievements 
     SET current_value = 3, 
         is_completed = true, 
         completed_at = NOW(), 
         updated_at = NOW()
     WHERE user_id = $1 AND achievement_id = 'tripwire_graduate'`,
    [user_id]
  );

  console.log(`🎓 [TripwireService] Certificate issued for user ${user_id}`);
}

// ============================================
// 5. UPDATE VIDEO TRACKING (честный трекинг)
// ============================================

export async function updateVideoTracking(
  user_id: string,
  lesson_id: number,
  watchedSegments: VideoSegment[],
  videoDuration: number,
  currentPosition: number
) {
  return withTransaction(
    tripwirePool,
    async (client) => {
      // Calculate unique watched seconds from segments
      const mergedSegments = mergeSegments(watchedSegments);
      const totalWatchedSeconds = calculateTotalWatched(mergedSegments);
      const watchPercentage = Math.min(100, Math.round((totalWatchedSeconds / videoDuration) * 100));

      // Check if qualified (80% rule)
      const isQualified = watchPercentage >= 80 || (currentPosition / videoDuration) >= 0.8;

      await client.query(
        `INSERT INTO public.video_tracking 
         (user_id, lesson_id, watched_segments, total_watched_seconds, video_duration_seconds, watch_percentage, last_position_seconds, is_qualified_for_completion, updated_at)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (user_id, lesson_id) 
         DO UPDATE SET 
           watched_segments = $3::jsonb,
           total_watched_seconds = $4,
           video_duration_seconds = $5,
           watch_percentage = $6,
           last_position_seconds = $7,
           is_qualified_for_completion = $8,
           updated_at = NOW()`,
        [
          user_id,
          lesson_id,
          JSON.stringify(mergedSegments),
          totalWatchedSeconds,
          videoDuration,
          watchPercentage,
          currentPosition,
          isQualified
        ]
      );

      // Update student_progress to 'in_progress' if not started
      await client.query(
        `UPDATE public.student_progress 
         SET status = CASE 
           WHEN status = 'not_started' THEN 'in_progress' 
           ELSE status 
         END,
         started_at = CASE 
           WHEN status = 'not_started' THEN NOW() 
           ELSE started_at 
         END,
         updated_at = NOW()
         WHERE user_id = $1 AND lesson_id = $2`,
        [user_id, lesson_id]
      );

      return {
        success: true,
        watch_percentage: watchPercentage,
        is_qualified: isQualified,
        total_watched_seconds: totalWatchedSeconds
      };
    },
    'READ COMMITTED'
  );
}

// Helper: Merge overlapping segments
function mergeSegments(segments: VideoSegment[]): VideoSegment[] {
  if (segments.length === 0) return [];

  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const merged: VideoSegment[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];

    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

// Helper: Calculate total watched time
function calculateTotalWatched(segments: VideoSegment[]): number {
  return segments.reduce((total, seg) => total + (seg.end - seg.start), 0);
}

// ============================================
// 6. GET SALES STATS (использует RPC для агрегации)
// ============================================

export async function getSalesStats(managerId: string) {
  const { data, error } = await supabase.rpc('rpc_get_manager_stats', {
    manager_id_param: managerId
  });

  if (error) {
    throw new Error(`Failed to get stats: ${error.message}`);
  }

  return data?.[0] || {
    total_students: 0,
    active_students: 0,
    completed_students: 0,
    total_revenue: 0,
    avg_completion_rate: 0,
    students_this_month: 0,
    revenue_this_month: 0
  };
}

export async function getSalesLeaderboard(limit = 10) {
  const { data, error } = await supabase.rpc('rpc_get_sales_leaderboard', {
    limit_count: limit
  });

  if (error) {
    throw new Error(`Failed to get leaderboard: ${error.message}`);
  }

  return data || [];
}

export async function getSalesChartData(managerId: string, daysBack = 30) {
  const { data, error } = await supabase.rpc('rpc_get_sales_chart_data', {
    manager_id_param: managerId,
    days_back: daysBack
  });

  if (error) {
    throw new Error(`Failed to get chart data: ${error.message}`);
  }

  return data || [];
}

export async function getManagerActivity(managerId: string, limit = 50) {
  const { data, error } = await supabase.rpc('rpc_get_manager_activity', {
    manager_id_param: managerId,
    limit_count: limit
  });

  if (error) {
    throw new Error(`Failed to get activity: ${error.message}`);
  }

  return data || [];
}

// ============================================
// 7. GET TRIPWIRE USERS (Direct Query Builder)
// ============================================

export async function getTripwireUsers(filters?: {
  managerId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('tripwire_users')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.managerId) {
    query = query.eq('granted_by', filters.managerId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get tripwire users: ${error.message}`);
  }

  return data || [];
}

// ============================================
// EXPORT ALL
// ============================================

export default {
  createTripwireUser,
  completeLesson,
  updateVideoTracking,
  getSalesStats,
  getSalesLeaderboard,
  getSalesChartData,
  getManagerActivity,
  getTripwireUsers
};
