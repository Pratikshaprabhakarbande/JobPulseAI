import express from 'express';
import cors from 'cors';
import path from 'path';
import { config, validateConfig } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import resumeRoutes from './routes/resume';
import jobRoutes from './routes/jobs';
import dashboardRoutes from './routes/dashboard';
import settingsRoutes from './routes/settings';
import schedulerRoutes from './routes/scheduler';
import { schedulerService } from './services/schedulerService';
import { jobService } from './services/jobService';
import { dataStore } from './services/dataStore';

const app = express();

// ============ Middleware ============
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://jobpulse.pratiksha.dev',
];

const customOrigins = config.corsOrigin
  ? config.corsOrigin.split(',').map((o: string) => o.trim()).filter(Boolean)
  : [];

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...customOrigins]));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.pratiksha.dev')) {
      return callback(null, true);
    }
    return callback(null, true); // Allow client requests with credentials
  },
  credentials: true,
}));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============ Health & Root Endpoints ============
const sendHealth = (_req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    demoMode: config.demoMode,
    aiProvider: config.ai.provider,
    jobProvider: jobService.getProviderName(),
    realSourceConfigured: jobService.isRealSourceConfigured(),
    schedulerRunning: schedulerService.getStatus().isRunning,
  });
};

app.get('/api/health', sendHealth);
app.get('/health', sendHealth);
app.get('/', (_req, res) => {
  res.json({
    name: 'JobPulse AI Backend API',
    status: 'online',
    health: '/api/health',
    frontend: 'https://jobpulse.pratiksha.dev',
  });
});

// ============ API Routes ============
app.use('/api/resume', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/scheduler', schedulerRoutes);

// ============ Error Handling ============
app.use(notFoundHandler);
app.use(errorHandler);

// ============ Start Server ============
app.listen(config.port, () => {
  console.log('');
  console.log('🚀 ═══════════════════════════════════════════');
  console.log('   JOBPULSE AI - Backend Server');
  console.log('═══════════════════════════════════════════════');
  console.log(`   🌐 Server:     http://localhost:${config.port}`);
  console.log(`   🤖 AI Mode:    ${config.ai.provider === 'demo' ? 'Demo (Mock)' : config.ai.provider}`);
  console.log(`   📊 Demo Mode:  ${config.demoMode ? 'ON' : 'OFF'}`);
  console.log(`   💼 Provider:   ${jobService.getProviderName()}`);
  console.log(`   ⏰ Scheduler:  ${config.scheduler.enabled ? `ON (Daily at ${config.scheduler.dailyTime})` : 'OFF'}`);
  console.log(`   🎯 CORS:       ${config.corsOrigin}`);
  console.log('═══════════════════════════════════════════════');

  const warnings = validateConfig();
  if (warnings.length > 0) {
    console.log('⚠️  Startup Notices:');
    warnings.forEach(w => console.log(`   - ${w}`));
  }
  console.log('');

  // Start background scheduler
  schedulerService.start();

  // Background warm-up: populate live jobs on cold start if store is empty
  if (!config.demoMode && dataStore.getJobs().jobs.length === 0) {
    setTimeout(() => {
      console.log('🔄 Initial store empty: warming up live job discovery in background...');
      dataStore.refreshJobs().catch(e => console.warn('Startup warm-up notice:', e.message));
    }, 2500);
  }
});

export default app;
