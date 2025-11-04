# 🎯 Настройка MCP Server в Cursor для shadcn/ui

## ✅ Текущий статус

MCP конфигурация уже создана и готова к использованию!

---

## 📋 Что уже настроено

### 1. ✅ Файл `.cursor/mcp.json` создан

**Путь:** `.cursor/mcp.json`

**Содержимое:**
```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    }
  }
}
```

### 2. ✅ Зависимость `shadcn` установлена

Пакет `shadcn@latest` уже установлен в `package.json`.

### 3. ✅ `components.json` настроен

Файл конфигурации shadcn уже существует и правильно настроен.

---

## 🔧 Шаги для активации в Cursor

### Шаг 1: Перезапустите Cursor

Закройте и откройте Cursor заново, чтобы он подхватил конфигурацию MCP.

### Шаг 2: Откройте настройки MCP

1. Нажмите `⌘` + `,` (Cmd + Comma) для открытия Settings
2. В поиске введите: **"MCP"**
3. Или перейдите в **Settings → Features → MCP**

### Шаг 3: Включите shadcn MCP сервер

В списке MCP серверов найдите:
```
📦 shadcn
   command: npx shadcn@latest mcp
```

**Включите его** переключателем справа.

**Индикатор:**
- 🟢 **Зелёная точка** = работает
- 🔴 **Красная точка** = ошибка
- ⚪️ **Серая точка** = отключен

---

## 🧪 Проверка работы

### После включения попробуйте:

Напишите в Cursor (в чате с AI):

```
Show me all available components in the shadcn registry
```

Или:

```
Add the button and dialog components to my project
```

### Ожидаемый результат:

Cursor должен:
- ✅ Показать список доступных компонентов
- ✅ Предложить установить их
- ✅ Показать кнопку "Install" или выполнить установку

---

## 💡 Что можно делать с MCP

### Поиск компонентов:

```
Find me a login form from the shadcn registry
Search for card components
Show all button variants
```

### Установка компонентов:

```
Add button, dialog and card components to my project
Install the avatar and badge components
Add tooltip component
```

### Создание с компонентами:

```
Create a dashboard layout using cards and sidebar
Build a login page using shadcn components
Make a profile card with avatar and badge
```

### Просмотр примеров:

```
Show me examples of button usage
Find card component demos
Get accordion examples
```

---

## 🗂️ Доступные компоненты shadcn/ui

### Базовые:
- button
- input
- label
- textarea
- checkbox
- radio-group
- switch
- select

### Навигация:
- navigation-menu
- menubar
- breadcrumb
- pagination
- tabs

### Overlay:
- dialog
- sheet
- popover
- dropdown-menu
- tooltip
- hover-card
- context-menu

### Feedback:
- toast
- alert
- alert-dialog
- progress
- skeleton

### Layout:
- card
- separator
- scroll-area
- aspect-ratio
- accordion
- collapsible

### Forms:
- form
- command
- calendar
- date-picker
- slider

### Data Display:
- table
- badge
- avatar
- chart

### Advanced:
- carousel
- drawer
- resizable
- sonner (toast notifications)

---

## 🔍 Troubleshooting

### Проблема: "No tools or prompts" в MCP списке

**Решение:**
```bash
# 1. Очистите npx кеш
npx clear-npx-cache

# 2. Переустановите shadcn
npm install -D shadcn@latest

# 3. Перезапустите Cursor
```

### Проблема: MCP сервер не появляется в настройках

**Решение:**
1. Убедитесь что файл `.cursor/mcp.json` существует
2. Проверьте что JSON валидный (нет лишних запятых)
3. Перезапустите Cursor полностью (Quit + Open)

### Проблема: Красная точка (ошибка)

**Проверьте логи:**
1. В Cursor: View → Output
2. Выберите в dropdown: **MCP: project-***
3. Посмотрите ошибки

**Частая причина:**
```bash
# Убедитесь что shadcn установлен
npm install -D shadcn@latest
```

### Проблема: Компоненты не устанавливаются

**Решение:**
1. Проверьте `components.json` в корне проекта
2. Убедитесь что пути правильные:
```json
{
  "style": "default",
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css"
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

---

## 📝 Примеры использования

### Пример 1: Добавление компонентов

**Команда в Cursor:**
```
Add button, card, and avatar components
```

**Что произойдет:**
- Создадутся файлы в `src/components/ui/`
- Установятся зависимости (если нужно)
- Обновится `components.json`

### Пример 2: Поиск компонентов

**Команда:**
```
Find all form-related components
```

**Результат:**
- form
- input
- label
- textarea
- select
- checkbox
- radio-group

### Пример 3: Создание с помощью компонентов

**Команда:**
```
Create a profile card using shadcn components with avatar, name, and bio
```

**Cursor создаст:**
```tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export function ProfileCard() {
  return (
    <Card>
      <CardHeader>
        <Avatar>
          <AvatarImage src="/avatar.jpg" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      </CardHeader>
      <CardContent>
        <h3>John Doe</h3>
        <p>Software Developer</p>
      </CardContent>
    </Card>
  )
}
```

---

## 🎯 Best Practices

### 1. Используйте конкретные запросы

❌ **Плохо:**
```
Add components
```

✅ **Хорошо:**
```
Add button, dialog, and card components to my project
```

### 2. Ищите примеры перед использованием

```
Show me examples of dialog usage
```

Затем:
```
Create a confirmation dialog using the example
```

### 3. Устанавливайте зависимости группами

```
Add all form components: input, label, textarea, select, checkbox
```

### 4. Проверяйте установленные компоненты

```bash
ls src/components/ui/
```

---

## 📦 Альтернативные реестры

### Если хотите использовать другие реестры:

Добавьте в `components.json`:

```json
{
  "registries": {
    "@shadcn": "https://ui.shadcn.com/r/{name}.json",
    "@acme": "https://registry.acme.com/r/{name}.json"
  }
}
```

Затем можете использовать:
```
Add @acme/custom-button component
Show components from @acme registry
```

---

## ✅ Checklist

После настройки проверьте:

- [ ] Cursor перезапущен
- [ ] Файл `.cursor/mcp.json` существует
- [ ] MCP сервер включен в Settings
- [ ] Зелёная точка рядом с shadcn
- [ ] Команда "Show shadcn components" работает
- [ ] Компоненты устанавливаются

---

## 🚀 Готово!

Теперь вы можете:

1. ✅ Искать компоненты через AI чат
2. ✅ Устанавливать компоненты одной командой
3. ✅ Создавать UI с помощью shadcn/ui
4. ✅ Просматривать примеры использования

**Попробуйте прямо сейчас:**
```
Show me all available shadcn components
```

---

## 📚 Дополнительные ресурсы

- [shadcn/ui Docs](https://ui.shadcn.com)
- [MCP Protocol](https://modelcontextprotocol.io)
- [Cursor MCP Docs](https://docs.cursor.com/en/context/mcp)

---

*Последнее обновление: 4 ноября 2025*  
*Статус: ✅ MCP конфигурация готова к использованию*

