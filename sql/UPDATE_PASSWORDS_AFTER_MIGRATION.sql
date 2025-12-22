-- ============================================
-- UPDATE PASSWORDS FOR ALL TRAFFIC USERS
-- Apply AFTER Traffic DB migration is complete
-- Database: Traffic DB (oetodaexnjcunklkdlkv)
-- ============================================

-- Set all users to password: "onai2024"
-- Hash: $2b$10$rIz9tS53OX36M5OM49ea1uOe5hgHIL1EUlVzeLKsnJ8c6F9.B.XLq

UPDATE traffic_users
SET password_hash = '$2b$10$rIz9tS53OX36M5OM49ea1uOe5hgHIL1EUlVzeLKsnJ8c6F9.B.XLq',
    updated_at = now()
WHERE email IN (
  'kenesary@onai.academy',
  'arystan@onai.academy',
  'traf4@onai.academy',
  'muha@onai.academy',
  'admin@onai.academy'
);

-- Verify update
SELECT email, full_name, team_name, role, 
       CASE 
         WHEN password_hash = '$2b$10$rIz9tS53OX36M5OM49ea1uOe5hgHIL1EUlVzeLKsnJ8c6F9.B.XLq' 
         THEN '✅ Updated' 
         ELSE '❌ Old' 
       END as password_status
FROM traffic_users
ORDER BY team_name;

-- ✅ All users can now login with password: "onai2024"
