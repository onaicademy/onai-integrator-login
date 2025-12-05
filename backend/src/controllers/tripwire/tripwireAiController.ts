/**
 * Tripwire AI Curator Controller
 * HTTP Controller для AI-куратора
 * ИЗОЛИРОВАННЫЙ для Tripwire DB
 */

import { Request, Response } from 'express';
import { processChat, getChatHistory, processVoiceMessage, processFileUpload } from '../../services/tripwire/tripwireAiService';

/**
 * POST /api/tripwire/ai/chat
 * Отправить сообщение AI-куратору
 */
export async function chat(req: Request, res: Response): Promise<void> {
  try {
    const { user_id, message } = req.body;
    
    if (!user_id || !message) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, message'
      });
      return;
    }
    
    console.log('🤖 [Tripwire AiController] Чат-запрос от:', user_id);
    
    const response = await processChat(user_id, message);
    
    res.json({
      success: true,
      data: response
    });
  } catch (error: any) {
    console.error('❌ [Tripwire AiController] Ошибка chat:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process chat message'
    });
  }
}

/**
 * GET /api/tripwire/ai/history
 * Получить историю чата
 */
export async function history(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.query.user_id as string;
    const limit = parseInt(req.query.limit as string) || 50;
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Missing required query parameter: user_id'
      });
      return;
    }
    
    console.log('🤖 [Tripwire AiController] Запрос истории для:', userId);
    
    const messages = await getChatHistory(userId, limit);
    
    res.json({
      success: true,
      data: messages,
      count: messages.length
    });
  } catch (error: any) {
    console.error('❌ [Tripwire AiController] Ошибка history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch chat history'
    });
  }
}

/**
 * POST /api/tripwire/ai/voice
 * Отправить голосовое сообщение (TODO: Whisper)
 */
export async function voice(req: Request, res: Response): Promise<void> {
  try {
    const { user_id } = req.body;
    const audioFile = req.file; // Multer file
    
    if (!user_id || !audioFile) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, audio file'
      });
      return;
    }
    
    console.log('🎤 [Tripwire AiController] Голосовое сообщение от:', user_id);
    
    const response = await processVoiceMessage(user_id, audioFile);
    
    res.json({
      success: true,
      data: response,
      message: 'Voice message processing (placeholder)'
    });
  } catch (error: any) {
    console.error('❌ [Tripwire AiController] Ошибка voice:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process voice message'
    });
  }
}

/**
 * POST /api/tripwire/ai/file
 * Загрузить файл для анализа (TODO: Vision API)
 */
export async function file(req: Request, res: Response): Promise<void> {
  try {
    const { user_id } = req.body;
    const uploadedFile = req.file; // Multer file
    
    if (!user_id || !uploadedFile) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, file'
      });
      return;
    }
    
    console.log('📎 [Tripwire AiController] Файл от:', user_id);
    
    const response = await processFileUpload(user_id, uploadedFile);
    
    res.json({
      success: true,
      data: response,
      message: 'File processing (placeholder)'
    });
  } catch (error: any) {
    console.error('❌ [Tripwire AiController] Ошибка file:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process file'
    });
  }
}

