import { Router, Request, Response } from 'express';
import { config } from '../config';
import { dataStore } from '../services/dataStore';
import { jobService } from '../services/jobService';
import { schedulerService } from '../services/schedulerService';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', (_req: Request, res: Response): void => {
  const stats = dataStore.getStats();
  const resume = dataStore.getResume();
  const profile = dataStore.getProfile();
  const schedulerStatus = schedulerService.getStatus();

  res.json({
    ...stats,
    hasResume: !!resume,
    resumeFilename: resume?.filename || null,
    hasProfile: !!profile,
    candidateName: profile?.name || null,
    targetRoles: profile?.targetRoles || [],
    aiProvider: config.ai.provider,
    demoMode: config.demoMode,
    realSourceConfigured: jobService.isRealSourceConfigured(),
    jobProvider: jobService.getProviderName(),
    scheduler: schedulerStatus,
  });
});

export default router;
