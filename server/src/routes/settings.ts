import { Router, Request, Response } from 'express';
import { config } from '../config';
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
    const email = req.body?.email || settings.emailAddress || config.email.to;

    if (!email) {
      res.json({
        success: false,
        message: 'No recipient email specified. Please enter a valid email address in Settings.',
      });
      return;
    }

    if (!config.email.user || !config.email.pass) {
      res.json({
        success: false,
        message: 'SMTP credentials not configured on Vercel. Please add EMAIL_USER and EMAIL_PASS (e.g. Gmail 16-character App Password) in your Vercel Environment Variables to enable email delivery.',
      });
      return;
    }

    // Ensure jobs are available; warm up store if empty
    let { jobs } = dataStore.getJobs();
    if (jobs.length === 0) {
      await dataStore.refreshJobs();
      jobs = dataStore.getJobs().jobs;
    }

    let topJobs = dataStore.getTopMatchedJobsForEmail(settings.minMatchScore, settings.maxJobsPerEmail, false);

    // For test emails, if no jobs met the strict threshold, use top available vacancies
    if (topJobs.length === 0) {
      topJobs = dataStore.getTopMatchedJobsForEmail(0, 3, false);
    }

    if (topJobs.length === 0 && jobs.length > 0) {
      // Pick first active jobs with synthesized match
      topJobs = jobs.slice(0, 3).map(j => ({
        job: j,
        match: {
          id: `synth-match-${j.id}`,
          jobId: j.id,
          resumeId: 'default-profile',
          matchScore: 85,
          isEligible: true,
          skillsMatched: j.requiredSkills.slice(0, 3),
          skillsMissing: [],
          experienceMatch: 'Fresher / Entry level match',
          locationMatch: j.isIndiaLocation ? 'India target location' : 'Remote eligible',
          whyMatch: 'Selected from active vacancies for test digest.',
          eligibilityConcerns: [],
          resumeSuggestions: 'Highlight relevant projects in application.',
          scoreBreakdown: {
            jobFamilyMatch: 85,
            skillsMatch: 85,
            experienceMatch: 90,
            educationMatch: 90,
            locationMatch: j.isIndiaLocation ? 95 : 60,
          },
          createdAt: new Date().toISOString(),
        },
      }));
    }

    if (topJobs.length === 0) {
      res.json({
        success: false,
        message: 'No active job vacancies found to compile email digest. Please click "Refresh Jobs" on the Dashboard.',
      });
      return;
    }

    const result = await sendJobDigestEmail(topJobs, { recipientEmail: email, isTest: true });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: `Email test failed: ${error.message}` });
  }
});

export default router;
