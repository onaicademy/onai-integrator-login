import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// JWT secret для Tripwire
const JWT_SECRET = process.env.JWT_SECRET || 'tripwire-secret-key-change-in-production';

/**
 * POST /api/tripwire/login
 * Tripwire Login - Simplified authentication for trial users
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Tripwire login attempt:', email);

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !authData.user) {
      console.error('❌ Tripwire auth failed:', authError?.message);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('⚠️ Failed to load profile:', profileError);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: authData.user.id,
        email: authData.user.email,
        type: 'tripwire',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Tripwire login successful:', email);

    res.json({
      success: true,
      token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: profile?.full_name || 'Trial User',
        avatar_url: profile?.avatar_url,
      },
    });
  } catch (error: any) {
    console.error('❌ Tripwire login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/tripwire/verify
 * Verify JWT token for Tripwire users
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (decoded.type !== 'tripwire') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    res.json({
      success: true,
      userId: decoded.userId,
      email: decoded.email,
    });
  } catch (error: any) {
    console.error('❌ Token verification failed:', error.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

/**
 * POST /api/tripwire/password-reset
 * Request password reset (mock implementation)
 */
router.post('/password-reset', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        code: 'VALIDATION_ERROR',
        message: 'Email обязателен',
        field: 'email' 
      });
    }

    console.log('🔑 Password reset requested for:', email);

    // TODO: Implement actual password reset logic
    // For now, just return success
    res.json({
      success: true,
      message: 'Письмо с инструкциями отправлено на указанный email',
    });
  } catch (error: any) {
    console.error('❌ Password reset error:', error);
    res.status(500).json({ 
      code: 'NETWORK_ERROR',
      message: 'Не удалось отправить письмо',
      field: 'general' 
    });
  }
});

export default router;

