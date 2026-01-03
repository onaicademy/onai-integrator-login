# 🎓 ИНСТРУКЦИЯ: Исправление проблемы с генерацией сертификатов

**Дата:** 30 декабря 2025
**Проблема:** Студент завершил 3/3 модуля, но сертификат не был выдан автоматически

---

## 🔴 СРОЧНЫЕ ДЕЙСТВИЯ

### ✅ ШАГ 1: Выдать сертификат студенту palonin348@roratu.com (ВРУЧНУЮ)

**Запустить скрипт:**

```bash
cd /Users/miso/onai-integrator-login

npx ts-node backend/scripts/issue-certificate-manual.ts e494b82e-c635-486e-bad5-28886b37bd6b
```

**Что делает скрипт:**
1. Проверяет, что студент завершил 3/3 модуля
2. Генерирует PDF сертификата
3. Загружает PDF в Storage bucket `tripwire-certificates`
4. Создаёт запись в таблице `certificates`
5. Обновляет `tripwire_user_profile` (certificate_issued = true)

**Ожидаемый результат:**
```
✅ СЕРТИФИКАТ УСПЕШНО ВЫДАН!

Certificate Number: TW-USER-E494B82E-123456
PDF URL: https://pjmvxecykysfrzppdcto.supabase.co/storage/v1/object/public/tripwire-certificates/...
```

---

### ✅ ШАГ 2: Добавить автоматическую выдачу сертификатов (ДОЛГОСРОЧНОЕ РЕШЕНИЕ)

**Файл:** `/backend/src/routes/tripwire-lessons.ts`

**После строки 589 добавить:**

```typescript
// ✅ STEP 6d: Автоматическая выдача сертификата при завершении 3/3 модулей
if (completedModulesCount === 3) {
  console.log('🎓 [AUTO CERTIFICATE] Студент завершил все модули, выдаём сертификат...');

  try {
    // Проверяем, не выдан ли уже сертификат
    const { data: existingCert } = await tripwireAdminSupabase
      .from('certificates')
      .select('id')
      .eq('user_id', main_user_id)
      .maybeSingle();

    if (!existingCert) {
      const { issueCertificate } = await import('../services/tripwire/tripwireCertificateService');
      const certificate = await issueCertificate(main_user_id);

      console.log('✅ [AUTO CERTIFICATE] Сертификат выдан:', certificate.certificate_number);
      console.log('   PDF URL:', certificate.pdf_url);
    } else {
      console.log('ℹ️ [AUTO CERTIFICATE] Сертификат уже выдан ранее');
    }
  } catch (certError: any) {
    console.error('❌ [AUTO CERTIFICATE] Ошибка выдачи сертификата:', certError.message);
    // Не падаем - студент всё равно завершил урок
  }
}
```

**Расположение кода:**

```typescript
// ... (строка 589)
        } else {
          console.log(`✅ [STEP 6c SUCCESS] Profile updated: ${completedModulesCount}/3 modules (${completion_percentage}%)`);
        }
      }
    }

    // ✅ ШАГ 6d: Автоматическая выдача сертификата ⬅️ ДОБАВИТЬ ЗДЕСЬ
    if (completedModulesCount === 3) {
      // ... код выше ...
    }

    console.log(`✅ [SUCCESS] Lesson completion successful!`);

    // ============================================
    // 🔥 AMOCRM INTEGRATION - Update deal stage (ЛОГИКА НЕ ИЗМЕНЕНА!)
    // ============================================
```

---

## 📊 ПРОВЕРКА РЕЗУЛЬТАТА

### 1. Проверить сертификат в БД

```sql
-- Connect to Tripwire Supabase (pjmvxecykysfrzppdcto)

SELECT
  c.certificate_number,
  c.full_name,
  c.issued_at,
  c.pdf_url,
  tup.certificate_issued,
  tu.email
FROM certificates c
JOIN tripwire_users tu ON c.user_id = tu.user_id
JOIN tripwire_user_profile tup ON c.user_id = tup.user_id
WHERE tu.email = 'palonin348@roratu.com';
```

**Ожидаемый результат:**
```
certificate_number: TW-USER-E494B82E-123456
full_name: Tst uchenik
issued_at: 2025-12-30 ...
pdf_url: https://...
certificate_issued: true
email: palonin348@roratu.com
```

### 2. Проверить PDF в Storage

Перейти по URL из `pdf_url` - должен открыться PDF сертификат.

### 3. Проверить в UI студента

1. Войти как студент palonin348@roratu.com
2. Перейти в профиль
3. Раздел "Мой сертификат" должен отображаться
4. Кнопка "Скачать сертификат" должна работать

---

## 🔍 ДОПОЛНИТЕЛЬНАЯ ДИАГНОСТИКА

### Найти всех студентов, завершивших 3/3 модуля без сертификата

```sql
-- Connect to Tripwire Supabase

SELECT
  tu.user_id,
  tu.email,
  tu.full_name,
  tup.modules_completed,
  tup.certificate_issued,
  COUNT(DISTINCT tp.module_id) FILTER (WHERE tp.is_completed = true AND tp.module_id IN (16,17,18)) as actual_completed
FROM tripwire_users tu
JOIN tripwire_user_profile tup ON tu.user_id = tup.user_id
LEFT JOIN tripwire_progress tp ON tu.user_id = tp.tripwire_user_id
WHERE tup.modules_completed >= 3
  AND tup.certificate_issued = false
GROUP BY tu.user_id, tu.email, tu.full_name, tup.modules_completed, tup.certificate_issued
HAVING COUNT(DISTINCT tp.module_id) FILTER (WHERE tp.is_completed = true AND tp.module_id IN (16,17,18)) = 3;
```

### Выдать сертификаты всем студентам (массовая выдача)

```bash
# Получить список user_id из SQL выше, затем:

for user_id in "<user_id_1>" "<user_id_2>" "<user_id_3>"; do
  npx ts-node backend/scripts/issue-certificate-manual.ts "$user_id"
done
```

---

## 📁 СВЯЗАННЫЕ ФАЙЛЫ

- **Отчёт о проверке БД:** `/docs/CERTIFICATE_DB_VERIFICATION_REPORT_20251230.md`
- **Скрипт ручной выдачи:** `/backend/scripts/issue-certificate-manual.ts`
- **Роутер завершения уроков:** `/backend/src/routes/tripwire-lessons.ts`
- **Сервис генерации сертификатов:** `/backend/src/services/tripwire/tripwireCertificateService.ts`

---

## ✅ CHECKLIST

- [ ] Выдан сертификат студенту palonin348@roratu.com
- [ ] Добавлен код автоматической выдачи в `tripwire-lessons.ts`
- [ ] Проверен сертификат в БД
- [ ] Проверен PDF в Storage
- [ ] Протестирована автоматическая выдача (завершить урок новым студентом)
- [ ] Найдены и обработаны другие студенты без сертификатов

---

**Подготовлено:** Claude Sonnet 4.5
**Дата:** 30 декабря 2025
