import * as mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import * as groqService from './groqAiService';

/**
 * Извлечь текст из PDF (с автоматической конвертацией через Groq Vision)
 * ✅ Если PDF содержит текст - извлекаем напрямую
 * ✅ Если PDF содержит изображения - конвертируем → Groq Vision
 */
export async function extractTextFromPDF(buffer: Buffer, userQuestion?: string): Promise<string> {
  try {
    console.log('[FileProcessing] ✅ Начинаем парсинг PDF...');
    console.log('[FileProcessing] Buffer size:', buffer.length, 'bytes');

    if (buffer.length === 0) {
      throw new Error('PDF buffer is empty!');
    }

    // Пробуем извлечь текст
    const data = await pdfParse(buffer);

    console.log(`[FileProcessing] PDF info: ${data.numpages} страниц, ${data.text.length} символов текста`);
    
    // Если текста достаточно - возвращаем
    if (data.text && data.text.trim().length >= 50) {
      console.log('[FileProcessing] ✅ PDF содержит текст - возвращаем');
      return data.text;
    }
    
    // ✅ Если текста мало - используем Groq Vision (Pure JS!)
    console.log('[FileProcessing] 🔄 PDF содержит изображения → используем Groq Vision (Pure JS)');
    
    const { analysis } = await groqService.analyzePDF(
      buffer,
      userQuestion || 'Прочитай и извлеки весь текст из этого документа.',
      { page: 0 }
    );
    
    console.log('[FileProcessing] ✅ Текст извлечён через Groq Vision');
    
    return analysis;
  } catch (error: any) {
    console.error('[FileProcessing] ❌ ОШИБКА парсинга PDF:', error.message);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Извлечь текст из DOCX (РАБОТАЕТ)
 */
export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    console.log('[FileProcessing] ✅ Начинаем парсинг DOCX...');

    if (buffer.length === 0) {
      throw new Error('DOCX buffer is empty!');
    }

    const result = await mammoth.extractRawText({ buffer });
    
    console.log(`[FileProcessing] ✅ УСПЕХ! Извлечено ${result.value.length} символов из DOCX`);
    
    return result.value;
  } catch (error: any) {
    console.error('[FileProcessing] ❌ ОШИБКА парсинга DOCX:');
    console.error('[FileProcessing] Message:', error.message);
    throw new Error(`Failed to parse DOCX: ${error.message}`);
  }
}

/**
 * Обработать файл в зависимости от типа
 */
export async function processFile(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<{
  type: 'text' | 'image';
  content: string;
  originalName: string;
}> {
  console.log(`[FileProcessing] Обрабатываем файл: ${filename}, тип: ${mimeType}`);

  // PDF
  if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) {
    const text = await extractTextFromPDF(buffer);
    return {
      type: 'text',
      content: text,
      originalName: filename,
    };
  }

  // DOCX
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    filename.endsWith('.docx')
  ) {
    const text = await extractTextFromDOCX(buffer);
    return {
      type: 'text',
      content: text,
      originalName: filename,
    };
  }

  // Изображения (PNG, JPG, WEBP)
  if (mimeType.startsWith('image/')) {
    // Конвертируем в base64 для Vision API
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;
    
    return {
      type: 'image',
      content: dataUrl,
      originalName: filename,
    };
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

