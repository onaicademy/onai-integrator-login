# PDF TO IMAGE CONVERSION WITHOUT NATIVE DEPENDENCIES

## 🎯 ПРОБЛЕМА:

**Контекст:**
- Node.js backend (Express + TypeScript)
- Нужна автоматическая конвертация PDF → PNG/JPG
- Для анализа через Groq Vision API (Llama 4 Scout)

**Текущая ситуация:**
- Попробовал `pdfjs-dist` + `canvas` → **НЕ РАБОТАЕТ**
- `canvas` требует нативные библиотеки (Cairo, Pango, libjpeg)
- Не компилируется на macOS без `brew install cairo pango`
- В Docker может работать, но хотим SIMPLER решение

---

## ❓ ВОПРОСЫ ДЛЯ PERPLEXITY:

### 1️⃣ **Pure JavaScript/WASM решения:**

> Какие существуют **pure JavaScript** или **WebAssembly** библиотеки для конвертации PDF → Image в Node.js, которые НЕ требуют нативных зависимостей (Cairo, Pango)?
>
> Требования:
> - ✅ Работает из коробки (`npm install` без дополнительных системных пакетов)
> - ✅ Поддерживает отсканированные PDF (с изображениями внутри)
> - ✅ Может рендерить PDF страницу в PNG/JPEG Buffer
> - ✅ Работает в production (не только в браузере)
>
> Рассмотри варианты:
> - `pdf.js` (Mozilla) - есть ли WASM версия для Node.js?
> - `pdfjs-serverless` или аналоги
> - Другие WASM-based решения

---

### 2️⃣ **Cloud/API решения (без хостинга зависимостей):**

> Какие существуют **бесплатные или очень дешевые API** для конвертации PDF → Image, которые можно интегрировать в Node.js backend?
>
> Требования:
> - ✅ REST API (можно отправить PDF Buffer → получить Image URL или Base64)
> - ✅ Дешево или бесплатно (до 1000 конвертаций/месяц)
> - ✅ Быстро (< 2 секунды на страницу)
> - ✅ Поддержка отсканированных PDF
>
> Рассмотри:
> - Cloudinary (есть ли PDF→Image?)
> - imgproxy
> - pdf.co
> - ConvertAPI
> - Adobe PDF Services API (есть ли free tier?)
> - Другие сервисы

---

### 3️⃣ **Docker-based решения (если нет другого выхода):**

> Если pure JS/WASM нет, какой **минимальный Docker image** можно использовать для PDF→Image конвертации?
>
> Требования:
> - ✅ Минимальный размер образа (Alpine Linux базу?)
> - ✅ Предустановлены: Poppler (pdftoppm) или ImageMagick + Ghostscript
> - ✅ Можно запустить как microservice рядом с основным backend
> - ✅ Примеры готовых образов на Docker Hub
>
> Рассмотри:
> - `jplatform/pdftoimage` или аналоги
> - Alpine + Poppler (`pdftoppm`)
> - Готовые решения с REST API внутри Docker

---

### 4️⃣ **Альтернативные архитектуры:**

> Может быть есть **другой подход** к проблеме "бот не видит отсканированные PDF"?
>
> Идеи:
> - Использовать Groq Vision API напрямую с PDF (если поддерживает?)
> - Конвертировать PDF → Base64 и отправить как "документ" (есть ли такой API у Groq?)
> - Использовать специализированные OCR API (Tesseract.js, Google Vision OCR, Azure Form Recognizer)
> - Client-side конвертация (в браузере через pdf.js → Canvas → отправка Image на сервер)

---

## 🎯 ИТОГОВЫЙ ЗАПРОС ДЛЯ PERPLEXITY:

```
I need to convert PDF files to images (PNG/JPEG) in a Node.js Express backend for AI Vision API analysis. 

PROBLEM:
- Tried pdfjs-dist + canvas → requires native dependencies (Cairo, Pango)
- Cannot use native modules that need system packages (want clean npm install)

REQUIREMENTS:
1. Convert PDF page (especially scanned PDFs with embedded images) to PNG/JPEG Buffer
2. Work in Node.js production environment
3. Fast (<2 seconds per page)
4. Support for PDFs that contain images (not just text)

QUESTIONS:
1. What are the best **pure JavaScript or WebAssembly** libraries for PDF→Image in Node.js that DON'T require native dependencies?
   - Is there a serverless/WASM version of Mozilla's pdf.js?
   - Are there other WASM-based PDF renderers?

2. What are good **free/cheap PDF→Image cloud APIs** (<1000 conversions/month)?
   - Cloudinary, imgproxy, pdf.co, ConvertAPI, Adobe PDF Services?
   - Which ones are reliable and fast?

3. If no pure JS solution exists, what's the **minimal Docker image** approach?
   - Alpine + Poppler (pdftoppm)?
   - Ready-made Docker images on Docker Hub?

4. Are there **alternative approaches** to handle scanned PDFs in AI chat?
   - Does Groq Vision API support PDF directly?
   - OCR APIs (Tesseract.js, Google Vision, Azure)?
   - Client-side conversion (browser pdf.js → Canvas → upload image)?

CONTEXT:
- Backend: Node.js 22, Express, TypeScript
- AI: Groq Vision API (Llama 4 Scout)
- Use case: Users upload PDFs to AI chatbot, bot needs to read them
- Current workaround: Ask users to upload screenshots instead

Please provide specific library names, code examples if possible, and pros/cons of each approach.
```

---

## 📊 СРАВНИТЕЛЬНАЯ ТАБЛИЦА (заполню после ответа):

| Решение | Простота | Стоимость | Скорость | Native Deps | Рейтинг |
|---------|----------|-----------|----------|-------------|---------|
| ??? | ??? | ??? | ??? | ??? | ??? |

---

## 💡 ФИНАЛЬНОЕ РЕШЕНИЕ (выберу после исследования):

> TODO: Выбрать оптимальное решение из вариантов Perplexity
