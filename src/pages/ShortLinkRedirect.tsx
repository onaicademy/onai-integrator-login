import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getApiBaseUrl } from '@/lib/runtime-config';

/**
 * 🔗 SHORT LINK REDIRECT COMPONENT
 * 
 * Обрабатывает переходы по коротким ссылкам /l/:shortCode
 * Делает server-side редирект через backend API
 */
export default function ShortLinkRedirect() {
  const { shortCode } = useParams<{ shortCode: string }>();

  useEffect(() => {
    if (!shortCode) {
      // Если нет shortCode, редиректим на главную
      window.location.href = 'https://onai.academy';
      return;
    }

    // Редиректим на backend endpoint, который сделает редирект
    // Backend отследит клик и редиректнет на оригинальную ссылку
    const backendUrl = getApiBaseUrl() || 'https://api.onai.academy';
    window.location.href = `${backendUrl}/l/${shortCode}`;
  }, [shortCode]);

  // Показываем лоадер пока редиректим
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00FF88]"></div>
        <p className="mt-4 text-white">Перенаправление...</p>
      </div>
    </div>
  );
}





