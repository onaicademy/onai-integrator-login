// Supabase Edge Function для создания студентов
// Развёртывание: supabase functions deploy create-student

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Получаем данные из запроса
    const { 
      email, 
      full_name, 
      phone,
      password,
      role = 'student',
      account_expires_at,
      course_ids = []           // ← НОВОЕ: для назначения курсов
    } = await req.json()

    console.log('📥 Полученные данные:', { 
      email, 
      full_name, 
      phone, 
      role, 
      account_expires_at, 
      course_ids 
    })

    // Валидация
    if (!email || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Email and full_name are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'Phone is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!password || password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Создаём Supabase Admin клиент с service_role ключом
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Используем переданный пароль (НЕ генерируем!)
    console.log('🔑 Creating user with provided password...')

    // Создаём пользователя в auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,  // ← Используем переданный пароль!
      phone,     // ← НОВОЕ: Сохраняем телефон в auth.users!
      email_confirm: true, // Автоматически подтверждаем email
      user_metadata: {
        full_name,
        role
      }
    })
    
    console.log('📞 Phone saved to auth.users:', phone)

    console.log('✅ User created in auth.users:', authData?.user?.id)

    if (authError) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: `Failed to create user: ${authError.message}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Создаём запись в public.profiles
    console.log('👤 Creating profile...')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name,
        role,
        is_active: true,
        account_expires_at,  // ← НОВОЕ: срок действия
        created_at: new Date().toISOString()
      })

    console.log('✅ Создан profiles с role:', role)

    if (profileError) {
      console.error('Profile error:', profileError)
      // Если ошибка создания профиля - удаляем пользователя из auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return new Response(
        JSON.stringify({ error: `Failed to create profile: ${profileError.message}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Создаём запись в student_profiles (если это студент)
    if (role === 'student') {
      console.log('🎓 Creating student profile...')
      const { error: studentError } = await supabaseAdmin
        .from('student_profiles')
        .insert({
          id: authData.user.id,      // ← ИСПРАВЛЕНО: id вместо user_id
          email,
          full_name,
          phone,
          total_xp: 0,
          streak_days: 0,
          is_active: true
        })

      if (studentError) {
        console.error('❌ Student profile error:', studentError)
        // Не критичная ошибка, продолжаем
      } else {
        console.log('✅ Student profile created')
      }
    }

    // Назначение курсов (если есть)
    if (course_ids && course_ids.length > 0) {
      console.log('📚 Назначаю курсы:', course_ids)
      
      const coursesToInsert = course_ids.map(courseId => ({
        student_id: authData.user.id,
        course_id: courseId,
        status: 'active',
        enrolled_at: new Date().toISOString()
      }))

      const { error: coursesError } = await supabaseAdmin
        .from('student_courses')
        .insert(coursesToInsert)

      if (coursesError) {
        console.error('❌ Ошибка назначения курсов:', coursesError)
        // Не фейлим создание, просто логируем
      } else {
        console.log('✅ Назначено курсов:', course_ids.length)
      }
    }

    // Возвращаем успешный результат
    console.log('🎉 User created successfully!')
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authData.user.id,
          email,
          full_name,
          phone,
          role,
          account_expires_at
        },
        credentials: {
          email,
          // Пароль НЕ возвращаем из соображений безопасности
          // Frontend уже знает пароль, который ввёл админ
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

