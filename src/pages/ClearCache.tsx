import { useEffect, useState } from 'react';

export default function ClearCache() {
  const [logs, setLogs] = useState<Array<{ msg: string; type: 'info' | 'success' | 'error' }>>([]);
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [...prev, { msg, type }]);
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const clearEverything = async () => {
    setLogs([]);
    addLog('🔄 Начинаю полную очистку...', 'info');
    setIsClearing(true);
    setProgress(10);

    try {
      // 1. localStorage
      localStorage.clear();
      addLog('✅ localStorage очищен', 'success');
      setProgress(20);
      await sleep(200);

      // 2. sessionStorage
      sessionStorage.clear();
      addLog('✅ sessionStorage очищен', 'success');
      setProgress(30);
      await sleep(200);

      // 3. Service Workers
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (let registration of registrations) {
            await registration.unregister();
            addLog('✅ Service Worker удалён', 'success');
          }
          setProgress(50);
        } catch (e: any) {
          addLog('⚠️ Service Workers: ' + e.message, 'error');
        }
      }
      await sleep(200);

      // 4. Cache Storage
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          for (let cacheName of cacheNames) {
            await caches.delete(cacheName);
            addLog('✅ Кэш удалён: ' + cacheName, 'success');
          }
          setProgress(70);
        } catch (e: any) {
          addLog('⚠️ Cache Storage: ' + e.message, 'error');
        }
      }
      await sleep(200);

      // 5. Cookies
      const cookies = document.cookie.split(";");
      for (let cookie of cookies) {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      }
      addLog('✅ Cookies очищены', 'success');
      setProgress(90);
      await sleep(200);

      // 6. IndexedDB
      if (window.indexedDB && (window.indexedDB as any).databases) {
        try {
          const databases = await (window.indexedDB as any).databases();
          for (let db of databases) {
            if (db.name) {
              window.indexedDB.deleteDatabase(db.name);
              addLog('✅ IndexedDB удалена: ' + db.name, 'success');
            }
          }
        } catch (e: any) {
          addLog('⚠️ IndexedDB: ' + e.message, 'error');
        }
      }

      setProgress(100);
      addLog('', 'info');
      addLog('🎉 ВСЁ ОЧИЩЕНО УСПЕШНО!', 'success');
      addLog('🔄 Перезагружаю страницу через 3 секунды...', 'info');

      // Countdown
      setCountdown(3);
      await sleep(1000);
      setCountdown(2);
      await sleep(1000);
      setCountdown(1);
      await sleep(1000);

      window.location.href = '/integrator/modules?nocache=' + Date.now();

    } catch (error: any) {
      addLog('❌ Ошибка: ' + error.message, 'error');
      setIsClearing(false);
    }
  };

  const hardReload = () => {
    setLogs([]);
    addLog('⚡ Выполняю жёсткую перезагрузку...', 'info');
    setTimeout(() => {
      window.location.href = '/integrator/modules?v=' + Date.now();
      location.reload();
    }, 500);
  };

  useEffect(() => {
    addLog('✅ Панель очистки готова', 'success');
    addLog('💡 Нажмите кнопку для очистки', 'info');
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #030303 0%, #0a0a0a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '"Courier New", monospace'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        background: 'rgba(10, 10, 10, 0.8)',
        border: '2px solid #00FF88',
        borderRadius: '15px',
        padding: '40px',
        boxShadow: '0 0 50px rgba(0, 255, 136, 0.3)'
      }}>
        <h1 style={{
          fontSize: '2.5em',
          marginBottom: '10px',
          textAlign: 'center',
          color: '#00FF88',
          textShadow: '0 0 20px rgba(0, 255, 136, 0.5)'
        }}>
          🧹 ОЧИСТКА КЭША
        </h1>
        
        <p style={{
          textAlign: 'center',
          color: '#888',
          marginBottom: '30px',
          fontSize: '14px'
        }}>
          Принудительное обновление платформы
        </p>

        {progress > 0 && (
          <div style={{
            width: '100%',
            height: '6px',
            background: 'rgba(0, 255, 136, 0.2)',
            borderRadius: '3px',
            overflow: 'hidden',
            margin: '20px 0'
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #00FF88 0%, #00cc6a 100%)',
              width: `${progress}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        )}

        {countdown !== null && (
          <div style={{
            textAlign: 'center',
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#00FF88',
            margin: '20px 0',
            textShadow: '0 0 20px rgba(0, 255, 136, 0.8)'
          }}>
            {countdown}
          </div>
        )}

        <div style={{
          margin: '25px 0',
          padding: '20px',
          background: 'rgba(0, 0, 0, 0.6)',
          borderRadius: '8px',
          minHeight: '150px',
          maxHeight: '300px',
          overflowY: 'auto',
          border: '1px solid #00FF88'
        }}>
          {logs.map((log, i) => (
            <div
              key={i}
              style={{
                margin: '8px 0',
                padding: '5px',
                borderLeft: `3px solid ${
                  log.type === 'error' ? '#ff6b6b' :
                  log.type === 'success' ? '#00FF88' : '#888'
                }`,
                paddingLeft: '10px',
                color: log.type === 'error' ? '#ff6b6b' :
                       log.type === 'success' ? '#00FF88' : '#888'
              }}
            >
              {log.msg}
            </div>
          ))}
        </div>

        <button
          onClick={clearEverything}
          disabled={isClearing}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #00FF88 0%, #00cc6a 100%)',
            color: '#030303',
            border: 'none',
            padding: '18px',
            fontSize: '18px',
            fontWeight: 'bold',
            borderRadius: '8px',
            cursor: isClearing ? 'not-allowed' : 'pointer',
            margin: '10px 0',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            opacity: isClearing ? 0.5 : 1
          }}
        >
          🚀 ОЧИСТИТЬ ВСЁ И ОБНОВИТЬ
        </button>

        <button
          onClick={hardReload}
          disabled={isClearing}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #333 0%, #222 100%)',
            color: '#00FF88',
            border: 'none',
            padding: '18px',
            fontSize: '18px',
            fontWeight: 'bold',
            borderRadius: '8px',
            cursor: isClearing ? 'not-allowed' : 'pointer',
            margin: '10px 0',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            opacity: isClearing ? 0.5 : 1
          }}
        >
          ⚡ ЖЁСТКАЯ ПЕРЕЗАГРУЗКА
        </button>
      </div>
    </div>
  );
}










