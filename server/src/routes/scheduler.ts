import { Router, Request, Response } from 'express';
import { schedulerService } from '../services/schedulerService';

const router = Router();

// GET /api/scheduler/status - Get scheduler status and last execution stats
router.get('/status', (_req: Request, res: Response): void => {
  res.json(schedulerService.getStatus());
});

// Helper to verify cron authorization if CRON_SECRET is configured
function verifyCronAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // If no secret configured, allow trigger (dev/preview mode)

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.trim() === `Bearer ${secret}`) return true;

  const queryKey = req.query.key as string;
  if (queryKey && queryKey === secret) return true;

  return false;
}

// Handler for automation cycle trigger (scheduled or manual)
const handleTrigger = async (req: Request, res: Response): Promise<void> => {
  if (!verifyCronAuth(req)) {
    res.status(401).json({
      error: 'Unauthorized. Invalid or missing CRON_SECRET authorization header.',
    });
    return;
  }

  try {
    const isScheduled = req.method === 'GET' || req.query.source === 'scheduled';
    const result = await schedulerService.runAutomationCycle(isScheduled ? 'scheduled' : 'manual');
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Trigger failed: ${error.message}`,
    });
  }
};

// GET /api/scheduler/trigger - Used by Vercel Cron invocation
router.get('/trigger', handleTrigger);

// POST /api/scheduler/trigger - Used by UI manual trigger button
router.post('/trigger', handleTrigger);

// POST /api/scheduler/start - Start or restart the cron scheduler
router.post('/start', (_req: Request, res: Response): void => {
  schedulerService.start();
  res.json({ success: true, status: schedulerService.getStatus() });
});

// POST /api/scheduler/stop - Stop the cron scheduler
router.post('/stop', (_req: Request, res: Response): void => {
  schedulerService.stop();
  res.json({ success: true, status: schedulerService.getStatus() });
});

export default router;
