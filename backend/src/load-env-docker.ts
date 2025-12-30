/**
 * Load environment variables for Docker containers
 * This file must be imported FIRST in server.ts when running in Docker
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { existsSync } from 'fs';

// ✅ Try multiple paths for .env (Docker specific paths)
const possiblePaths = [
  '/app/.env',  // Docker container path
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '..', '.env'),
  './.env'
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
  console.error('❌ .env file not found in any of the following paths:');
  possiblePaths.forEach(p => console.error(`   - ${p}`));
  console.error('\n💡 Make sure .env exists in Docker container at /app/.env\n');
}

// Export loaded status
export { envLoaded };