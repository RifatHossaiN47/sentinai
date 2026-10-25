// Entry point shim for Vercel Express service deployment
const app = require('./dist/app').default || require('./dist/app');

module.exports = app;
module.exports.default = app;
