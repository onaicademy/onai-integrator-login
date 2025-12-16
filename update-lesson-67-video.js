const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.TRIPWIRE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function updateVideo() {
  try {
    const result = await pool.query(
      `UPDATE lessons 
       SET bunny_video_id = $1 
       WHERE id = 67 
       RETURNING id, title, bunny_video_id, duration_minutes`,
      ['62a18d70-0ac8-4894-bdaf-5e69445d34c8']
    );
    
    console.log('✅ Updated Lesson 67:');
    console.log(result.rows[0]);
    
    // Verify
    const verify = await pool.query('SELECT id, title, bunny_video_id FROM lessons WHERE id = 67');
    console.log('\n✅ Verified:');
    console.log(verify.rows[0]);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

updateVideo();
