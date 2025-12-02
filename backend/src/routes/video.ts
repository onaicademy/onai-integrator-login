import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as transcriptionService from '../services/transcriptionService';

const router = Router();

/**
 * GET /api/video/:videoId/qualities
 * Получить доступные качества видео от BunnyCDN
 */
router.get('/video/:videoId/qualities', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    
    // Запрос к BunnyCDN API для получения доступных качеств
    const bunnyResponse = await fetch(
      `https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        headers: {
          'AccessKey': process.env.BUNNY_API_KEY || ''
        }
      }
    );
    
    if (!bunnyResponse.ok) {
      // Если BunnyCDN недоступен, возвращаем дефолтные качества
      console.warn('BunnyCDN API unavailable, returning default qualities');
      return res.json({
        success: true,
        videoId: videoId,
        qualities: ['360p', '480p', '720p', '1080p'],
        defaultQuality: '720p'
      });
    }
    
    const videoData = await bunnyResponse.json() as any;
    
    // BunnyCDN возвращает доступные резолюции
    const availableQualities = videoData.availableResolutions || ['360p', '480p', '720p', '1080p'];
    
    res.json({
      success: true,
      videoId: videoId,
      qualities: availableQualities,
      defaultQuality: '720p'
    });
  } catch (error) {
    console.error('Error fetching video qualities:', error);
    
    // Fallback на дефолтные качества
    res.json({
      success: true,
      videoId: req.params.videoId,
      qualities: ['360p', '480p', '720p', '1080p'],
      defaultQuality: '720p'
    });
  }
});

/**
 * GET /api/video/:videoId/transcription
 * Получить транскрибацию видео
 */
router.get('/video/:videoId/transcription', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    
    const transcription = await transcriptionService.getTranscription(videoId);
    
    if (!transcription) {
      return res.status(404).json({
        success: false,
        message: 'Transcription not found'
      });
    }
    
    res.json({
      success: true,
      videoId: videoId,
      transcript_text: transcription.transcript_text,
      transcript_vtt: transcription.transcript_vtt,
      transcript_srt: transcription.transcript_srt,
      language: transcription.language,
      status: transcription.status
    });
  } catch (error) {
    console.error('Error fetching transcription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transcription'
    });
  }
});

/**
 * POST /api/video/:videoId/transcription/generate
 * Сгенерировать транскрибацию для видео
 */
router.post('/video/:videoId/transcription/generate', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const { videoUrl } = req.body;
    
    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        message: 'videoUrl is required'
      });
    }
    
    // Запуск транскрибации асинхронно
    transcriptionService.generateTranscription(videoId, videoUrl)
      .then(() => console.log(`✅ Transcription completed for video ${videoId}`))
      .catch(err => console.error(`❌ Transcription failed for video ${videoId}:`, err));
    
    res.json({
      success: true,
      message: 'Transcription generation started',
      videoId: videoId
    });
  } catch (error) {
    console.error('Error starting transcription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start transcription'
    });
  }
});

export default router;

