# 🎯 Инструкция по UTM Трекингу и Отслеживанию Переходов

## ✅ Что изменилось:

1. **Удалены все тестовые лиды** - оставлены только реальные из amoCRM
2. **Добавлен UTM трекинг** - отслеживание источника трафика
3. **Добавлено отслеживание кликов** - кто перешел по ссылке из Email/SMS
4. **Обновлен дашборд** - новые метрики и визуализация

## 📊 Новые метрики на дашборде `/target`:

### Основные метрики:
- **Всего лидов** - общее количество
- **В AmoCRM** - синхронизированных сделок
- **Email отправлено** - количество отправленных писем
- **Email открыто** - количество открытых писем
- **SMS отправлено** - количество отправленных SMS
- **SMS доставлено** - количество доставленных SMS

### Новые метрики по переходам:
- **Посетили лендинг** - сколько людей перешли на лендинг
- **Клики из Email** - кто кликнул по ссылке в письме (+ CTR %)
- **Клики из SMS** - кто кликнул по ссылке в SMS (+ CTR %)
- **Пришли с Email** - кто попал на лендинг через Email
- **Пришли с SMS** - кто попал на лендинг через SMS

## 🔗 Как правильно генерировать ссылки:

### 1. Ссылки в Email:

```
https://onai.academy/integrator/expresscourse?utm_source=email&utm_medium=welcome&utm_campaign=tripwire_dec2024&email={EMAIL_АДРЕС}
```

**Параметры:**
- `utm_source=email` - источник (обязательно!)
- `utm_medium=welcome` - тип письма (welcome, reminder, promo)
- `utm_campaign=tripwire_dec2024` - название кампании
- `email={EMAIL_АДРЕС}` - email лида для идентификации

### 2. Ссылки в SMS:

```
https://onai.academy/integrator/expresscourse?utm_source=sms&utm_medium=welcome&utm_campaign=tripwire_dec2024&phone={ТЕЛЕФОН}
```

**Параметры:**
- `utm_source=sms` - источник (обязательно!)
- `utm_medium=welcome` - тип SMS
- `utm_campaign=tripwire_dec2024` - название кампании
- `phone={ТЕЛЕФОН}` - телефон лида для идентификации

### 3. Короткие ссылки (для SMS):

Используйте сервис сокращения ссылок, но СОХРАНЯЙТЕ UTM параметры!

```
bit.ly/onai-trip?utm_source=sms&phone=77001234567
```

## ⚙️ Как интегрировать отслеживание:

### Шаг 1: На лендинге добавить трекинг кода

Добавьте этот код на лендинг страницу (`TripwireLanding.tsx`):

```typescript
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

export default function TripwireLanding() {
  const [searchParams] = useSearchParams();
  const API_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    // Отслеживаем переход на лендинг
    const trackVisit = async () => {
      const email = searchParams.get('email');
      const phone = searchParams.get('phone');
      const utm_source = searchParams.get('utm_source');
      const utm_medium = searchParams.get('utm_medium');
      const utm_campaign = searchParams.get('utm_campaign');

      // Если есть email или phone и utm_source - отслеживаем
      if ((email || phone) && utm_source) {
        try {
          await axios.post(`${API_URL}/api/lead-tracking/track-click`, {
            email,
            phone,
            source: utm_source, // 'email' или 'sms'
            utm: {
              source: utm_source,
              medium: utm_medium,
              campaign: utm_campaign
            }
          });
          console.log('✅ Visit tracked');
        } catch (error) {
          console.error('❌ Failed to track visit:', error);
        }
      }
    };

    trackVisit();
  }, [searchParams]);

  return (
    // ... ваш лендинг код
  );
}
```

### Шаг 2: В сервисе отправки Email

Обновите функцию отправки Email:

```typescript
async function sendWelcomeEmail(lead: { email: string; name: string }) {
  // Генерируем ссылку с UTM
  const landingUrl = `https://onai.academy/integrator/expresscourse?utm_source=email&utm_medium=welcome&utm_campaign=tripwire_dec2024&email=${encodeURIComponent(lead.email)}`;

  try {
    // Отправляем Email
    await resend.emails.send({
      from: 'onai@onai.academy',
      to: lead.email,
      subject: 'Добро пожаловать в Tripwire! 🚀',
      html: `
        <p>Привет, ${lead.name}!</p>
        <p>Твой доступ к курсу готов!</p>
        <a href="${landingUrl}">Перейти на платформу →</a>
      `
    });

    // Обновляем статус
    await axios.post(`${API_URL}/api/lead-tracking/update-email-status`, {
      leadId: lead.id,
      status: 'sent'
    });

    console.log(`✅ Email sent to ${lead.email}`);
  } catch (error) {
    // При ошибке тоже обновляем статус
    await axios.post(`${API_URL}/api/lead-tracking/update-email-status`, {
      leadId: lead.id,
      status: 'error',
      error: error.message
    });
  }
}
```

### Шаг 3: В сервисе отправки SMS

```typescript
async function sendWelcomeSMS(lead: { phone: string; name: string }) {
  // Генерируем короткую ссылку с UTM
  const landingUrl = `https://onai.academy/integrator/expresscourse?utm_source=sms&utm_medium=welcome&utm_campaign=tripwire_dec2024&phone=${encodeURIComponent(lead.phone)}`;

  try {
    // Отправляем SMS
    await smsService.send({
      to: lead.phone,
      text: `Привет, ${lead.name}! Твой доступ готов: ${landingUrl}`
    });

    // Обновляем статус
    await axios.post(`${API_URL}/api/lead-tracking/update-sms-status`, {
      leadId: lead.id,
      status: 'sent'
    });

    console.log(`✅ SMS sent to ${lead.phone}`);
  } catch (error) {
    // При ошибке обновляем статус
    await axios.post(`${API_URL}/api/lead-tracking/update-sms-status`, {
      leadId: lead.id,
      status: 'error',
      error: error.message
    });
  }
}
```

## 📈 Как проверить что работает:

1. **Отправьте тестовое письмо** себе с правильной UTM ссылкой
2. **Кликните по ссылке** в письме
3. **Откройте дашборд** `/target`
4. **Проверьте статистику**:
   - Должна увеличиться метрика "Посетили лендинг"
   - Должна увеличиться метрика "Клики из Email"
   - В таблице должен появиться ваш переход с источником "📧 Email"

## 🔍 API Endpoints:

### 1. Отслеживание клика по ссылке
```
POST /api/lead-tracking/track-click
Body: {
  "email": "user@example.com",  // или "phone": "77001234567"
  "source": "email",             // или "sms"
  "utm": {
    "source": "email",
    "medium": "welcome",
    "campaign": "tripwire_dec2024"
  }
}
```

### 2. Получение статистики
```
GET /api/lead-tracking/leads
Response: {
  "success": true,
  "stats": {
    "total_leads": 4,
    "landing_visited": 2,
    "email_link_clicked": 1,
    "sms_link_clicked": 1,
    "from_email": 1,
    "from_sms": 1
  },
  "leads": [...]
}
```

## 🎯 Примеры UTM кампаний:

### Welcome Email (после регистрации):
```
utm_source=email
utm_medium=welcome
utm_campaign=tripwire_welcome
```

### Reminder Email (напоминание):
```
utm_source=email
utm_medium=reminder
utm_campaign=tripwire_reminder_day1
```

### Promo SMS (рекламная):
```
utm_source=sms
utm_medium=promo
utm_campaign=tripwire_discount
```

## ⚡ Важно:

1. **ВСЕГДА используйте UTM параметры** в ссылках для Email и SMS
2. **ВСЕГДА передавайте email или phone** для идентификации лида
3. **Проверяйте работу** через дашборд `/target`
4. **Не забывайте** сокращать длинные ссылки для SMS

---

**Обновлено:** 13 декабря 2025  
**Статус:** ✅ Готово к использованию

