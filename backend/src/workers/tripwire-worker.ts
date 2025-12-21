import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { tripwireAdminSupabase } from '../config/supabase-tripwire';
import { sendWelcomeEmail } from '../services/emailService';
import { logHealthEvent } from '../services/queueService';

/**
 * Tripwire User Creation Worker
 * Processes user creation jobs asynchronously from Redis queue
 */

export interface CreateUserJob {
  full_name: string;
  email: string;
  password: string;
  currentUserId: string;
  currentUserEmail?: string;
  currentUserName?: string;
}

const worker = new Worker<CreateUserJob>(
  'tripwire-user-creation',
  async (job: Job<CreateUserJob>) => {
    const startTime = Date.now();
    console.log(`🔄 [WORKER] Processing job ${job.id} for ${job.data.email}`);
    
    const { full_name, email, password, currentUserId, currentUserEmail, currentUserName } = job.data;
    
    try {
      // ===================================
      // 🛡️ IDEMPOTENCY CHECK
      // Prevent double-processing if job retries
      // ===================================
      const idempotencyKey = `job-${job.id}-${email}`;
      
      // Check if this exact job was already processed
      const { data: existingLog, error: logCheckError } = await tripwireAdminSupabase
        .from('system_health_logs')
        .select('id')
        .eq('event_type', 'INFO')
        .ilike('message', `%User created successfully: ${email}%`)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (existingLog && existingLog.length > 0) {
        const recentLog = existingLog[0];
        // If processed in last 5 minutes, skip
        console.warn(`⚠️ [WORKER] Idempotency: User ${email} was recently created, skipping duplicate`);
        return { 
          success: true, 
          skipped: true, 
          reason: 'Already processed (idempotency check)',
          email 
        };
      }
      
      // Step 1: Check if email already exists in auth
      const { data: userData, error: checkError } = await tripwireAdminSupabase.auth.admin.listUsers();
      
      if (checkError) {
        throw new Error(`Error checking existing users: ${checkError.message}`);
      }
      
      const existingUser = userData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        console.warn(`⚠️ [WORKER] User ${email} already exists in auth`);
        // Not an error - just skip
        return { 
          success: true, 
          skipped: true, 
          reason: 'User already exists',
          userId: existingUser.id,
          email 
        };
      }

      // Step 2: Create auth user
      const { data: newUser, error: authError } = await tripwireAdminSupabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name,
          role: 'student',
        },
        app_metadata: {
          role: 'student',
        },
      });
      
      if (authError || !newUser?.user) {
        throw new Error(`Auth error: ${authError?.message || 'No user returned'}`);
      }
      
      const userId = newUser.user.id;
      console.log(`   ✅ User created in auth.users: ${userId}`);
      
      // ===================================
      // 🛡️ DOUBLE-CHECK: Idempotency for DB inserts
      // In case of retry after auth success
      // ===================================
      const { data: existingTripwireUser } = await tripwireAdminSupabase
        .from('tripwire_users')
        .select('user_id')
        .eq('user_id', userId)
        .single();
      
      if (existingTripwireUser) {
        console.warn(`⚠️ [WORKER] User ${userId} already exists in tripwire_users (partial retry), skipping inserts`);
        return { 
          success: true, 
          skipped: true, 
          reason: 'Already in database (partial retry)',
          userId,
          email 
        };
      }
      
      // Step 3: Insert into all required tables
      await tripwireAdminSupabase.from('users').insert({
        id: userId,
        email,
        full_name,
        role: 'student'
      });
      console.log('   ✅ users');

      await tripwireAdminSupabase.from('tripwire_users').insert({
        user_id: userId,
        email,
        full_name,
        granted_by: currentUserId,
        manager_name: currentUserName || currentUserEmail || 'Unknown Manager',
        status: 'active',
        modules_completed: 0,
        price: 5000
      });
      console.log('   ✅ tripwire_users');

      await tripwireAdminSupabase.from('tripwire_user_profile').insert({
        user_id: userId,
        full_name,
        total_modules: 3,
        modules_completed: 0
      });
      console.log('   ✅ tripwire_user_profile');

      await tripwireAdminSupabase.from('tripwire_progress').insert({
        tripwire_user_id: userId,
        module_id: 16,
        lesson_id: 67,
        is_completed: false,
        watch_time_seconds: 0,
        video_progress_percent: 0,
        last_position_seconds: 0,
        video_qualified_for_completion: false
      });
      console.log('   ✅ tripwire_progress');

      // Log activity
      await tripwireAdminSupabase.from('sales_activity_log').insert({
        manager_id: currentUserId,
        action_type: 'user_created',
        target_user_id: userId,
        details: { email, full_name }
      });
      console.log('   ✅ sales_activity_log');
      
      // Step 4: Send welcome email (non-blocking if fails)
      let emailSent = false;
      try {
        emailSent = await sendWelcomeEmail({
          toEmail: email,
          name: full_name,
          password: password,
        });

        if (emailSent) {
          await tripwireAdminSupabase.from('tripwire_users').update({
            welcome_email_sent: true,
            welcome_email_sent_at: new Date().toISOString()
          }).eq('user_id', userId);

          await tripwireAdminSupabase.from('sales_activity_log').insert({
            manager_id: currentUserId,
            action_type: 'email_sent',
            target_user_id: userId,
            details: { email, full_name, email_type: 'welcome' }
          });
          
          console.log('   ✅ Welcome email sent');
        }
      } catch (emailError: any) {
        console.warn(`   ⚠️ Email failed (non-critical): ${emailError.message}`);
        // Don't fail job if email fails
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ [WORKER] Job ${job.id} completed in ${duration}ms`);
      
      // Log success
      await logHealthEvent('INFO', `User created successfully: ${email}`, { 
        userId, 
        duration,
        emailSent 
      });
      
      return { success: true, userId, email, emailSent };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ [WORKER] Job ${job.id} failed after ${duration}ms:`, error.message);
      
      // Log failure
      await logHealthEvent('ERROR', `Failed to create user: ${email}`, { 
        error: error.message,
        duration,
        attempt: job.attemptsMade
      });
      
      throw error; // BullMQ will retry
    }
  },
  {
    connection: redis,
    concurrency: 5, // Process 5 jobs in parallel
    limiter: {
      max: 10,
      duration: 1000 // Max 10 jobs per second
    }
  }
);

// Worker event handlers
worker.on('completed', (job) => {
  console.log(`✅ [WORKER] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ [WORKER] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('❌ [WORKER] Worker error:', err);
});

console.log('🔄 Tripwire Worker initialized and ready');

export default worker;
