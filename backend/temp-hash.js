const bcrypt = require('bcrypt');
const password = 'admin123';
const hash = bcrypt.hashSync(password, 10);
console.log('Password:', password);
console.log('Hash:', hash);
// Verify
const isValid = bcrypt.compareSync(password, hash);
console.log('Verify:', isValid);
