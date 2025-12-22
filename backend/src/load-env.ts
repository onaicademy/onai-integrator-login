/**
 * Load environment variables BEFORE any other imports
 * This file must be imported FIRST in server.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { existsSync } from 'fs';

// ✅ Get directory path (use native __dirname in CommonJS)
const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

// ✅ Try multiple paths for env.env
const possiblePaths = [
  path.join(currentDir, '..', 'env.env'),
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





















