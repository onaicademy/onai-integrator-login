/**
 * Load environment variables BEFORE any other imports
 * This file must be imported FIRST in server.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// ✅ ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Try multiple paths for env.env
const possiblePaths = [
  path.join(__dirname, '..', 'env.env'),
  path.join(process.cwd(), 'env.env'),
  '/Users/miso/onai-integrator-login/backend/env.env'
];

let envLoaded = false;
for (const envPath of possiblePaths) {
  if (existsSync(envPath)) {
    console.log(`✅ Loading env from: ${envPath}`);
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.error(`❌ Error loading env:`, result.error);
    } else {
      console.log(`✅ Environment variables loaded successfully!`);
      envLoaded = true;
    }
    break;
  }
}

if (!envLoaded) {
  console.error('❌ env.env file not found in any of the following paths:');
  possiblePaths.forEach(p => console.error(`   - ${p}`));
  console.error('\n💡 Make sure backend/env.env exists\n');
}

// Export loaded status
export { envLoaded };


