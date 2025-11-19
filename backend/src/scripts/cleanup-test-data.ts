import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { adminSupabase } from '../config/supabase';

async function cleanup() {
  console.log('🧹 Cleaning up old test data...\n');
  
  // Delete test lessons
  const { data: deleted } = await adminSupabase
    .from('lessons')
    .delete()
    .like('title', '%RLS Test%')
    .select();
  
  console.log('✅ Deleted', deleted?.length || 0, 'test lessons');
  
  // Verify
  const { data: remaining } = await adminSupabase
    .from('lessons')
    .select('id, title')
    .like('title', '%RLS Test%');
  
  console.log('Remaining test lessons:', remaining?.length || 0);
}

cleanup();

