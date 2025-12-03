import { Request, Response } from 'express';
import * as userService from '../services/userService';
import { sendEmailChangeNotification, sendPasswordChangeNotification } from '../services/emailService';
import { adminSupabase } from '../config/supabase';

export async function syncUser(req: Request, res: Response) {
  try {
    const { id, email, full_name, avatar_url } = req.body;

    // Валидация
    if (!id || !email) {
      return res.status(400).json({ error: 'Missing required fields: id, email' });
    }

    const user = await userService.syncUser({
      id,
      email,
      full_name,
      avatar_url
    });

    return res.status(200).json(user);
  } catch (error: any) {
    console.error('Sync user error:', error);
    return res.status(500).json({ error: error.message || 'Failed to sync user' });
  }
}

export async function updateLastLogin(req: Request, res: Response) {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await userService.updateLastLogin(userId);

    return res.status(200).json(user);
  } catch (error: any) {
    console.error('Update last login error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update last login' });
  }
}

/**
 * Отправляет уведомление о смене email
 */
export async function notifyEmailChange(req: Request, res: Response) {
  try {
    const { oldEmail, newEmail, name } = req.body;

    if (!oldEmail || !newEmail || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Отправляем уведомление на СТАРЫЙ email
    await sendEmailChangeNotification({
      toEmail: oldEmail,
      name,
      oldEmail,
      newEmail,
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Notify email change error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send notification' });
  }
}

/**
 * Отправляет уведомление о смене пароля
 */
export async function notifyPasswordChange(req: Request, res: Response) {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await sendPasswordChangeNotification({
      toEmail: email,
      name,
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Notify password change error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send notification' });
  }
}

/**
 * 🔥 BACKEND-FIRST: Обновление email через Admin API (обходит rate limits)
 */
export async function updateEmail(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = currentUser.sub || currentUser.id;
    const { newEmail, userName } = req.body;

    if (!newEmail) {
      return res.status(400).json({ error: 'newEmail is required' });
    }

    // Валидация email формата
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    console.log(`[updateEmail] Обновляем email для пользователя ${userId}: ${currentUser.email} -> ${newEmail}`);

    // 🔥 Используем adminSupabase для обхода rate limits
    const { data, error } = await adminSupabase.auth.admin.updateUserById(userId, {
      email: newEmail,
    });

    if (error) {
      console.error('[updateEmail] Ошибка обновления email:', error);
      return res.status(400).json({ error: error.message || 'Failed to update email' });
    }

    console.log('[updateEmail] ✅ Email успешно обновлен в auth.users');

    // Отправляем уведомление на СТАРЫЙ email
    try {
      await sendEmailChangeNotification({
        toEmail: currentUser.email,
        name: userName || 'Пользователь',
        oldEmail: currentUser.email,
        newEmail,
      });
      console.log('[updateEmail] ✅ Email уведомление отправлено');
    } catch (emailError: any) {
      console.error('[updateEmail] ⚠️ Не удалось отправить email уведомление:', emailError);
      // Не падаем, email обновлен успешно
    }

    return res.status(200).json({
      success: true,
      message: 'Email успешно обновлен',
      newEmail,
    });
  } catch (error: any) {
    console.error('[updateEmail] ❌ Критическая ошибка:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * 🔥 BACKEND-FIRST: Обновление пароля через Admin API (обходит rate limits)
 */
export async function updatePassword(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = currentUser.sub || currentUser.id;
    const { newPassword, userName } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'newPassword is required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    console.log(`[updatePassword] Обновляем пароль для пользователя ${userId}`);

    // 🔥 Используем adminSupabase для обхода rate limits
    const { data, error } = await adminSupabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error('[updatePassword] Ошибка обновления пароля:', error);
      return res.status(400).json({ error: error.message || 'Failed to update password' });
    }

    console.log('[updatePassword] ✅ Пароль успешно обновлен');

    // Отправляем уведомление на текущий email
    try {
      await sendPasswordChangeNotification({
        toEmail: currentUser.email,
        name: userName || 'Пользователь',
      });
      console.log('[updatePassword] ✅ Email уведомление отправлено');
    } catch (emailError: any) {
      console.error('[updatePassword] ⚠️ Не удалось отправить email уведомление:', emailError);
      // Не падаем, пароль обновлен успешно
    }

    return res.status(200).json({
      success: true,
      message: 'Пароль успешно обновлен',
    });
  } catch (error: any) {
    console.error('[updatePassword] ❌ Критическая ошибка:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

