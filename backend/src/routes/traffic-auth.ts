/**
 * Traffic Dashboard Authentication Routes
 * 
 * JWT-based authentication for Traffic Command Dashboard
 * Separate from main platform auth
 */

import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { tripwireAdminSupabase } from '../config/supabase-tripwire.js';
import { logUserSession } from './traffic-security.js';

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
    
    // Get user from traffic_users table
    const { data: user, error } = await tripwireAdminSupabase
      .from('traffic_users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .single();
    
    if (error || !user) {
      console.log(`❌ User not found or inactive: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      console.log(`❌ Invalid password for: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login timestamp
    await tripwireAdminSupabase
      .from('traffic_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);
    
    // 🔒 Log user session (IP, device, browser)
    await logUserSession(req, user.id, {
      email: user.email,
      team: user.team_name,
      role: user.role
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        team: user.team_name,
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
        team: user.team_name,
        role: user.role,
        avatarUrl: user.avatar_url
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

// 👤 GET /api/traffic-auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await tripwireAdminSupabase
      .from('traffic_users')
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
    const { data: user, error } = await tripwireAdminSupabase
      .from('traffic_users')
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

export default router;

