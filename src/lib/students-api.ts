/**
 * API для управления учениками
 * Используется в админ панели
 */

import { supabase } from './supabase';

export interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  email_verified: boolean;
  invited_by?: string;
  invited_at: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentInvitation {
  id: string;
  email: string;
  full_name: string;
  invitation_token: string;
  invitation_url: string;
  temp_password: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  created_at: string;
}

/**
 * Получить список всех учеников
 */
export async function getAllStudents() {
  try {
    const { data, error } = await supabase
      .from('student_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching students:', error);
    return { data: null, error };
  }
}

/**
 * Создать приглашение для ученика
 */
export async function createStudentInvitation(
  email: string,
  fullName: string
): Promise<{ data: StudentInvitation | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('create_student_invitation', {
      p_email: email,
      p_full_name: fullName,
      p_invited_by: user.id
    });

    if (error) throw error;

    // Преобразуем результат
    const invitation: StudentInvitation = {
      id: data[0].invitation_id,
      email,
      full_name: fullName,
      invitation_token: data[0].invitation_token,
      invitation_url: data[0].invitation_url,
      temp_password: data[0].temp_password,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    };

    return { data: invitation, error: null };
  } catch (error) {
    console.error('Error creating invitation:', error);
    return { data: null, error };
  }
}

/**
 * Получить все приглашения
 */
export async function getAllInvitations() {
  try {
    const { data, error } = await supabase
      .from('student_invitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return { data: null, error };
  }
}

/**
 * Сменить пароль ученика (admin)
 */
export async function resetStudentPassword(
  studentId: string,
  newPassword: string
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Вызов admin API для смены пароля
    // TODO: Реализовать через Supabase Admin API или Edge Function
    console.log('Password reset for student:', studentId);

    // Логируем изменение
    await supabase
      .from('password_change_history')
      .insert({
        user_id: studentId,
        changed_by: user.id,
        reason: 'admin_reset'
      });

    return { success: true, error: null };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { success: false, error };
  }
}

/**
 * Обновить профиль ученика
 */
export async function updateStudentProfile(
  studentId: string,
  updates: Partial<StudentProfile>
) {
  try {
    const { data, error } = await supabase
      .from('student_profiles')
      .update(updates)
      .eq('id', studentId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { data: null, error };
  }
}

/**
 * Деактивировать ученика
 */
export async function deactivateStudent(studentId: string) {
  return updateStudentProfile(studentId, { is_active: false });
}

/**
 * Активировать ученика
 */
export async function activateStudent(studentId: string) {
  return updateStudentProfile(studentId, { is_active: true });
}

