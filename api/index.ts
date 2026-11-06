import { app, ensureInitialized } from '../server.js';

export default async function handler(req: any, res: any) {
  try {
    await ensureInitialized();

    // Handle Vercel URL rewrite normalization:
    // If Vercel rewrote req.url or stripped the /api prefix, reconstruct the canonical API route
    const forwardedUri = req.headers?.['x-forwarded-uri'] || 
                         req.headers?.['x-matched-path'] || 
                         req.headers?.['x-real-origin-url'] ||
                         (typeof req.originalUrl === 'string' && req.originalUrl.startsWith('/api') ? req.originalUrl : null);

    if (forwardedUri && typeof forwardedUri === 'string' && forwardedUri.startsWith('/api')) {
      req.url = forwardedUri;
    } else if (typeof req.headers?.['x-now-route-matches'] === 'string') {
      const match = req.headers['x-now-route-matches'].match(/1=([^&]+)/);
      if (match && match[1]) {
        req.url = '/api/' + decodeURIComponent(match[1]);
      }
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

