import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), 'backend/env.env') });

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY;

async function debug() {
  const res = await fetch(
    `${TRIPWIRE_URL}/rest/v1/tripwire_users?select=id,email,phone,full_name&limit=3`,
    {
      headers: {
        'apikey': TRIPWIRE_KEY!,
        'Authorization': `Bearer ${TRIPWIRE_KEY}`
      }
    }
  );

  console.log('Status:', res.status);
  console.log('Headers:', Object.fromEntries(res.headers));
  
  const text = await res.text();
  console.log('\nRaw response:', text);
  
  try {
    const json = JSON.parse(text);
    console.log('\nParsed:', json);
    console.log('Type:', typeof json);
    console.log('Is Array:', Array.isArray(json));
  } catch (e) {
    console.log('Not JSON');
  }
}

debug();
