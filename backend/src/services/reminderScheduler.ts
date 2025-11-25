/**
 * Reminder Scheduler Service
 * Sends Telegram reminders for tasks based on reminder_before setting
 */

import cron from 'node-cron';
import { adminSupabase } from '../config/supabase';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

interface TaskReminder {
  id: string;
  title: string;
  due_date: string;
  reminder_before: number; // minutes
  user_id: string;
  telegram_chat_id: number;
  user_name: string;
}

/**
 * Check for tasks that need reminders
 */
async function checkTaskReminders() {
  try {
    console.log('🔔 [Scheduler] Checking for task reminders...');

    // Calculate time range for reminders
    // Check tasks that are due in the next 60 minutes
    const now = new Date();
    const sixtyMinutesLater = new Date(now.getTime() + 60 * 60 * 1000);

    // Query goals with:
    // 1. due_date is in the future (within next 60 min)
    // 2. telegram_reminder = true
    // 3. status != 'done'
    // 4. user has telegram_connected = true
    const { data: tasks, error } = await adminSupabase
      .from('goals')
      .select(`
        id,
        title,
        due_date,
        reminder_before,
        user_id
      `)
      .eq('telegram_reminder', true)
      .neq('status', 'done')
      .gte('due_date', now.toISOString())
      .lte('due_date', sixtyMinutesLater.toISOString());

    if (error) {
      console.error('❌ [Scheduler] Error fetching tasks:', error);
      return;
    }

    if (!tasks || tasks.length === 0) {
      console.log('✅ [Scheduler] No tasks with reminders found');
      return;
    }

    console.log(`📋 [Scheduler] Found ${tasks.length} tasks to check`);

    // Get user data for each task
    for (const task of tasks) {
      // Fetch user data separately
      const { data: user, error: userError } = await adminSupabase
        .from('users')
        .select('telegram_chat_id, telegram_connected, full_name')
        .eq('id', task.user_id)
        .eq('telegram_connected', true)
        .single();

      if (userError || !user) {
        console.log(`⚠️ [Scheduler] Task ${task.id}: user not connected or not found`);
        continue;
      }

      await processTaskReminder({ ...task, users: user });
    }
  } catch (error) {
    console.error('❌ [Scheduler] Error in checkTaskReminders:', error);
  }
}

/**
 * Process individual task reminder
 */
async function processTaskReminder(task: any) {
  try {
    const user = task.users;
    if (!user || !user.telegram_chat_id) {
      console.log(`⚠️ [Scheduler] Task ${task.id}: user has no telegram_chat_id`);
      return;
    }

    const dueDate = new Date(task.due_date);
    const now = new Date();
    const minutesUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60));
    const reminderBefore = task.reminder_before || 30; // default 30 min

    // Check if we should send reminder
    // Send if current time is within reminder_before window
    if (minutesUntilDue <= reminderBefore && minutesUntilDue > 0) {
      // ✅ CHECK IF REMINDER WAS ALREADY SENT
      const { data: alreadySent } = await adminSupabase
        .from('task_reminders_sent')
        .select('id')
        .eq('task_id', task.id)
        .eq('user_id', task.user_id)
        .single();

      if (alreadySent) {
        console.log(`⏭️ [Scheduler] Reminder already sent for task ${task.id}`);
        return;
      }
      
      const message = formatReminderMessage(task, user.full_name, minutesUntilDue);
      
      console.log(`📨 [Scheduler] Sending reminder for task ${task.id} to ${user.full_name}`);

      const sent = await sendTelegramReminder(user.telegram_chat_id, message);
      
      // ✅ MARK REMINDER AS SENT
      if (sent) {
        await adminSupabase
          .from('task_reminders_sent')
          .insert({
            task_id: task.id,
            user_id: task.user_id,
            reminder_minutes: minutesUntilDue
          });
        
        console.log(`✅ [Scheduler] Marked reminder as sent for task ${task.id}`);
      }
    }
  } catch (error) {
    console.error(`❌ [Scheduler] Error processing task ${task.id}:`, error);
  }
}

/**
 * Format reminder message
 */
function formatReminderMessage(task: any, userName: string, minutesUntilDue: number): string {
  const dueDate = new Date(task.due_date);
  const timeStr = dueDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const dateStr = dueDate.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' });

  let urgency = '⏰';
  if (minutesUntilDue <= 15) {
    urgency = '🔥';
  } else if (minutesUntilDue <= 30) {
    urgency = '⚡';
  }

  return (
    `${urgency} *Напоминание о задаче!*\n\n` +
    `👤 ${userName}\n` +
    `📋 *${task.title}*\n\n` +
    `⏰ Осталось *${minutesUntilDue} минут*\n` +
    `📅 Дедлайн: ${dateStr} в ${timeStr}\n\n` +
    `💪 Самое время завершить задачу!`
  );
}

/**
 * Send Telegram reminder via API
 */
async function sendTelegramReminder(chatId: number, message: string): Promise<boolean> {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/telegram/send-reminder`, {
      chatId,
      message
    });

    if (response.data.success) {
      console.log(`✅ [Scheduler] Reminder sent to chat ${chatId}`);
      return true;
    }

    return false;
  } catch (error: any) {
    // Check if bot was blocked (403)
    if (error.response?.status === 403 && error.response?.data?.blocked) {
      console.warn(`⚠️ [Scheduler] Bot blocked by user (chat ${chatId})`);
      
      // Update user status in database
      await adminSupabase
        .from('users')
        .update({ telegram_connected: false })
        .eq('telegram_chat_id', chatId);
      
      console.log(`🔌 [Scheduler] Marked user as disconnected (chat ${chatId})`);
      return false;
    }

    console.error(`❌ [Scheduler] Failed to send reminder to chat ${chatId}:`, error.message);
    return false;
  }
}

/**
 * Start reminder scheduler
 * Runs every minute to check for tasks
 */
export function startReminderScheduler() {
  console.log('🚀 [Scheduler] Starting reminder scheduler...');
  
  // Run every minute
  cron.schedule('* * * * *', () => {
    checkTaskReminders();
  });
  
  console.log('✅ [Scheduler] Reminder scheduler started (runs every minute)');
}

/**
 * Manual trigger for testing
 */
export async function triggerReminderCheck() {
  console.log('🧪 [Scheduler] Manual trigger: checking reminders...');
  await checkTaskReminders();
}

