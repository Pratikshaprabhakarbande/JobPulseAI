import { Router, Request, Response } from 'express';
import { dataStore } from '../services/dataStore';
import { sendJobDigestEmail } from '../services/emailService';
import { emailLimiter } from '../middleware/rateLimiter';

const router = Router();

// GET /api/settings
router.get('/', (_req: Request, res: Response): void => {
  res.json(dataStore.getSettings());
});

// PUT /api/settings
router.put('/', (req: Request, res: Response): void => {
  const updates = req.body;
  const settings = dataStore.updateSettings(updates);
  res.json({ success: true, settings });
});

// POST /api/email/test - Send a test email
router.post('/email/test', emailLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = dataStore.getSettings();
    let topJobs = dataStore.getTopMatchedJobsForEmail(settings.minMatchScore, settings.maxJobsPerEmail, false);

    // For test emails, if no jobs met the strict threshold, use top available scored jobs
    if (topJobs.length === 0) {
      topJobs = dataStore.getTopMatchedJobsForEmail(0, 3, false);
    }

    if (topJobs.length === 0) {
      res.json({
        success: false,
        message: 'No jobs found in database to send test email. Try clicking "Refresh Jobs" first.',
      });
      return;
    }

    const email = req.body?.email || settings.emailAddress;
    const result = await sendJobDigestEmail(topJobs, { recipientEmail: email, isTest: true });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: `Email test failed: ${error.message}` });
  }
});

export default router;
