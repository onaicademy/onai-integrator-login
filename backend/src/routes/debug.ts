import { Router } from 'express';

const router = Router();

// 🔍 DEBUG: Check environment variables
router.get('/env-check', async (req, res) => {
  try {
    const tripwireUrl = process.env.TRIPWIRE_SUPABASE_URL;
    const tripwireKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY;
    
    res.json({
      TRIPWIRE_SUPABASE_URL: {
        exists: !!tripwireUrl,
        value: tripwireUrl ? tripwireUrl.substring(0, 30) + '...' : 'NOT SET'
      },
      TRIPWIRE_SERVICE_ROLE_KEY: {
        exists: !!tripwireKey,
        length: tripwireKey?.length || 0,
        first20: tripwireKey ? tripwireKey.substring(0, 20) + '...' : 'NOT SET',
        last10: tripwireKey ? '...' + tripwireKey.substring(tripwireKey.length - 10) : 'NOT SET'
      },
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('TRIPWIRE'))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
