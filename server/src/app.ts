import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import resumeRoutes from './routes/resume';
import jobRoutes from './routes/jobs';
import dashboardRoutes from './routes/dashboard';
import settingsRoutes from './routes/settings';
import schedulerRoutes from './routes/scheduler';
import { schedulerService } from './services/schedulerService';
import { jobService } from './services/jobService';

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
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.pratiksha.dev') ||
      origin.endsWith('.vercel.app')
    ) {
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
    deployment: process.env.VERCEL ? 'vercel-serverless' : 'standalone-node',
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
    deployment: process.env.VERCEL ? 'vercel-serverless' : 'standalone-node',
  });
});

// ============ API Routes (supports both /api/* and direct mounts) ============
app.use('/api/resume', resumeRoutes);
app.use('/resume', resumeRoutes);

app.use('/api/jobs', jobRoutes);
app.use('/jobs', jobRoutes);

app.use('/api/dashboard', dashboardRoutes);
app.use('/dashboard', dashboardRoutes);

app.use('/api/settings', settingsRoutes);
app.use('/settings', settingsRoutes);

app.use('/api/scheduler', schedulerRoutes);
app.use('/scheduler', schedulerRoutes);

// ============ Error Handling ============
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
export { app };
