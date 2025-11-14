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
  course_ids?: number[]; // ✅ Массив чисел (ID курсов)
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
        // ✅ ОНБОРДИНГ ТОЛЬКО ДЛЯ СТУДЕНТОВ
        // Админы, кураторы, тех специалисты сразу получают onboarding_completed = true
        onboarding_completed: data.role !== 'student',
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
          id: authData.user.id, // student_profiles.id = users.id
          email: data.email,
          full_name: data.full_name,
          phone: data.phone || null,
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
      const courseAssignments = data.course_ids.map(courseId => ({
        user_id: authData.user!.id,
        course_id: courseId, // ✅ courseId уже number, не нужен parseInt
        is_active: true,
      }));

      const { error: coursesError } = await supabase
        .from('user_courses')
        .insert(courseAssignments);

      if (coursesError) {
        console.warn('[StudentService] Courses assignment warning:', coursesError);
        // Не критично, продолжаем
      } else {
        console.log(`[StudentService] ✅ Assigned ${data.course_ids.length} courses`);
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

/**
 * Получить назначенные курсы студента
 */
export async function getUserCourses(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_courses')
      .select(`
        *,
        courses:course_id (
          id,
          name,
          slug,
          description
        )
      `)
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user courses: ${error.message}`);
    }

    return data || [];
  } catch (error: any) {
    console.error('[StudentService] ❌ Error fetching courses:', error.message);
    throw error;
  }
}

/**
 * Назначить курсы студенту
 */
export async function assignCourses(userId: string, courseIds: number[]) {
  try {
    const assignments = courseIds.map(courseId => ({
      user_id: userId,
      course_id: courseId,
      is_active: true,
    }));

    const { error } = await supabase
      .from('user_courses')
      .upsert(assignments, {
        onConflict: 'user_id,course_id',
      });

    if (error) {
      throw new Error(`Failed to assign courses: ${error.message}`);
    }

    return { success: true, message: `Assigned ${courseIds.length} courses` };
  } catch (error: any) {
    console.error('[StudentService] ❌ Error assigning courses:', error.message);
    throw error;
  }
}

/**
 * Отозвать курс у студента
 */
export async function revokeCourse(userId: string, courseId: number) {
  try {
    const { error } = await supabase
      .from('user_courses')
      .delete()
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (error) {
      throw new Error(`Failed to revoke course: ${error.message}`);
    }

    return { success: true, message: 'Course revoked' };
  } catch (error: any) {
    console.error('[StudentService] ❌ Error revoking course:', error.message);
    throw error;
  }
}

/**
 * Получить все доступные курсы
 */
export async function getAllCourses() {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .order('id');

    if (error) {
      throw new Error(`Failed to fetch courses: ${error.message}`);
    }

    return data || [];
  } catch (error: any) {
    console.error('[StudentService] ❌ Error fetching courses:', error.message);
    throw error;
  }
}

