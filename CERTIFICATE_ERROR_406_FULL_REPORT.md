# 🔴 КРИТИЧЕСКАЯ ОШИБКА 406: Полный отчет для AI-архитектора

## 📋 EXECUTIVE SUMMARY

**Проблема**: При загрузке страницы профиля Tripwire студента возникает ошибка 406 (Not Acceptable) при попытке получить данные о сертификате из Supabase.

**Статус**: НЕРЕШЕНА после множественных попыток исправления.

**Влияние**: Студенты не могут генерировать и скачивать сертификаты после завершения курса.

---

## 🔍 ДЕТАЛЬНОЕ ОПИСАНИЕ ОШИБКИ

### Ошибка в браузере:

```
GET https://pjmvxecykysfrzppdcto.supabase.co/rest/v1/certificates?select=*&user_id=eq.6635f2ad-3743-45a1-b74a-231fe09abfa1
406 (Not Acceptable)
```

### HTTP 406 - что это значит:

**406 Not Acceptable** - сервер не может вернуть ответ в формате, который клиент готов принять (указан в заголовке `Accept`).

### Контекст ошибки:

1. **Когда происходит**: При загрузке страницы `/tripwire/profile`
2. **Что пытается сделать**: Загрузить существующий сертификат пользователя
3. **База данных**: Tripwire Supabase (`pjmvxecykysfrzppdcto`)
4. **Таблица**: `certificates`
5. **Пользователь**: Авторизован через Tripwire Auth

---

## 🏗️ АРХИТЕКТУРА СИСТЕМЫ

### Две Supabase базы:

1. **Main Platform** (`arqhkacellqbhjhbebfh.supabase.co`)
   - Основные пользователи
   - Основные курсы
   - НЕ используется для Tripwire

2. **Tripwire** (`pjmvxecykysfrzppdcto.supabase.co`) ✅
   - Tripwire студенты (auth)
   - Tripwire прогресс
   - **Сертификаты** (должны быть здесь)
   - Storage bucket: `certificates`

### Структура аутентификации:

```
User login → Tripwire Supabase Auth
    ↓
Tripwire Auth создает: auth.users (UUID1)
    ↓
Связь с Main Platform: tripwire_users.user_id = Main Platform users.id (UUID2)
    ↓
В таблице certificates:
    - user_id = UUID2 (Main Platform user ID)
    - НЕ UUID1 (Tripwire auth ID)
```

**ПРОБЛЕМА**: `auth.uid()` в RLS политиках возвращает UUID1, но в таблице хранится UUID2!

---

## 📊 СТРУКТУРА ТАБЛИЦЫ `certificates`

```sql
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,  -- Main Platform user ID!
  certificate_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  pdf_url TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_certificates_user ON certificates(user_id);
CREATE UNIQUE INDEX idx_certificates_number_unique ON certificates(certificate_number);

-- RLS (отключен!)
ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;
```

**Статус RLS**: ❌ ОТКЛЮЧЕН (но ошибка 406 все еще есть!)

---

## 🔧 ЧТО УЖЕ БЫЛО СДЕЛАНО

### Попытка 1: Использование Main Platform DB
- **Что сделали**: Изменили backend для использования Main Platform Supabase
- **Результат**: ❌ Ошибка 500 - таблица не существовала в Main Platform
- **Откат**: Да

### Попытка 2: Создание таблицы в Main Platform
- **Что сделали**: Создали таблицу `certificates` в Main Platform DB
- **Результат**: ❌ Неправильная архитектура - сертификаты должны быть в Tripwire
- **Откат**: Да

### Попытка 3: Переименование таблицы
- **Что сделали**: Переименовали `tripwire_certificates` → `certificates`
- **Результат**: ✅ Название таблицы правильное, но ошибка 406 осталась
- **Откат**: Нет

### Попытка 4: Исправление импортов
- **Что сделали**: Изменили все импорты на использование Tripwire Supabase
- **Результат**: ✅ Запросы идут к правильной базе, но ошибка 406 осталась
- **Откат**: Нет

### Попытка 5: Добавление RLS политик
- **Что сделали**: Создали политики для чтения сертификатов
- **Результат**: ❌ Ошибка 406 осталась (проблема с auth.uid())
- **Откат**: Нет

### Попытка 6: Отключение RLS
- **Что сделали**: `ALTER TABLE certificates DISABLE ROW LEVEL SECURITY`
- **Результат**: ❌ Ошибка 406 ОСТАЛАСЬ!
- **Откат**: Нет

### Попытка 7: Добавление заголовков в Supabase клиент
- **Что сделали**: Добавили `Accept` и `Content-Type` в `global.headers`
- **Результат**: ❌ Ошибка 406 осталась
- **Откат**: Нет

---

## 💻 ТЕКУЩИЙ КОД

### Frontend: `src/lib/supabase-tripwire.ts`

```typescript
export const tripwireSupabase = createClient(tripwireUrl, tripwireKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'sb-tripwire-auth-token',
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Accept': 'application/json',      // ✅ Добавлено
      'Content-Type': 'application/json' // ✅ Добавлено
    }
  }
})
```

### Frontend: `TripwireProfile.tsx` (загрузка сертификата)

```typescript
// 3. Сертификаты (используем Tripwire Supabase!)
const { data: certificateData } = await tripwireSupabase
  .from('certificates')
  .select('*')
  .eq('user_id', user.id)  // user.id = Main Platform UUID
  .single();
```

### Backend: `tripwireCertificateService.ts`

```typescript
import { tripwireAdminSupabase as supabase } from '../../config/supabase-tripwire';

// Проверка существующего сертификата
const { data: existingCert } = await supabase
  .from('certificates')
  .select('*')
  .eq('user_id', userId)
  .single();
```

### Backend: `supabase-tripwire.ts`

```typescript
export const tripwireAdminSupabase = createClient(tripwireUrl, tripwireServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      Authorization: `Bearer ${tripwireServiceRoleKey}`
    }
  }
});
```

---

## 🐛 АНАЛИЗ ПРОБЛЕМЫ

### Почему ошибка 406, а не 404 или 403?

1. **404** - таблица/запись не найдена
2. **403** - доступ запрещен (RLS)
3. **406** - проблема с форматом ответа (заголовки!)

### Гипотезы:

#### Гипотеза 1: Проблема с PostgREST
PostgREST (используется Supabase) возвращает 406 когда:
- Клиент запрашивает формат который сервер не может предоставить
- Например: `Accept: application/xml`, но сервер поддерживает только JSON

**Проверка**: В коде добавлен `Accept: application/json` - должно работать.

#### Гипотеза 2: Проблема с Content Negotiation
PostgREST использует заголовок `Accept` для определения формата:
- `application/json` - JSON
- `application/vnd.pgrst.object+json` - Single object
- `text/csv` - CSV

**Проверка**: Используем `.single()` в запросе - возможно нужен специальный заголовок?

#### Гипотеза 3: Проблема с Prefer заголовком
PostgREST использует `Prefer` для опций запроса:
- `Prefer: return=representation` - вернуть созданные данные
- `Prefer: count=exact` - вернуть точный count

**Проверка**: Не добавляли `Prefer` заголовок для GET запросов.

#### Гипотеза 4: Таблица не существует в schema
Возможно таблица существует, но не в `public` schema.

**Проверка**: Нужно проверить `SELECT * FROM information_schema.tables WHERE table_name = 'certificates'`

#### Гипотеза 5: Anon Key неправильный
Возможно `VITE_TRIPWIRE_SUPABASE_ANON_KEY` - это ключ от другого проекта.

**Проверка**: Нужно проверить JWT payload ключа.

---

## 🔬 ДИАГНОСТИКА

### Что нужно проверить:

#### 1. Проверить существование таблицы:
```sql
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name = 'certificates';
```

#### 2. Проверить колонки таблицы:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'certificates' 
ORDER BY ordinal_position;
```

#### 3. Проверить RLS статус:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'certificates';
```

#### 4. Проверить что данные можно прочитать напрямую:
```sql
SELECT * FROM certificates LIMIT 1;
```

#### 5. Проверить через curl с правильными заголовками:
```bash
curl -X GET \
  'https://pjmvxecykysfrzppdcto.supabase.co/rest/v1/certificates?select=*&user_id=eq.6635f2ad-3743-45a1-b74a-231fe09abfa1' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json'
```

#### 6. Декодировать JWT ключ:
Проверить что `VITE_TRIPWIRE_SUPABASE_ANON_KEY` содержит правильный `ref`:
```javascript
// JWT payload должен содержать:
{
  "iss": "supabase",
  "ref": "pjmvxecykysfrzppdcto",  // ✅ Правильный project ref
  "role": "anon"
}
```

---

## 📝 ЛОГИ И ЗАПРОСЫ

### Request Headers (из браузера):
```
GET /rest/v1/certificates?select=*&user_id=eq.6635f2ad-3743-45a1-b74a-231fe09abfa1
Host: pjmvxecykysfrzppdcto.supabase.co
Accept: */*  (?)
apikey: eyJ...
Authorization: Bearer eyJ...
```

**ПРОБЛЕМА**: `Accept: */*` вместо `Accept: application/json`?

### Response:
```
Status: 406 Not Acceptable
(No response body)
```

---

## 🎯 ВОЗМОЖНЫЕ РЕШЕНИЯ

### Решение 1: Явно указать Accept заголовок для каждого запроса

```typescript
const { data, error } = await tripwireSupabase
  .from('certificates')
  .select('*', {
    headers: {
      'Accept': 'application/json',
      'Prefer': 'return=representation'
    }
  })
  .eq('user_id', user.id)
  .single();
```

### Решение 2: Использовать fetch напрямую вместо Supabase SDK

```typescript
const response = await fetch(
  `${TRIPWIRE_URL}/rest/v1/certificates?select=*&user_id=eq.${userId}`,
  {
    headers: {
      'apikey': TRIPWIRE_ANON_KEY,
      'Authorization': `Bearer ${session.access_token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
);
```

### Решение 3: Создать API endpoint на backend

```typescript
// Backend: GET /api/tripwire/certificates/my
export async function getMyCertificate(userId: string) {
  const { data } = await tripwireAdminSupabase
    .from('certificates')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  return data;
}

// Frontend: вызывать через apiClient
const certificate = await apiClient.get(`/api/tripwire/certificates/my?user_id=${userId}`);
```

### Решение 4: Проверить Vercel environment variables

Возможно в Vercel неправильные переменные окружения:
- `VITE_TRIPWIRE_SUPABASE_URL` - должен быть `https://pjmvxecykysfrzppdcto.supabase.co`
- `VITE_TRIPWIRE_SUPABASE_ANON_KEY` - должен быть anon key от правильного проекта

### Решение 5: Отключить `.single()` и использовать массив

```typescript
const { data: certificates } = await tripwireSupabase
  .from('certificates')
  .select('*')
  .eq('user_id', user.id);

const certificate = certificates?.[0] || null;
```

---

## 🚨 КРИТИЧЕСКИЕ ВОПРОСЫ ДЛЯ АРХИТЕКТОРА

1. **Почему PostgREST возвращает 406 для GET запроса с `Accept: application/json`?**
   - Это стандартный заголовок для JSON API
   - Что может быть не так с таблицей/схемой?

2. **Как правильно настроить Supabase JS SDK для работы с кастомной таблицей?**
   - Нужны ли специальные опции?
   - Нужны ли дополнительные заголовки `Prefer`?

3. **Почему отключение RLS не помогло?**
   - RLS отключен: `rowsecurity = false`
   - Но ошибка 406 осталась
   - Это значит проблема НЕ в RLS, а в чем-то другом

4. **Правильно ли мы используем user_id?**
   - В таблице: Main Platform UUID
   - В запросе: тоже Main Platform UUID
   - Но пользователь аутентифицирован через Tripwire Auth
   - Может ли это влиять на PostgREST?

5. **Нужно ли добавить view или stored procedure?**
   - Может быть проблема в прямом доступе к таблице?
   - Создать view который PostgREST сможет обработать?

---

## 📦 WORKAROUND (временное решение)

Пока не решим проблему 406, можно:

1. **Использовать только backend API** для работы с сертификатами:
   ```typescript
   // Frontend: НЕ обращаться к Supabase напрямую
   // Использовать только apiClient.get('/api/tripwire/certificates/my')
   ```

2. **Игнорировать ошибку 406** при загрузке профиля:
   ```typescript
   try {
     const { data } = await tripwireSupabase.from('certificates')...
   } catch (error) {
     if (error.code === 'PGRST116') {
       // Certificate not found - это нормально
       return null;
     }
     // Игнорируем 406
     console.warn('Certificate fetch failed, will generate new one');
     return null;
   }
   ```

3. **Не проверять существование сертификата** на фронтенде:
   - Всегда показывать кнопку "Сгенерировать сертификат"
   - Backend проверит при генерации

---

## 🔗 ПОЛЕЗНЫЕ ССЫЛКИ

1. [PostgREST Error Reference](https://postgrest.org/en/stable/errors.html)
2. [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
3. [PostgREST Content Negotiation](https://postgrest.org/en/stable/references/api/tables_views.html#content-negotiation)

---

## 📋 ЧЕКЛИСТ ДЛЯ АРХИТЕКТОРА

- [ ] Проверить существование таблицы в правильном schema
- [ ] Проверить что anon key правильный (декодировать JWT)
- [ ] Проверить прямой curl запрос к PostgREST API
- [ ] Проверить настройки PostgREST в Supabase Dashboard
- [ ] Проверить что таблица не имеет специальных ограничений
- [ ] Рассмотреть использование backend API вместо прямого доступа
- [ ] Рассмотреть создание view вместо прямого доступа к таблице

---

## 🎬 СЛЕДУЮЩИЕ ШАГИ

1. **СРОЧНО**: Диагностика через curl с правильными заголовками
2. **СРОЧНО**: Проверка Vercel environment variables
3. Реализация backend API endpoint как fallback
4. Решение проблемы 406 на уровне PostgREST

---

**Дата создания**: 10 декабря 2025  
**Автор**: AI Assistant  
**Статус**: АКТИВНАЯ ПРОБЛЕМА  
**Приоритет**: 🔴 КРИТИЧЕСКИЙ
