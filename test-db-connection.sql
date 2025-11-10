-- Проверка подключения к базе данных
SELECT 
  NOW() as current_time,
  current_database() as database_name,
  current_user as user_name,
  version() as postgres_version;

