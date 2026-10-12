import cron, { ScheduledTask } from 'node-cron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { config } from '../config';
import { dataStore } from './dataStore';
import { sendJobDigestEmail } from './emailService';

export interface SchedulerStatus {
  enabled: boolean;
  dailyTime: string;
  timezone: string;
  cronExpression: string;
  isRunning: boolean;
  lastRun: {
    timestamp: string | null;
    trigger: 'scheduled' | 'manual' | 'startup' | null;
    status: 'success' | 'warning' | 'error' | 'idle';
    jobsDiscovered: number;
    jobsMatched: number;
    emailSent: boolean;
    emailRecipient: string | null;
    message: string;
  };
  nextRunEstimated: string | null;
}

class SchedulerService {
  private cronTask: ScheduledTask | null = null;
  private status: SchedulerStatus;
  private statusFile: string;

  constructor() {
    const defaultDataDir = process.env.VERCEL === '1'
      ? path.join(os.tmpdir(), 'jobpulse_data')
      : path.join(process.cwd(), 'data');
    const dataDir = path.resolve(process.env.DATA_DIR || defaultDataDir);
    this.statusFile = path.join(dataDir, 'scheduler_status.json');

    // Default initial status
    this.status = {
      enabled: config.scheduler.enabled,
      dailyTime: config.scheduler.dailyTime,
      timezone: config.scheduler.timezone,
      cronExpression: this.timeToCron(config.scheduler.dailyTime),
      isRunning: false,
      lastRun: {
        timestamp: null,
        trigger: null,
        status: 'idle',
        jobsDiscovered: 0,
        jobsMatched: 0,
        emailSent: false,
        emailRecipient: null,
        message: 'Automation initialized. Waiting for scheduled run or manual trigger.',
      },
      nextRunEstimated: null,
    };

    this.loadStatus();
  }

  private timeToCron(timeStr: string): string {
    const [hours, minutes] = (timeStr || '09:00').split(':').map(n => parseInt(n, 10) || 0);
    return `${minutes} ${hours} * * *`;
  }

  private loadStatus(): void {
    try {
      if (fs.existsSync(this.statusFile)) {
        const saved = JSON.parse(fs.readFileSync(this.statusFile, 'utf-8'));
        this.status.lastRun = saved.lastRun || this.status.lastRun;
      }
    } catch {
      // Ignore load errors
    }
  }

  private saveStatus(): void {
    try {
      const dataDir = path.dirname(this.statusFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.statusFile, JSON.stringify(this.status, null, 2));
    } catch (err) {
      console.error('Failed to save scheduler status:', err);
    }
  }

  private estimateNextRun(): string {
    const [hours, minutes] = (this.status.dailyTime || '09:00').split(':').map(n => parseInt(n, 10) || 0);
    const now = new Date();
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    return next.toISOString();
  }

  /**
   * Start the scheduler background process
   */
  start(): void {
    if (!this.status.enabled) {
      console.log('⏰ JobPulse Scheduler is disabled in configuration.');
      return;
    }

    const cronExpr = this.timeToCron(this.status.dailyTime);
    this.status.cronExpression = cronExpr;
    this.status.nextRunEstimated = this.estimateNextRun();

    // Stop existing task if any
    if (this.cronTask) {
      this.cronTask.stop();
    }

    console.log(`⏰ Initializing JobPulse Scheduler: daily at ${this.status.dailyTime} (${this.status.timezone}) -> [${cronExpr}]`);

    this.cronTask = cron.schedule(
      cronExpr,
      async () => {
        console.log(`⏰ [${new Date().toLocaleTimeString()}] Scheduled automation cycle triggered!`);
        await this.runAutomationCycle('scheduled');
      },
      {
        timezone: this.status.timezone,
      }
    );

    this.status.isRunning = true;
    this.saveStatus();
    console.log(`✅ JobPulse Scheduler active. Next run scheduled for: ${new Date(this.status.nextRunEstimated).toLocaleString()}`);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }
    this.status.isRunning = false;
    this.saveStatus();
    console.log('🛑 JobPulse Scheduler stopped.');
  }

  /**
   * Get current automation status
   */
  getStatus(): SchedulerStatus {
    this.status.nextRunEstimated = this.estimateNextRun();
    return { ...this.status };
  }

  /**
   * Run the complete automation cycle:
   * 1. Discover recent jobs
   * 2. Match against resume
   * 3. Filter by score and age
   * 4. Send email digest if enabled
   */
  async runAutomationCycle(trigger: 'scheduled' | 'manual' | 'startup' = 'manual'): Promise<{
    success: boolean;
    jobsDiscovered: number;
    jobsMatched: number;
    emailSent: boolean;
    emailMessage?: string;
    message: string;
  }> {
    const timestamp = new Date().toISOString();
    console.log(`🚀 Starting JobPulse Automation Cycle (${trigger.toUpperCase()}) at ${new Date().toLocaleTimeString()}...`);

    try {
      // 1. Refresh jobs from active provider
      const refreshResult = await dataStore.refreshJobs();
      const jobsCount = refreshResult.count;
      console.log(`   📥 Jobs fetched: ${jobsCount} (${refreshResult.provider})`);

      // 2. AI Matching against uploaded resume
      const resume = dataStore.getResume();
      let matchedCount = 0;
      if (resume) {
        const matchResults = await dataStore.analyzeAllJobs();
        matchedCount = matchResults.length;
        console.log(`   🧠 AI Matching completed: ${matchedCount} jobs analyzed against ${resume.filename}`);
      } else {
        console.log(`   ℹ️ No resume uploaded yet. Skipping AI resume matching step.`);
      }

      // 3. Check settings for email delivery
      const settings = dataStore.getSettings();
      let emailSent = false;
      let emailMessage = '';
      const recipient = settings.emailAddress || config.email.to;

      // Top matching jobs according to strict minimum score & verification (deduplicated)
      const topJobs = dataStore.getTopMatchedJobsForEmail(
        settings.minMatchScore || 65,
        settings.maxJobsPerEmail || 10,
        trigger === 'scheduled' // only exclude already notified on scheduled runs
      );

      // 4. Send email if enabled and eligible jobs exist
      if (settings.emailEnabled && topJobs.length > 0) {
        console.log(`   📧 Sending automated job digest (${topJobs.length} top jobs) to ${recipient}...`);
        const emailResult = await sendJobDigestEmail(topJobs, recipient);
        emailSent = emailResult.success;
        emailMessage = emailResult.message;
        if (emailSent) {
          dataStore.recordNotifiedJobs(topJobs.map(t => t.job.id));
        }
        console.log(`   📧 Email result: ${emailResult.message}`);
      } else if (!settings.emailEnabled) {
        emailMessage = 'Email alerts are disabled in Settings. Turn on "Email Alerts" in settings to receive digests.';
        console.log(`   ℹ️ Email alerts disabled in Settings.`);
      } else if (topJobs.length === 0) {
        emailMessage = `No new unnotified vacancies met the minimum match score of ${settings.minMatchScore}%. Lower the threshold or refresh jobs.`;
        console.log(`   ℹ️ No unnotified jobs met minimum match score of ${settings.minMatchScore}%.`);
      }

      const summaryMessage = `Automation cycle completed. Found ${jobsCount} jobs, analyzed ${matchedCount} matches.${emailSent ? ' Email digest sent successfully.' : ''}`;

      // Update status
      this.status.lastRun = {
        timestamp,
        trigger,
        status: 'success',
        jobsDiscovered: jobsCount,
        jobsMatched: matchedCount,
        emailSent,
        emailRecipient: emailSent ? recipient : null,
        message: summaryMessage,
      };
      this.status.nextRunEstimated = this.estimateNextRun();
      this.saveStatus();

      return {
        success: true,
        jobsDiscovered: jobsCount,
        jobsMatched: matchedCount,
        emailSent,
        emailMessage,
        message: summaryMessage,
      };
    } catch (error: any) {
      console.error('❌ Automation cycle error:', error);
      const errorMessage = `Automation cycle failed: ${error.message}`;

      this.status.lastRun = {
        timestamp,
        trigger,
        status: 'error',
        jobsDiscovered: 0,
        jobsMatched: 0,
        emailSent: false,
        emailRecipient: null,
        message: errorMessage,
      };
      this.saveStatus();

      return {
        success: false,
        jobsDiscovered: 0,
        jobsMatched: 0,
        emailSent: false,
        message: errorMessage,
      };
    }
  }
}

export const schedulerService = new SchedulerService();
