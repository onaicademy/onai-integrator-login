/**
 * Tripwire Certificates Routes
 * API для работы с сертификатами (ИЗОЛИРОВАННАЯ БД)
 */

import express from 'express';
import { authenticateTripwireJWT } from '../../middleware/tripwire-auth';
import * as tripwireCertificateController from '../../controllers/tripwire/tripwireCertificateController';
import * as tripwireCertificateSSEController from '../../controllers/tripwire/tripwireCertificateSSEController';

const router = express.Router();

/**
 * POST /api/tripwire/certificates/issue-stream
 * 🔥 NEW: Выдать сертификат с реальным прогрессом через SSE
 */
router.post('/issue-stream', tripwireCertificateSSEController.issueCertificateStream);

/**
 * POST /api/tripwire/certificates/issue
 * Выдать сертификат пользователю (старый метод, для обратной совместимости)
 */
router.post('/issue', authenticateTripwireJWT, tripwireCertificateController.issue);

/**
 * GET /api/tripwire/certificates/my
 * Получить сертификат текущего пользователя
 */
router.get('/my', authenticateTripwireJWT, tripwireCertificateController.getMyCertificate);

/**
 * GET /api/tripwire/certificates/check-eligibility
 * Проверить, может ли пользователь получить сертификат
 */
router.get('/check-eligibility', authenticateTripwireJWT, tripwireCertificateController.checkEligibility);

export default router;

