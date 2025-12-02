import { Request, Response } from 'express';
import * as userService from '../services/userService';

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

