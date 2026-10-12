import app from './app';
import { config, validateConfig } from './config';
import { schedulerService } from './services/schedulerService';
import { jobService } from './services/jobService';
import { dataStore } from './services/dataStore';

// Only start standalone HTTP server when not in serverless environment
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
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

    // Start background scheduler in persistent server mode
    schedulerService.start();

    // Background warm-up: populate live jobs on cold start if store is empty
    if (!config.demoMode && dataStore.getJobs().jobs.length === 0) {
      setTimeout(() => {
        console.log('🔄 Initial store empty: warming up live job discovery in background...');
        dataStore.refreshJobs().catch(e => console.warn('Startup warm-up notice:', e.message));
      }, 2500);
    }
  });
}

export default app;
