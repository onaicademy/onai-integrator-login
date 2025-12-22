/**
 * Targetologist Assignment API
 * 
 * Endpoints для ручного назначения таргетолога к кампании
 */

import { Router, Request, Response } from 'express';
import { 
  manuallyAssignTargetologist,
  getCampaignsForTargetologist,
  type Targetologist
} from '../services/targetologist-detector.js';

const router = Router();

/**
 * POST /api/targetologist-assignment/manual
 * 
 * Вручную назначить таргетолога к кампании
 * 
 * Body:
 * {
 *   fbCampaignId: string,
 *   fbCampaignName: string,
 *   fbAccountId: string,
 *   targetologist: 'Kenesary' | 'Arystan' | 'Muha' | 'Traf4',
 *   verifiedBy: string
 * }
 */
router.post('/manual', async (req: Request, res: Response) => {
  try {
    const {
      fbCampaignId,
      fbCampaignName,
      fbAccountId,
      targetologist,
      verifiedBy
    } = req.body;

    // Validate input
    if (!fbCampaignId || !fbCampaignName || !fbAccountId || !targetologist || !verifiedBy) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Validate targetologist
    const validTargetologists = ['Kenesary', 'Arystan', 'Muha', 'Traf4'];
    if (!validTargetologists.includes(targetologist)) {
      return res.status(400).json({
        success: false,
        error: `Invalid targetologist. Must be one of: ${validTargetologists.join(', ')}`
      });
    }

    console.log(`[Targetologist Assignment] Manual assignment: ${fbCampaignId} → ${targetologist} by ${verifiedBy}`);

    const result = await manuallyAssignTargetologist(
      fbCampaignId,
      fbCampaignName,
      fbAccountId,
      targetologist as Targetologist,
      verifiedBy
    );

    if (result.success) {
      return res.json({
        success: true,
        message: `Campaign ${fbCampaignId} assigned to ${targetologist}`,
        data: {
          fbCampaignId,
          targetologist,
          verifiedBy
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to assign targetologist'
      });
    }

  } catch (error: any) {
    console.error('[Targetologist Assignment] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/targetologist-assignment/campaigns/:targetologist
 * 
 * Получить все кампании для конкретного таргетолога
 */
router.get('/campaigns/:targetologist', async (req: Request, res: Response) => {
  try {
    const { targetologist } = req.params;

    // Validate targetologist
    const validTargetologists = ['Kenesary', 'Arystan', 'Muha', 'Traf4'];
    if (!validTargetologists.includes(targetologist)) {
      return res.status(400).json({
        success: false,
        error: `Invalid targetologist. Must be one of: ${validTargetologists.join(', ')}`
      });
    }

    console.log(`[Targetologist Assignment] Getting campaigns for ${targetologist}`);

    const campaigns = await getCampaignsForTargetologist(targetologist as Targetologist);

    return res.json({
      success: true,
      targetologist,
      campaigns,
      count: campaigns.length
    });

  } catch (error: any) {
    console.error('[Targetologist Assignment] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
