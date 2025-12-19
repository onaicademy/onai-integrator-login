import http from 'http';

const API = 'http://localhost:3000';

async function test(path, name) {
  return new Promise((resolve) => {
    http.get(`${API}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`✅ ${name} (${res.statusCode})`);
          if (Array.isArray(json)) console.log(`   Length: ${json.length}`);
          resolve(true);
        } catch (e) {
          console.log(`❌ ${name} - ${e.message}`);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.log(`❌ ${name} - ${err.message}`);
      resolve(false);
    });
  });
}

console.log('🚀 Testing Traffic API...\n');
await test('/health', 'Health');
await test('/api/traffic-constructor/teams', 'Teams');
await test('/api/traffic-constructor/users', 'Users');
console.log('\n✅ Done!');
