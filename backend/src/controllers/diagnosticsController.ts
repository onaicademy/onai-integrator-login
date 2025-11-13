import { Request, Response } from 'express';
import * as diagnosticsService from '../services/diagnosticsService';

export async function checkDatabase(req: Request, res: Response) {
  try {
    const result = await diagnosticsService.checkDatabase();
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Diagnostics error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to check database'
    });
  }
}

