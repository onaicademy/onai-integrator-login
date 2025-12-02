-- Проверяем роль saint@onaiacademy.kz в базе
SELECT id, email, full_name, role, is_active 
FROM profiles 
WHERE email = 'saint@onaiacademy.kz';

