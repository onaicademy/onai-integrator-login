# 🔗 ПРИМЕР РАБОТЫ КОРОТКОЙ ССЫЛКИ - ПОШАГОВО

## 📧 СЦЕНАРИЙ: Пользователь получил Email после профтеста

---

## 🎬 ШАГ ЗА ШАГОМ:

### **1️⃣ Пользователь проходит профтест**

```
Имя: Иван
Email: ivan@example.com
Phone: +77771234567
Lead ID: abc123-def456-ghi789
```

---

### **2️⃣ Система создает короткую ссылку для Email**

**Оригинальная (длинная) ссылка:**
```
https://onai.academy/integrator/expresscourse?utm_source=email&utm_campaign=proftest&lead_id=abc123-def456-ghi789
```
*Длина: 103 символа*

**Система вызывает:**
```typescript
const shortCode = await createShortLink({
  originalUrl: 'https://onai.academy/integrator/expresscourse?utm_source=email&utm_campaign=proftest&lead_id=abc123-def456-ghi789',
  leadId: 'abc123-def456-ghi789',
  campaign: 'proftest',
  source: 'email',
  expiresInDays: 90
});
```

**Результат:**
```typescript
shortCode = "aB3xY9"
```

**Короткая ссылка:**
```
https://onai.academy/l/aB3xY9
```
*Длина: 31 символ* → **Экономия 72 символа (70%)**

---

### **3️⃣ Запись в базу данных**

**Таблица: `short_links`**
```sql
INSERT INTO short_links (
  id,
  short_code,
  original_url,
  lead_id,
  campaign,
  source,
  expires_at,
  is_active,
  clicks_count,
  unique_ips
) VALUES (
  'aB3xY9',
  'aB3xY9',
  'https://onai.academy/integrator/expresscourse?utm_source=email&utm_campaign=proftest&lead_id=abc123-def456-ghi789',
  'abc123-def456-ghi789',
  'proftest',
  'email',
  '2025-03-14 20:00:00', -- expires через 90 дней
  true,
  0, -- клики пока 0
  []  -- пока нет IP
);
```

---

### **4️⃣ Email отправляется**

**Текст Email (упрощённо):**
```html
<h1>Привет, Иван! 👋</h1>
<p>Поздравляем! Вы успешно прошли профтест.</p>

<a href="https://onai.academy/l/aB3xY9" class="button">
  Получить продукт →
</a>

<p>Если кнопка не работает, скопируйте эту ссылку:</p>
<a href="https://onai.academy/l/aB3xY9">
  https://onai.academy/l/aB3xY9
</a>
```

---

### **5️⃣ ПОЛЬЗОВАТЕЛЬ КЛИКАЕТ НА ССЫЛКУ** 🖱️

**Клик на:** `https://onai.academy/l/aB3xY9`

---

### **6️⃣ Запрос попадает на сервер**

**HTTP Request:**
```http
GET /l/aB3xY9 HTTP/1.1
Host: onai.academy
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0
Referer: https://mail.google.com/
X-Forwarded-For: 185.123.45.67
```

---

### **7️⃣ Backend обрабатывает запрос**

**Код (из `backend/src/routes/short-links.ts`):**

```typescript
router.get('/:shortCode', async (req: Request, res: Response) => {
  const { shortCode } = req.params; // "aB3xY9"

  // 1️⃣ Получаем оригинальную ссылку из БД
  const originalUrl = await resolveShortLink(shortCode);
  // originalUrl = "https://onai.academy/integrator/expresscourse?utm_source=email&utm_campaign=proftest&lead_id=abc123-def456-ghi789"

  if (!originalUrl) {
    // Ссылка не найдена или истекла → редирект на главную
    return res.redirect('https://onai.academy');
  }

  // 2️⃣ Извлекаем данные о клике
  const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  // ipAddress = "185.123.45.67"
  
  const userAgent = req.headers['user-agent'];
  // userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
  
  const referer = req.headers['referer'] || req.headers['referrer'];
  // referer = "https://mail.google.com/"

  // 3️⃣ АСИНХРОННО отслеживаем клик (не блокирует редирект!)
  trackShortLinkClick(shortCode, ipAddress, userAgent, referer)
    .catch(err => console.error('❌ Error tracking click:', err));

  // 4️⃣ НЕМЕДЛЕННО редиректим пользователя
  res.redirect(originalUrl);
  // Браузер перенаправляется на:
  // https://onai.academy/integrator/expresscourse?utm_source=email&utm_campaign=proftest&lead_id=abc123-def456-ghi789
});
```

---

### **8️⃣ Функция `trackShortLinkClick()` работает в фоне**

**Код (из `backend/src/services/urlShortener.ts`):**

```typescript
export async function trackShortLinkClick(
  shortCode: string,
  ipAddress: string,
  userAgent?: string,
  referer?: string
): Promise<void> {
  // 1️⃣ Получаем текущую статистику ссылки
  const { data: linkData } = await supabase
    .from('short_links')
    .select('clicks_count, unique_ips, first_clicked_at')
    .eq('short_code', shortCode)
    .single();

  // clicks_count = 0
  // unique_ips = []
  // first_clicked_at = null

  // 2️⃣ Проверяем уникальность IP
  const uniqueIps = linkData.unique_ips || [];
  const isUniqueClick = !uniqueIps.includes(ipAddress);
  // isUniqueClick = true (первый клик с этого IP)

  // 3️⃣ Обновляем статистику основной таблицы
  await supabase
    .from('short_links')
    .update({
      clicks_count: 1, // было 0, стало 1
      unique_ips: ["185.123.45.67"], // добавили IP
      first_clicked_at: new Date().toISOString(), // "2025-12-14T20:30:15Z"
      last_clicked_at: new Date().toISOString()   // "2025-12-14T20:30:15Z"
    })
    .eq('short_code', shortCode);

  // 4️⃣ Записываем детальную информацию о клике
  await supabase
    .from('short_link_clicks')
    .insert({
      short_link_id: "aB3xY9",
      ip_address: "185.123.45.67",
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      referer: "https://mail.google.com/",
      clicked_at: "2025-12-14T20:30:15Z"
    });

  console.log(`✅ Click tracked: aB3xY9 (unique: true, total: 1)`);
}
```

---

### **9️⃣ Пользователь попадает на продуктовую страницу**

**URL в браузере:**
```
https://onai.academy/integrator/expresscourse?utm_source=email&utm_campaign=proftest&lead_id=abc123-def456-ghi789
```

**✅ ВСЕ UTM МЕТКИ СОХРАНИЛИСЬ!**

---

### **🔟 Google Analytics / Facebook Pixel получают данные**

**UTM параметры:**
- ✅ `utm_source=email` → источник: Email
- ✅ `utm_campaign=proftest` → кампания: Профтест
- ✅ `lead_id=abc123-def456-ghi789` → ID лида

**Google Analytics видит:**
```
Source: email
Campaign: proftest
Custom Dimension: lead_id = abc123-def456-ghi789
```

**Facebook Conversion API получает:**
```javascript
{
  event_name: "PageView",
  user_data: {
    client_user_agent: "Mozilla/5.0...",
    client_ip_address: "185.123.45.67"
  },
  custom_data: {
    source: "email",
    campaign: "proftest",
    lead_id: "abc123-def456-ghi789"
  }
}
```

---

## 📊 ЧТО СОХРАНИЛОСЬ В БАЗЕ ДАННЫХ:

### **Таблица: `short_links`** (после клика)

```sql
SELECT * FROM short_links WHERE short_code = 'aB3xY9';
```

**Результат:**
| short_code | original_url | clicks_count | unique_ips | first_clicked_at | last_clicked_at |
|------------|--------------|--------------|------------|------------------|-----------------|
| aB3xY9 | https://onai.academy/integrator/expresscourse?utm_source=email... | **1** | ["185.123.45.67"] | 2025-12-14 20:30:15 | 2025-12-14 20:30:15 |

---

### **Таблица: `short_link_clicks`** (детальная статистика)

```sql
SELECT * FROM short_link_clicks WHERE short_link_id = 'aB3xY9';
```

**Результат:**
| id | short_link_id | ip_address | user_agent | referer | clicked_at |
|----|---------------|------------|------------|---------|------------|
| 1 | aB3xY9 | 185.123.45.67 | Mozilla/5.0... | https://mail.google.com/ | 2025-12-14 20:30:15 |

---

## 🎯 ВТОРОЙ КЛИК (тот же пользователь, через 5 минут)

**Пользователь снова кликает:** `https://onai.academy/l/aB3xY9`

### **Что происходит:**

1. ✅ Редирект на ту же страницу
2. ✅ `clicks_count` увеличивается: `1 → 2`
3. ❌ `unique_ips` НЕ изменяется (тот же IP)
4. ✅ `last_clicked_at` обновляется
5. ✅ Новая запись в `short_link_clicks`

**Результат:**
```
clicks_count = 2
unique_ips = ["185.123.45.67"] (всё ещё 1 уникальный)
```

---

## 🎯 ТРЕТИЙ КЛИК (другой пользователь, другой IP)

**Новый пользователь кликает:** `https://onai.academy/l/aB3xY9`

**IP:** `92.45.78.123`

### **Что происходит:**

1. ✅ Редирект на ту же страницу
2. ✅ `clicks_count` увеличивается: `2 → 3`
3. ✅ `unique_ips` ДОБАВЛЯЕТСЯ новый IP: `["185.123.45.67", "92.45.78.123"]`
4. ✅ `last_clicked_at` обновляется
5. ✅ Новая запись в `short_link_clicks`

**Результат:**
```
clicks_count = 3
unique_ips = ["185.123.45.67", "92.45.78.123"] (2 уникальных)
```

---

## ✅ ИТОГОВАЯ АНАЛИТИКА:

### **После 3 кликов:**

```json
{
  "shortCode": "aB3xY9",
  "originalUrl": "https://onai.academy/integrator/expresscourse?utm_source=email&utm_campaign=proftest&lead_id=abc123-def456-ghi789",
  "totalClicks": 3,
  "uniqueClicks": 2,
  "clickThroughRate": "2/100 = 2%", // если отправили 100 emails
  "firstClickedAt": "2025-12-14T20:30:15Z",
  "lastClickedAt": "2025-12-14T21:15:30Z"
}
```

---

## 🎉 ОТВЕТ НА ТВОЙ ВОПРОС:

### **"Уйдет в аналитику или нет?"**

# ✅ ДА! АНАЛИТИКА РАБОТАЕТ НА 100%!

**Что отслеживается:**

1. ✅ **Наша внутренняя аналитика:**
   - Количество кликов (общее + уникальные)
   - IP адреса всех кликов
   - User Agent (браузер/устройство)
   - Referer (откуда пришёл)
   - Время кликов

2. ✅ **Google Analytics:**
   - UTM метки (source, campaign)
   - Lead ID
   - Путь пользователя по сайту

3. ✅ **Facebook Conversion API:**
   - Событие PageView
   - IP адрес и User Agent
   - Custom Data (lead_id, source, campaign)

4. ✅ **AmoCRM:**
   - Lead ID связан с AmoCRM
   - Можно отследить конверсию

---

## 🚀 КАК ПРОВЕРИТЬ:

### **1. Посмотреть статистику по короткой ссылке:**

```bash
curl https://api.onai.academy/api/short-links/stats/aB3xY9
```

### **2. Посмотреть все ссылки лида:**

```bash
curl https://api.onai.academy/api/short-links/lead/abc123-def456-ghi789
```

### **3. В админ панели:**

```
/integrator/admin/leads → Найти лида → Посмотреть клики
```

---

**ВСЯ АНАЛИТИКА РАБОТАЕТ! КОРОТКАЯ ССЫЛКА = ПОЛНЫЙ ТРЕКИНГ!** 🎯
