require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.TRIPWIRE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createUsersTable() {
  try {
    console.log('🚀 Creating users table in Tripwire DB...\n');
    
    const sql = `
      -- Создаем минимальную таблицу users для JOIN'ов
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        role TEXT DEFAULT 'student',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Индексы
      CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

      -- RLS
      ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "api_access_users" ON public.users FOR ALL USING (true);

      -- Права
      GRANT ALL PRIVILEGES ON public.users TO anon, authenticated, service_role, postgres;

      -- Вставляем существующих пользователей из auth.users
      INSERT INTO public.users (id, email, full_name, role)
      SELECT 
        id,
        email,
        COALESCE(raw_user_meta_data->>'full_name', email) as full_name,
        COALESCE(raw_user_meta_data->>'role', 'student') as role
      FROM auth.users
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        updated_at = NOW();
    `;
    
    console.log('🔄 Executing...');
    await pool.query(sql);
    
    console.log('✅ Users table created!\n');
    
    // Проверяем
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM public.users;
    `);
    
    console.log(`✅ Users в таблице: ${result.rows[0].count}\n`);
    
    await pool.end();
    console.log('🎉 SUCCESS!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

createUsersTable();

