const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const examplePath = path.join(rootDir, '.env.example');

// Only copy .env.example in local development; on Vercel, use cloud environment variables
if (!process.env.VERCEL && !fs.existsSync(envPath) && fs.existsSync(examplePath)) {
  fs.copyFileSync(examplePath, envPath);
  console.log('[Bootstrap] Initialized default .env from .env.example');
}
