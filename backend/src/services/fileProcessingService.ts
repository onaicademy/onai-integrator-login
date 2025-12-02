import * as mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

/**
 * Извлечь текст из PDF (РАБОЧАЯ ВЕРСИЯ!)
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    console.log('[FileProcessing] ✅ Начинаем парсинг PDF (pdf-parse@1.1.1)...');
    console.log('[FileProcessing] Buffer size:', buffer.length, 'bytes');

    if (buffer.length === 0) {
      throw new Error('PDF buffer is empty!');
    }

    // ✅ ПРАВИЛЬНЫЙ СИНТАКСИС для v1.1.1
    const data = await pdfParse(buffer);

    console.log(`[FileProcessing] ✅ УСПЕХ! Извлечено ${data.text.length} символов из PDF`);
    console.log('[FileProcessing] Pages:', data.numpages);
    
    return data.text;
  } catch (error: any) {
    console.error('[FileProcessing] ❌ ОШИБКА парсинга PDF:');
    console.error('[FileProcessing] Message:', error.message);
    console.error('[FileProcessing] Stack:', error.stack);
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

