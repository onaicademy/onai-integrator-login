import { Router } from 'express';
import * as supabaseController from '../controllers/supabaseController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

/**
 * =====================================================
 * AI-КУРАТОР ROUTES
 * =====================================================
 */

// POST /api/supabase/curator/messages - Сохранить пару сообщений (user + assistant)
router.post('/curator/messages', authenticateJWT, supabaseController.saveCuratorMessagePair);

// POST /api/supabase/curator/thread - Получить или создать thread
router.post('/curator/thread', authenticateJWT, supabaseController.getOrCreateCuratorThread);

/**
 * =====================================================
 * AI-АНАЛИТИК ROUTES
 * =====================================================
 */

// POST /api/supabase/analyst/messages - Сохранить пару сообщений (user + assistant)
router.post('/analyst/messages', authenticateJWT, supabaseController.saveAnalystMessagePair);

// POST /api/supabase/analyst/thread - Получить или создать thread
router.post('/analyst/thread', authenticateJWT, supabaseController.getOrCreateAnalystThread);

/**
 * =====================================================
 * AI-НАСТАВНИК (TELEGRAM) ROUTES
 * =====================================================
 */

// POST /api/supabase/mentor/messages - Сохранить пару сообщений (user + assistant)
router.post('/mentor/messages', authenticateJWT, supabaseController.saveMentorMessagePair);

// POST /api/supabase/mentor/thread - Получить или создать thread
router.post('/mentor/thread', authenticateJWT, supabaseController.getOrCreateMentorThread);

export default router;


