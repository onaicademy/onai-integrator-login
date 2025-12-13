import { Router } from 'express';
import { unifiedTrackingService } from '../services/unified-tracking.service.js';

const router = Router();

/**
 * GET /api/unified-tracking/leads
 * Get all leads with statistics
 */
router.get('/leads', async (req, res) => {
  try {
    const result = await unifiedTrackingService.getAllLeads();
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/unified-tracking/lead/:email
 * Get lead by email
 */
router.get('/lead/:email', async (req, res) => {
  try {
    const lead = await unifiedTrackingService.getLeadByEmail(req.params.email);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    res.json({ success: true, lead });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/unified-tracking/track-landing
 * Track landing page visit
 */
router.post('/track-landing', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, error: 'Email is required' });
    }
    const leadId = await unifiedTrackingService.trackLandingVisit(email);
    res.json({ success: true, leadId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/unified-tracking/update-email-status
 * Update email status (opened, clicked, failed)
 */
router.post('/update-email-status', async (req, res) => {
  try {
    const { leadId, status, reason } = req.body;
    await unifiedTrackingService.updateEmailStatus(leadId, status, reason);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/unified-tracking/update-sms-status
 * Update SMS status (delivered, clicked, failed)
 */
router.post('/update-sms-status', async (req, res) => {
  try {
    const { leadId, status, reason } = req.body;
    await unifiedTrackingService.updateSMSStatus(leadId, status, reason);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
