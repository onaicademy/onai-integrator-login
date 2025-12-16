/**
 * Отправить тестовый лид напрямую через Telegram API
 */

const TOKEN = '8275130868:AAGiH466WmyoUQUKN4VfwI3nM1qZAmlUJOQ';
const CHAT_ID = '-1003505301432';

const message = 
  `🎯 <b>НОВАЯ ЗАЯВКА - 🎓 ЭКСПРЕСС КУРС</b>\n\n` +
  `👤 <b>Имя:</b> 🔥 ТЕСТОВЫЙ ЛИД 🔥\n` +
  `📱 <b>Телефон:</b> +7 777 999 88 77\n` +
  `📧 <b>Email:</b> supertest@onai.kz\n` +
  `💳 <b>Способ оплаты:</b> 💳 Kaspi банк\n` +
  `📍 <b>Источник:</b> expresscourse\n\n` +
  `⏰ ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}`;

console.log('📱 Отправляю тестовый лид в Telegram...\n');

fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: CHAT_ID,
    text: message,
    parse_mode: 'HTML'
  })
})
.then(res => res.json())
.then(data => {
  if (data.ok) {
    console.log('✅ УСПЕХ! Тестовый лид отправлен в группу!');
    console.log('📊 Message ID:', data.result.message_id);
    console.log('\n🎉 ПРОВЕРЬ TELEGRAM ГРУППУ - ЛИД ДОЛЖЕН ПРИЙТИ!');
  } else {
    console.error('❌ Ошибка:', data.description);
  }
})
.catch(err => {
  console.error('❌ Ошибка отправки:', err.message);
});
