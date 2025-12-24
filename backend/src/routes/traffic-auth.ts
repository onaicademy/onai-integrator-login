// @ts-nocheck
/**
 * Traffic Dashboard Authentication Routes
 * 
 * JWT-based authentication for Traffic Command Dashboard
 * Separate from main platform auth
 */

import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { trafficAdminSupabase, trafficSupabase } from '../config/supabase-traffic.js';
import { logUserSession } from './traffic-security.js';
import { callFunction } from '../config/traffic-db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// 🔒 POST /api/traffic-auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    console.log(`🔐 Traffic login attempt: ${email}`);
    
    // ✅ РЕШЕНИЕ SCHEMA CACHE: Mock Mode для локальной разработки
    let user: any = null;
    
    if (process.env.NODE_ENV !== 'production') {
      // 🏠 LOCALHOST: Используем mock data
      console.log('⚠️ [MOCK] Using mock targetologist for local development');
      
      // Mock users для тестирования (все 8 пользователей)
      const mockUsers: Record<string, any> = {
        'kenesary@onai.academy': {
          id: 'f0decafb-8598-4671-9b02-bb097ae44452',
          email: 'kenesary@onai.academy',
          full_name: 'Kenesary',
          team: 'Kenesary',
          role: 'targetologist',
          password_hash: '$2b$10$fR0O5/ZGKMYupr7lne5U0ua414xLeoUk/JOcyc3fF7vA3XeocFbMS', // changeme123
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        'arystan@onai.academy': {
          id: 'mock-arystan-id',
          email: 'arystan@onai.academy',
          full_name: 'Arystan',
          team: 'Arystan',
          role: 'targetologist',
          password_hash: '$2b$10$fR0O5/ZGKMYupr7lne5U0ua414xLeoUk/JOcyc3fF7vA3XeocFbMS', // changeme123
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        'traf4@onai.academy': {
          id: 'mock-traf4-id',
          email: 'traf4@onai.academy',
          full_name: 'Traf4',
          team: 'Traf4',
          role: 'targetologist',
          password_hash: '$2b$10$fR0O5/ZGKMYupr7lne5U0ua414xLeoUk/JOcyc3fF7vA3XeocFbMS', // changeme123
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        'muha@onai.academy': {
          id: 'mock-muha-id',
          email: 'muha@onai.academy',
          full_name: 'Muha',
          team: 'Muha',
          role: 'targetologist',
          password_hash: '$2b$10$fR0O5/ZGKMYupr7lne5U0ua414xLeoUk/JOcyc3fF7vA3XeocFbMS', // changeme123
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        'aidar@onai.academy': {
          id: '38055645-82b6-47a9-b114-257d1dd18362',
          email: 'aidar@onai.academy',
          full_name: 'Aidar',
          team: 'Aidar',
          role: 'targetologist',
          password_hash: '$2b$10$fR0O5/ZGKMYupr7lne5U0ua414xLeoUk/JOcyc3fF7vA3XeocFbMS', // changeme123
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        'sasha@onai.academy': {
          id: '5e3bd4be-7708-4712-aafa-be7f9e002be6',
          email: 'sasha@onai.academy',
          full_name: 'Sasha',
          team: 'Sasha',
          role: 'targetologist',
          password_hash: '$2b$10$fR0O5/ZGKMYupr7lne5U0ua414xLeoUk/JOcyc3fF7vA3XeocFbMS', // changeme123
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        'dias@onai.academy': {
          id: '67702531-b3f4-42b1-b0ad-6b75ecc6deb0',
          email: 'dias@onai.academy',
          full_name: 'Dias',
          team: 'Dias',
          role: 'targetologist',
          password_hash: '$2b$10$fR0O5/ZGKMYupr7lne5U0ua414xLeoUk/JOcyc3fF7vA3XeocFbMS', // changeme123
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        'admin@onai.academy': {
          id: 'admin-mock-id',
          email: 'admin@onai.academy',
          full_name: 'Admin',
          team: 'Admin',
          role: 'admin',
          password_hash: '$2b$10$Hxv8PramiMr6IMUbhngQ3.6IilQlhEtf0m1OQ6uTfjLWIu8lhyrg2', // admin123
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };
      
      user = mockUsers[email.toLowerCase().trim()] || null;
    } else {
      // 🚀 PRODUCTION: Используем настоящую RPC функцию
      const { data: users, error } = await trafficAdminSupabase
        .rpc('get_targetologist_by_email', { 
          p_email: email.toLowerCase().trim() 
        });
      user = users?.[0] || null;
    }
    
    if (!user) {
      console.log(`❌ User not found or inactive: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log(`✅ User found: ${user.email}, Team: ${user.team}`);
    console.log(`   Password hash from DB: ${user.password_hash?.substring(0, 20)}...`);
    
    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, user.password_hash);
    console.log(`   Password verification: ${isValid}`);
    
    if (!isValid) {
      console.log(`❌ Invalid password for: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login timestamp
    await trafficAdminSupabase
      .from('traffic_targetologists')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', user.id);
    
    // 🔒 Log user session (IP, device, browser)
    await logUserSession(req, user.id, {
      email: user.email,
      team: user.team,
      role: user.role
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        team: user.team,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    console.log(`✅ Login successful: ${email} (${user.role})`);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        team: user.team,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 🚪 POST /api/traffic-auth/logout
router.post('/logout', (req, res) => {
  // JWT is stateless, so just return success
  // Client will remove token from localStorage
  res.json({ success: true, message: 'Logged out successfully' });
});

// 🔄 POST /api/traffic-auth/refresh
// Refresh access token using refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    // Verify refresh token
    jwt.verify(refreshToken, JWT_SECRET, async (err: any, decoded: any) => {
      if (err) {
        console.log('❌ Invalid refresh token:', err.message);
        return res.status(403).json({ error: 'Invalid or expired refresh token' });
      }
      
      // Get user to verify they still exist and are active
      const { data: user, error } = await trafficAdminSupabase
        .from('traffic_users')
        .select('id, email, full_name, team_name, role')
        .eq('id', decoded.userId)
        .eq('is_active', true)
        .single();
      
      if (error || !user) {
        return res.status(404).json({ error: 'User not found or inactive' });
      }
      
      // Generate new access token
      const newAccessToken = jwt.sign(
        { 
          userId: user.id,
          email: user.email,
          team: user.team_name,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      console.log(`✅ Token refreshed for: ${user.email}`);
      
      res.json({
        success: true,
        accessToken: newAccessToken,
        expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
      });
    });
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 👤 GET /api/traffic-auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await trafficAdminSupabase
      .from('traffic_targetologists')
      .select('id, email, full_name, team_name, role, avatar_url, last_login_at')
      .eq('id', req.user.userId)
      .single();
    
    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        team: user.team_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        lastLoginAt: user.last_login_at
      }
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// 🔑 POST /api/traffic-auth/change-password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    // Get user with password hash
    const { data: user, error } = await trafficAdminSupabase
      .from('traffic_targetologists')
      .select('password_hash')
      .eq('id', req.user.userId)
      .single();
    
    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    const { error: updateError } = await tripwireAdminSupabase
      .from('traffic_users')
      .update({ 
        password_hash: newHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.userId);
    
    if (updateError) {
      throw updateError;
    }
    
    console.log(`✅ Password changed for user: ${req.user.email}`);
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// 🔐 Middleware: Authenticate JWT token
export function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      console.log('❌ Invalid token:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = user;
    next();
  });
}

// 🔒 POST /api/traffic-auth/request-password-reset
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    console.log(`🔑 Password reset requested for: ${email}`);
    
    // Get user from traffic_users table
    const { data: user, error } = await trafficAdminSupabase
      .from('traffic_users')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .single();
    
    if (error || !user) {
      // Return success anyway for security (don't reveal if email exists)
      console.log(`⚠️ Password reset requested for non-existent email: ${email}`);
      return res.json({ success: true, message: 'If the email exists, a password reset link will be sent' });
    }
    
    // Generate password reset token using NEW Traffic Supabase Auth
    const trafficUrl = process.env.TRAFFIC_SUPABASE_URL!;
    const trafficServiceKey = process.env.TRAFFIC_SERVICE_ROLE_KEY!;
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAuth = createClient(trafficUrl, trafficServiceKey);
    
    // Send password reset email via Supabase
    const { data, error: resetError } = await supabaseAuth.auth.admin.generateLink({
      type: 'recovery',
      email: user.email,
      options: {
        redirectTo: 'https://traffic.onai.academy/reset-password' // TODO: Create this page
      }
    });
    
    if (resetError) {
      console.error('❌ Supabase password reset error:', resetError);
      return res.status(500).json({ error: 'Failed to send password reset email' });
    }
    
    console.log(`✅ Password reset email sent to: ${email}`);
    
    res.json({ 
      success: true, 
      message: 'Password reset link sent to your email'
    });
    
  } catch (error: any) {
    console.error('❌ Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

