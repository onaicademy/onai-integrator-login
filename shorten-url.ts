// Используем бесплатный сервис для сокращения ссылок
async function shortenUrl(longUrl: string) {
  try {
    // Вариант 1: is.gd (бесплатный, без API ключа)
    const response = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`);
    const data = await response.json();
    
    if (data.shorturl) {
      console.log('✅ Короткая ссылка:', data.shorturl);
      return data.shorturl;
    }
  } catch (e: any) {
    console.error('Ошибка is.gd:', e.message);
  }
  
  // Если не получилось - возвращаем оригинал
  return longUrl;
}

const BIZON_URL = 'https://start.bizon365.ru/room/196985/rejUuP-7-x';
console.log('🔗 Сокращаем ссылку на эфир...\n');
console.log('Оригинал:', BIZON_URL);
console.log('');

shortenUrl(BIZON_URL);
