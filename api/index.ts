import { app, ensureInitialized } from '../server.js';

export default async function handler(req: any, res: any) {
  try {
    await ensureInitialized();

    // Handle Vercel URL rewrite normalization:
    // If Vercel rewrote req.url or stripped the /api prefix, reconstruct the canonical API route
    const forwardedUri = req.headers?.['x-forwarded-uri'] || req.headers?.['x-matched-path'];
    if ((!req.url || req.url === '/' || req.url === '/api') && typeof forwardedUri === 'string' && forwardedUri.startsWith('/api')) {
      req.url = forwardedUri;
    } else if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }

    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Handler Initialization Error]:', err?.message || err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Unable to connect to the authentication service. Please try again.',
        details: process.env.NODE_ENV !== 'production' ? err?.message : undefined
      });
    }
  }
}

