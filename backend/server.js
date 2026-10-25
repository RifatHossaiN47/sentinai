// Entry point shim for Vercel Express service deployment with self-diagnostic error reporting
let app;
let loadError = null;

try {
  app = require('./dist/app').default || require('./dist/app');
} catch (err) {
  loadError = err;
  console.error('[Vercel Boot Error]', err);
}

const diagnosticHandler = (req, res) => {
  if (app) {
    return app(req, res);
  }

  res.statusCode = 500;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify(
      {
        error: 'BACKEND_BOOT_EXCEPTION',
        message: loadError ? loadError.message : 'Unknown load error',
        stack: loadError ? loadError.stack : null,
      },
      null,
      2
    )
  );
};

module.exports = diagnosticHandler;
module.exports.default = diagnosticHandler;
