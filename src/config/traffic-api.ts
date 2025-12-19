/**
 * Traffic Dashboard API Configuration
 * 
 * Автоматически определяет API URL в зависимости от среды:
 * - На traffic.onai.academy используется относительный путь (nginx proxy)
 * - На других доменах используется прямой API URL
 */

// Определяем environment
const isTrafficDomain = window.location.hostname === 'traffic.onai.academy';
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

/**
 * API_URL для Traffic Dashboard
 * 
 * - traffic.onai.academy: '' (относительный путь, nginx proxy)
 * - localhost: 'http://localhost:3000'
 * - другие: 'https://api.onai.academy'
 */
export const TRAFFIC_API_URL = isTrafficDomain
  ? '' // ✅ Nginx proxy на traffic.onai.academy/api/* → localhost:3000/api/*
  : isLocalhost
    ? 'http://localhost:3000'
    : 'https://api.onai.academy';

console.log('🔧 [Traffic API Config]');
console.log('  Hostname:', window.location.hostname);
console.log('  API URL:', TRAFFIC_API_URL || '(relative path)');
console.log('  Using Nginx Proxy:', isTrafficDomain ? 'YES' : 'NO');
