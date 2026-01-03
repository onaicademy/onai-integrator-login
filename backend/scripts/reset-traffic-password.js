const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabase = createClient(
  'https://oetodaexnjcunklkdlkv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldG9kYWV4bmpjdW5rbGtkbGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MTg3MzYsImV4cCI6MjA1MDA5NDczNn0.bvl8tIXBwbPOZ5Ls3xHgCcCajcB06OyBEJqj_L7Vze8'
);

async function updatePassword() {
  // List all users to find kenesary
  const { data: allUsers, error: listError } = await supabase
    .from('traffic_users')
    .select('id, email, full_name, team_name');
  
  if (listError) {
    console.log('List error:', listError.message);
    return;
  }
  
  console.log('All traffic_users:');
  allUsers.forEach(u => console.log(`  - ${u.email} (${u.full_name || 'no name'}) Team: ${u.team_name || 'none'}`));
  
  // Find kenesary
  const user = allUsers.find(u => u.email && u.email.toLowerCase().includes('kenesary'));
  if (!user) {
    console.log('\nUser kenesary not found!');
    return;
  }
  
  console.log('\nFound user:', user.email, user.full_name);
  
  // Update password
  const newPassword = 'Traffic2025!';
  const newHash = await bcrypt.hash(newPassword, 10);
  
  const { error: updateError } = await supabase
    .from('traffic_users')
    .update({ password_hash: newHash })
    .eq('id', user.id);
  
  if (updateError) {
    console.log('Update error:', updateError.message);
    return;
  }
  
  console.log('\n✅ PASSWORD UPDATED SUCCESSFULLY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Email:', user.email);
  console.log('New Password:', newPassword);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nLogin URL: https://onai.academy/traffic');
}

updatePassword().catch(console.error);
