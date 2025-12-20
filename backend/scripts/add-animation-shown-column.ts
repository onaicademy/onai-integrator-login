// ✅ Use existing tripwire-db config
const { tripwirePool } = require('../src/config/tripwire-db');

async function addAnimationShownColumn() {
  try {
    console.log('🔧 Adding animation_shown column to module_unlocks...');
    
    await tripwirePool.query(`
      ALTER TABLE module_unlocks 
      ADD COLUMN IF NOT EXISTS animation_shown boolean DEFAULT false;
    `);
    
    console.log('✅ Column added successfully');
    
    // Verify
    const result = await tripwirePool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'module_unlocks' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Current module_unlocks schema:');
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name} (${row.data_type}) ${row.column_default || ''}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addAnimationShownColumn();
























