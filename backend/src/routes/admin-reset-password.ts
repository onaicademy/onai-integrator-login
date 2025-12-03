import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticateJWT, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * TEMPORARY ENDPOINT: Reset user password (admin only)
 * POST /api/admin/reset-password
 * Body: { email: string, newPassword: string }
 */
router.post('/reset-password', authenticateJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and newPassword are required' });
    }

    console.log(`🔐 Admin resetting password for ${email}...`);

    // Get user by email
    const { data: users, error: getUserError } = await supabase.auth.admin.listUsers();

    if (getUserError) {
      console.error('❌ Error listing users:', getUserError);
      return res.status(500).json({ error: 'Failed to list users' });
    }

    const user = users.users.find((u: any) => u.email === email);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user password
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('❌ Error updating password:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    console.log(`✅ Password reset successfully for ${email}`);
    return res.json({ message: 'Password reset successfully', user: data.user.email });

  } catch (error: any) {
    console.error('❌ Error in reset-password:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

