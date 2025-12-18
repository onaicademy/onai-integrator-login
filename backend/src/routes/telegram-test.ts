import express from 'express';
import { sendToAllChats } from '../services/telegramBot';
import {
  generateYesterdayReport,
  generateCurrentStatusReport,
  generateDailyReport,
  generateWeeklyReport,
} from '../services/telegramReports';

const router = express.Router();

// 🧪 Тестовая отправка "Вчерашний отчет"
router.post('/test/yesterday', async (req, res) => {
  try {
    console.log('🧪 Тестовая отправка: Вчерашний отчет');
    const report = await generateYesterdayReport();
    const results = await sendToAllChats(report, 'Markdown');
    
    res.json({
      success: true,
      message: 'Вчерашний отчет отправлен',
      results,
      preview: report.substring(0, 200) + '...',
    });
  } catch (error: any) {
    console.error('❌ Ошибка отправки вчерашнего отчета:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🧪 Тестовая отправка "Текущий статус"
router.post('/test/current', async (req, res) => {
  try {
    console.log('🧪 Тестовая отправка: Текущий статус');
    const report = await generateCurrentStatusReport();
    const results = await sendToAllChats(report, 'Markdown');
    
    res.json({
      success: true,
      message: 'Текущий статус отправлен',
      results,
      preview: report.substring(0, 200) + '...',
    });
  } catch (error: any) {
    console.error('❌ Ошибка отправки текущего статуса:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🧪 Тестовая отправка "Дневной отчет"
router.post('/test/daily', async (req, res) => {
  try {
    console.log('🧪 Тестовая отправка: Дневной отчет');
    const report = await generateDailyReport();
    const results = await sendToAllChats(report, 'Markdown');
    
    res.json({
      success: true,
      message: 'Дневной отчет отправлен',
      results,
      preview: report.substring(0, 200) + '...',
    });
  } catch (error: any) {
    console.error('❌ Ошибка отправки дневного отчета:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🧪 Тестовая отправка "Недельный отчет"
router.post('/test/weekly', async (req, res) => {
  try {
    console.log('🧪 Тестовая отправка: Недельный отчет');
    const report = await generateWeeklyReport();
    const results = await sendToAllChats(report, 'Markdown');
    
    res.json({
      success: true,
      message: 'Недельный отчет отправлен',
      results,
      preview: report.substring(0, 200) + '...',
    });
  } catch (error: any) {
    console.error('❌ Ошибка отправки недельного отчета:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🧪 Тестовое сообщение
router.post('/test/message', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message required' });
    }
    
    console.log('🧪 Тестовая отправка сообщения:', message);
    const results = await sendToAllChats(message, 'Markdown');
    
    res.json({
      success: true,
      message: 'Тестовое сообщение отправлено',
      results,
    });
  } catch (error: any) {
    console.error('❌ Ошибка отправки тестового сообщения:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
