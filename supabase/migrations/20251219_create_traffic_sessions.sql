-- 🔒 TRAFFIC DASHBOARD - USER SESSIONS TRACKING
-- Отслеживание всех входов в систему для безопасности

CREATE TABLE IF NOT EXISTS traffic_user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  team_name TEXT NOT NULL,
  role TEXT NOT NULL,
  
  -- IP и локация
  ip_address TEXT NOT NULL,
  ip_country TEXT,
  ip_city TEXT,
  
  -- Устройство и браузер
  user_agent TEXT NOT NULL,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser_name TEXT,
  browser_version TEXT,
  os_name TEXT,
  os_version TEXT,
  
  -- Device Fingerprint (для определения уникального устройства)
  device_fingerprint TEXT,
  screen_resolution TEXT,
  timezone TEXT,
  language TEXT,
  
  -- Session info
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_at TIMESTAMP WITH TIME ZONE,
  session_duration_seconds INTEGER,
  
  -- Security flags
  is_suspicious BOOLEAN DEFAULT FALSE,
  suspicious_reason TEXT,
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES traffic_users(id) ON DELETE CASCADE
);

-- Индексы для быстрого поиска
CREATE INDEX idx_sessions_user_id ON traffic_user_sessions(user_id);
CREATE INDEX idx_sessions_email ON traffic_user_sessions(email);
CREATE INDEX idx_sessions_ip ON traffic_user_sessions(ip_address);
CREATE INDEX idx_sessions_login_at ON traffic_user_sessions(login_at DESC);
CREATE INDEX idx_sessions_suspicious ON traffic_user_sessions(is_suspicious);

-- View для админа: подозрительная активность
CREATE OR REPLACE VIEW traffic_suspicious_activity AS
SELECT 
  u.email,
  u.team_name,
  COUNT(DISTINCT s.ip_address) as unique_ips,
  COUNT(DISTINCT s.device_fingerprint) as unique_devices,
  COUNT(*) as total_logins,
  MAX(s.login_at) as last_login,
  STRING_AGG(DISTINCT s.ip_address, ', ') as all_ips
FROM traffic_users u
LEFT JOIN traffic_user_sessions s ON u.id = s.user_id
WHERE s.login_at > NOW() - INTERVAL '7 days' -- за последние 7 дней
GROUP BY u.email, u.team_name
HAVING COUNT(DISTINCT s.ip_address) > 3 -- более 3 разных IP = подозрительно
ORDER BY unique_ips DESC;

-- Комментарии
COMMENT ON TABLE traffic_user_sessions IS 'История всех входов в систему Traffic Dashboard';
COMMENT ON COLUMN traffic_user_sessions.device_fingerprint IS 'Уникальный отпечаток устройства для определения повторных входов';
COMMENT ON COLUMN traffic_user_sessions.is_suspicious IS 'Флаг подозрительной активности (много разных IP, необычное время входа и т.д.)';
COMMENT ON VIEW traffic_suspicious_activity IS 'Пользователи с подозрительной активностью (частая смена IP адресов)';
