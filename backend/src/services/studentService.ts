import { supabase } from '../config/supabase';

/**
 * Создать нового студента
 */
export async function createStudent(data: {
  email: string;
  full_name: string;
  phone?: string;
  password: string;
  role: 'student' | 'curator' | 'admin';
  account_expires_at?: string | null;
  course_ids?: string[];
}) {
  try {
    console.log('[StudentService] Creating student:', data.email);

    // 1. Создаём пользователя в Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // Авто-подтверждение email
      user_metadata: {
        full_name: data.full_name,
        role: data.role,
      },
    });

    if (authError) {
      console.error('[StudentService] Auth error:', authError);
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('User creation failed: no user returned');
    }

    console.log('[StudentService] ✅ Auth user created:', authData.user.id);

    // 2. Создаём/обновляем запись в таблице users
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: authData.user.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        // telegram_chat_id будет установлен когда студент нажмёт /start в боте
      }, {
        onConflict: 'id',
      });

    if (profileError) {
      console.error('[StudentService] Profile error:', profileError);
      // Не критично, продолжаем
    } else {
      console.log('[StudentService] ✅ User profile created');
    }

    // 3. Создаём запись в student_profiles (если роль = student)
    if (data.role === 'student') {
      const { error: studentProfileError } = await supabase
        .from('student_profiles')
        .insert({
          user_id: authData.user.id,
          phone: data.phone || null,
          account_expires_at: data.account_expires_at || null,
          is_active: true,
        });

      if (studentProfileError) {
        console.error('[StudentService] Student profile error:', studentProfileError);
        throw new Error(`Failed to create student profile: ${studentProfileError.message}`);
      }

      console.log('[StudentService] ✅ Student profile created');
    }

    // 4. Назначаем курсы (если указаны)
    if (data.course_ids && data.course_ids.length > 0) {
      const enrollments = data.course_ids.map(courseId => ({
        student_id: authData.user!.id,
        course_id: parseInt(courseId),
        enrolled_at: new Date().toISOString(),
      }));

      const { error: enrollmentError } = await supabase
        .from('course_enrollments')
        .insert(enrollments);

      if (enrollmentError) {
        console.warn('[StudentService] Enrollment warning:', enrollmentError);
        // Не критично, продолжаем
      } else {
        console.log(`[StudentService] ✅ Enrolled in ${data.course_ids.length} courses`);
      }
    }

    return {
      success: true,
      user_id: authData.user.id,
      credentials: {
        email: data.email,
        temp_password: data.password,
      },
    };
  } catch (error: any) {
    console.error('[StudentService] ❌ Error:', error.message);
    throw error;
  }
}

/**
 * Получить список студентов
 */
export async function getStudents(filters?: {
  searchTerm?: string;
  role?: string;
  isActive?: boolean;
}) {
  try {
    let query = supabase
      .from('users')
      .select('id, email, full_name, role, created_at, last_login_at, total_xp, level, telegram_chat_id');

    // Фильтры
    if (filters?.searchTerm) {
      query = query.or(`email.ilike.%${filters.searchTerm}%,full_name.ilike.%${filters.searchTerm}%`);
    }

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch students: ${error.message}`);
    }

    return data || [];
  } catch (error: any) {
    console.error('[StudentService] ❌ Error fetching students:', error.message);
    throw error;
  }
}

/**
 * Получить студента по ID
 */
export async function getStudentById(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch student: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    console.error('[StudentService] ❌ Error fetching student:', error.message);
    throw error;
  }
}

/**
 * Обновить студента
 */
export async function updateStudent(userId: string, updates: {
  full_name?: string;
  phone?: string;
  telegram_chat_id?: number;
  [key: string]: any;
}) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update student: ${error.message}`);
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('[StudentService] ❌ Error updating student:', error.message);
    throw error;
  }
}

/**
 * Деактивировать студента
 */
export async function deactivateStudent(userId: string, reason?: string) {
  try {
    // Обновляем student_profiles
    const { error: profileError } = await supabase
      .from('student_profiles')
      .update({
        is_active: false,
        deactivation_reason: reason,
        deleted_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (profileError) {
      console.warn('[StudentService] Warning updating profile:', profileError);
    }

    return { success: true, message: 'Student deactivated' };
  } catch (error: any) {
    console.error('[StudentService] ❌ Error deactivating student:', error.message);
    throw error;
  }
}

/**
 * Активировать студента
 */
export async function activateStudent(userId: string) {
  try {
    const { error: profileError } = await supabase
      .from('student_profiles')
      .update({
        is_active: true,
        deactivation_reason: null,
        deleted_at: null
      })
      .eq('user_id', userId);

    if (profileError) {
      console.warn('[StudentService] Warning updating profile:', profileError);
    }

    return { success: true, message: 'Student activated' };
  } catch (error: any) {
    console.error('[StudentService] ❌ Error activating student:', error.message);
    throw error;
  }
}

