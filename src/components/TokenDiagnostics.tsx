import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';

export function TokenDiagnostics() {
  const { session, accessToken, refreshToken, user, userRole, isInitialized } = useAuth();

  // Проверка localStorage
  const checkLocalStorage = () => {
    const keys = Object.keys(localStorage);
    const authKey = keys.find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
    
    if (!authKey) return { found: false };
    
    const stored = localStorage.getItem(authKey);
    if (!stored) return { found: false };
    
    try {
      const data = JSON.parse(stored);
      return {
        found: true,
        key: authKey,
        hasAccessToken: !!data.access_token,
        hasRefreshToken: !!data.refresh_token,
        expiresAt: data.expires_at,
        expiresIn: data.expires_at ? Math.floor((data.expires_at * 1000 - Date.now()) / 1000) : null
      };
    } catch {
      return { found: false };
    }
  };

  const storageData = checkLocalStorage();

  return (
    <Card className="fixed bottom-4 right-4 p-4 max-w-md bg-black/90 text-white text-xs z-50">
      <div className="space-y-2">
        <h3 className="font-bold text-sm mb-2">🔐 Диагностика токенов</h3>
        
        <div>
          <strong>AuthContext:</strong>
          <div className="pl-2">
            ✅ Инициализирован: {isInitialized ? 'Да' : 'Нет'}<br/>
            👤 User: {user?.email || 'Нет'}<br/>
            🎭 Role: {userRole || 'Нет'}<br/>
          </div>
        </div>

        <div>
          <strong>Session:</strong>
          <div className="pl-2">
            {session ? '✅ Есть' : '❌ Нет'}<br/>
            {session && (
              <>
                📧 Email: {session.user.email}<br/>
                ⏰ Expires: {new Date(session.expires_at! * 1000).toLocaleTimeString()}
              </>
            )}
          </div>
        </div>

        <div>
          <strong>Токены:</strong>
          <div className="pl-2">
            🔑 Access Token: {accessToken ? `✅ ${accessToken.slice(0, 20)}...` : '❌ Нет'}<br/>
            🔄 Refresh Token: {refreshToken ? `✅ ${refreshToken.slice(0, 20)}...` : '❌ Нет'}
          </div>
        </div>

        <div>
          <strong>localStorage:</strong>
          <div className="pl-2">
            {storageData.found ? (
              <>
                ✅ Найден: {storageData.key?.split('-').pop()}<br/>
                🔑 Access: {storageData.hasAccessToken ? 'Есть' : 'Нет'}<br/>
                🔄 Refresh: {storageData.hasRefreshToken ? 'Есть' : 'Нет'}<br/>
                ⏰ Истекает через: {storageData.expiresIn ? `${storageData.expiresIn}с` : 'N/A'}
              </>
            ) : (
              '❌ Токен не найден в localStorage'
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}




