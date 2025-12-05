/**
 * Tripwire Certificates Routes
 * API для работы с сертификатами (ИЗОЛИРОВАННАЯ БД)
 */

import express from 'express';
import * as tripwireCertificateController from '../../controllers/tripwire/tripwireCertificateController';

const router = express.Router();

/**
 * POST /api/tripwire/certificates/issue
 * Выдать сертификат пользователю
 */
router.post('/issue', tripwireCertificateController.issue);

/**
 * GET /api/tripwire/certificates/my
 * Получить сертификат текущего пользователя
 */
router.get('/my', tripwireCertificateController.getMyCertificate);

/**
 * GET /api/tripwire/certificates/check-eligibility
 * Проверить, может ли пользователь получить сертификат
 */
router.get('/check-eligibility', tripwireCertificateController.checkEligibility);

export default router;

