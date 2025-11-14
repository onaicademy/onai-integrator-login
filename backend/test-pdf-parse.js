/**
 * Тестовый скрипт для проверки pdf-parse
 * Запуск: node test-pdf-parse.js
 */

const fs = require('fs');
const pdfParse = require('pdf-parse');

console.log('🔍 Тестируем pdf-parse...\n');

// Укажи путь к тестовому PDF файлу
const testPdfPath = './test.pdf'; // Замени на реальный путь к твоему PDF

if (!fs.existsSync(testPdfPath)) {
  console.error('❌ ОШИБКА: Файл не найден:', testPdfPath);
  console.log('\n📝 Инструкция:');
  console.log('1. Положи тестовый PDF файл в папку backend/');
  console.log('2. Переименуй его в "test.pdf"');
  console.log('3. Запусти: node test-pdf-parse.js');
  process.exit(1);
}

console.log('📄 Читаем файл:', testPdfPath);
const dataBuffer = fs.readFileSync(testPdfPath);
console.log('📊 Размер файла:', dataBuffer.length, 'байт');

console.log('\n🔄 Парсим PDF через pdf-parse...\n');

pdfParse(dataBuffer)
  .then(data => {
    console.log('✅ PDF УСПЕШНО РАСПОЗНАН!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Статистика:');
    console.log('  - Страниц:', data.numpages);
    console.log('  - Символов:', data.text.length);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📝 Содержимое (первые 500 символов):\n');
    console.log(data.text.substring(0, 500));
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ pdf-parse РАБОТАЕТ КОРРЕКТНО!');
  })
  .catch(error => {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ОШИБКА ПАРСИНГА PDF:');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Тип ошибки:', error.constructor.name);
    console.error('Сообщение:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
    console.log('1. PDF файл защищён паролем');
    console.log('2. PDF файл повреждён');
    console.log('3. PDF не содержит текст (только изображения)');
    console.log('4. Неподдерживаемая версия PDF');
    console.log('5. Проблема с кодировкой');
    
    process.exit(1);
  });

