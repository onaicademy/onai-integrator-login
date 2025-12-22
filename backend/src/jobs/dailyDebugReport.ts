/**
 * Daily Debug Report - Every day at 23:00 Almaty
 * Sends intelligent error summary to @oapdbugger_bot via GROQ
 */

import cron from 'node-cron';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Telegram Bot
const DEBUGGER_BOT_TOKEN = process.env.TELEGRAM_ANALYTICS_BOT_TOKEN;
const DEBUGGER_CHAT_ID = process.env.TELEGRAM_ANALYTICS_CHAT_ID;

// GROQ API
const GROQ_API_KEY = process.env.GROQ_DEBUGGER_API_KEY || process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Landing Supabase (where error_logs are stored)
const LANDING_SUPABASE_URL = process.env.LANDING_SUPABASE_URL || '';
const LANDING_SUPABASE_SERVICE_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY || '';

const supabase = createClient(LANDING_SUPABASE_URL, LANDING_SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Schedule: Every day at 23:00 Almaty (17:00 UTC)
 */
export function startDailyDebugReportJob() {
  // 23:00 Almaty = 17:00 UTC (Almaty is UTC+6)
  cron.schedule('0 17 * * *', async () => {
    console.log('🐛 [Daily Debug Report] Starting...');
    
    try {
      await generateAndSendDebugReport();
    } catch (error: any) {
      console.error('❌ [Daily Debug Report] Failed:', error.message);
      
      // Send fallback message
      if (DEBUGGER_BOT_TOKEN && DEBUGGER_CHAT_ID) {
        await sendToTelegram(
          `❌ Ошибка генерации отчёта\n\n${error.message}\n\nПопробую завтра.`
        );
      }
    }
  });
  
  console.log('✅ [Daily Debug Report] Scheduled at 23:00 Almaty (17:00 UTC)');
}

/**
 * Generate and send debug report
 */
async function generateAndSendDebugReport() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const startDate = yesterday.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];
  
  console.log(`📊 [Daily Debug Report] Collecting errors from ${startDate} to ${endDate}...`);
  
  // 1. Collect errors from database
  const { data: errors, error: dbError } = await supabase
    .from('error_logs')
    .select('*')
    .gte('timestamp', startDate)
    .lt('timestamp', endDate)
    .order('timestamp', { ascending: false });
  
  if (dbError) {
    throw new Error(`Database error: ${dbError.message}`);
  }
  
  if (!errors || errors.length === 0) {
    console.log('✅ [Daily Debug Report] No errors today! 🎉');
    await sendToTelegram(
      `✅ *ЕЖЕДНЕВНЫЙ ОТЧЁТ* | ${new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty' })}\n\n` +
      `🎉 *НЕТ ОШИБОК!*\n\n` +
      `Платформа работала стабильно весь день.`
    );
    return;
  }
  
  console.log(`🔍 [Daily Debug Report] Found ${errors.length} errors`);
  
  // 2. Generate intelligent summary via GROQ
  const summary = await generateIntelligentSummary(errors, startDate);
  
  // 3. Send to Telegram
  await sendToTelegram(summary);
  
  console.log('✅ [Daily Debug Report] Sent successfully');
}

/**
 * Generate intelligent summary using GROQ AI
 */
async function generateIntelligentSummary(errors: any[], date: string): Promise<string> {
  // Prepare error data for AI
  const errorsSummary = errors.map(err => ({
    severity: err.severity,
    category: err.category,
    message: err.message,
    context: err.context,
    timestamp: err.timestamp,
    resolved: err.resolved
  }));
  
  // Group by category
  const groupedErrors = errors.reduce((acc: any, err) => {
    if (!acc[err.category]) acc[err.category] = [];
    acc[err.category].push(err);
    return acc;
  }, {});
  
  // Count by severity
  const severityCounts = errors.reduce((acc: any, err) => {
    acc[err.severity] = (acc[err.severity] || 0) + 1;
    return acc;
  }, {});
  
  const prompt = `You are a Senior DevOps Engineer analyzing error logs for OnAI Academy platform.

**Date:** ${date}
**Total Errors:** ${errors.length}

**Severity Breakdown:**
${Object.entries(severityCounts).map(([severity, count]) => `- ${severity.toUpperCase()}: ${count}`).join('\n')}

**Errors by Category:**
${Object.entries(groupedErrors).map(([category, errs]: [string, any]) => 
  `\n**${category.toUpperCase()}** (${errs.length} errors):\n${errs.slice(0, 3).map((e: any) => `  - ${e.message}`).join('\n')}`
).join('\n')}

**Task:** Create a concise daily report in Russian for the development team.

**Format:**
🐛 *ЕЖЕДНЕВНЫЙ ОТЧЁТ* | ${new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty' })}

📊 *Статистика:*
- Всего ошибок: X
- CRITICAL: X
- HIGH: X
- MEDIUM: X
- LOW: X

🔥 *Критичные проблемы:*
(List top 3 critical issues with page URLs if available)

⚠️ *Требуют внимания:*
(List important patterns or recurring errors)

💡 *Рекомендации:*
(3-5 specific actionable recommendations)

✅ *Что исправить завтра:*
(Prioritized TODO list)

**Requirements:**
- Be concise and specific
- Include page URLs where errors occurred (from context.endpoint or context.metadata)
- Prioritize by impact on users
- Give actionable recommendations
- Use emojis for readability
- Write in Russian
- Keep under 4000 characters for Telegram`;

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'llama-3.1-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a Senior DevOps Engineer. Respond in Russian.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    const aiSummary = response.data.choices[0].message.content;
    console.log('✅ [Daily Debug Report] AI summary generated');
    return aiSummary;
    
  } catch (error: any) {
    console.error('❌ [Daily Debug Report] GROQ API failed:', error.message);
    
    // Fallback: Simple summary without AI
    return generateFallbackSummary(errors, date, severityCounts, groupedErrors);
  }
}

/**
 * Fallback summary (if GROQ fails)
 */
function generateFallbackSummary(
  errors: any[], 
  date: string, 
  severityCounts: any, 
  groupedErrors: any
): string {
  const criticalErrors = errors.filter(e => e.severity === 'critical');
  
  let summary = `🐛 *ЕЖЕДНЕВНЫЙ ОТЧЁТ* | ${new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty' })}\n\n`;
  
  summary += `📊 *Статистика:*\n`;
  summary += `  • Всего ошибок: ${errors.length}\n`;
  Object.entries(severityCounts).forEach(([severity, count]) => {
    const emoji = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
    summary += `  ${emoji} ${severity.toUpperCase()}: ${count}\n`;
  });
  
  if (criticalErrors.length > 0) {
    summary += `\n🔥 *Критичные проблемы:*\n`;
    criticalErrors.slice(0, 3).forEach((err, i) => {
      summary += `  ${i + 1}. ${err.message}\n`;
      if (err.context?.endpoint) {
        summary += `     • Страница: ${err.context.endpoint}\n`;
      }
    });
  }
  
  summary += `\n📂 *По категориям:*\n`;
  Object.entries(groupedErrors).forEach(([category, errs]: [string, any]) => {
    summary += `  • ${category}: ${errs.length} ошибок\n`;
  });
  
  summary += `\n⚠️ *Требует внимания!*`;
  
  return summary;
}

/**
 * Send message to Telegram
 */
async function sendToTelegram(message: string): Promise<void> {
  if (!DEBUGGER_BOT_TOKEN || !DEBUGGER_CHAT_ID) {
    console.warn('⚠️ [Daily Debug Report] Telegram not configured');
    return;
  }
  
  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${DEBUGGER_BOT_TOKEN}/sendMessage`,
      {
        chat_id: DEBUGGER_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      },
      { timeout: 10000 }
    );
    
    if (!response.data.ok) {
      throw new Error(`Telegram API error: ${JSON.stringify(response.data)}`);
    }
    
    console.log('✅ [Daily Debug Report] Sent to Telegram');
  } catch (error: any) {
    console.error('❌ [Daily Debug Report] Failed to send to Telegram:', error.message);
    throw error;
  }
}

/**
 * Manual trigger (for testing)
 */
export async function triggerDebugReport() {
  console.log('🧪 [Daily Debug Report] Manual trigger...');
  await generateAndSendDebugReport();
}
