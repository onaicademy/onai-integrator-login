import { useEffect } from 'react';

interface YandexMetrikaProps {
  counterId: number;
}

declare global {
  interface Window {
    ym?: (id: number, method: string, params?: any) => void;
  }
}

export default function YandexMetrika({ counterId }: YandexMetrikaProps) {
  useEffect(() => {
    // Проверяем, не загружен ли уже скрипт
    const existingScript = document.querySelector(`script[src*="metrika/tag.js?id=${counterId}"]`);
    if (existingScript) {
      console.log('📊 Yandex.Metrika already loaded');
      return;
    }

    // Создаем скрипт
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = `
      (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
      })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${counterId}', 'ym');

      ym(${counterId}, 'init', {
        ssr: true,
        webvisor: true,
        clickmap: true,
        ecommerce: "dataLayer",
        accurateTrackBounce: true,
        trackLinks: true
      });
    `;

    document.head.appendChild(script);

    // Добавляем noscript
    const noscript = document.createElement('noscript');
    noscript.innerHTML = `<div><img src="https://mc.yandex.ru/watch/${counterId}" style="position:absolute; left:-9999px;" alt="" /></div>`;
    document.body.appendChild(noscript);

    console.log(`📊 Yandex.Metrika ${counterId} initialized`);

    // Cleanup
    return () => {
      // При размонтировании компонента не удаляем скрипт (он должен работать глобально)
    };
  }, [counterId]);

  return null;
}

// Helper функция для отправки целей
export function ymReachGoal(counterId: number, goal: string, params?: any) {
  if (typeof window !== 'undefined' && window.ym) {
    window.ym(counterId, 'reachGoal', goal, params);
    console.log(`📊 Yandex.Metrika goal: ${goal}`, params);
  } else {
    console.warn('⚠️ Yandex.Metrika not loaded yet');
  }
}
