# 🔴 Критическая ошибка: PDF парсинг не работает

**Проект:** onAI Academy Integrator  
**Дата:** 15 ноября 2025  
**Статус:** 🔴 КРИТИЧЕСКИЙ - PDF файлы не обрабатываются

---

## 📋 Краткое описание проблемы

При загрузке PDF файлов через веб-интерфейс возникает ошибка:

```
Failed to parse PDF: pdfParse is not a function! Type: object
```

**Файл не обрабатывается**, текст не извлекается, AI не получает содержимое документа.

---

## 🎯 Ожидаемое поведение

1. Пользователь загружает PDF файл через веб-интерфейс
2. Frontend отправляет файл на backend (`POST /api/files/process`)
3. Backend извлекает текст из PDF с помощью библиотеки `pdf-parse`
4. Текст сохраняется в Supabase Storage + Database
5. Текст передается в OpenAI Assistant для анализа
6. AI отвечает на основе содержимого документа

---

## ❌ Фактическое поведение

1. ✅ Файл загружается (98504 bytes)
2. ✅ FormData корректно передается на backend
3. ✅ Multer middleware получает файл
4. ❌ **PDF парсинг ЛОМАЕТСЯ** - `pdfParse is not a function`
5. ❌ Текст не извлекается
6. ❌ AI не получает содержимое документа

---

## 🔍 Технические детали

### Окружение

**Backend:**
- Node.js (version: требует проверки, минимум 20.16.0 или 22.3.0+)
- TypeScript 5.9.3
- Express 5.1.0
- Модульная система: **CommonJS** (`"module": "commonjs"`)
- Рабочая директория: `C:\onai-integrator-login\backend`

**Frontend:**
- Vite + React + TypeScript
- Port: 8080
- Рабочая директория: `C:\onai-integrator-login`

**Библиотека для PDF:**
- Пакет: `pdf-parse`
- Версия: **2.4.5** (НОВАЯ версия с переписанной архитектурой)
- Место установки: `backend/node_modules/pdf-parse`

---

## 📦 Структура экспорта pdf-parse@2.4.5

Из `backend/node_modules/pdf-parse/package.json`:

```json
{
  "name": "pdf-parse",
  "version": "2.4.5",
  "type": "module",
  "main": "dist/pdf-parse/cjs/index.cjs",
  "exports": {
    ".": {
      "require": {
        "types": "./dist/pdf-parse/cjs/index.d.cts",
        "default": "./dist/pdf-parse/cjs/index.cjs"
      }
    },
    "./node": {
      "require": {
        "types": "./dist/node/cjs/index.d.cts",
        "default": "./dist/node/cjs/index.cjs"
      }
    },
    "./worker": {
      "require": {
        "types": "./dist/worker/cjs/index.d.cts",
        "default": "./dist/worker/cjs/index.cjs"
      }
    }
  },
  "engines": {
    "node": ">=20.16.0 <21 || >=22.3.0"
  }
}
```

**Ключевые моменты:**
1. `"type": "module"` - библиотека является ES Module
2. Есть 3 entry points: `.` (основной), `./node`, `./worker`
3. Требует Node.js >= 20.16.0 или >= 22.3.0

---

## 🛠 История попыток решения

### Попытка 1: ES Module import

**Код:**
```typescript
import pdfParse from 'pdf-parse';

const data = await pdfParse(buffer);
```

**Результат:** ❌ `pdfParse is not a function`

**Причина:** Конфликт ES Module в CommonJS проекте (`"module": "commonjs"`)

---

### Попытка 2: CommonJS require

**Код:**
```typescript
const pdfParse = require('pdf-parse');

const data = await pdfParse(buffer);
```

**Результат:** ❌ `pdfParse is not a function`

**Лог ошибки:**
```
Type: undefined
Keys: AbortException, FormatError, InvalidPDFException, Line, 
      LineDirection, LineStore, PDFParser, PasswordException, 
      Point, Rectangle, ResponseException, Shape, Table, 
      UnknownErrorException, VerbosityLevel, getException
```

**Причина:** Модуль экспортирует **объект с классами**, а не функцию парсинга

---

### Попытка 3: Динамический import

**Код:**
```typescript
const pdfParseModule = await import('pdf-parse');
const pdfParse = pdfParseModule.default || pdfParseModule;

const data = await pdfParse(buffer);
```

**Результат:** ❌ `pdfParse is not a function`

**Причина:** `await import()` нестабильно работает в CommonJS окружении

---

### Попытка 4: CommonJS с проверкой .default

**Код:**
```typescript
const pdfParseModule = require('pdf-parse');
const pdfParse = typeof pdfParseModule === 'function' 
  ? pdfParseModule 
  : pdfParseModule.default;

const data = await pdfParse(buffer);
```

**Результат:** ❌ `pdfParse is not a function`

**Причина:** `pdfParseModule.default` тоже не содержит функцию

---

### Попытка 5: Использование entry point ./node

**Код:**
```typescript
const pdfParseModule = require('pdf-parse/node');
const pdfParse = pdfParseModule.default || pdfParseModule;

const data = await pdfParse(buffer);
```

**Результат:** ❌ `pdfParse is not a function! Type: object`

**Лог:**
```
❌ API Error: Failed to parse PDF: pdfParse is not a function! Type: object
```

**Причина:** Даже Node.js entry point возвращает объект, а не функцию

---

## 📝 Текущий код

### Файл: `backend/src/services/fileProcessingService.ts`

```typescript
import * as mammoth from 'mammoth';

// pdf-parse v2.4.5 имеет отдельный entry point для Node.js!
const pdfParseModule = require('pdf-parse/node');
const pdfParse = pdfParseModule.default || pdfParseModule;

/**
 * Извлечь текст из PDF
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    console.log('[FileProcessing] Извлекаем текст из PDF...');
    console.log('[FileProcessing] Buffer size:', buffer.length, 'bytes');
    console.log('[FileProcessing] 📦 pdfParse модуль:', typeof pdfParse);
    
    if (buffer.length === 0) {
      throw new Error('PDF buffer is empty!');
    }
    
    if (typeof pdfParse !== 'function') {
      console.error('[FileProcessing] ❌ pdfParse не функция!');
      console.error('[FileProcessing] Type:', typeof pdfParse);
      console.error('[FileProcessing] Module keys:', Object.keys(pdfParseModule).join(', '));
      throw new Error(`pdfParse is not a function! Type: ${typeof pdfParse}`);
    }
    
    const data = await pdfParse(buffer);
    console.log(`[FileProcessing] ✅ Извлечено ${data.text.length} символов из PDF`);
    return data.text;
  } catch (error: any) {
    console.error('[FileProcessing] ❌ КРИТИЧЕСКАЯ ОШИБКА парсинга PDF:');
    console.error('[FileProcessing] Тип ошибки:', error.constructor.name);
    console.error('[FileProcessing] Сообщение:', error.message);
    console.error('[FileProcessing] Стек:', error.stack);
    console.error('[FileProcessing] Buffer размер:', buffer?.length || 0);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Извлечь текст из DOCX
 */
export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    console.log('[FileProcessing] Извлекаем текст из DOCX...');
    console.log('[FileProcessing] Buffer size:', buffer.length, 'bytes');
    
    if (buffer.length === 0) {
      throw new Error('DOCX buffer is empty!');
    }
    
    const result = await mammoth.extractRawText({ buffer });
    console.log(`[FileProcessing] ✅ Извлечено ${result.value.length} символов из DOCX`);
    return result.value;
  } catch (error: any) {
    console.error('[FileProcessing] ❌ КРИТИЧЕСКАЯ ОШИБКА парсинга DOCX:');
    console.error('[FileProcessing] Тип ошибки:', error.constructor.name);
    console.error('[FileProcessing] Сообщение:', error.message);
    console.error('[FileProcessing] Стек:', error.stack);
    console.error('[FileProcessing] Buffer размер:', buffer?.length || 0);
    throw new Error(`Failed to parse DOCX: ${error.message}`);
  }
}
```

### Файл: `backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

### Файл: `backend/package.json`

```json
{
  "name": "backend",
  "version": "1.0.0",
  "type": "commonjs",
  "dependencies": {
    "@supabase/supabase-js": "^2.81.1",
    "@types/multer": "^2.0.0",
    "cors": "^2.8.5",
    "dotenv": "^17.2.3",
    "express": "^5.1.0",
    "express-validator": "^7.3.0",
    "helmet": "^8.1.0",
    "jsonwebtoken": "^9.0.2",
    "mammoth": "^1.11.0",
    "multer": "^2.0.2",
    "openai": "^4.28.0",
    "pdf-parse": "^2.4.5"
  },
  "devDependencies": {
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.5",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^24.10.1",
    "nodemon": "^3.1.11",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.3"
  }
}
```

---

## 📊 Логи последней попытки

### Frontend console (браузер)

```
📎 [processFile] Получен файл: {name: 'Квитанция.pdf', size: 98504, type: 'application/pdf'}
📎 [processFile] FormData создан, файл добавлен
📎 [processFile] Отправляем на Backend: /api/files/process
🌐 API Request: POST http://localhost:3000/api/files/process

❌ POST http://localhost:3000/api/files/process 500 (Internal Server Error)
❌ API Error: Failed to parse PDF: pdfParse is not a function! Type: object
{error: 'Failed to parse PDF: pdfParse is not a function! Type: object', type: 'Error'}

❌ API Request Failed: POST http://localhost:3000/api/files/process
Error: Failed to parse PDF: pdfParse is not a function! Type: object

❌ Ошибка обработки файла: Failed to parse PDF: pdfParse is not a function! Type: object
❌ Не удалось обработать файл Квитанция.pdf: 
Error: Не удалось обработать файл: Failed to parse PDF: pdfParse is not a function! Type: object
```

### Backend logs (ожидаемые)

```
[FileController] 🔍 Обработка файла (НОВАЯ АРХИТЕКТУРА)...
[FileController] 📄 Файл получен: {filename: 'Квитанция.pdf', mimetype: 'application/pdf', size: 98504}
[FileController] 📄 Извлекаем текст из PDF...
[FileProcessing] Извлекаем текст из PDF...
[FileProcessing] Buffer size: 98504 bytes
[FileProcessing] 📦 pdfParse модуль: object  ← ПРОБЛЕМА ЗДЕСЬ!
[FileProcessing] ❌ pdfParse не функция!
[FileProcessing] Type: object
[FileProcessing] Module keys: (нужны ключи для диагностики)
[FileProcessing] ❌ КРИТИЧЕСКАЯ ОШИБКА парсинга PDF:
[FileProcessing] Тип ошибки: Error
[FileProcessing] Сообщение: pdfParse is not a function! Type: object
```

---

## 🔬 Диагностика

### Что нужно проверить

1. **Версия Node.js:**
```bash
node --version
```
Требуется: `>= 20.16.0` или `>= 22.3.0`

2. **Структура модуля pdf-parse:**
```bash
cd backend/node_modules/pdf-parse/dist/node/cjs
ls -la
cat index.cjs
```
Проверить, что экспортируется в `index.cjs`

3. **Логи импорта:**
Добавить в `fileProcessingService.ts`:
```typescript
const pdfParseModule = require('pdf-parse/node');
console.log('pdfParseModule type:', typeof pdfParseModule);
console.log('pdfParseModule keys:', Object.keys(pdfParseModule));
console.log('pdfParseModule.default type:', typeof pdfParseModule.default);
console.log('pdfParseModule.default keys:', pdfParseModule.default ? Object.keys(pdfParseModule.default) : 'undefined');
```

4. **Типы TypeScript:**
```bash
cd backend
npx tsc --showConfig
```

---

## 💡 Возможные решения

### Решение 1: Откатить версию pdf-parse

**Старая версия `pdf-parse@1.1.1` работала по-другому:**

```bash
cd backend
npm uninstall pdf-parse
npm install pdf-parse@1.1.1
```

**Проверить синтаксис для старой версии:**
```typescript
const pdfParse = require('pdf-parse');
const data = await pdfParse(buffer);
console.log(data.text);
```

---

### Решение 2: Использовать альтернативную библиотеку

#### Вариант A: `pdf2json`

```bash
npm install pdf2json
```

```typescript
import PDFParser from 'pdf2json';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      const text = pdfParser.getRawTextContent();
      resolve(text);
    });
    
    pdfParser.on('pdfParser_dataError', (error: any) => {
      reject(error);
    });
    
    pdfParser.parseBuffer(buffer);
  });
}
```

#### Вариант B: `pdfjs-dist` (официальная библиотека PDF.js от Mozilla)

```bash
npm install pdfjs-dist
```

```typescript
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
}
```

#### Вариант C: `pdf-lib`

```bash
npm install pdf-lib
```

```typescript
import { PDFDocument } from 'pdf-lib';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const pdfDoc = await PDFDocument.load(buffer);
  const pages = pdfDoc.getPages();
  
  let fullText = '';
  
  for (const page of pages) {
    const { width, height } = page.getSize();
    const textContent = await page.getTextContent();
    fullText += textContent;
  }
  
  return fullText;
}
```

**Примечание:** `pdf-lib` больше подходит для создания/редактирования PDF, а не для извлечения текста.

---

### Решение 3: Использовать внешний инструмент через child_process

#### Вариант A: `pdftk` (если установлен в системе)

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const tempFilePath = path.join(__dirname, `temp_${Date.now()}.pdf`);
  const outputPath = path.join(__dirname, `temp_${Date.now()}.txt`);
  
  try {
    // Сохраняем буфер во временный файл
    await fs.promises.writeFile(tempFilePath, buffer);
    
    // Используем pdftk для извлечения текста
    await execAsync(`pdftk ${tempFilePath} output ${outputPath} uncompress`);
    
    // Читаем результат
    const text = await fs.promises.readFile(outputPath, 'utf-8');
    
    // Удаляем временные файлы
    await fs.promises.unlink(tempFilePath);
    await fs.promises.unlink(outputPath);
    
    return text;
  } catch (error) {
    // Очистка при ошибке
    if (fs.existsSync(tempFilePath)) await fs.promises.unlink(tempFilePath);
    if (fs.existsSync(outputPath)) await fs.promises.unlink(outputPath);
    throw error;
  }
}
```

#### Вариант B: Python script с `PyPDF2`

**Создать:** `backend/scripts/extract_pdf.py`

```python
import sys
import PyPDF2

def extract_text(pdf_path):
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ''
        for page in reader.pages:
            text += page.extract_text()
    return text

if __name__ == '__main__':
    pdf_path = sys.argv[1]
    text = extract_text(pdf_path)
    print(text)
```

**В TypeScript:**

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const tempFilePath = path.join(__dirname, `temp_${Date.now()}.pdf`);
  
  try {
    await fs.promises.writeFile(tempFilePath, buffer);
    
    const scriptPath = path.join(__dirname, '../../scripts/extract_pdf.py');
    const { stdout } = await execAsync(`python ${scriptPath} ${tempFilePath}`);
    
    await fs.promises.unlink(tempFilePath);
    
    return stdout;
  } catch (error) {
    if (fs.existsSync(tempFilePath)) await fs.promises.unlink(tempFilePath);
    throw error;
  }
}
```

---

### Решение 4: Исследовать структуру pdf-parse@2.4.5

**Нужно понять, как ПРАВИЛЬНО использовать новую версию:**

1. **Проверить документацию:**
   - GitHub: https://github.com/mehmet-kozan/pdf-parse
   - Docs: https://mehmet-kozan.github.io/pdf-parse/

2. **Посмотреть примеры в репозитории:**
```bash
cd backend/node_modules/pdf-parse
cat README.md
# Или
cd examples
ls -la
```

3. **Проверить TypeScript типы:**
```bash
cd backend/node_modules/pdf-parse/dist/node/cjs
cat index.d.cts
```

4. **Добавить детальное логирование:**
```typescript
const pdfParseModule = require('pdf-parse/node');

console.log('=== ДИАГНОСТИКА pdf-parse ===');
console.log('Module type:', typeof pdfParseModule);
console.log('Module keys:', Object.keys(pdfParseModule));
console.log('Module.default:', pdfParseModule.default);
console.log('Module.default type:', typeof pdfParseModule.default);

if (pdfParseModule.default) {
  console.log('Module.default keys:', Object.keys(pdfParseModule.default));
}

// Попробовать все возможные варианты
const variants = [
  pdfParseModule,
  pdfParseModule.default,
  pdfParseModule.parse,
  pdfParseModule.PDFParser,
  pdfParseModule.extractText,
];

for (let i = 0; i < variants.length; i++) {
  console.log(`Вариант ${i}:`, typeof variants[i]);
}
console.log('=== КОНЕЦ ДИАГНОСТИКИ ===');
```

---

### Решение 5: Переписать проект на ES Modules

**Если pdf-parse v2.4.5 работает ТОЛЬКО как ES Module:**

1. **Изменить `package.json`:**
```json
{
  "type": "module"
}
```

2. **Изменить `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "module": "ES2020",
    "target": "ES2020"
  }
}
```

3. **Переименовать файлы:**
- `server.ts` → `server.mts`
- Или добавить расширения `.js` во все импорты

4. **Изменить импорты:**
```typescript
import pdfParse from 'pdf-parse/node';

const data = await pdfParse(buffer);
```

**⚠️ Это масштабная переделка проекта!**

---

## 🎯 Рекомендуемый план действий

### Шаг 1: Диагностика (5 минут)

```bash
cd C:\onai-integrator-login\backend

# Проверить версию Node.js
node --version

# Добавить детальное логирование в fileProcessingService.ts
# (код из "Решение 4" выше)

# Перезапустить backend
npm run dev
```

Загрузить PDF и скопировать **ВСЕ логи** из консоли backend.

---

### Шаг 2: Быстрое решение (10 минут)

**Откатить на старую версию pdf-parse:**

```bash
cd C:\onai-integrator-login\backend
npm uninstall pdf-parse
npm install pdf-parse@1.1.1
```

**Изменить код:**
```typescript
const pdfParse = require('pdf-parse');

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}
```

Перезапустить и протестировать.

---

### Шаг 3: Альтернативное решение (30 минут)

**Использовать `pdfjs-dist` (надежная библиотека от Mozilla):**

```bash
npm install pdfjs-dist
```

```typescript
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
}
```

---

## 📞 Контакты для поддержки

**Документация pdf-parse:**
- GitHub: https://github.com/mehmet-kozan/pdf-parse
- Issues: https://github.com/mehmet-kozan/pdf-parse/issues
- Docs: https://mehmet-kozan.github.io/pdf-parse/

**Альтернативы:**
- pdfjs-dist: https://github.com/mozilla/pdf.js
- pdf2json: https://github.com/modesty/pdf2json
- pdf-lib: https://pdf-lib.js.org/

---

## 📎 Дополнительные материалы

### Структура проекта

```
C:\onai-integrator-login\
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   └── fileProcessingService.ts  ← ПРОБЛЕМА ЗДЕСЬ
│   │   ├── controllers/
│   │   │   └── fileController.ts
│   │   ├── routes/
│   │   │   └── files.ts
│   │   └── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── node_modules/
│       └── pdf-parse/  ← ВЕРСИЯ 2.4.5
├── src/
│   ├── lib/
│   │   └── openai-assistant.ts
│   └── components/
│       └── profile/v2/AIChatDialog.tsx
└── package.json
```

### Важные файлы для специалиста

1. `backend/src/services/fileProcessingService.ts` - логика парсинга PDF
2. `backend/package.json` - зависимости
3. `backend/tsconfig.json` - конфигурация TypeScript
4. `backend/node_modules/pdf-parse/package.json` - структура библиотеки

---

## ✅ Чеклист для специалиста

- [ ] Проверить версию Node.js (`node --version`)
- [ ] Добавить детальное логирование импорта pdf-parse
- [ ] Проверить структуру экспорта модуля
- [ ] Попробовать откатить на `pdf-parse@1.1.1`
- [ ] Если не помогло - заменить на `pdfjs-dist`
- [ ] Протестировать загрузку PDF файла
- [ ] Убедиться, что текст извлекается
- [ ] Убедиться, что AI получает содержимое документа

---

**Дата создания отчета:** 15.11.2025  
**Автор:** AI Assistant (Claude Sonnet 4.5)  
**Для вопросов:** Передать этот файл специалисту

---

## 🔥 КРИТИЧНО: Проект заблокирован

**PDF загрузка - ключевая функция приложения.**  
**Без работающего парсинга проект не функционален.**  

**Требуется срочное решение!**

