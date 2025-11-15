/**
 * Materials Routes
 */

import express from 'express';
import * as materialController from '../controllers/materialController';

const router = express.Router();

// Material routes
router.delete('/:materialId', materialController.deleteMaterial);

export default router;

