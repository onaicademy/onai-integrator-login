/**
 * Device and Browser Parser
 * Парсинг User-Agent для определения устройства, браузера, ОС
 */

interface ParsedDevice {
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
}

export function parseUserAgent(userAgent: string): ParsedDevice {
  const ua = userAgent.toLowerCase();
  
  // Определение типа устройства
  let deviceType: ParsedDevice['deviceType'] = 'unknown';
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (!/mobile|tablet/i.test(userAgent)) {
    deviceType = 'desktop';
  }
  
  // Определение браузера
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  
  if (ua.includes('firefox')) {
    browserName = 'Firefox';
    const match = userAgent.match(/firefox\/([\d.]+)/i);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (ua.includes('edg/')) {
    browserName = 'Edge';
    const match = userAgent.match(/edg\/([\d.]+)/i);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (ua.includes('chrome')) {
    browserName = 'Chrome';
    const match = userAgent.match(/chrome\/([\d.]+)/i);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browserName = 'Safari';
    const match = userAgent.match(/version\/([\d.]+)/i);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (ua.includes('opera') || ua.includes('opr/')) {
    browserName = 'Opera';
    const match = userAgent.match(/(opera|opr)\/([\d.]+)/i);
    browserVersion = match ? match[2] : 'Unknown';
  }
  
  // Определение ОС
  let osName = 'Unknown';
  let osVersion = 'Unknown';
  
  if (ua.includes('windows')) {
    osName = 'Windows';
    if (ua.includes('windows nt 10.0')) osVersion = '10/11';
    else if (ua.includes('windows nt 6.3')) osVersion = '8.1';
    else if (ua.includes('windows nt 6.2')) osVersion = '8';
    else if (ua.includes('windows nt 6.1')) osVersion = '7';
  } else if (ua.includes('mac os x')) {
    osName = 'macOS';
    const match = userAgent.match(/mac os x ([\d_]+)/i);
    if (match) {
      osVersion = match[1].replace(/_/g, '.');
    }
  } else if (ua.includes('android')) {
    osName = 'Android';
    const match = userAgent.match(/android ([\d.]+)/i);
    osVersion = match ? match[1] : 'Unknown';
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    osName = 'iOS';
    const match = userAgent.match(/os ([\d_]+)/i);
    if (match) {
      osVersion = match[1].replace(/_/g, '.');
    }
  } else if (ua.includes('linux')) {
    osName = 'Linux';
  }
  
  return {
    deviceType,
    browserName,
    browserVersion,
    osName,
    osVersion
  };
}

/**
 * Генерация device fingerprint на основе доступных данных
 */
export function generateDeviceFingerprint(
  userAgent: string,
  ip: string,
  additionalData?: {
    screenResolution?: string;
    timezone?: string;
    language?: string;
  }
): string {
  const data = [
    userAgent,
    ip,
    additionalData?.screenResolution || '',
    additionalData?.timezone || '',
    additionalData?.language || ''
  ].join('|');
  
  // Простой хеш (в production можно использовать crypto)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}
