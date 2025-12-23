import { Router, Request, Response } from 'express';
import { tripwireAdminSupabase } from '../config/supabase-tripwire';
import crypto from 'crypto';
import { sendWelcomeEmail } from '../services/emailService';

const router = Router();

/**
 * 🚀 CREATE TRIPWIRE USER WITH REAL-TIME PROGRESS
 * 
 * POST /api/admin/tripwire/users/create-with-progress
 * 
 * Server-Sent Events endpoint для создания пользователя с прогресс-баром
 * Возвращает статусы: checking, creating_auth, creating_profile, sending_email, completed
 */
router.post('/users/create-with-progress', async (req: Request, res: Response) => {
  const { full_name, email, password, currentUserId, currentUserEmail, currentUserName } = req.body;

  // ✅ Устанавливаем SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  /**
   * Отправка статуса клиенту
   */
  const sendStatus = (status: string, message: string, error?: string, data?: any) => {
    const payload = {
      status,
      message,
      ...(error && { error }),
      ...(data && { data }),
      timestamp: new Date().toISOString()
    };
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  let userId: string | null = null;

  try {
    // 🔍 STEP 1: ПРОВЕРКА СУЩЕСТВУЮЩЕГО ПОЛЬЗОВАТЕЛЯ
    sendStatus('checking', '🔍 Проверка email адреса...');
    await new Promise(resolve => setTimeout(resolve, 500)); // UI delay

    const { data: userData, error: checkError } = await tripwireAdminSupabase.auth.admin.listUsers();
    
    if (checkError) {
      sendStatus('error', '❌ Ошибка проверки базы данных', checkError.message);
      res.end();
      return;
    }
    
    const existingUser = userData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      sendStatus('error', '❌ Пользователь уже существует', `Пользователь с email ${email} уже зарегистрирован в системе`);
      res.end();
      return;
    }

    sendStatus('checked', '✅ Email свободен');
    await new Promise(resolve => setTimeout(resolve, 300));

    // 🔐 STEP 2: СОЗДАНИЕ AUTH USER
    sendStatus('creating_auth', '🔐 Создание учетной записи...');
    await new Promise(resolve => setTimeout(resolve, 500));

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
      sendStatus('error', '❌ Ошибка создания учетной записи', authError?.message || 'Не удалось создать пользователя');
      res.end();
      return;
    }

    userId = newUser.user.id;
    sendStatus('auth_created', '✅ Учетная запись создана');
    await new Promise(resolve => setTimeout(resolve, 300));

    // 📝 STEP 3: СОЗДАНИЕ ПРОФИЛЯ В БАЗЕ ДАННЫХ
    sendStatus('creating_profile', '📝 Создание профиля в базе данных...');
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      // 1. public.users
      const { error: usersError } = await tripwireAdminSupabase
        .from('users')
        .insert({
          id: userId,
          email,
          full_name,
          role: 'student'
        });
      if (usersError) throw new Error(`Ошибка таблицы users: ${usersError.message}`);

      sendStatus('profile_users', '  ✅ Основная таблица пользователей');
      await new Promise(resolve => setTimeout(resolve, 200));

      // 2. tripwire_users
      const { error: twError } = await tripwireAdminSupabase
        .from('tripwire_users')
        .insert({
          user_id: userId,
          email,
          full_name,
          granted_by: currentUserId,
          manager_name: currentUserName || currentUserEmail || 'Unknown Manager',
          status: 'active',
          modules_completed: 0,
          price: 5000
        });
      if (twError) throw new Error(`Ошибка таблицы tripwire_users: ${twError.message}`);

      sendStatus('profile_tripwire', '  ✅ Данные курса');
      await new Promise(resolve => setTimeout(resolve, 200));

      // 3. tripwire_user_profile
      const { error: profileError } = await tripwireAdminSupabase
        .from('tripwire_user_profile')
        .insert({
          user_id: userId,
          full_name,
          total_modules: 3,
          modules_completed: 0
        });
      if (profileError) throw new Error(`Ошибка таблицы tripwire_user_profile: ${profileError.message}`);

      sendStatus('profile_details', '  ✅ Детали профиля');
      await new Promise(resolve => setTimeout(resolve, 200));

      // 4. tripwire_progress (Lesson 67)
      const { error: progressError } = await tripwireAdminSupabase
        .from('tripwire_progress')
        .insert({
          tripwire_user_id: userId,
          module_id: 16,
          lesson_id: 67,
          is_completed: false,
          watch_time_seconds: 0,
          video_progress_percent: 0,
          last_position_seconds: 0,
          video_qualified_for_completion: false
        });
      if (progressError) throw new Error(`Ошибка инициализации прогресса: ${progressError.message}`);

      sendStatus('profile_progress', '  ✅ Прогресс обучения');
      await new Promise(resolve => setTimeout(resolve, 200));

      // 5. sales_activity_log
      await tripwireAdminSupabase
        .from('sales_activity_log')
        .insert({
          manager_id: currentUserId,
          action_type: 'user_created',
          target_user_id: userId,
          target_user_email: email,
          details: { email, full_name }
        });

      sendStatus('profile_created', '✅ Профиль создан');
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (dbError: any) {
      // 🔥 ROLLBACK
      sendStatus('rolling_back', '⚠️ Откат изменений...');
      
      try {
        await tripwireAdminSupabase
          .from('users')
          .delete()
          .eq('id', userId);
        
        await tripwireAdminSupabase.auth.admin.deleteUser(userId);
        
        sendStatus('error', '❌ Ошибка создания профиля', dbError.message);
      } catch (rollbackError: any) {
        sendStatus('error', '❌ Критическая ошибка', `Ошибка отката: ${rollbackError.message}`);
      }
      
      res.end();
      return;
    }

    // 📧 STEP 4: ОТПРАВКА EMAIL
    sendStatus('sending_email', '📧 Отправка приглашения на email...');
    await new Promise(resolve => setTimeout(resolve, 500));

    let emailSent = false;
    try {
      emailSent = await sendWelcomeEmail({
        toEmail: email,
        name: full_name,
        password: password,
      });

      if (emailSent) {
        await tripwireAdminSupabase
          .from('tripwire_users')
          .update({
            welcome_email_sent: true,
            welcome_email_sent_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        await tripwireAdminSupabase
          .from('sales_activity_log')
          .insert({
            manager_id: currentUserId,
            action_type: 'welcome_email_sent',
            target_user_id: userId,
            target_user_email: email,
            details: { email, full_name }
          });

        sendStatus('email_sent', '✅ Email отправлен');
      } else {
        sendStatus('email_warning', '⚠️ Email не отправлен (не критично)');
      }
    } catch (emailError: any) {
      console.error('Email error:', emailError);
      sendStatus('email_warning', '⚠️ Ошибка отправки email (не критично)', emailError.message);
    }

    await new Promise(resolve => setTimeout(resolve, 300));

    // ✅ STEP 5: ЗАВЕРШЕНИЕ
    sendStatus('completed', '🎉 Ученик успешно создан!', undefined, {
      userId,
      email,
      full_name,
      canLogin: true,
      emailSent
    });

    res.end();

  } catch (error: any) {
    console.error('❌ Critical error in user creation:', error);
    sendStatus('error', '❌ Критическая ошибка', error.message);
    res.end();
  }
});

export default router;
