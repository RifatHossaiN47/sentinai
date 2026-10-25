const express = require('express');

let app;
let bootError = null;

try {
  app = require('./dist/app').default || require('./dist/app');
} catch (err) {
  bootError = err;
  console.error('[Vercel Express Boot Error]', err);
}

const fallbackApp = express();
fallbackApp.use(express.json());

fallbackApp.all('*', (req, res) => {
  res.status(500).json({
    diagnostic: 'BACKEND_BOOT_FAILED',
    message: bootError ? bootError.message : 'Unknown boot failure',
    stack: bootError ? bootError.stack : null,
    node_version: process.version,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      DIRECT_URL_SET: !!process.env.DIRECT_URL,
    },
  });
});

const exportedApp = app || fallbackApp;

module.exports = exportedApp;
module.exports.default = exportedApp;
