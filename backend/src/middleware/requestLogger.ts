import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusTag = status >= 500 ? 'ERR' : status >= 400 ? 'WARN' : 'OK';
    console.log(
      `[${new Date().toISOString()}] [${statusTag}] ${req.method} ${req.originalUrl || req.url} ${status} ${duration}ms`
    );
  });
  next();
};
