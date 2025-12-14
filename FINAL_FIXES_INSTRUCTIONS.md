# 🔧 FINAL FIXES - Manual Instructions

## 🎯 Что нужно исправить:

### 1. ✅ **Админ панель - скрыть от студентов**

**Файл**: `src/components/tripwire/TripwireSidebar.tsx`

**Найти** (строки 58-63):
```typescript
export function TripwireSidebar({ onClose, isMobile = false }: TripwireSidebarProps) {
  const { user, userRole } = useAuth();
  
  // 🔒 SECURITY: Role-based access
  const isAdmin = userRole === 'admin';
  const isSales = userRole === 'sales' || isAdmin;
```

**Заменить на**:
```typescript
export function TripwireSidebar({ onClose, isMobile = false }: TripwireSidebarProps) {
  const [tripwireUserRole, setTripwireUserRole] = useState<string>('student');
  
  // 🔥 Load Tripwire user role from tripwireSupabase
  useEffect(() => {
    tripwireSupabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role || 'student';
        setTripwireUserRole(role);
        console.log('🔒 TripwireSidebar: User role:', role);
      }
    });
  }, []);
  
  // 🔒 SECURITY: Role-based access  
  const isAdmin = tripwireUserRole === 'admin';
  const isSales = false; // Sales not available in Tripwire
```

**Также добавить импорты** (в начало файла после существующих):
```typescript
import { useState, useEffect } from "react";
import { tripwireSupabase } from "@/lib/supabase-tripwire";
```

---

### 2. ✅ **Убрать смену email, оставить только пароль**

**Файл**: `src/pages/tripwire/components/AccountSettings.tsx`

**Найти** (строки 162-232):
```typescript
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column: Info & Email */}
        <div className="space-y-8">
          
          {/* Account Info Card */}
          <div className="relative group">
            ...
          </div>

          {/* Update Email Card */}
          <div className="relative group">
            ...СМЕНИТЬ EMAIL...
          </div>
        </div>

        {/* Right Column: Password & Security */}
        <div className="space-y-8">
```

**Заменить на**:
```typescript
      <div className="max-w-2xl mx-auto">
        {/* Account Info Card */}
        <div className="relative group mb-8">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-[#00FF94]/20 to-transparent rounded-2xl blur opacity-50" />
          <div className="relative bg-[rgba(10,10,10,0.9)] border border-gray-800 rounded-2xl p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/20">
                <User className="w-6 h-6 text-[#00FF94]" />
              </div>
              <h3 className="text-xl font-bold text-white font-['Space_Grotesk'] uppercase">
                ИНФОРМАЦИЯ
              </h3>
            </div>
            
            <div className="space-y-4">
              {email && (
                <div className="p-4 bg-black/40 rounded-xl border border-gray-800">
                  <span className="text-xs text-[#9CA3AF] font-['JetBrains_Mono'] block mb-1">АДРЕС ЭЛЕКТРОННОЙ ПОЧТЫ</span>
                  <p className="text-white font-mono">{email}</p>
                </div>
              )}
              <div className="p-4 bg-black/40 rounded-xl border border-gray-800">
                <span className="text-xs text-[#9CA3AF] font-['JetBrains_Mono'] block mb-1">В СИСТЕМЕ С</span>
                <p className="text-white font-mono">
                  {new Date(created_at).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Password & Security */}
        <div className="space-y-8">
```

---

### 3. ✅ **Исправить длительность модулей (подтягивать из БД)**

**Файл**: `src/pages/tripwire/TripwireProductPage.tsx`

**Найти** (строки 30-67):
```typescript
const tripwireModules = [
  {
    id: 16,
    title: "Вводный модуль",
    subtitle: "Определим какое направление в ИИ твое",
    description: "Базовое погружение в нейросети...",
    duration: "45 мин", // ❌ MOCK-UP
    lessons: 1,
    icon: Brain,
    status: "active",
    gradient: "from-[#00FF88]/20 via-transparent to-transparent",
    lessonId: 67,
  },
  {
    id: 17,
    title: "Создание GPT-бота",
    subtitle: "Instagram, WhatsApp интеграции",
    description: "Практический модуль...",
    duration: "60 мин", // ❌ MOCK-UP
    lessons: 1,
    icon: Bot,
    status: "locked",
    gradient: "from-purple-500/20 via-transparent to-transparent",
    lessonId: 68,
  },
  {
    id: 18,
    title: "Создание вирусных Reels",
    subtitle: "100 000 👁️ | Сценарий, видео, монтаж",
    description: "Генерация контента с помощью AI...",
    duration: "50 мин", // ❌ MOCK-UP
    lessons: 1,
    icon: Clapperboard,
    status: "locked",
    gradient: "from-blue-500/20 via-transparent to-transparent",
    lessonId: 69,
  },
];
```

**Решение**: Загружать длительность из БД при инициализации компонента

**Добавить state** (после строки 89):
```typescript
const [modulesWithDuration, setModulesWithDuration] = useState(tripwireModules);
```

**Добавить useEffect для загрузки длительности** (после useEffect с loadUnlocks):
```typescript
// 🔥 Load lesson durations from database
useEffect(() => {
  const loadDurations = async () => {
    try {
      const { data: lessons, error } = await tripwireSupabase
        .from('lessons')
        .select('id, duration_minutes')
        .in('id', [67, 68, 69]);
      
      if (!error && lessons) {
        const updatedModules = tripwireModules.map(module => {
          const lesson = lessons.find(l => l.id === module.lessonId);
          if (lesson && lesson.duration_minutes) {
            const hours = Math.floor(lesson.duration_minutes / 60);
            const minutes = lesson.duration_minutes % 60;
            let durationStr = '';
            if (hours > 0) {
              durationStr = `${hours} ч ${minutes > 0 ? minutes + ' мин' : ''}`;
            } else {
              durationStr = `${minutes} мин`;
            }
            return { ...module, duration: durationStr };
          }
          return module;
        });
        setModulesWithDuration(updatedModules);
        console.log('✅ Loaded lesson durations from DB:', lessons);
      }
    } catch (error) {
      console.error('❌ Failed to load durations:', error);
    }
  };
  
  loadDurations();
}, []);
```

**Заменить использование** `tripwireModules` → `modulesWithDuration` (строка 206):
```typescript
const modulesWithDynamicStatus = modulesWithDuration.map(module => {
```

И строка 233:
```typescript
const currentUnlockModule = currentUnlock 
    ? modulesWithDuration.find(m => m.id === currentUnlock.module_id)
    : null;
```

---

## 🧪 Тестирование после исправлений:

### 1. Админ панель
- [ ] Зайти как студент → Админ панель НЕ видна в сайдбаре
- [ ] Зайти как админ → Админ панель ВИДНА в сайдбаре

### 2. Настройки аккаунта
- [ ] Открыть `/tripwire/profile`
- [ ] Пролистать до "Настройки аккаунта"
- [ ] Email показывается только если не пустой
- [ ] Смена email УБРАНА
- [ ] Смена пароля РАБОТАЕТ

### 3. Длительность модулей
- [ ] Открыть `/tripwire/product`
- [ ] Проверить что модули показывают реальную длительность из БД
- [ ] Не должно быть mock-up значений (45 мин, 60 мин, 50 мин)
- [ ] Должна быть реальная длительность видео

---

## 🚀 Deployment

После тестирования на локалке:
```bash
git add .
git commit -m "fix: hide admin panel from students, remove email change, load real lesson durations"
git push origin main

# На сервере:
ssh root@207.154.231.30
cd /var/www/onai-integrator-login-main
git pull
cd backend && npm install && npm run build && pm2 restart onai-backend
```

---

## 📝 Changelog

### Fixed:
- ✅ Админ панель теперь видна только администраторам
- ✅ Убрана смена email из настроек
- ✅ Длительность модулей загружается из БД
- ✅ Скрыт пустой email если не заполнен
- ✅ Прогресс сохраняется в правильную таблицу tripwire_progress
- ✅ Карточка Live Эфира открывается после завершения 3 модулей

**Готово к тестированию!** ✨
