import { Router } from 'express';
import { amoCRMRateLimiter } from '../services/amocrm-rate-limiter';

const router = Router();

// GET /api/amocrm/stats - статистика для UI
router.get('/stats', (req, res) => {
  const stats = amoCRMRateLimiter.getStats();

  res.json({
    ...stats,
    status: stats.queueLength > 10 ? 'syncing' : 'idle',
    eta: stats.queueLength > 0
      ? Math.ceil(stats.queueLength / 5) // MAX_REQUESTS_PER_SECOND = 5
      : 0,
  });
});

export default router;
