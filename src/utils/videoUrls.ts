/**
 * 🎥 Video URLs Helper
 * Генерирует URL для разных форматов видео из Bunny CDN
 */

export interface VideoUrls {
  hls: string;
  mp4: string;
  webm: string;
  poster: string;
  subtitles?: string;
}

/**
 * Получить URLs для всех форматов видео
 * @param bunnyCdnVideoId - GUID видео из Bunny CDN
 * @returns Объект с URLs для HLS, MP4, WebM и poster
 */
export const getVideoUrls = (bunnyCdnVideoId: string): VideoUrls => {
  const BASE_URL = 'https://video.onai.academy';

  return {
    hls: `${BASE_URL}/${bunnyCdnVideoId}/playlist.m3u8`,
    mp4: `${BASE_URL}/${bunnyCdnVideoId}/play_720p.mp4`,
    webm: `${BASE_URL}/${bunnyCdnVideoId}/play_720p.webm`,
    poster: `${BASE_URL}/${bunnyCdnVideoId}/thumbnail.jpg`,
    subtitles: `${BASE_URL}/${bunnyCdnVideoId}/subtitles.vtt`,
  };
};

/**
 * Проверить поддержку видео форматов в браузере
 * @returns Объект с флагами поддержки разных форматов
 */
export const getVideoSupport = () => {
  const video = document.createElement('video');

  return {
    hlsSupported:
      typeof window !== 'undefined' &&
      (window.MediaSource?.isTypeSupported?.('application/vnd.apple.mpegurl') ||
        video.canPlayType?.('application/vnd.apple.mpegurl') === 'probably'),
    nativeHlsSupported: video.canPlayType?.('application/vnd.apple.mpegurl') !== '',
    mp4Supported: video.canPlayType?.('video/mp4') !== '',
    webmSupported: video.canPlayType?.('video/webm') !== '',
    dashSupported: typeof window !== 'undefined' && 
      window.MediaSource?.isTypeSupported?.('application/dash+xml'),
  };
};

/**
 * Определить лучший формат для текущего браузера
 * @param videoId - ID видео
 * @returns Рекомендуемый источник
 */
export const getBestVideoSource = (videoId: string): { type: 'hls' | 'native-hls' | 'mp4' | 'webm'; url: string } => {
  const urls = getVideoUrls(videoId);
  const support = getVideoSupport();

  // 1. Попробовать HLS через hls.js
  if (support.hlsSupported && typeof window !== 'undefined' && 'Hls' in window) {
    return { type: 'hls', url: urls.hls };
  }

  // 2. Попробовать native HLS (Safari)
  if (support.nativeHlsSupported) {
    return { type: 'native-hls', url: urls.hls };
  }

  // 3. Fallback на MP4
  if (support.mp4Supported) {
    return { type: 'mp4', url: urls.mp4 };
  }

  // 4. Последний шанс - WebM
  if (support.webmSupported) {
    return { type: 'webm', url: urls.webm };
  }

  // 5. По умолчанию MP4 (обычно поддерживается везде)
  return { type: 'mp4', url: urls.mp4 };
};
