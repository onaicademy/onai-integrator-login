import express, { Request, Response } from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// 📦 Multer для временного хранения файла
const upload = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  },
});

// 🐰 BunnyCDN Stream API config
const BUNNY_STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY || '';
const BUNNY_STREAM_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID || '';
const BUNNY_STREAM_CDN_HOSTNAME = process.env.BUNNY_STREAM_CDN_HOSTNAME || 'video.onai.academy';

/**
 * 🎬 POST /api/upload-video
 * Загружает видео в BunnyCDN Stream
 */
router.post('/upload-video', upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No video file provided' });
    }

    if (!BUNNY_STREAM_API_KEY || !BUNNY_STREAM_LIBRARY_ID) {
      return res.status(500).json({ 
        success: false, 
        error: 'BunnyCDN Stream not configured. Please set BUNNY_STREAM_API_KEY and BUNNY_STREAM_LIBRARY_ID in .env' 
      });
    }

    const { title, collectionId } = req.body;
    const videoTitle = title || req.file.originalname;

    console.log(`📤 Uploading video to BunnyCDN Stream: ${videoTitle}`);

    // ШАГ 1: Создаём видео в BunnyCDN Stream
    const createVideoResponse = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos`,
      {
        method: 'POST',
        headers: {
          'AccessKey': BUNNY_STREAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: videoTitle,
          collectionId: collectionId || '',
        }),
      }
    );

    if (!createVideoResponse.ok) {
      const errorText = await createVideoResponse.text();
      console.error('❌ BunnyCDN Create Video Error:', errorText);
      
      // Удаляем временный файл
      fs.unlinkSync(req.file.path);
      
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create video in BunnyCDN',
        details: errorText 
      });
    }

    const videoData: any = await createVideoResponse.json();
    const videoId = videoData.guid;

    console.log(`✅ Video created in BunnyCDN. ID: ${videoId}`);

    // ШАГ 2: Загружаем файл
    const uploadUrl = `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`;
    
    const fileStream = fs.createReadStream(req.file.path);
    const fileStats = fs.statSync(req.file.path);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_STREAM_API_KEY,
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileStats.size.toString(),
      },
      body: fileStream,
    });

    // Удаляем временный файл
    fs.unlinkSync(req.file.path);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ BunnyCDN Upload Error:', errorText);
      
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to upload video to BunnyCDN',
        details: errorText 
      });
    }

    const uploadResult: any = await uploadResponse.json();

    console.log(`🎉 Video uploaded successfully!`);
    console.log(`   Video ID: ${videoId}`);
    console.log(`   Status: ${uploadResult.status || 'processing'}`);

    // Возвращаем результат
    return res.json({
      success: true,
      videoId: videoId,
      title: videoTitle,
      status: uploadResult.status || 'processing',
      hlsUrl: `https://${BUNNY_STREAM_CDN_HOSTNAME}/${videoId}/playlist.m3u8`,
      thumbnailUrl: `https://${BUNNY_STREAM_CDN_HOSTNAME}/${videoId}/thumbnail.jpg`,
      message: 'Video uploaded successfully. It may take a few minutes to process.',
    });

  } catch (error: any) {
    console.error('❌ Upload Error:', error);
    
    // Удаляем временный файл в случае ошибки
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error during video upload',
      details: error.message 
    });
  }
});

/**
 * 🔍 GET /api/video-status/:videoId
 * Проверяет статус обработки видео в BunnyCDN
 */
router.get('/video-status/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    if (!BUNNY_STREAM_API_KEY || !BUNNY_STREAM_LIBRARY_ID) {
      return res.status(500).json({ 
        success: false, 
        error: 'BunnyCDN Stream not configured' 
      });
    }

    const response = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`,
      {
        method: 'GET',
        headers: {
          'AccessKey': BUNNY_STREAM_API_KEY,
        },
      }
    );

    if (!response.ok) {
      return res.status(404).json({ 
        success: false, 
        error: 'Video not found' 
      });
    }

    const videoData: any = await response.json();

    return res.json({
      success: true,
      videoId: videoData.guid,
      title: videoData.title,
      status: videoData.status, // 0 = queued, 1 = processing, 2 = encoding, 3 = finished, 4 = error
      duration: videoData.length,
      views: videoData.views,
      hlsUrl: `https://${BUNNY_STREAM_CDN_HOSTNAME}/${videoData.guid}/playlist.m3u8`,
      thumbnailUrl: `https://${BUNNY_STREAM_CDN_HOSTNAME}/${videoData.guid}/thumbnail.jpg`,
    });

  } catch (error: any) {
    console.error('❌ Status Check Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to check video status',
      details: error.message 
    });
  }
});

// 🗑️ DELETE /api/video/:videoId
router.delete('/video/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    if (!BUNNY_STREAM_API_KEY || !BUNNY_STREAM_LIBRARY_ID) {
      return res.status(500).json({ 
        success: false, 
        error: 'BunnyCDN Stream not configured' 
      });
    }

    const response = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`,
      {
        method: 'DELETE',
        headers: {
          'AccessKey': BUNNY_STREAM_API_KEY,
        },
      }
    );

    if (!response.ok) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to delete video from BunnyCDN' 
      });
    }

    return res.json({
      success: true,
      message: 'Video deleted successfully',
    });

  } catch (error: any) {
    console.error('❌ Delete Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to delete video',
      details: error.message 
    });
  }
});

export default router;

