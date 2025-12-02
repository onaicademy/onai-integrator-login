# AmoCRM Интеграция - Tripwire Product

## 🎯 Описание

При создании пользователя через **Sales Manager Dashboard**, автоматически происходит интеграция с AmoCRM:

1. ✅ Поиск существующей сделки по email контакта в воронке Tripwire
2. ✅ Перемещение сделки на этап **"Купил продукт"**
3. ✅ Добавление примечания с учетными данными
4. ✅ Сохранение `amocrm_deal_id` в базу данных

## 🔧 Настройка

### 1. Получение Access Token

1. Войдите в AmoCRM: `https://your_company.amocrm.ru`
2. Настройки → Интеграции → Создать интеграцию
3. Название: `onAI Tripwire Integration`
4. Права доступа:
   - ✅ Доступ к сделкам
   - ✅ Доступ к контактам
   - ✅ Доступ к задачам
   - ✅ Доступ к примечаниям
5. Скопируйте **Access Token**

### 2. Получение Pipeline ID и Stage ID

**Метод 1: Через URL**

1. Откройте воронку Tripwire в AmoCRM
2. URL будет: `https://your_company.amocrm.ru/leads/pipeline/123456`
3. `123456` - это Pipeline ID

**Метод 2: Через API**

```bash
curl -X GET "https://your_company.amocrm.ru/api/v4/leads/pipelines" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Найдите воронку Tripwire и скопируйте:
- `id` - Pipeline ID
- `statuses[].id` - Stage ID для этапа "Купил продукт"

### 3. Добавить в backend/.env

```env
# AmoCRM Integration - Tripwire
AMOCRM_ENABLED=true
AMOCRM_SUBDOMAIN=your_company
AMOCRM_ACCESS_TOKEN=your_access_token_here
AMOCRM_TRIPWIRE_PIPELINE_ID=123456
AMOCRM_TRIPWIRE_STAGE_BOUGHT_ID=789012
```

## 📝 Реализация

### Создать файл: backend/src/services/amocrmService.ts

```typescript
import axios from 'axios';

const AMOCRM_BASE_URL = `https://${process.env.AMOCRM_SUBDOMAIN}.amocrm.ru/api/v4`;

interface AmoCRMContact {
  id: number;
  name: string;
}

interface AmoCRMDeal {
  id: number;
  name: string;
  pipeline_id: number;
  status_id: number;
}

/**
 * Поиск контакта по email
 */
async function findContactByEmail(email: string): Promise<AmoCRMContact | null> {
  try {
    const response = await axios.get(`${AMOCRM_BASE_URL}/contacts`, {
      headers: {
        Authorization: `Bearer ${process.env.AMOCRM_ACCESS_TOKEN}`,
      },
      params: {
        query: email,
      },
    });

    if (response.data._embedded?.contacts?.length > 0) {
      return response.data._embedded.contacts[0];
    }

    return null;
  } catch (error: any) {
    console.error('AmoCRM: Ошибка поиска контакта', error.message);
    return null;
  }
}

/**
 * Поиск сделки в воронке Tripwire по контакту
 */
async function findDealInPipeline(
  contactId: number,
  pipelineId: string
): Promise<AmoCRMDeal | null> {
  try {
    const response = await axios.get(`${AMOCRM_BASE_URL}/leads`, {
      headers: {
        Authorization: `Bearer ${process.env.AMOCRM_ACCESS_TOKEN}`,
      },
      params: {
        filter: {
          pipeline_id: pipelineId,
        },
        with: 'contacts',
      },
    });

    const deals = response.data._embedded?.leads || [];
    
    // Ищем сделку с нужным контактом
    for (const deal of deals) {
      const contacts = deal._embedded?.contacts || [];
      if (contacts.some((c: any) => c.id === contactId)) {
        return deal;
      }
    }

    return null;
  } catch (error: any) {
    console.error('AmoCRM: Ошибка поиска сделки', error.message);
    return null;
  }
}

/**
 * Обновить этап сделки
 */
async function updateDealStage(dealId: number, stageId: string): Promise<boolean> {
  try {
    await axios.patch(
      `${AMOCRM_BASE_URL}/leads/${dealId}`,
      {
        status_id: parseInt(stageId),
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`✅ AmoCRM: Сделка ${dealId} перемещена на этап ${stageId}`);
    return true;
  } catch (error: any) {
    console.error('AmoCRM: Ошибка обновления сделки', error.message);
    return false;
  }
}

/**
 * Добавить примечание к сделке
 */
async function addNoteToLead(dealId: number, noteText: string): Promise<boolean> {
  try {
    await axios.post(
      `${AMOCRM_BASE_URL}/leads/${dealId}/notes`,
      {
        note_type: 'common',
        params: {
          text: noteText,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`✅ AmoCRM: Примечание добавлено к сделке ${dealId}`);
    return true;
  } catch (error: any) {
    console.error('AmoCRM: Ошибка добавления примечания', error.message);
    return false;
  }
}

/**
 * Создать новую сделку Tripwire
 */
async function createTripwireDeal(contactId: number, userName: string): Promise<number | null> {
  try {
    const response = await axios.post(
      `${AMOCRM_BASE_URL}/leads`,
      [
        {
          name: `Tripwire - ${userName}`,
          pipeline_id: parseInt(process.env.AMOCRM_TRIPWIRE_PIPELINE_ID || '0'),
          status_id: parseInt(process.env.AMOCRM_TRIPWIRE_STAGE_BOUGHT_ID || '0'),
          _embedded: {
            contacts: [
              {
                id: contactId,
              },
            ],
          },
        },
      ],
      {
        headers: {
          Authorization: `Bearer ${process.env.AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const dealId = response.data._embedded?.leads[0]?.id;
    console.log(`✅ AmoCRM: Создана новая сделка ${dealId} для ${userName}`);
    return dealId;
  } catch (error: any) {
    console.error('AmoCRM: Ошибка создания сделки', error.message);
    return null;
  }
}

/**
 * Главная функция - переместить сделку Tripwire на этап "Купил продукт"
 */
export async function moveTripwireDealToStage(
  contactEmail: string,
  userName: string
): Promise<number | null> {
  try {
    // Проверяем что AmoCRM включен
    if (process.env.AMOCRM_ENABLED !== 'true') {
      console.log('⚠️ AmoCRM интеграция отключена');
      return null;
    }

    console.log(`🔄 AmoCRM: Обработка для ${contactEmail} (${userName})`);

    // 1. Найти контакт
    const contact = await findContactByEmail(contactEmail);
    if (!contact) {
      console.log(`⚠️ AmoCRM: Контакт ${contactEmail} не найден`);
      return null;
    }

    console.log(`✅ AmoCRM: Контакт найден (ID: ${contact.id})`);

    // 2. Найти сделку в воронке Tripwire
    const deal = await findDealInPipeline(
      contact.id,
      process.env.AMOCRM_TRIPWIRE_PIPELINE_ID || ''
    );

    if (deal) {
      // 3. Переместить на этап "Купил продукт"
      console.log(`✅ AmoCRM: Сделка найдена (ID: ${deal.id})`);
      
      await updateDealStage(deal.id, process.env.AMOCRM_TRIPWIRE_STAGE_BOUGHT_ID || '');
      await addNoteToLead(
        deal.id,
        `✅ Доступ к Tripwire предоставлен: ${userName}\nЛогин: ${contactEmail}`
      );

      return deal.id;
    } else {
      // 4. Создать новую сделку если не найдена
      console.log(`⚠️ AmoCRM: Сделка не найдена, создаем новую`);
      return await createTripwireDeal(contact.id, userName);
    }
  } catch (error: any) {
    console.error('❌ AmoCRM: Критическая ошибка', error.message);
    return null;
  }
}
```

### Обновить tripwireManagerService.ts

```typescript
import { moveTripwireDealToStage } from './amocrmService';

// В функции createTripwireUser, после создания пользователя:

// 7. AmoCRM интеграция (опционально)
let amocrmDealId = null;
if (process.env.AMOCRM_ENABLED === 'true') {
  amocrmDealId = await moveTripwireDealToStage(email, full_name);
  
  if (amocrmDealId) {
    // Сохраняем amocrm_deal_id в базу
    await supabaseAdmin
      .from('tripwire_users')
      .update({ amocrm_deal_id: amocrmDealId.toString() })
      .eq('user_id', newUser.user.id);
  }
}
```

## 🧪 Тестирование

### 1. Проверка настроек

```bash
cd backend
node -e "
  console.log('AMOCRM_ENABLED:', process.env.AMOCRM_ENABLED);
  console.log('AMOCRM_SUBDOMAIN:', process.env.AMOCRM_SUBDOMAIN);
  console.log('AMOCRM_ACCESS_TOKEN exists:', !!process.env.AMOCRM_ACCESS_TOKEN);
  console.log('AMOCRM_TRIPWIRE_PIPELINE_ID:', process.env.AMOCRM_TRIPWIRE_PIPELINE_ID);
  console.log('AMOCRM_TRIPWIRE_STAGE_BOUGHT_ID:', process.env.AMOCRM_TRIPWIRE_STAGE_BOUGHT_ID);
"
```

### 2. Создать тестового пользователя

1. Откройте `/admin/tripwire-manager`
2. Создайте пользователя с email который **ЕСТЬ В AMOCRM**
3. Проверьте логи backend:

```bash
pm2 logs onai-backend --lines 100 | grep AmoCRM
```

Ожидаемый вывод:
```
🔄 AmoCRM: Обработка для test@example.com (Тест Пользователь)
✅ AmoCRM: Контакт найден (ID: 123456)
✅ AmoCRM: Сделка найдена (ID: 789012)
✅ AmoCRM: Сделка 789012 перемещена на этап 142857
✅ AmoCRM: Примечание добавлено к сделке 789012
```

### 3. Проверка в AmoCRM

1. Откройте сделку в AmoCRM
2. Проверьте что:
   - ✅ Сделка на этапе "Купил продукт"
   - ✅ Есть примечание с логином и паролем
   - ✅ Дата обновления изменилась

### 4. Проверка в БД

```sql
SELECT 
  full_name,
  email,
  amocrm_deal_id,
  created_at
FROM tripwire_users
WHERE amocrm_deal_id IS NOT NULL
ORDER BY created_at DESC;
```

## 📚 Документация AmoCRM API

- Официальная документация: https://www.amocrm.ru/developers/content/crm_platform/platform-api
- Авторизация: https://www.amocrm.ru/developers/content/oauth/step-by-step
- Работа со сделками: https://www.amocrm.ru/developers/content/crm_platform/leads-api
- Работа с контактами: https://www.amocrm.ru/developers/content/crm_platform/contacts-api

---

**Готово! 📊✅**


