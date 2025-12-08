/**
 * PDF to Image Conversion Service
 * ✅ Pure JavaScript - NO native dependencies!
 * ✅ Works out-of-the-box with npm install
 */

import { pdf } from 'pdf-to-img';
import sharp from 'sharp';

interface PDFToImageOptions {
  pageNumber?: number; // Default: 1 (first page)
  scale?: number; // Default: 2 (higher = better quality but slower)
  format?: 'png' | 'jpg'; // Default: 'jpg'
}

/**
 * Convert PDF page to image Buffer
 * Optimized for Groq Vision API (max 4MB base64)
 */
export async function convertPdfPageToImage(
  pdfBuffer: Buffer,
  options: PDFToImageOptions = {}
): Promise<Buffer> {
  const { pageNumber = 1, scale = 2, format = 'jpg' } = options;

  try {
    console.log(`📄 [PDF→Image] Converting PDF page ${pageNumber}...`);
    const startTime = Date.now();

    // Convert PDF to images
    const document = await pdf(pdfBuffer, { scale });
    
    // Get all pages as async iterator
    let currentPage = 0;
    let targetPageBuffer: Buffer | null = null;

    for await (const image of document) {
      currentPage++;
      if (currentPage === pageNumber) {
        targetPageBuffer = image;
        break;
      }
    }

    if (!targetPageBuffer) {
      throw new Error(`Page ${pageNumber} not found in PDF`);
    }

    // Optimize for Vision API if size > 3MB
    let optimizedBuffer = targetPageBuffer;
    if (targetPageBuffer.length > 3 * 1024 * 1024) {
      console.log(`🔧 [PDF→Image] Optimizing large image (${(targetPageBuffer.length / 1024 / 1024).toFixed(2)}MB)...`);
      optimizedBuffer = await optimizeImageForVision(targetPageBuffer, format);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [PDF→Image] Converted in ${duration}ms, size: ${(optimizedBuffer.length / 1024).toFixed(2)}KB`);

    return optimizedBuffer;

  } catch (error: any) {
    console.error('❌ [PDF→Image] Conversion failed:', error.message);
    throw new Error(`Failed to convert PDF: ${error.message}`);
  }
}

/**
 * Optimize image for Groq Vision API
 * Constraints: 4MB base64 max, 33MP resolution
 */
async function optimizeImageForVision(
  imageBuffer: Buffer,
  format: 'png' | 'jpg'
): Promise<Buffer> {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    console.log(`🔍 [Image Optimize] Original: ${(imageBuffer.length / 1024).toFixed(2)}KB, ${metadata.width}x${metadata.height}px`);

    // Resize if too large
    let optimized = sharp(imageBuffer);

    if (metadata.width! > 2048 || metadata.height! > 2048) {
      optimized = optimized.resize(2048, 2048, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Compress to JPEG for better size
    if (format === 'jpg') {
      const result = await optimized.jpeg({ quality: 85, progressive: true }).toBuffer();
      console.log(`✅ [Image Optimize] Compressed to ${(result.length / 1024).toFixed(2)}KB`);
      return result;
    } else {
      return await optimized.png({ compressionLevel: 9 }).toBuffer();
    }

  } catch (error: any) {
    console.error('⚠️ [Image Optimize] Optimization failed:', error.message);
    return imageBuffer; // Return original if optimization fails
  }
}

export default {
  convertPdfPageToImage,
};
