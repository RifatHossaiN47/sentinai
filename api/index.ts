import app from '../backend/src/app';

export default function handler(req: any, res: any) {
  console.log('[Vercel Serverless API] Request received:', req.method, req.url);
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless API Error]:', err);
    res.status(500).json({
      error: 'API_HANDLER_CRASH',
      message: err?.message || 'Unknown handler error',
      stack: err?.stack || null,
    });
  }
}
