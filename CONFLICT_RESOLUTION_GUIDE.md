# 🔧 ИНСТРУКЦИЯ: Решение конфликта "Хард данные блокируют визуал"

**Дата:** 27 ноября 2025  
**Проблема:** Модули разблокированы в БД, но визуально остаются серыми с замочками  
**Статус:** ✅ РЕШЕНО

---

## 🎯 ОПИСАНИЕ ПРОБЛЕМЫ

### Что было сделано изначально:
1. ✅ Создана таблица `module_unlocks` в БД
2. ✅ Создан компонент `ModuleUnlockAnimation.tsx` (анимация)
3. ✅ Добавлены API эндпоинты для получения unlocks
4. ✅ Интегрирована анимация в `TripwireProductPage.tsx`
5. ✅ Модули 2, 3, 4 разблокированы в БД для админа Saint

### Что НЕ работало:
❌ **Модули визуально оставались ЗАБЛОКИРОВАННЫМИ**
- Серый цвет
- Замочки при hover
- Нельзя кликнуть (cursor-not-allowed)
- Анимация не показывалась (потому что модули считались locked)

### Почему это произошло:
**ХАРДКОД в коде!**

В `TripwireProductPage.tsx` был жёстко заданный массив модулей:

```typescript
const tripwireModules = [
  { id: 1, status: "active" },
  { id: 2, status: "locked" },  // ❌ ХАРДКОД
  { id: 3, status: "locked" },  // ❌ ХАРДКОД
  { id: 4, status: "locked" },  // ❌ ХАРДКОД
];
```

**Проблема:** Даже если в БД модуль разблокирован, код всегда рендерил `status: "locked"`.

---

## 🛠️ РЕШЕНИЕ: ПОШАГОВАЯ ИНСТРУКЦИЯ

### ШАГ 1: Загрузить unlocked модули из БД

**Файл:** `src/pages/tripwire/TripwireProductPage.tsx`

**Что добавил:**
```typescript
// State для хранения ID разблокированных модулей
const [userUnlockedModuleIds, setUserUnlockedModuleIds] = useState<number[]>([]);

// useEffect для загрузки unlocks при монтировании
useEffect(() => {
  if (!user?.id) return;

  const loadUnlocks = async () => {
    try {
      const response = await api.get(`/api/tripwire/module-unlocks/${user.id}`);
      const unlocks = response.unlocks || [];
      
      // ✅ Сохраняем ВСЕ ID разблокированных модулей
      const allUnlockedIds = unlocks.map((u: any) => u.module_id);
      setUserUnlockedModuleIds(allUnlockedIds);
      
      // Показываем анимацию только для непоказанных
      const pendingUnlocks = unlocks.filter((u: any) => !u.animation_shown);
      if (pendingUnlocks.length > 0) {
        setUnlockedModules(pendingUnlocks);
        setCurrentUnlock(pendingUnlocks[0]);
        setShowUnlockAnimation(true);
      }
    } catch (error) {
      console.error('❌ Failed to load unlocks:', error);
    }
  };

  loadUnlocks();
}, [user?.id]);
```

**Ключевой момент:**
- `allUnlockedIds` - массив ID модулей, разблокированных в БД
- Сохраняем в state `userUnlockedModuleIds`
- Используем для динамической смены статуса

---

### ШАГ 2: Динамически менять статус модулей

**Было (ХАРДКОД):**
```typescript
const activeModule = tripwireModules.find(m => m.status === 'active');
const lockedModules = tripwireModules.filter(m => m.status === 'locked');
```

**Стало (ДИНАМИЧЕСКИЙ):**
```typescript
// ✅ СОЗДАЁМ НОВЫЙ МАССИВ с динамическим статусом
const modulesWithDynamicStatus = tripwireModules.map(module => ({
  ...module,
  status: (module.id === 1 || userUnlockedModuleIds.includes(module.id) || isAdmin) 
    ? 'active' 
    : 'locked'
}));

const activeModules = modulesWithDynamicStatus.filter(m => m.status === 'active');
const lockedModules = modulesWithDynamicStatus.filter(m => m.status === 'locked');
```

**Логика:**
1. Модуль 1 ВСЕГДА активен (бесплатный)
2. Если `userUnlockedModuleIds.includes(module.id)` → `status = 'active'`
3. Если `isAdmin` → ВСЕ модули `status = 'active'`
4. Иначе → `status = 'locked'`

---

### ШАГ 3: Разделить активные модули на featured и other

**Было:**
```typescript
const activeModule = modulesWithDynamicStatus.find(m => m.status === 'active');
```

**Стало:**
```typescript
const activeModules = modulesWithDynamicStatus.filter(m => m.status === 'active');

// Первый активный модуль - большая карта слева
const featuredModule = activeModules[0];

// Остальные активные - карточки справа (БЕЗ замочка)
const otherActiveModules = activeModules.slice(1);
```

**Зачем:**
- Большой hero card слева - для главного модуля
- Маленькие карточки справа - для остальных разблокированных
- Замочки ТОЛЬКО на `lockedModules`

---

### ШАГ 4: Обновить рендеринг

**Было (только locked модули справа):**
```tsx
<div className="lg:col-span-5 space-y-6 lg:space-y-8">
  {lockedModules.map((module, index) => (
    // Карточка с замочком
  ))}
</div>
```

**Стало (активные + locked):**
```tsx
<div className="lg:col-span-5 space-y-6 lg:space-y-8">
  {/* ✅ РАЗБЛОКИРОВАННЫЕ модули (кроме первого) */}
  {otherActiveModules.map((module, index) => (
    <motion.div
      onClick={() => handleModuleClick(module)}
      style={{
        border: `2px solid ${BRAND.colors.neon_green}`,  // ✅ ЗЕЛЁНЫЙ border
        boxShadow: `0 0 40px rgba(0, 255, 148, 0.3)`    // ✅ GLOW
      }}
    >
      {/* Иконка с зелёным фоном */}
      <module.icon style={{ color: BRAND.colors.neon_green }} />
      
      {/* БЕЗ замочка! */}
    </motion.div>
  ))}
  
  {/* ❌ ЗАБЛОКИРОВАННЫЕ модули */}
  {lockedModules.map((module, index) => (
    <motion.div
      style={{
        opacity: 0.4,  // Серый
        cursor: 'not-allowed'
      }}
    >
      {/* С замочком */}
      <Lock className="w-12 h-12" />
    </motion.div>
  ))}
</div>
```

---

### ШАГ 5: Заменить все ссылки на `activeModule` на `featuredModule`

**Было:**
```tsx
{activeModule && (
  <div onClick={() => handleModuleClick(activeModule)}>
    <activeModule.icon />
    <h2>{activeModule.title}</h2>
    <p>{activeModule.description}</p>
  </div>
)}
```

**Стало:**
```tsx
{featuredModule && (
  <div onClick={() => handleModuleClick(featuredModule)}>
    <featuredModule.icon />
    <h2>{featuredModule.title}</h2>
    <p>{featuredModule.description}</p>
  </div>
)}
```

**Почему:** `activeModule` был ОДНИМ модулем, `featuredModule` - тоже один, но из массива активных.

---

## 📊 РЕЗУЛЬТАТ

### ДО исправления:
```
Модуль 1: Зелёный, активный ✅
Модуль 2: Серый, замочек ❌
Модуль 3: Серый, замочек ❌
Модуль 4: Серый, замочек ❌
```

### ПОСЛЕ исправления:
```
Модуль 1: Зелёный, большая карта слева ✅
Модуль 2: Зелёный, карточка справа, БЕЗ замочка ✅
Модуль 3: Зелёный, карточка справа, БЕЗ замочка ✅
Модуль 4: Зелёный, карточка справа, БЕЗ замочка ✅
```

---

## 🎯 КЛЮЧЕВЫЕ УРОКИ

### 1. Не хардкодить статусы
❌ **Плохо:**
```typescript
const modules = [
  { id: 1, status: "active" },
  { id: 2, status: "locked" },  // ❌ Жёстко заданный статус
];
```

✅ **Хорошо:**
```typescript
const modules = modulesData.map(module => ({
  ...module,
  status: userUnlockedIds.includes(module.id) ? 'active' : 'locked'
}));
```

### 2. Разделять данные и представление
- **Данные:** В БД (`module_unlocks`)
- **Представление:** В компоненте (`modulesWithDynamicStatus`)
- **Связь:** API запрос + dynamic mapping

### 3. Проверять визуал в браузере
- ❌ Не полагаться только на код
- ✅ ВСЕГДА открывать браузер и смотреть результат
- ✅ Делать скриншоты для сравнения

### 4. State как источник истины
```typescript
// State хранит список разблокированных модулей
const [userUnlockedModuleIds, setUserUnlockedModuleIds] = useState<number[]>([]);

// Используем state для рендеринга
const modulesWithDynamicStatus = tripwireModules.map(module => ({
  ...module,
  status: userUnlockedModuleIds.includes(module.id) ? 'active' : 'locked'
}));
```

---

## 🚀 ПРИМЕНЕНИЕ В PRODUCTION

### Когда студент завершает модуль:
```typescript
// Backend: После завершения модуля
await supabase.from('module_unlocks').insert({
  user_id: userId,
  module_id: nextModuleId,
  animation_shown: false  // ✅ Показать анимацию при следующем заходе
});
```

### Что произойдёт:
1. **БД обновится** - модуль разблокирован
2. **При следующем заходе:**
   - `useEffect` загрузит unlocks
   - `userUnlockedModuleIds` обновится
   - `modulesWithDynamicStatus` пересчитается
   - Модуль станет **ЗЕЛЁНЫМ** и **КЛИКАБЕЛЬНЫМ**
   - Покажется **АНИМАЦИЯ** (confetti + glow)

---

## 📝 CHECKLIST ДЛЯ БУДУЩИХ РАЗБЛОКИРОВОК

- [ ] Добавить запись в `module_unlocks` с `animation_shown = false`
- [ ] Убедиться что `user_id` и `module_id` корректны
- [ ] Перезагрузить страницу `/tripwire`
- [ ] Проверить что модуль ЗЕЛЁНЫЙ
- [ ] Проверить что модуль КЛИКАБЕЛЬНЫЙ
- [ ] Проверить что показалась АНИМАЦИЯ
- [ ] Проверить что после анимации модуль остался АКТИВНЫМ

---

## 🔥 ФИНАЛЬНЫЙ КОД (Упрощённая версия)

```typescript
function TripwireProductPage() {
  const { user, userRole } = useAuth();
  const [userUnlockedModuleIds, setUserUnlockedModuleIds] = useState<number[]>([]);
  
  // 1. Загружаем unlocks из БД
  useEffect(() => {
    const loadUnlocks = async () => {
      const response = await api.get(`/api/tripwire/module-unlocks/${user.id}`);
      const unlocks = response.unlocks || [];
      const allUnlockedIds = unlocks.map(u => u.module_id);
      setUserUnlockedModuleIds(allUnlockedIds);  // ✅ Сохраняем в state
    };
    loadUnlocks();
  }, [user?.id]);
  
  // 2. Динамически меняем статус
  const modulesWithDynamicStatus = tripwireModules.map(module => ({
    ...module,
    status: (module.id === 1 || userUnlockedModuleIds.includes(module.id) || isAdmin) 
      ? 'active' 
      : 'locked'
  }));
  
  // 3. Разделяем на активные и locked
  const activeModules = modulesWithDynamicStatus.filter(m => m.status === 'active');
  const lockedModules = modulesWithDynamicStatus.filter(m => m.status === 'locked');
  const featuredModule = activeModules[0];
  const otherActiveModules = activeModules.slice(1);
  
  // 4. Рендерим
  return (
    <div>
      {/* Featured (большая карта) */}
      <BigCard module={featuredModule} />
      
      {/* Other Active (БЕЗ замочков) */}
      {otherActiveModules.map(module => <GreenCard module={module} />)}
      
      {/* Locked (с замочками) */}
      {lockedModules.map(module => <GrayCardWithLock module={module} />)}
    </div>
  );
}
```

---

**ИТОГ:** Решение заняло 5 правок, но теперь система **ПОЛНОСТЬЮ ДИНАМИЧЕСКАЯ** и работает на основе данных из БД! 🎉



