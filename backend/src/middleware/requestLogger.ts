import morgan from 'morgan';

export const requestLogger = morgan((tokens, req, res) => {
  const status = Number(tokens.status(req, res) || 200);
  const statusTag = status >= 500 ? 'ERR' : status >= 400 ? 'WARN' : 'OK';
  return [
    `[${new Date().toISOString()}]`,
    `[${statusTag}]`,
    tokens.method(req, res),
    tokens.url(req, res),
    status,
    `${tokens['response-time'](req, res)}ms`,
  ].join(' ');
});
