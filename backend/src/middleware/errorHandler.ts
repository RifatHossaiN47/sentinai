import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error & { status?: number; type?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: 'Malformed JSON',
      message: 'Request body contains invalid JSON syntax.',
    });
    return;
  }

  const statusCode = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  console.error(`[Error ${statusCode}] ${err.message}`, err.stack);

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : 'Request Error',
    message: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred while processing telemetry.'
      : err.message,
  });
}
