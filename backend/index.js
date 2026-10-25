// Entry point shim for Vercel Express service deployment
const app = require('./dist/server').default || require('./dist/server');

module.exports = app;
module.exports.default = app;
