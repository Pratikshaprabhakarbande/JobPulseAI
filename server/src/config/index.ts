import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/jobpulse',

  // AI Configuration
  ai: {
    provider: process.env.AI_PROVIDER || 'demo', // 'openai' | 'gemini' | 'demo'
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    baseUrl: process.env.AI_BASE_URL || '',
  },

  // Email Configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || '',
    to: process.env.EMAIL_TO || '',
  },

  // Upload Configuration
  upload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    uploadDir: './uploads',
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Job Listings Provider (Adzuna preferred, Arbeitnow as public fallback)
  adzuna: {
    appId: process.env.ADZUNA_APP_ID || '',
    appKey: process.env.ADZUNA_APP_KEY || '',
    country: process.env.ADZUNA_COUNTRY || 'in',
  },
  // If Adzuna credentials exist, use 'adzuna'; otherwise respect explicit JOB_PROVIDER or fall back to 'arbeitnow'
  jobProvider: (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY)
    ? 'adzuna'
    : (process.env.JOB_PROVIDER && process.env.JOB_PROVIDER !== 'adzuna' ? process.env.JOB_PROVIDER : 'arbeitnow'),

  // Demo Mode
  demoMode: process.env.DEMO_MODE === 'true', // false by default — real mode unless explicitly enabled

  // Scheduler Configuration
  scheduler: {
    enabled: process.env.SCHEDULER_ENABLED !== 'false', // enabled by default
    // Daily run time in HH:MM format (24-hour, IST)
    dailyTime: process.env.SCHEDULER_DAILY_TIME || '09:00',
    // Timezone for scheduling
    timezone: process.env.SCHEDULER_TIMEZONE || 'Asia/Kolkata',
  },
};

// ============ Startup Validation ============
export function validateConfig(): string[] {
  const warnings: string[] = [];

  // Check if any real job provider is available
  const hasAdzuna = !!(config.adzuna.appId && config.adzuna.appKey);
  const hasArbeitnow = config.jobProvider === 'arbeitnow' || config.jobProvider === 'public';

  if (!hasAdzuna && !hasArbeitnow && !config.demoMode) {
    warnings.push(
      'No real job provider configured and DEMO_MODE is not enabled. ' +
      'Set ADZUNA_APP_ID & ADZUNA_APP_KEY in .env, or set JOB_PROVIDER=arbeitnow, or set DEMO_MODE=true.'
    );
  }

  // Check email configuration
  if (!config.email.user || !config.email.pass) {
    warnings.push('Email not configured (EMAIL_USER / EMAIL_PASS missing). Email alerts will not work.');
  }

  return warnings;
}
