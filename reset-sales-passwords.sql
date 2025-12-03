-- Reset passwords for Amina and Rakhat sales managers
-- Password: Onai2134

-- This SQL updates auth.users directly using encrypted password
-- Run this through Supabase SQL Editor

-- For Amina
UPDATE auth.users
SET encrypted_password = crypt('Onai2134', gen_salt('bf'))
WHERE email = 'amina@onaiacademy.kz';

-- For Rakhat
UPDATE auth.users
SET encrypted_password = crypt('Onai2134', gen_salt('bf'))
WHERE email = 'rakhat@onaiacademy.kz';

-- Verify
SELECT email, role, created_at FROM auth.users WHERE email IN ('amina@onaiacademy.kz', 'rakhat@onaiacademy.kz');


