/**
 * Скрипт для автоматического добавления логирования во все сервисы интеграций
 *
 * Модифицирует файлы:
 * - amoCrmService.ts
 * - emailService.ts
 * - telegramService.ts
 * - mobizon.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const SERVICES_DIR = path.join(__dirname, '..', 'src', 'services');

console.log('🚀 Начинаем добавление логирования в сервисы интеграций...\n');

// ========================================
// 1. AmoCRM Service
// ========================================
console.log('📝 Обрабатываем amoCrmService.ts...');

const amoCrmPath = path.join(SERVICES_DIR, 'amoCrmService.ts');
let amoCrmContent = fs.readFileSync(amoCrmPath, 'utf-8');

// Добавляем импорт IntegrationLogger (если его нет)
if (!amoCrmContent.includes('IntegrationLogger')) {
  const importStatement = "import { IntegrationLogger } from './integrationLogger';\n";
  const importInsertPos = amoCrmContent.indexOf("import { landingSupabase }") + "import { landingSupabase } from '../config/supabase-landing';".length + 1;
  amoCrmContent = amoCrmContent.slice(0, importInsertPos) + importStatement + amoCrmContent.slice(importInsertPos);
  console.log('  ✅ Добавлен импорт IntegrationLogger');
}

// Оборачиваем onLessonCompleted в IntegrationLogger.track
if (amoCrmContent.includes('export async function onLessonCompleted') && !amoCrmContent.includes('IntegrationLogger.track')) {
  // Это сложная замена, делаем вручную через patch файл
  console.log('  ⚠️  onLessonCompleted требует ручного обновления (см. amoCrmService-with-logging.patch.ts)');
} else if (amoCrmContent.includes('IntegrationLogger.track')) {
  console.log('  ✅ Логирование уже добавлено');
}

fs.writeFileSync(amoCrmPath, amoCrmContent);
console.log('  ✅ amoCrmService.ts обновлён\n');

// ========================================
// 2. Email Service
// ========================================
console.log('📝 Обрабатываем emailService.ts...');

const emailServicePath = path.join(SERVICES_DIR, 'emailService.ts');
let emailContent = fs.readFileSync(emailServicePath, 'utf-8');

// Добавляем импорт
if (!emailContent.includes('IntegrationLogger')) {
  // Найти первый import
  const firstImportIndex = emailContent.indexOf('import');
  const firstImportEnd = emailContent.indexOf(';', firstImportIndex) + 1;

  const importStatement = "\nimport { IntegrationLogger } from './integrationLogger';";
  emailContent = emailContent.slice(0, firstImportEnd) + importStatement + emailContent.slice(firstImportEnd);
  console.log('  ✅ Добавлен импорт IntegrationLogger');
}

fs.writeFileSync(emailServicePath, emailContent);
console.log('  ✅ emailService.ts обновлён\n');

// ========================================
// 3. Telegram Service
// ========================================
console.log('📝 Обрабатываем telegramService.ts...');

const telegramServicePath = path.join(SERVICES_DIR, 'telegramService.ts');

if (fs.existsSync(telegramServicePath)) {
  let telegramContent = fs.readFileSync(telegramServicePath, 'utf-8');

  // Добавляем импорт
  if (!telegramContent.includes('IntegrationLogger')) {
    const firstImportIndex = telegramContent.indexOf('import');
    const firstImportEnd = telegramContent.indexOf(';', firstImportIndex) + 1;

    const importStatement = "\nimport { IntegrationLogger } from './integrationLogger';";
    telegramContent = telegramContent.slice(0, firstImportEnd) + importStatement + telegramContent.slice(firstImportEnd);
    console.log('  ✅ Добавлен импорт IntegrationLogger');
  }

  fs.writeFileSync(telegramServicePath, telegramContent);
  console.log('  ✅ telegramService.ts обновлён\n');
} else {
  console.log('  ⚠️  telegramService.ts не найден\n');
}

// ========================================
// 4. Mobizon Service
// ========================================
console.log('📝 Обрабатываем mobizon.ts...');

const mobizonPath = path.join(SERVICES_DIR, 'mobizon.ts');

if (fs.existsSync(mobizonPath)) {
  let mobizonContent = fs.readFileSync(mobizonPath, 'utf-8');

  // Добавляем импорт
  if (!mobizonContent.includes('IntegrationLogger')) {
    const firstImportIndex = mobizonContent.indexOf('import');
    if (firstImportIndex >= 0) {
      const firstImportEnd = mobizonContent.indexOf(';', firstImportIndex) + 1;
      const importStatement = "\nimport { IntegrationLogger } from './integrationLogger';";
      mobizonContent = mobizonContent.slice(0, firstImportEnd) + importStatement + mobizonContent.slice(firstImportEnd);
      console.log('  ✅ Добавлен импорт IntegrationLogger');
    }
  }

  fs.writeFileSync(mobizonPath, mobizonContent);
  console.log('  ✅ mobizon.ts обновлён\n');
} else {
  console.log('  ⚠️  mobizon.ts не найден\n');
}

// ========================================
// ФИНАЛЬНЫЙ ОТЧЁТ
// ========================================
console.log('\n✅ ГОТОВО!\n');
console.log('📋 Следующие шаги:');
console.log('1. Проверьте изменения: git diff backend/src/services/');
console.log('2. Примените патчи вручную из файлов *-with-logging.patch.ts');
console.log('3. Соберите проект: npm run build');
console.log('4. Задеплойте на production');
console.log('\n🔗 Документация:');
console.log('- IntegrationLogger API: backend/src/services/integrationLogger.ts');
console.log('- Примеры использования: backend/src/services/*-with-logging.patch.ts');
