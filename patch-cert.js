const fs = require('fs');
const filePath = '/var/www/onai-integrator-login-main/backend/dist/services/tripwire/tripwireCertificateService.js';

console.log('📦 Reading file...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Applying patches...');

// Patch 1: Simplify path - remove users/ and certificates/ folders
content = content.replace(
  /const storagePath = `users\/\$\{userId\}\/certificates\/\$\{fileName\}`;/g,
  'const storagePath = `${userId}/${fileName}`;'
);

// Patch 2: Simplify even more - check other variations
content = content.replace(
  /`users\/\$\{userId\}\/certificates\/\$\{/g,
  '`${userId}/${'
);

fs.writeFileSync(filePath, content);

console.log('✅ Patched successfully!');
console.log('New path format: ${userId}/${fileName}');

