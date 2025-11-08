// 🔍 ДИАГНОСТИЧЕСКИЙ СКРИПТ ДЛЯ ПРОВЕРКИ АВТОРИЗАЦИИ
// 
// ИНСТРУКЦИЯ:
// 1. Открой https://localhost:8080/admin/students-activity
// 2. Нажми F12 → Console
// 3. Скопируй и вставь ВЕСЬ этот файл в консоль
// 4. Нажми Enter
// 5. Скопируй результат и отправь разработчику

console.log('═══════════════════════════════════════════════════');
console.log('🔍 ДИАГНОСТИКА АВТОРИЗАЦИИ');
console.log('═══════════════════════════════════════════════════\n');

// 1. Проверка localStorage
console.log('📦 1. ПРОВЕРКА localStorage:');
const localStorageKeys = Object.keys(localStorage);
console.log('   Всего ключей:', localStorageKeys.length);
const supabaseKeys = localStorageKeys.filter(k => k.includes('supabase'));
console.log('   Supabase ключи:', supabaseKeys);

if (supabaseKeys.length > 0) {
  supabaseKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      const parsed = JSON.parse(value);
      console.log(`   ${key}:`, parsed);
    } catch (e) {
      console.log(`   ${key}:`, localStorage.getItem(key));
    }
  });
} else {
  console.log('   ⚠️ Нет данных Supabase в localStorage');
}

// 2. Проверка sessionStorage
console.log('\n📦 2. ПРОВЕРКА sessionStorage:');
const sessionStorageKeys = Object.keys(sessionStorage);
console.log('   Всего ключей:', sessionStorageKeys.length);
sessionStorageKeys.forEach(key => {
  console.log(`   ${key}:`, sessionStorage.getItem(key));
});

// 3. Проверка текущей страницы
console.log('\n📄 3. ТЕКУЩАЯ СТРАНИЦА:');
console.log('   URL:', window.location.href);
console.log('   Pathname:', window.location.pathname);
console.log('   Hash:', window.location.hash);

// 4. Проверка Supabase сессии (если доступен supabase)
console.log('\n🔐 4. ПРОВЕРКА SUPABASE СЕССИИ:');

if (typeof supabase !== 'undefined') {
  console.log('   ✅ Supabase клиент доступен');
  
  supabase.auth.getSession()
    .then(({ data: { session }, error }) => {
      if (error) {
        console.log('   ❌ Ошибка getSession:', error);
      } else if (session) {
        console.log('   ✅ ЕСТЬ АКТИВНАЯ СЕССИЯ:');
        console.log('      User ID:', session.user.id);
        console.log('      Email:', session.user.email);
        console.log('      Role:', session.user.user_metadata?.role || session.user.raw_user_meta_data?.role);
        console.log('      Expires at:', new Date(session.expires_at * 1000).toLocaleString());
      } else {
        console.log('   ❌ НЕТ АКТИВНОЙ СЕССИИ');
      }
    });
  
  supabase.auth.getUser()
    .then(({ data: { user }, error }) => {
      if (error) {
        console.log('   ❌ Ошибка getUser:', error);
      } else if (user) {
        console.log('   ✅ ЕСТЬ ПОЛЬЗОВАТЕЛЬ:');
        console.log('      User ID:', user.id);
        console.log('      Email:', user.email);
        console.log('      user_metadata:', user.user_metadata);
        console.log('      raw_user_meta_data:', user.raw_user_meta_data);
      } else {
        console.log('   ❌ НЕТ ПОЛЬЗОВАТЕЛЯ');
      }
    });
} else {
  console.log('   ⚠️ Supabase клиент НЕ доступен в глобальной области');
  console.log('   Попробуй получить доступ через React DevTools');
}

// 5. Проверка cookies
console.log('\n🍪 5. ПРОВЕРКА COOKIES:');
const cookies = document.cookie.split(';');
console.log('   Всего cookies:', cookies.length);
const authCookies = cookies.filter(c => c.includes('auth') || c.includes('token') || c.includes('supabase'));
if (authCookies.length > 0) {
  console.log('   Auth-related cookies:', authCookies);
} else {
  console.log('   ⚠️ Нет auth-related cookies');
}

// 6. Рекомендации
console.log('\n═══════════════════════════════════════════════════');
console.log('💡 РЕКОМЕНДАЦИИ:');
console.log('═══════════════════════════════════════════════════');

if (supabaseKeys.length > 0) {
  console.log('✅ У вас ЕСТЬ сохраненная сессия Supabase');
  console.log('   Для теста без авторизации:');
  console.log('   1. Используйте режим инкогнито');
  console.log('   2. ИЛИ выполните: localStorage.clear(); sessionStorage.clear(); location.reload();');
} else {
  console.log('✅ У вас НЕТ сохраненной сессии');
  console.log('   Редирект на /login должен работать!');
}

console.log('\n═══════════════════════════════════════════════════\n');

