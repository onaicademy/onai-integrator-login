/**
 * FIX AMINA METADATA - Добавляем роль sales
 */
require('dotenv').config();

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL;
const SERVICE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY;

async function fixAminaMetadata() {
  try {
    console.log('🔍 Ищем Amina...');
    
    // Получаем список всех пользователей
    const listResponse = await fetch(`${TRIPWIRE_URL}/auth/v1/admin/users`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    });
    
    const { users } = await listResponse.json();
    console.log(`📊 Всего пользователей: ${users.length}`);
    
    users.forEach(u => {
      console.log(`  - ${u.email} (role: ${u.user_metadata?.role || 'none'})`);
    });
    
    // Находим Amina
    const amina = users.find(u => u.email === 'amina@onaiacademy.kz');
    
    if (!amina) {
      console.log('❌ Amina не найдена!');
      return;
    }
    
    console.log(`✅ Найдена Amina, ID: ${amina.id}`);
    console.log(`   Текущий metadata:`, amina.user_metadata);
    
    // Обновляем metadata
    console.log('🔄 Обновляем metadata...');
    
    const updateResponse = await fetch(`${TRIPWIRE_URL}/auth/v1/admin/users/${amina.id}`, {
      method: 'PUT',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_metadata: {
          ...amina.user_metadata,
          role: 'sales',
          full_name: 'Amina Sales Manager'
        }
      })
    });
    
    const updatedUser = await updateResponse.json();
    
    console.log('✅ Metadata обновлен!');
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Role: ${updatedUser.user_metadata?.role}`);
    console.log(`   Full metadata:`, updatedUser.user_metadata);
    
    // То же для Rakhat
    const rakhat = users.find(u => u.email === 'rakhat@onaiacademy.kz');
    if (rakhat) {
      console.log(`\n✅ Найден Rakhat, ID: ${rakhat.id}`);
      console.log('🔄 Обновляем metadata...');
      
      const rakhatUpdate = await fetch(`${TRIPWIRE_URL}/auth/v1/admin/users/${rakhat.id}`, {
        method: 'PUT',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_metadata: {
            ...rakhat.user_metadata,
            role: 'sales',
            full_name: 'Rakhat Sales Manager'
          }
        })
      });
      
      const updatedRakhat = await rakhatUpdate.json();
      console.log('✅ Rakhat metadata обновлен!');
      console.log(`   Role: ${updatedRakhat.user_metadata?.role}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

fixAminaMetadata();

