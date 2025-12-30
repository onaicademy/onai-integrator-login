// backend/src/services/referral.service.ts
// 🚀 REFERRAL SYSTEM SERVICE - Complete Implementation

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { Resend } from 'resend';
import { sendSMS } from './mobizon-simple.js';

// ═══════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface Referrer {
  id: string;
  email: string;
  phone_number: string;
  full_name?: string;
  referral_code: string;
  utm_source: string;
  is_active: boolean;
  current_commission_percent: number;
  total_conversions: number;
  total_earnings: number;
  pending_earnings: number;
  created_at: string;
  updated_at: string;
}

export interface Conversion {
  id: string;
  referrer_id: string;
  customer_email: string;
  customer_name?: string;
  amocrm_deal_id?: string;
  utm_source: string;
  sale_amount: number;
  commission_percent: number;
  commission_amount: number;
  payment_status: 'pending' | 'confirmed' | 'paid' | 'rejected';
  sale_date: string;
}

export interface CommissionTier {
  id: string;
  tier_name: string;
  min_conversions: number;
  commission_percent: number;
  description: string;
  badge_color: string;
}

// ═══════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

class ReferralService {
  private db: SupabaseClient;

  constructor() {
    this.db = createClient(
      process.env.TRIPWIRE_SUPABASE_URL || process.env.SUPABASE_URL || '',
      process.env.TRIPWIRE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
    );
    console.log('🎯 ReferralService initialized');
  }

  // ═══════════════════════════════════════════════════════════════
  // 1️⃣ CREATE REFERRER
  // ═══════════════════════════════════════════════════════════════
  
  async createReferrer(
    email: string,
    phoneNumber: string,
    fullName?: string
  ): Promise<Referrer> {
    // Check if email already exists
    const { data: existing } = await this.db
      .from('referral_referrers')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      console.log(`⚠️ Referrer already exists: ${email}`);
      return existing;
    }

    // Generate unique codes
    const referralCode = this.generateReferralCode();
    const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
    const utmSource = `ref_${this.generateShortId()}_${emailPrefix}`.toLowerCase();

    const { data, error } = await this.db
      .from('referral_referrers')
      .insert({
        email: email.toLowerCase(),
        phone_number: phoneNumber,
        full_name: fullName,
        referral_code: referralCode,
        utm_source: utmSource,
        is_active: true,
        current_commission_percent: 10.00,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating referrer:', error);
      throw error;
    }

    console.log(`✅ Referrer created: ${email} | Code: ${referralCode} | UTM: ${utmSource}`);

    // Send welcome email/SMS with UTM instructions (async, don't wait)
    this.sendWelcomeEmail(data)
      .catch(err => console.error('❌ Failed to send welcome email:', err));

    return data;
  }

  // ═══════════════════════════════════════════════════════════════
  // 2️⃣ GET REFERRER BY CODE
  // ═══════════════════════════════════════════════════════════════
  
  async getReferrerByCode(referralCode: string): Promise<Referrer | null> {
    const { data, error } = await this.db
      .from('referral_referrers')
      .select('*')
      .eq('referral_code', referralCode)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  }

  // ═══════════════════════════════════════════════════════════════
  // 3️⃣ GET REFERRER BY UTM SOURCE
  // ═══════════════════════════════════════════════════════════════
  
  async getReferrerByUTM(utmSource: string): Promise<Referrer | null> {
    const { data, error } = await this.db
      .from('referral_referrers')
      .select('*')
      .eq('utm_source', utmSource.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  }

  // ═══════════════════════════════════════════════════════════════
  // 4️⃣ RECORD CONVERSION (from AmoCRM webhook)
  // ═══════════════════════════════════════════════════════════════
  
  async recordConversion(
    utmSource: string,
    amoCRMDealId: string,
    customerEmail: string,
    customerName: string,
    saleAmount: number
  ): Promise<Conversion> {
    // Find referrer by UTM
    const referrer = await this.getReferrerByUTM(utmSource);

    if (!referrer) {
      console.warn(`⚠️ No referrer found for utm_source: ${utmSource}`);
      throw new Error(`Referrer not found for UTM: ${utmSource}`);
    }

    // Check for duplicate deal
    const { data: existingConversion } = await this.db
      .from('referral_conversions')
      .select('id')
      .eq('amocrm_deal_id', amoCRMDealId)
      .single();

    if (existingConversion) {
      console.log(`⚠️ Conversion already exists for deal: ${amoCRMDealId}`);
      throw new Error('Conversion already recorded');
    }

    // Calculate commission
    const commissionPercent = referrer.current_commission_percent;
    const commissionAmount = (saleAmount * commissionPercent) / 100;

    // Create conversion record
    const { data, error } = await this.db
      .from('referral_conversions')
      .insert({
        referrer_id: referrer.id,
        customer_email: customerEmail,
        customer_name: customerName,
        amocrm_deal_id: amoCRMDealId,
        utm_source: utmSource.toLowerCase(),
        sale_amount: saleAmount,
        commission_percent: commissionPercent,
        commission_amount: commissionAmount,
        payment_status: 'pending',
        sale_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error recording conversion:', error);
      throw error;
    }

    console.log(
      `✅ Conversion recorded: ${referrer.email} | ` +
      `Sale: ${saleAmount.toLocaleString()} KZT | ` +
      `Commission: ${commissionAmount.toLocaleString()} KZT (${commissionPercent}%)`
    );

    // Send email notification (async, don't wait)
    this.sendSaleNotificationEmail(referrer, saleAmount, commissionAmount, utmSource, customerName, new Date().toISOString())
      .catch(err => console.error('❌ Failed to send notification email:', err));

    return data;
  }

  // ═══════════════════════════════════════════════════════════════
  // 5️⃣ SEND SALE NOTIFICATION EMAIL + SMS
  // ═══════════════════════════════════════════════════════════════
  
  private async sendSaleNotificationEmail(
    referrer: Referrer,
    saleAmount: number,
    commissionAmount: number,
    utmSource: string,
    customerName?: string,
    saleDate?: string
  ): Promise<void> {
    const dashboardUrl = process.env.DASHBOARD_URL || 'https://traffic.onai.academy';
    
    // 📱 Contact buttons
    const whatsappUrl = 'https://wa.me/77066523203';
    const telegramUrl = 'https://t.me/flaaee';
    
    // Format sale date
    const formattedDate = saleDate 
      ? new Date(saleDate).toLocaleString('ru-RU', { 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      : new Date().toLocaleString('ru-RU', { 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
    
    // ═══════════════════════════════════════════════════════════════
    // 📧 SEND EMAIL via Resend
    // ═══════════════════════════════════════════════════════════════
    
    const emailContent = `
      <html>
        <body style="font-family: 'Manrope', Arial, sans-serif; background: #030303; color: #fff; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, rgba(15,15,15,0.95) 0%, rgba(10,10,10,0.95) 100%); padding: 40px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.08);">
            
            <h1 style="color: #00FF94; font-family: 'Space Grotesk', Arial, sans-serif; font-size: 28px; margin: 0 0 20px 0; letter-spacing: -0.5px;">
              ✅ НОВАЯ ПРОДАЖА!
            </h1>
            
            <p style="font-size: 16px; margin: 15px 0; color: #fff;">
              Привет, <strong>${referrer.full_name || referrer.email}</strong>!
            </p>
            
            <p style="font-size: 16px; margin: 15px 0; color: #9CA3AF;">
              Один из твоих рефералов совершил покупку нашего курса! 🎉
            </p>
            
            <!-- Sale Details Box -->
            <div style="background: rgba(0,255,148,0.1); border-left: 4px solid #00FF94; padding: 20px; margin: 25px 0; border-radius: 0 12px 12px 0;">
              ${customerName ? `
              <p style="margin: 8px 0; color: #9CA3AF;">
                <strong style="color: #fff;">👤 Покупатель:</strong> 
                <span style="color: #00FF94; font-weight: bold;">${customerName}</span>
              </p>
              ` : ''}
              <p style="margin: 8px 0; color: #9CA3AF;">
                <strong style="color: #fff;">📅 Дата покупки:</strong> ${formattedDate}
              </p>
              <p style="margin: 8px 0; color: #9CA3AF;">
                <strong style="color: #fff;">💰 Сумма продажи:</strong> ${saleAmount.toLocaleString()} KZT
              </p>
              <p style="margin: 8px 0; color: #9CA3AF;">
                <strong style="color: #fff;">🎯 Ваша комиссия:</strong> 
                <span style="color: #00FF94; font-size: 24px; font-weight: bold;">${commissionAmount.toLocaleString()} KZT</span>
              </p>
              <p style="margin: 8px 0; color: #9CA3AF;">
                <strong style="color: #fff;">📊 Процент:</strong> ${referrer.current_commission_percent}%
              </p>
              <p style="margin: 8px 0; color: #9CA3AF;">
                <strong style="color: #fff;">🔗 UTM-метка:</strong> 
                <code style="background: #0A0A0A; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${utmSource}</code>
              </p>
            </div>
            
            <p style="font-size: 14px; color: #9CA3AF; margin: 20px 0;">
              💡 <strong style="color: #fff;">Следующий шаг:</strong> Свяжитесь с менеджером для получения выплаты.
            </p>
            
            <!-- Contact Buttons -->
            <div style="margin-top: 25px;">
              <a href="${whatsappUrl}" 
                 style="display: inline-block; background: #25D366; color: #fff; padding: 16px 28px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; margin-right: 10px; margin-bottom: 10px;">
                📱 НАПИСАТЬ В WHATSAPP
              </a>
              <a href="${telegramUrl}" 
                 style="display: inline-block; background: #0088CC; color: #fff; padding: 16px 28px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; margin-bottom: 10px;">
                ✈️ НАПИСАТЬ В TELEGRAM
              </a>
            </div>
            
            <p style="font-size: 12px; color: #666; margin-top: 15px;">
              Если кнопки не работают:<br>
              WhatsApp: <a href="${whatsappUrl}" style="color: #25D366;">${whatsappUrl}</a><br>
              Telegram: <a href="${telegramUrl}" style="color: #0088CC;">${telegramUrl}</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 30px 0;">
            
            <p style="font-size: 12px; color: #666; margin: 0;">
              onAI Academy | Реферальная система v4.0
            </p>
            
          </div>
        </body>
      </html>
    `;

    try {
      if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { data, error } = await resend.emails.send({
          from: 'onAI Academy <notifications@onai.academy>',
          to: referrer.email,
          subject: `✅ Новая продажа! Ваша комиссия: ${commissionAmount.toLocaleString()} KZT`,
          html: emailContent,
        });

        if (error) {
          console.error('❌ Email sending error:', error);
        } else {
          console.log(`✅ Sale notification EMAIL sent to: ${referrer.email} (ID: ${data?.id})`);
        }
      } else {
        console.warn('⚠️ RESEND_API_KEY not configured, skipping email');
      }
    } catch (emailError: any) {
      console.error('❌ Failed to send email:', emailError.message);
    }

    // ═══════════════════════════════════════════════════════════════
    // 📱 SEND SMS via Mobizon
    // ═══════════════════════════════════════════════════════════════
    
    try {
      const smsText = `onAI: Продажа! ${commissionAmount.toLocaleString()}₸. WhatsApp: wa.me/77066523203 или TG: t.me/flaaee`;
      
      if (referrer.phone_number && process.env.MOBIZON_API_KEY) {
        const smsResult = await sendSMS({
          recipient: referrer.phone_number,
          text: smsText,
        });

        if (smsResult) {
          console.log(`✅ Sale notification SMS sent to: ${referrer.phone_number}`);
        } else {
          console.error('❌ SMS sending failed');
        }
      } else {
        console.warn('⚠️ Phone number or MOBIZON_API_KEY not available, skipping SMS');
      }
    } catch (smsError: any) {
      console.error('❌ Failed to send SMS:', smsError.message);
    }

    // Mark as notified
    await this.db
      .from('referral_conversions')
      .update({ sale_notified_at: new Date().toISOString() })
      .eq('utm_source', utmSource)
      .order('created_at', { ascending: false })
      .limit(1);
    
    console.log(`📧📱 Sale notification completed for ${referrer.email}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 6️⃣ CONFIRM PAYMENT (Admin action)
  // ═══════════════════════════════════════════════════════════════
  
  async confirmPayment(conversionId: string): Promise<void> {
    const { error } = await this.db
      .from('referral_conversions')
      .update({
        payment_status: 'confirmed',
        payment_confirmed_at: new Date().toISOString(),
      })
      .eq('id', conversionId);

    if (error) {
      console.error('❌ Error confirming payment:', error);
      throw error;
    }

    console.log(`✅ Payment confirmed for conversion: ${conversionId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 7️⃣ SEND PAYMENT (Admin action)
  // ═══════════════════════════════════════════════════════════════
  
  async sendPayment(conversionId: string): Promise<void> {
    const { error } = await this.db
      .from('referral_conversions')
      .update({
        payment_status: 'paid',
        payment_sent_at: new Date().toISOString(),
      })
      .eq('id', conversionId);

    if (error) {
      console.error('❌ Error sending payment:', error);
      throw error;
    }

    // Get conversion details and send confirmation email
    const { data: conversion } = await this.db
      .from('referral_conversions')
      .select('*, referrer:referral_referrers(*)')
      .eq('id', conversionId)
      .single();

    if (conversion && conversion.referrer) {
      this.sendPaymentConfirmationEmail(conversion.referrer, conversion.commission_amount)
        .catch(err => console.error('❌ Failed to send payment confirmation:', err));
    }

    console.log(`💰 Payment sent for conversion: ${conversionId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 8️⃣ PAYMENT CONFIRMATION EMAIL
  // ═══════════════════════════════════════════════════════════════
  
  private async sendPaymentConfirmationEmail(
    referrer: Referrer,
    commissionAmount: number
  ): Promise<void> {
    console.log(`📧 Payment confirmation email would be sent to: ${referrer.email}`);
    console.log(`   Amount paid: ${commissionAmount.toLocaleString()} KZT`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 🎉 WELCOME EMAIL + SMS (on registration)
  // ═══════════════════════════════════════════════════════════════
  
  private async sendWelcomeEmail(referrer: Referrer): Promise<void> {
    const salesPageUrl = 'https://expresscourse.onai.academy/expresscourse';
    const utmLink = `${salesPageUrl}?utm_source=${referrer.utm_source}`;
    const dashboardUrl = process.env.DASHBOARD_URL || 'https://traffic.onai.academy/referral';
    const videoTutorialUrl = 'https://www.youtube.com/watch?v=TUTORIAL_ID'; // Заглушка для видео
    const sendpulseGuideUrl = 'https://sendpulse.com/features/chatbot'; // Ссылка на Sendpulse
    const managerContactUrl = 'https://t.me/ayaulym_sales';
    
    // ═══════════════════════════════════════════════════════════════
    // 📧 SEND WELCOME EMAIL via Resend
    // ═══════════════════════════════════════════════════════════════
    
    const emailContent = `
      <html>
        <body style="font-family: 'Manrope', Arial, sans-serif; background: #030303; color: #fff; margin: 0; padding: 20px;">
          <div style="max-width: 700px; margin: 0 auto; background: linear-gradient(135deg, rgba(15,15,15,0.95) 0%, rgba(10,10,10,0.95) 100%); padding: 40px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.08);">
            
            <h1 style="color: #00FF94; font-family: 'Space Grotesk', Arial, sans-serif; font-size: 28px; margin: 0 0 20px 0; letter-spacing: -0.5px;">
              🎉 Добро пожаловать в реферальную программу onAI Academy!
            </h1>
            
            <p style="font-size: 16px; margin: 15px 0; color: #fff;">
              Привет, <strong>${referrer.full_name || referrer.email}</strong>!
            </p>
            
            <p style="font-size: 16px; margin: 15px 0; color: #9CA3AF;">
              Ты успешно зарегистрировался в нашей реферальной программе. Теперь ты можешь зарабатывать от <strong style="color: #00FF94;">$60 до $120</strong> за каждую продажу!
            </p>
            
            <!-- UTM LINK BLOCK -->
            <div style="background: rgba(0,255,148,0.1); border: 2px solid #00FF94; padding: 25px; margin: 25px 0; border-radius: 16px;">
              <h2 style="color: #00FF94; margin: 0 0 15px 0; font-size: 20px;">🔗 Твоя реферальная ссылка:</h2>
              <div style="background: #0A0A0A; padding: 15px 20px; border-radius: 12px; word-break: break-all;">
                <code style="color: #00FF94; font-size: 14px;">${utmLink}</code>
              </div>
              <p style="margin: 15px 0 0 0; color: #9CA3AF; font-size: 14px;">
                <strong style="color: #fff;">UTM-метка:</strong> 
                <code style="background: rgba(0,255,148,0.2); padding: 4px 8px; border-radius: 4px;">${referrer.utm_source}</code>
              </p>
              <p style="margin: 10px 0 0 0; color: #9CA3AF; font-size: 14px;">
                <strong style="color: #fff;">Реферальный код:</strong> 
                <code style="background: rgba(0,255,148,0.2); padding: 4px 8px; border-radius: 4px;">${referrer.referral_code}</code>
              </p>
            </div>
            
            <!-- INSTRUCTIONS -->
            <div style="background: rgba(255,255,255,0.03); border-left: 4px solid #6366F1; padding: 25px; margin: 25px 0; border-radius: 0 16px 16px 0;">
              <h2 style="color: #fff; margin: 0 0 20px 0; font-size: 20px;">📌 Как использовать твою UTM-ссылку:</h2>
              
              <div style="margin: 15px 0;">
                <h3 style="color: #00FF94; margin: 0 0 10px 0; font-size: 16px;">1️⃣ Reels и TikTok с автоответом:</h3>
                <p style="color: #9CA3AF; margin: 0 0 10px 0;">Создай вирусный ролик и настрой автоответ бота:</p>
                <ul style="color: #9CA3AF; margin: 0; padding-left: 20px;">
                  <li>Опубликуй Reels/TikTok с призывом "Напиши ИИ в комментарии"</li>
                  <li>Настрой бота (ManyChat, Sendpulse) отправлять твою ссылку в Direct</li>
                  <li>Каждый клик отслеживается по твоей UTM-метке</li>
                </ul>
              </div>
              
              <div style="margin: 15px 0;">
                <h3 style="color: #00FF94; margin: 0 0 10px 0; font-size: 16px;">2️⃣ Ссылка в Bio/описании:</h3>
                <p style="color: #9CA3AF; margin: 0;">Добавь свою ссылку в описание профиля или в "Link in Bio" сервис (Linktree, Taplink)</p>
              </div>
              
              <div style="margin: 15px 0;">
                <h3 style="color: #00FF94; margin: 0 0 10px 0; font-size: 16px;">3️⃣ YouTube Shorts:</h3>
                <p style="color: #9CA3AF; margin: 0;">Добавь ссылку в описание видео и закреплённый комментарий</p>
              </div>
              
              <div style="margin: 15px 0;">
                <h3 style="color: #00FF94; margin: 0 0 10px 0; font-size: 16px;">4️⃣ Telegram-канал:</h3>
                <p style="color: #9CA3AF; margin: 0;">Делись ссылкой в постах и закреплённых сообщениях</p>
              </div>
            </div>
            
            <!-- LINKS -->
            <div style="margin: 25px 0;">
              <p style="color: #9CA3AF; margin: 0 0 15px 0;">📚 <strong style="color: #fff;">Полезные ресурсы:</strong></p>
              
              <a href="${videoTutorialUrl}" 
                 style="display: inline-block; background: rgba(99,102,241,0.2); border: 1px solid #6366F1; color: #fff; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 5px 5px 5px 0;">
                🎬 Видео-обучение (скоро)
              </a>
              
              <a href="${sendpulseGuideUrl}" 
                 style="display: inline-block; background: rgba(99,102,241,0.2); border: 1px solid #6366F1; color: #fff; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 5px;">
                🤖 Настройка Sendpulse бота
              </a>
              
              <a href="${dashboardUrl}" 
                 style="display: inline-block; background: rgba(99,102,241,0.2); border: 1px solid #6366F1; color: #fff; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 5px;">
                📊 Твой дашборд
              </a>
            </div>
            
            <!-- COMMISSION TABLE -->
            <div style="background: rgba(255,255,255,0.03); padding: 20px; margin: 25px 0; border-radius: 16px;">
              <h3 style="color: #fff; margin: 0 0 15px 0;">💰 Система выплат:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                  <td style="padding: 10px 0; color: #9CA3AF;">1-2 продажи</td>
                  <td style="padding: 10px 0; color: #8B7355; font-weight: bold; text-align: right;">$60 за продажу</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                  <td style="padding: 10px 0; color: #9CA3AF;">3-4 продажи</td>
                  <td style="padding: 10px 0; color: #C0C0C0; font-weight: bold; text-align: right;">$80 за продажу</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                  <td style="padding: 10px 0; color: #9CA3AF;">5-7 продаж</td>
                  <td style="padding: 10px 0; color: #FFD700; font-weight: bold; text-align: right;">$100 за продажу</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #9CA3AF;">8+ продаж</td>
                  <td style="padding: 10px 0; color: #00FF94; font-weight: bold; text-align: right;">$120 за продажу</td>
                </tr>
              </table>
            </div>
            
            <!-- CTA -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${managerContactUrl}" 
                 style="display: inline-block; background: #00FF94; color: #000; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; letter-spacing: 0.5px;">
                НАПИСАТЬ МЕНЕДЖЕРУ →
              </a>
              <p style="color: #666; font-size: 12px; margin: 15px 0 0 0;">Есть вопросы? Мы всегда на связи!</p>
            </div>
            
            <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 30px 0;">
            
            <p style="font-size: 12px; color: #666; margin: 0; text-align: center;">
              onAI Academy | Реферальная система v4.0<br>
              Это письмо было отправлено автоматически при регистрации.
            </p>
            
          </div>
        </body>
      </html>
    `;

    try {
      if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { data, error } = await resend.emails.send({
          from: 'onAI Academy <notifications@onai.academy>',
          to: referrer.email,
          subject: `🎉 Добро пожаловать! Твоя реферальная ссылка готова`,
          html: emailContent,
        });

        if (error) {
          console.error('❌ Welcome email error:', error);
        } else {
          console.log(`✅ Welcome EMAIL sent to: ${referrer.email} (ID: ${data?.id})`);
        }
      } else {
        console.warn('⚠️ RESEND_API_KEY not configured, skipping welcome email');
      }
    } catch (emailError: any) {
      console.error('❌ Failed to send welcome email:', emailError.message);
    }

    // ═══════════════════════════════════════════════════════════════
    // 📱 SEND WELCOME SMS via Mobizon
    // ═══════════════════════════════════════════════════════════════
    
    try {
      const smsText = `onAI Academy: Ты в реф. программе! Твоя ссылка: ${utmLink} Зарабатывай до $120/продажа!`;
      
      if (referrer.phone_number && process.env.MOBIZON_API_KEY) {
        const smsResult = await sendSMS({
          recipient: referrer.phone_number,
          text: smsText,
        });

        if (smsResult) {
          console.log(`✅ Welcome SMS sent to: ${referrer.phone_number}`);
        } else {
          console.error('❌ Welcome SMS sending failed');
        }
      } else {
        console.warn('⚠️ Phone number or MOBIZON_API_KEY not available, skipping welcome SMS');
      }
    } catch (smsError: any) {
      console.error('❌ Failed to send welcome SMS:', smsError.message);
    }

    console.log(`📧📱 Welcome notification completed for ${referrer.email}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 9️⃣ GET REFERRER STATS
  // ═══════════════════════════════════════════════════════════════
  
  async getReferrerStats(referrerId: string): Promise<any> {
    const { data, error } = await this.db
      .from('referral_stats')
      .select('*')
      .eq('id', referrerId)
      .single();

    if (error) {
      console.error('❌ Error getting referrer stats:', error);
      throw error;
    }

    return data;
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔟 GET COMMISSION TIERS
  // ═══════════════════════════════════════════════════════════════
  
  async getCommissionTiers(): Promise<CommissionTier[]> {
    const { data, error } = await this.db
      .from('referral_commission_tiers')
      .select('*')
      .order('min_conversions', { ascending: true });

    if (error) {
      console.error('❌ Error getting commission tiers:', error);
      throw error;
    }

    return data || [];
  }

  // ═══════════════════════════════════════════════════════════════
  // 1️⃣1️⃣ GET ALL REFERRERS (Admin)
  // ═══════════════════════════════════════════════════════════════
  
  async getAllReferrers(): Promise<Referrer[]> {
    const { data, error } = await this.db
      .from('referral_referrers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error getting all referrers:', error);
      throw error;
    }

    return data || [];
  }

  // ═══════════════════════════════════════════════════════════════
  // 1️⃣2️⃣ GET REFERRER CONVERSIONS
  // ═══════════════════════════════════════════════════════════════
  
  async getReferrerConversions(referrerId: string): Promise<Conversion[]> {
    const { data, error } = await this.db
      .from('referral_conversions')
      .select('*')
      .eq('referrer_id', referrerId)
      .order('sale_date', { ascending: false });

    if (error) {
      console.error('❌ Error getting referrer conversions:', error);
      throw error;
    }

    return data || [];
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  
  private generateReferralCode(): string {
    return `REF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private generateShortId(): string {
    return crypto.randomBytes(3).toString('hex').toLowerCase();
  }
}

// Export singleton instance
const referralService = new ReferralService();
export default referralService;
