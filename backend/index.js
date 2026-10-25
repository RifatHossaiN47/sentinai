const express = require('express');

let app;
let bootError = null;

try {
  const appModule = require('./dist/app');
  app = appModule.default || appModule;
} catch (err) {
  bootError = err;
  console.error('[Vercel Express Boot Error]', err);
}

const serverlessApp = express();

serverlessApp.get('/api/diagnostic', (req, res) => {
  res.status(200).json({
    status: 'diagnostic_online',
    appLoaded: !!app,
    bootError: bootError ? { message: bootError.message, stack: bootError.stack } : null,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      DIRECT_URL_SET: !!process.env.DIRECT_URL,
    },
    nodeVersion: process.version,
  });
});

if (app) {
  serverlessApp.use(app);
} else {
  serverlessApp.all('*', (req, res) => {
    res.status(500).json({
      error: 'BACKEND_FAILED_TO_LOAD',
      message: bootError ? bootError.message : 'Unknown load error',
      stack: bootError ? bootError.stack : null,
    });
  });
}

module.exports = serverlessApp;
module.exports.default = serverlessApp;
