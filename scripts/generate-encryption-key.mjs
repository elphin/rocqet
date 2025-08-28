import crypto from 'crypto';

// Generate a proper 256-bit (32 bytes) key for AES-256-GCM
const key = crypto.randomBytes(32).toString('hex');

console.log('Generated encryption key for DB_ENCRYPTION_KEY:');
console.log(key);
console.log('\nAdd this to your .env.local file:');
console.log(`DB_ENCRYPTION_KEY=${key}`);