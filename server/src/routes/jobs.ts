import { Router, Request, Response } from 'express';
import { config } from '../config';
import { dataStore } from '../services/dataStore';
import { jobService } from '../services/jobService';
import { verificationService } from '../services/verificationService';
import { refreshLimiter } from '../middleware/rateLimiter';
import { getTimeAgo, getFreshnessColor } from '../utils/types';

const router = Router();

// GET /api/jobs - List all jobs with filters & verification
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const filters = {
    search: req.query.search as string,
    role: req.query.role as string,
    company: req.query.company as string,
    location: req.query.location as string,
    city: req.query.city as string,
    workMode: req.query.workMode as string,
    experienceLevel: req.query.experienceLevel as string,
    minScore: req.query.minScore ? parseInt(req.query.minScore as string, 10) : undefined,
    maxAge: req.query.maxAge ? parseInt(req.query.maxAge as string, 10) : undefined,
    verifiedOnly: req.query.verifiedOnly === 'true',
    allowInternational: req.query.allowInternational === 'true' || req.query.international === 'true',
    sortBy: (req.query.sortBy as string) || 'match',
  };

  let { jobs, matches } = dataStore.getJobs(filters);
  if (jobs.length === 0 && !filters.search && !filters.role && !filters.company && !filters.city && !filters.location) {
    await dataStore.refreshJobs().catch(() => {});
    const reloaded = dataStore.getJobs(filters);
    jobs = reloaded.jobs;
    matches = reloaded.matches;
  }

  const jobsWithMatches = jobs.map(job => {
    const match = matches.get(job.id);
    return {
      ...job,
      timeAgo: getTimeAgo(job.postedDate),
      freshnessColor: getFreshnessColor(job.postedDate),
      matchScore: match?.matchScore || null,
      isEligible: match?.isEligible ?? true,
      skillsMatched: match?.skillsMatched || [],
      skillsMissing: match?.skillsMissing || [],
      eligibilityConcerns: match?.eligibilityConcerns || [],
      whyMatch: match?.whyMatch || null,
      scoreBreakdown: match?.scoreBreakdown || null,
      verification: job.verification || {
        status: 'UNKNOWN',
        checkedAt: new Date().toISOString(),
        evidence: 'Verification pending',
        isDirectEmployerLink: false,
      },
      hasAnalysis: !!match,
    };
  });

  const isConfigured = jobService.isRealSourceConfigured();
  const providerName = jobService.getProviderName();
  const isDemo = config.demoMode;

  const verifiedCount = jobsWithMatches.filter(j => j.verification.status === 'VERIFIED_OPEN').length;
  const indiaCount = jobsWithMatches.filter(j => j.isIndiaLocation || j.isRemoteEligibleIndia).length;

  res.json({
    total: jobsWithMatches.length,
    verifiedCount,
    indiaCount,
    jobs: jobsWithMatches,
    demoMode: isDemo,
    realSourceConfigured: isConfigured,
    provider: providerName,
    message: !isConfigured && !isDemo ? 'Real job source not configured' : null,
  });
});

// GET /api/jobs/:id - Get a specific job with full analysis & verification
router.get('/:id', (req: Request, res: Response): void => {
  const job = dataStore.getJobById(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  const match = dataStore.getMatchByJobId(job.id);

  res.json({
    ...job,
    timeAgo: getTimeAgo(job.postedDate),
    freshnessColor: getFreshnessColor(job.postedDate),
    analysis: match || null,
  });
});

// POST /api/jobs/:id/verify - On-demand live verification of a job vacancy URL
router.post('/:id/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const job = dataStore.getJobById(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const verification = await verificationService.verifyUrl(job.applyUrl || job.url, true);
    job.verification = verification;

    res.json({
      success: true,
      jobId: job.id,
      verification,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Verification failed: ${err.message}` });
  }
});

// POST /api/jobs/:id/analyze - Analyze a specific job against profile
router.post('/:id/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = dataStore.getProfile();
    if (!profile) {
      res.status(400).json({ error: 'Please upload your resume first before analyzing jobs.' });
      return;
    }

    const job = dataStore.getJobById(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const match = await dataStore.analyzeJob(job.id);
    if (!match) {
      res.status(500).json({ error: 'Analysis failed. Please try again.' });
      return;
    }

    res.json({
      success: true,
      analysis: match,
    });
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'AI analysis temporarily unavailable.',
    });
  }
});

// POST /api/jobs/analyze-all - Analyze all jobs against candidate profile
router.post('/analyze-all', async (_req: Request, res: Response): Promise<void> => {
  try {
    const profile = dataStore.getProfile();
    if (!profile) {
      res.status(400).json({ error: 'Please upload your resume first.' });
      return;
    }

    const matches = await dataStore.analyzeAllJobs();
    res.json({
      success: true,
      analyzed: matches.length,
      message: `Successfully analyzed ${matches.length} jobs against your candidate profile.`,
    });
  } catch (error: any) {
    res.status(500).json({ error: `Analysis failed: ${error.message}` });
  }
});

// POST /api/jobs/refresh - Refresh vacancies
router.post('/refresh', refreshLimiter, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await dataStore.refreshJobs();
    res.json({
      success: true,
      jobsLoaded: result.count,
      configured: result.configured,
      message: result.message,
      provider: result.provider,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Refresh failed: ${err.message}`,
    });
  }
});

export default router;
