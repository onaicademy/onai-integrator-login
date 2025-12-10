/**
 * Tripwire Certificate SSE Controller
 * Server-Sent Events для реального отслеживания прогресса генерации сертификата
 * ✅ ИСПОЛЬЗУЕТ TRIPWIRE DB (pjmvxecykysfrzppdcto)
 */

import { Request, Response } from 'express';
import { tripwireAdminSupabase as supabase } from '../../config/supabase-tripwire';
import { certificatePDFService } from '../../services/tripwire/certificatePDFService';
import { v4 as uuidv4 } from 'uuid';

interface SSEProgress {
  progress: number;
  message: string;
  data?: any;
}

/**
 * POST /api/tripwire/certificates/issue-stream
 * Генерация сертификата с реальным прогрессом через SSE
 */
export async function issueCertificateStream(req: Request, res: Response): Promise<void> {
  const { user_id, full_name } = req.body;

  if (!user_id) {
    res.status(400).json({ error: 'Missing user_id' });
    return;
  }

  // Настройка заголовков для SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Для Nginx

  const sendProgress = (progress: number, message: string, data: any = null) => {
    const payload: SSEProgress = { progress, message, data };
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    console.log(`📊 [SSE] ${progress}% - ${message}`);
  };

  try {
    console.log('🎓 [SSE Certificate] Starting generation for:', user_id);

    // ЭТАП 0: Проверяем существующий сертификат (кэширование)
    sendProgress(5, 'Проверка существующего сертификата...');
    
    const { data: existing } = await supabase
      .from('certificates')
      .select('pdf_url, certificate_number, issued_at')
      .eq('user_id', user_id)
      .single();

    if (existing?.pdf_url) {
      console.log('✅ [SSE] Certificate already exists, returning cached version');
      sendProgress(100, 'Сертификат уже готов!', { 
        pdfUrl: existing.pdf_url,
        certificateNumber: existing.certificate_number,
        issuedAt: existing.issued_at,
        cached: true
      });
      res.end();
      return;
    }

    // ЭТАП 1: Получаем данные студента (10%)
    sendProgress(10, 'Загрузка данных студента...');
    
    let studentName = full_name || 'Tripwire Student';
    if (!full_name) {
      const { data: tripwireUser } = await supabase
        .from('tripwire_users')
        .select('full_name')
        .eq('user_id', user_id)
        .single();
      
      studentName = tripwireUser?.full_name || 'Tripwire Student';
    }

    // ЭТАП 2: Генерируем номер сертификата (20%)
    sendProgress(20, 'Генерация номера сертификата...');
    
    const timestamp = Date.now().toString().slice(-6);
    const namePrefix = (studentName || 'USER').split(' ')[0]?.toUpperCase() || 'USER';
    const certificateNumber = `TW-${namePrefix}-${timestamp}`;

    // ЭТАП 3: Генерация PDF (25-50%)
    sendProgress(25, 'Создание PDF документа...');
    
    const pdfBuffer = await certificatePDFService.generatePDF({
      userName: studentName,
      courseTitle: 'Интегратор (быстрый старт)',
      completionDate: new Date().toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      certificateNumber,
    });

    sendProgress(50, 'PDF сертификат создан');

    // ЭТАП 4: Загрузка в Supabase Storage (50-75%)
    sendProgress(55, 'Подготовка к загрузке...');
    
    const fileName = `${certificateNumber}-${uuidv4()}.pdf`;
    const storagePath = `users/${user_id}/certificates/${fileName}`;

    sendProgress(60, 'Загрузка в облачное хранилище...');

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ [SSE] Storage upload failed:', uploadError);
      throw new Error(`Ошибка загрузки: ${uploadError.message}`);
    }

    sendProgress(70, 'Файл успешно загружен');
    console.log('✅ [SSE] Uploaded to storage:', uploadData?.path);

    // ЭТАП 5: Получение публичной ссылки (75%)
    sendProgress(75, 'Получение публичной ссылки...');

    const { data: urlData } = supabase.storage
      .from('certificates')
      .getPublicUrl(storagePath);

    if (!urlData?.publicUrl) {
      throw new Error('Не удалось получить публичную ссылку');
    }

    const certificateUrl = urlData.publicUrl;
    console.log('🔗 [SSE] Public URL:', certificateUrl);

    // ЭТАП 6: Сохранение в базу данных (75-90%)
    sendProgress(80, 'Регистрация в реестре сертификатов...');

    const { data: dbData, error: dbError } = await supabase
      .from('certificates')
      .insert({
        user_id: user_id,
        certificate_number: certificateNumber,
        full_name: studentName,
        pdf_url: certificateUrl,
        issued_at: new Date().toISOString(),
        metadata: { storage_path: storagePath },
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ [SSE] DB insert failed:', dbError);
      throw new Error(`Ошибка сохранения: ${dbError.message}`);
    }

    sendProgress(90, 'Сертификат зарегистрирован');

    // ЭТАП 7: Обновление профиля пользователя (95%)
    sendProgress(95, 'Обновление профиля...');

    await supabase
      .from('tripwire_user_profile')
      .update({ 
        certificate_issued: true,
        certificate_url: certificateUrl,
        modules_completed: 3,
        completion_percentage: 100
      })
      .eq('user_id', user_id);

    // ФИНАЛ: Готово! (100%)
    sendProgress(100, 'Готово! 🎉', {
      pdfUrl: certificateUrl,
      certificateNumber: certificateNumber,
      certificateId: dbData.id,
      issuedAt: dbData.issued_at,
      cached: false
    });

    console.log('✅ [SSE] Certificate issued successfully:', certificateNumber);
    res.end();

  } catch (error: any) {
    console.error('❌ [SSE Certificate] Error:', error);
    sendProgress(0, 'Ошибка генерации', { 
      error: error.message || 'Неизвестная ошибка' 
    });
    res.end();
  }
}
