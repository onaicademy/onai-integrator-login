-- 🎉 Таблица для истории продаж с привязкой к таргетологам
-- Supabase Tripwire: https://pjmvxecykysfrzppdcto.supabase.co

CREATE TABLE IF NOT EXISTS sales_notifications (
  id BIGSERIAL PRIMARY KEY,
  
  -- 📋 ДАННЫЕ СДЕЛКИ (AmoCRM)
  lead_id BIGINT NOT NULL, -- ID сделки из AmoCRM
  lead_name TEXT, -- Название сделки
  contact_name TEXT, -- Имя клиента
  contact_phone TEXT, -- Телефон клиента
  
  -- 💰 ФИНАНСЫ
  sale_amount DECIMAL(10, 2) NOT NULL, -- Сумма продажи (KZT)
  product_name TEXT, -- Название продукта (Tripwire/ExpressCourse/ProfTest)
  
  -- 🎯 ТАРГЕТОЛОГ
  targetologist TEXT NOT NULL, -- Kenesary/Arystan/Muha/Traf4
  utm_source TEXT, -- utm_source из сделки
  utm_medium TEXT, -- utm_medium
  utm_campaign TEXT, -- utm_campaign
  utm_content TEXT, -- utm_content
  utm_term TEXT, -- utm_term
  
  -- 📊 МЕТАДАННЫЕ
  sale_date TIMESTAMPTZ NOT NULL, -- Дата оплаты
  notified_at TIMESTAMPTZ, -- Когда отправили уведомление в Telegram
  notification_status TEXT DEFAULT 'pending', -- pending/sent/failed
  
  -- 📝 ДОПОЛНИТЕЛЬНО
  pipeline_id BIGINT, -- ID воронки
  status_id BIGINT, -- ID статуса
  responsible_user_id BIGINT, -- ID ответственного в AmoCRM
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_sales_notifications_lead_id 
ON sales_notifications(lead_id);

CREATE INDEX IF NOT EXISTS idx_sales_notifications_targetologist 
ON sales_notifications(targetologist);

CREATE INDEX IF NOT EXISTS idx_sales_notifications_sale_date 
ON sales_notifications(sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_sales_notifications_notification_status 
ON sales_notifications(notification_status);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_sales_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер
DROP TRIGGER IF EXISTS trigger_update_sales_notifications_updated_at 
ON sales_notifications;

CREATE TRIGGER trigger_update_sales_notifications_updated_at
  BEFORE UPDATE ON sales_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_notifications_updated_at();

-- Комментарии
COMMENT ON TABLE sales_notifications IS 'История продаж с привязкой к таргетологам для Telegram уведомлений';
COMMENT ON COLUMN sales_notifications.targetologist IS 'Таргетолог, который привел клиента (определяется по UTM)';
COMMENT ON COLUMN sales_notifications.notification_status IS 'Статус отправки уведомления: pending/sent/failed';

-- Примеры использования:

-- 1. Добавить новую продажу
/*
INSERT INTO sales_notifications (
  lead_id,
  lead_name,
  contact_name,
  contact_phone,
  sale_amount,
  product_name,
  targetologist,
  utm_source,
  utm_campaign,
  sale_date
) VALUES (
  12345678,
  'Tripwire - Иван Иванов',
  'Иван Иванов',
  '+77771234567',
  5000.00,
  'Tripwire',
  'Kenesary',
  'facebook',
  'tripwire_17.12',
  NOW()
);
*/

-- 2. Получить продажи по таргетологу за сегодня
/*
SELECT 
  contact_name,
  sale_amount,
  product_name,
  utm_campaign,
  sale_date
FROM sales_notifications
WHERE targetologist = 'Kenesary'
  AND sale_date::date = CURRENT_DATE
ORDER BY sale_date DESC;
*/

-- 3. Статистика по таргетологам за период
/*
SELECT 
  targetologist,
  COUNT(*) as sales_count,
  SUM(sale_amount) as total_revenue,
  AVG(sale_amount) as avg_sale,
  MIN(sale_date) as first_sale,
  MAX(sale_date) as last_sale
FROM sales_notifications
WHERE sale_date BETWEEN '2024-12-01' AND '2024-12-31'
GROUP BY targetologist
ORDER BY total_revenue DESC;
*/

-- 4. Последние 10 продаж
/*
SELECT 
  targetologist,
  contact_name,
  sale_amount,
  product_name,
  sale_date,
  notification_status
FROM sales_notifications
ORDER BY sale_date DESC
LIMIT 10;
*/

-- 5. Продажи с ошибкой отправки уведомления
/*
SELECT * FROM sales_notifications
WHERE notification_status = 'failed'
ORDER BY sale_date DESC;
*/
