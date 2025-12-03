import express, { Request, Response } from 'express';
import { adminSupabase } from '../config/supabase';

const router = express.Router();

/**
 * 🐰 POST /api/webhooks/bunnycdn
 * BunnyCDN Webhook endpoint for video transcoding events
 * 
 * BunnyCDN sends webhook when video status changes:
 * - VideoUploaded (status 1)
 * - VideoEncoded (status 4) ← We care about this!
 * - VideoFailed (status 5)
 * 
 * Webhook payload example:
 * {
 *   "EventType": "VideoEncoded",
 *   "VideoGuid": "9e3e25ad-fe5f-4e11-b797-de749f33631c",
 *   "VideoTitle": "My Lesson Video",
 *   "Status": 4,
 *   "Length": 360,
 *   "AvailableResolutions": "1080p,720p,480p,360p"
 * }
 */
router.post('/bunnycdn', async (req: Request, res: Response) => {
  try {
    const { EventType, VideoGuid, Status, Length, AvailableResolutions } = req.body;
    
    console.log(`🐰 [WEBHOOK] Received from BunnyCDN:`, {
      EventType,
      VideoGuid,
      Status
    });

    // Verify it's a video encoded event
    if (EventType !== 'VideoEncoded' || Status !== 4) {
      console.log(`⚠️ [WEBHOOK] Ignoring non-encoded event: ${EventType} (Status: ${Status})`);
      return res.status(200).json({ success: true, message: 'Event ignored' });
    }

    const videoId = VideoGuid;
    
    if (!videoId) {
      console.error(`❌ [WEBHOOK] No VideoGuid in payload`);
      return res.status(400).json({ success: false, error: 'VideoGuid is required' });
    }

    console.log(`✅ [WEBHOOK] Video ${videoId} is encoded! Triggering transcription...`);

    // Update video status in DB
    await adminSupabase
      .from('video_content')
      .update({ 
        transcoding_status: 'ready',
        duration_seconds: Length || 0,
        updated_at: new Date().toISOString()
      })
      .eq('bunny_video_id', videoId);

    // Trigger transcription asynchronously
    const BUNNY_STREAM_CDN_HOSTNAME = process.env.BUNNY_STREAM_CDN_HOSTNAME || 'video.onai.academy';
    const videoUrl = `https://${BUNNY_STREAM_CDN_HOSTNAME}/${videoId}/playlist.m3u8`;
    
    const { generateTranscription } = require('../services/transcriptionService');
    
    generateTranscription(videoId, videoUrl)
      .then(() => {
        console.log(`✅ [WEBHOOK] Transcription completed for ${videoId}`);
      })
      .catch((error: Error) => {
        console.error(`❌ [WEBHOOK] Transcription failed for ${videoId}:`, error.message);
        
        // Update transcription status as failed in DB
        adminSupabase
          .from('video_transcriptions')
          .upsert({
            video_id: videoId,
            status: 'failed',
            error_message: error.message
          });
      });

    // Return success immediately (transcription runs in background)
    return res.json({ 
      success: true, 
      message: 'Transcription triggered',
      videoId 
    });

  } catch (error: any) {
    console.error('❌ [WEBHOOK] Error processing BunnyCDN webhook:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to process webhook',
      details: error.message 
    });
  }
});

/**
 * 🔍 GET /api/webhooks/test
 * Test endpoint to verify webhook is reachable
 */
router.get('/test', (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    message: 'Webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
});

export default router;

