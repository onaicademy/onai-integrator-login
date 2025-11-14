import * as mammoth from 'mammoth';
const pdfParse = require('pdf-parse');

/**
 * Извлечь текст из PDF
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    console.log('[FileProcessing] Извлекаем текст из PDF...');
    console.log('[FileProcessing] Buffer size:', buffer.length, 'bytes');
    console.log('[FileProcessing] Buffer first 50 bytes:', buffer.slice(0, 50).toString('hex'));
    
    if (buffer.length === 0) {
      throw new Error('PDF buffer is empty!');
    }
    
    const data = await pdfParse(buffer);
    console.log(`[FileProcessing] ✅ Извлечено ${data.text.length} символов из PDF`);
    return data.text;
  } catch (error: any) {
    console.error('[FileProcessing] ❌ КРИТИЧЕСКАЯ ОШИБКА парсинга PDF:');
    console.error('[FileProcessing] Тип ошибки:', error.constructor.name);
    console.error('[FileProcessing] Сообщение:', error.message);
    console.error('[FileProcessing] Стек:', error.stack);
    console.error('[FileProcessing] Buffer размер:', buffer?.length || 0);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Извлечь текст из DOCX
 */
export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    console.log('[FileProcessing] Извлекаем текст из DOCX...');
    console.log('[FileProcessing] Buffer size:', buffer.length, 'bytes');
    
    if (buffer.length === 0) {
      throw new Error('DOCX buffer is empty!');
    }
    
    const result = await mammoth.extractRawText({ buffer });
    console.log(`[FileProcessing] ✅ Извлечено ${result.value.length} символов из DOCX`);
    return result.value;
  } catch (error: any) {
    console.error('[FileProcessing] ❌ КРИТИЧЕСКАЯ ОШИБКА парсинга DOCX:');
    console.error('[FileProcessing] Тип ошибки:', error.constructor.name);
    console.error('[FileProcessing] Сообщение:', error.message);
    console.error('[FileProcessing] Стек:', error.stack);
    console.error('[FileProcessing] Buffer размер:', buffer?.length || 0);
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

