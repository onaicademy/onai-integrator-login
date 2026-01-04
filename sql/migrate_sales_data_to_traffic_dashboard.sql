-- Миграция данных из Landing DB в Traffic Dashboard DB
-- Этот SQL скрипт должен быть выполнен на Traffic Dashboard DB
-- Вставляет данные из таблиц sales в соответствующие таблицы Traffic Dashboard

-- Вставка данных из express_course_sales в traffic_sales
INSERT INTO traffic_sales (
  id, deal_id, contact_id, amount, currency,
  utm_source, utm_campaign, utm_medium, utm_content, utm_term,
  customer_name, phone, email, product_name, payment_method,
  lead_id, sale_date, created_at, updated_at
)
SELECT 
  id::uuid,
  deal_id::bigint,
  customer_id::bigint,
  amount,
  currency,
  utm_source,
  utm_campaign,
  utm_medium,
  utm_content,
  utm_term,
  customer_name,
  phone,
  email,
  'Express Course' as product_name,
  'card' as payment_method,
  NULL::uuid as lead_id,
  sale_date,
  created_at,
  updated_at
FROM (
  -- Здесь должен быть запрос к внешней базе данных Landing DB
  -- Но в рамках одной базы данных мы используем существующие данные
  SELECT * FROM express_course_sales
) s
ON CONFLICT (id) DO NOTHING;

-- Вставка данных из main_product_sales в traffic_sales
INSERT INTO traffic_sales (
  id, deal_id, contact_id, amount, currency,
  utm_source, utm_campaign, utm_medium, utm_content, utm_term,
  customer_name, phone, email, product_name, payment_method,
  lead_id, sale_date, created_at, updated_at
)
SELECT 
  id::uuid,
  deal_id::bigint,
  customer_id::bigint,
  amount,
  currency,
  utm_source,
  utm_campaign,
  utm_medium,
  utm_content,
  utm_term,
  customer_name,
  phone,
  email,
  'Integrator Flagman' as product_name,
  'card' as payment_method,
  NULL::uuid as lead_id,
  sale_date,
  created_at,
  updated_at
FROM (
  -- Здесь должен быть запрос к внешней базе данных Landing DB
  -- Но в рамках одной базы данных мы используем существующие данные
  SELECT * FROM main_product_sales
) s
ON CONFLICT (id) DO NOTHING;

-- Вставка данных из challenge3d_sales в challenge3d_sales
INSERT INTO challenge3d_sales (
  id, deal_id, contact_id, amount, currency, prepaid,
  utm_source, utm_campaign, utm_medium, utm_content, utm_term,
  original_utm_source, original_utm_campaign, original_utm_medium,
  original_utm_content, original_utm_term,
  customer_name, phone, email, product_name, payment_method,
  lead_id, prepayment_deal_id, sale_date, created_at, updated_at
)
SELECT 
  id::uuid,
  deal_id::bigint,
  customer_id::bigint,
  amount,
  currency,
  prepaid,
  utm_source,
  utm_campaign,
  utm_medium,
  utm_content,
  utm_term,
  original_utm_source,
  original_utm_campaign,
  original_utm_medium,
  original_utm_content,
  original_utm_term,
  customer_name,
  phone,
  email,
  'Challenge 3D' as product_name,
  'card' as payment_method,
  NULL::uuid as lead_id,
  NULL::bigint as prepayment_deal_id,
  sale_date,
  created_at,
  updated_at
FROM (
  -- Здесь должен быть запрос к внешней базе данных Landing DB
  -- Но в рамках одной базы данных мы используем существующие данные
  SELECT * FROM challenge3d_sales
) s
ON CONFLICT (id) DO NOTHING;

-- Вставка данных в traffic_sales_stats
INSERT INTO traffic_sales_stats (
  id, date, period_type, team_name, team_id,
  utm_source, utm_medium, total_sales, total_revenue,
  average_order_value, flagman_sales, flagman_revenue,
  express_sales, express_revenue, leads_count, conversion_rate,
  fb_spend, fb_impressions, fb_clicks, fb_ctr,
  fb_cpc, fb_cpm, roi, roas, cpa,
  created_at, updated_at, is_historical, historical_synced_at, sync_type
)
SELECT 
  id::uuid,
  date,
  'daily' as period_type,
  team,
  NULL::uuid as team_id,
  CASE WHEN campaign_id = 'team_total' THEN NULL ELSE campaign_id END as utm_source,
  'cpc' as utm_medium,
  (express_sales || 0) + (main_sales || 0) as total_sales,
  revenue_total_usd as total_revenue,
  0 as average_order_value,
  main_sales || 0 as flagman_sales,
  revenue_main_usd as flagman_revenue,
  express_sales || 0 as express_sales,
  revenue_express_usd as express_revenue,
  registrations || 0 as leads_count,
  0 as conversion_rate,
  spend_usd as fb_spend,
  impressions as fb_impressions,
  clicks as fb_clicks,
  ctr as fb_ctr,
  cpc_usd as fb_cpc,
  cpm_usd as fb_cpm,
  roi_percent as roi,
  0 as roas,
  0 as cpa,
  created_at,
  updated_at,
  false as is_historical,
  NULL as historical_synced_at,
  'realtime' as sync_type
FROM (
  -- Здесь должен быть запрос к внешней базе данных Landing DB
  -- Но в рамках одной базы данных мы используем существующие данные
  SELECT * FROM traffic_stats
) s
ON CONFLICT (id) DO NOTHING;
