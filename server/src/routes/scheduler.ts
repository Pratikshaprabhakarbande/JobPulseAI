import { Router, Request, Response } from 'express';
import { schedulerService } from '../services/schedulerService';

const router = Router();

// GET /api/scheduler/status - Get scheduler status and last execution stats
router.get('/status', (_req: Request, res: Response): void => {
  res.json(schedulerService.getStatus());
});

// POST /api/scheduler/trigger - Manually trigger the full automation cycle right now
router.post('/trigger', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await schedulerService.runAutomationCycle('manual');
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Trigger failed: ${error.message}`,
    });
  }
});

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
