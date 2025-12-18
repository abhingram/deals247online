import fs from 'fs';
import path from 'path';

const required = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'SESSION_SECRET'
];

// If DB_SSL=true, ensure CA path is provided
const optionalIf = {
  'DB_SSL_CA_PATH': map => map['DB_SSL'] === 'true'
};

const envPath = path.join(process.cwd(), 'server', '.env.production');
if (!fs.existsSync(envPath)) {
  console.error(`Missing ${envPath}. Create one from .env.production.example`);
  process.exit(1);
}

const contents = fs.readFileSync(envPath, 'utf8');
const lines = contents.split(/\r?\n/);
const map = {};
for (const l of lines) {
  const m = l.match(/^([^=]+)=(.*)$/);
  if (m) map[m[1].trim()] = m[2].trim();
}

const missing = required.filter(k => !map[k]);
if (missing.length) {
  console.error('Missing required production env vars:', missing);
  process.exit(1);
}

// Validate optional-if conditions
for (const [key, predicate] of Object.entries(optionalIf)) {
  if (predicate(map) && !map[key]) {
    console.error(`Missing required production env var when condition met: ${key}`);
    process.exit(1);
  }
}

console.log('All required production env vars present');
