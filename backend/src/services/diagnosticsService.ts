import { supabase } from '../config/supabase';

export interface TableCheck {
  name: string;
  exists: boolean;
  count: number;
  error?: string;
}

export async function checkDatabase(): Promise<{
  connection: 'connected' | 'error';
  tables: TableCheck[];
}> {
  try {
    const tablesToCheck = [
      'profiles',
      'student_profiles',
      'courses',
      'modules',
      'lessons',
      'achievements',
      'user_achievements',
      'progress',
      'user_activity',
      'ai_curator_chats',
      'chat_messages',
    ];
    
    const tables: TableCheck[] = [];

    for (const tableName of tablesToCheck) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          tables.push({
            name: tableName,
            exists: false,
            count: 0,
            error: error.message
          });
        } else {
          tables.push({
            name: tableName,
            exists: true,
            count: count || 0
          });
        }
      } catch (tableError: any) {
        tables.push({
          name: tableName,
          exists: false,
          count: 0,
          error: tableError.message
        });
      }
    }

    return {
      connection: 'connected',
      tables
    };
  } catch (error: any) {
    console.error('Database check error:', error);
    return {
      connection: 'error',
      tables: []
    };
  }
}

