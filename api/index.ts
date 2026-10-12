import app from '../server/src/app';

/**
 * Vercel Serverless Function entry point for JobPulse AI.
 * Routes all /api/* requests into the Express application.
 */
export default function handler(req: any, res: any) {
  // Ensure the URL matches the full requested path under Vercel rewrites
  if (req.headers && req.headers['x-matched-path']) {
    req.url = req.headers['x-matched-path'];
  }
  return app(req, res);
}
