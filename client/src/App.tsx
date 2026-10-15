import { useState, useEffect, useCallback } from 'react';
import {
  Rocket, Briefcase, FileText, Settings, Search, Mail, BarChart3,
  RefreshCw, Zap, ChevronRight, ArrowUpRight, X, Upload, Trash2,
  CheckCircle, AlertTriangle, SlidersHorizontal, Play, Clock, Check,
  ShieldCheck, ShieldAlert, Globe, MapPin, Award, CheckSquare, Square,
  Building, ExternalLink, Plus
} from 'lucide-react';
import * as api from './api';

// ============ Types ============
export type VerificationStatus =
  | 'VERIFIED_OPEN'
  | 'LIKELY_OPEN'
  | 'UNKNOWN'
  | 'EXPIRED_OR_CLOSED'
  | 'INVALID_LINK'
  | 'VERIFICATION_BLOCKED';

interface VerificationDetails {
  status: VerificationStatus;
  checkedAt: string;
  httpStatus?: number;
  finalUrl?: string;
  evidence: string;
  responseTimeMs?: number;
  isDirectEmployerLink: boolean;
}

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  country?: string;
  city?: string;
  isIndiaLocation?: boolean;
  isRemoteEligibleIndia?: boolean;
  isInternational?: boolean;
  workMode: string;
  postedDate: string | null;
  postedDateSource?: 'source_timestamp' | 'source_date' | 'unverified';
  postedDateRelative?: string;
  discoveredAt?: string;
  url: string;
  applyUrl: string;
  source: string;
  jobFamily?: string;
  experienceLevel: string;
  salary: string | null;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  isDemo: boolean;
  timeAgo: string;
  freshnessColor: string;
  matchScore: number | null;
  isEligible?: boolean;
  skillsMatched: string[];
  skillsMissing: string[];
  whyMatch: string | null;
  eligibilityConcerns?: string[];
  hasAnalysis: boolean;
  verification?: VerificationDetails;
}

interface JobAnalysis {
  matchScore: number;
  isEligible?: boolean;
  skillsMatched: string[];
  skillsMissing: string[];
  experienceMatch: string;
  locationMatch?: string;
  whyMatch: string;
  eligibilityConcerns?: string[];
  resumeSuggestions: string;
  scoreBreakdown: {
    jobFamilyMatch?: number;
    skillsMatch: number;
    experienceMatch: number;
    educationMatch: number;
    locationMatch?: number;
    roleMatch?: number;
    keywordMatch?: number;
  };
}

interface EducationEntry {
  degree: string;
  branch: string;
  institution: string;
  graduationYear?: number;
  cgpaOrPercentage?: string;
}

interface ProjectEntry {
  title: string;
  description: string;
  technologies: string[];
  highlights?: string[];
}

interface CandidateProfile {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  summary: string;
  education: EducationEntry[];
  demonstratedSkills: string[];
  inferredInterests: string[];
  toolsAndFrameworks: string[];
  certifications: string[];
  projects: ProjectEntry[];
  experienceHistory: any[];
  experienceLevel: 'Fresher' | 'Intern' | 'Junior (0-2 years)' | 'Mid-Level (2-5 years)' | 'Senior (5+ years)';
  yearsOfExperienceEstimate: number;
  detectedJobFamilies: string[];
  targetRoles: string[];
  preferredLocations: string[];
  workModePreference: 'All' | 'Remote' | 'Hybrid' | 'On-site';
  countryPreference: string;
  verifiedOnly: boolean;
  allowInternational: boolean;
  minMatchScore: number;
  updatedAt: string;
}

interface DashboardStats {
  totalJobs: number;
  verifiedOpenJobs?: number;
  indiaJobsCount?: number;
  cityBreakdown?: Record<string, number>;
  newToday: number;
  excellentMatch: number;
  goodMatch: number;
  possibleMatch: number;
  lowMatch: number;
  hasResume: boolean;
  hasProfile?: boolean;
  resumeFilename: string | null;
  demoMode: boolean;
  realSourceConfigured?: boolean;
  jobProvider?: string;
  scheduler?: {
    enabled: boolean;
    dailyTime: string;
    timezone: string;
    cronExpression: string;
    isRunning: boolean;
    lastRun: {
      timestamp: string | null;
      trigger: string | null;
      status: string;
      jobsDiscovered: number;
      jobsMatched: number;
      emailSent: boolean;
      emailRecipient: string | null;
      message: string;
    };
    nextRunEstimated: string | null;
  };
}

interface UserSettings {
  emailEnabled: boolean;
  emailAddress: string;
  minMatchScore: number;
  emailFrequency: string;
  preferredJobAge: number;
  maxJobsPerEmail: number;
  targetRoles: string[];
  targetJobFamilies?: string[];
  preferredLocations?: string[];
  preferredCities?: string[];
  countryPreference?: string;
  verifiedOnly?: boolean;
  allowInternational?: boolean;
  workMode?: string;
}

type Page = 'dashboard' | 'jobs' | 'resume' | 'settings';

// ============ App ============
export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysis | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [resume, setResume] = useState<any>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [runningAutomation, setRunningAutomation] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [backendError, setBackendError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterWorkMode, setFilterWorkMode] = useState('all');
  const [filterMaxAge, setFilterMaxAge] = useState('');
  const [filterMinScore, setFilterMinScore] = useState('');
  const [filterVerifiedOnly, setFilterVerifiedOnly] = useState(false);
  const [filterIncludeInternational, setFilterIncludeInternational] = useState(false);
  const [sortBy, setSortBy] = useState('match');
  const [showFilters, setShowFilters] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const checkBackendHealth = useCallback(async (): Promise<boolean> => {
    try {
      const res = await api.checkHealth();
      if (res && (res.status === 'ok' || res.status === 'UP')) {
        setBackendStatus('connected');
        setBackendError(null);
        return true;
      }
      setBackendStatus('disconnected');
      setBackendError('Unexpected response from backend health check');
      return false;
    } catch (err: any) {
      setBackendStatus('disconnected');
      setBackendError(err.message || 'Connection refused');
      return false;
    }
  }, []);

  // ============ Data Loading ============
  const loadStats = useCallback(async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch { /* ignore */ }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const params: Record<string, string> = { sortBy };
      if (searchQuery) params.search = searchQuery;
      if (filterCity) params.city = filterCity;
      if (filterWorkMode !== 'all') params.workMode = filterWorkMode;
      if (filterMaxAge) params.maxAge = filterMaxAge;
      if (filterMinScore) params.minScore = filterMinScore;
      if (filterVerifiedOnly) params.verifiedOnly = 'true';
      if (filterIncludeInternational) {
        params.international = 'true';
        params.allowInternational = 'true';
      }

      const data = await api.getJobs(params);
      setJobs(data.jobs || []);
    } catch (err: any) {
      showToast('Failed to load jobs: ' + err.message, 'error');
    }
  }, [searchQuery, filterCity, filterWorkMode, filterMaxAge, filterMinScore, filterVerifiedOnly, filterIncludeInternational, sortBy, showToast]);

  const loadResumeAndProfile = useCallback(async () => {
    try {
      const resumeData = await api.getResume();
      setResume(resumeData);
      if (resumeData?.hasResume) {
        const profileData = await api.getProfile();
        if (profileData?.profile) {
          setCandidateProfile(profileData.profile);
          try {
            localStorage.setItem('jobpulse_candidate_profile', JSON.stringify(profileData.profile));
            localStorage.setItem('jobpulse_resume_data', JSON.stringify(resumeData));
          } catch {}
        }
      } else {
        // If backend returns hasResume: false (e.g. after Vercel serverless cold restart), restore from browser storage
        const cachedProfileStr = typeof window !== 'undefined' ? localStorage.getItem('jobpulse_candidate_profile') : null;
        const cachedResumeStr = typeof window !== 'undefined' ? localStorage.getItem('jobpulse_resume_data') : null;
        if (cachedProfileStr) {
          try {
            const cachedProfile = JSON.parse(cachedProfileStr);
            const cachedResume = cachedResumeStr ? JSON.parse(cachedResumeStr) : {
              hasResume: true,
              resume: { filename: 'Uploaded Resume Document', uploadedAt: new Date().toISOString() }
            };
            setResume(cachedResume);
            setCandidateProfile(cachedProfile);
            // Re-sync with backend so serverless instance has the profile populated
            api.updateProfile(cachedProfile).catch(() => {});
          } catch {}
        } else {
          setCandidateProfile(null);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch { /* ignore */ }
  }, []);

  const reloadAllData = useCallback(async () => {
    setLoading(true);
    await checkBackendHealth();
    await Promise.all([loadStats(), loadJobs(), loadResumeAndProfile(), loadSettings()]);
    setLoading(false);
  }, [checkBackendHealth, loadStats, loadJobs, loadResumeAndProfile, loadSettings]);

  useEffect(() => {
    reloadAllData();
  }, [reloadAllData]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // ============ Actions ============
  const handleRefreshJobs = async () => {
    try {
      setLoading(true);
      await api.refreshJobs();
      await loadJobs();
      await loadStats();
      showToast('Jobs refreshed from legitimate live sources!', 'success');
    } catch (err: any) {
      showToast('Failed to refresh: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeAll = async () => {
    if (!resume?.hasResume) {
      showToast('Please upload your resume first to enable AI matching!', 'error');
      setPage('resume');
      return;
    }
    try {
      setAnalyzing(true);
      showToast('Analyzing and scoring all jobs with structured AI engine...', 'info');
      const result = await api.analyzeAllJobs();
      showToast(`✅ Successfully evaluated ${result.analyzed} jobs against candidate profile!`, 'success');
      await Promise.all([loadJobs(), loadStats()]);
    } catch (err: any) {
      showToast('Analysis failed: ' + err.message, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzeJob = async (jobId: string) => {
    if (!resume?.hasResume) {
      showToast('Please upload your resume first!', 'error');
      return;
    }
    try {
      setAnalyzing(true);
      const result = await api.analyzeJob(jobId);
      setJobAnalysis(result.analysis);
      await loadJobs();
      await loadStats();
      showToast('Job analyzed successfully!', 'success');
    } catch (err: any) {
      showToast('AI analysis temporarily unavailable: ' + err.message, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleVerifyJob = async (jobId: string) => {
    try {
      setVerifyingId(jobId);
      showToast('Conducting live verification check against employer link...', 'info');
      const result = await api.verifyJob(jobId);
      const updatedVerification: VerificationDetails = result.verification;

      // Update in selectedJob if currently viewing
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob({ ...selectedJob, verification: updatedVerification });
      }

      // Update in jobs list
      setJobs(prev =>
        prev.map(j => (j.id === jobId ? { ...j, verification: updatedVerification } : j))
      );

      const statusLabels: Record<VerificationStatus, string> = {
        VERIFIED_OPEN: '✅ Verified Active: Application link is authentic and open.',
        LIKELY_OPEN: '🟡 Likely Open: Listing accessible, active application not conclusively verified.',
        EXPIRED_OR_CLOSED: '🔴 Vacancy Closed / Expired.',
        INVALID_LINK: '❌ Invalid application link.',
        VERIFICATION_BLOCKED: '⚠️ Verification blocked by access controls.',
        UNKNOWN: '⚪ Status inconclusive.',
      };

      showToast(statusLabels[updatedVerification.status] || 'Verification updated', 'info');
    } catch (err: any) {
      showToast('Verification check failed: ' + err.message, 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleViewJob = async (job: Job) => {
    setSelectedJob(job);
    setJobAnalysis(null);
    try {
      const detail = await api.getJobById(job.id);
      if (detail.analysis) {
        setJobAnalysis(detail.analysis);
      }
      if (detail.verification) {
        setSelectedJob(detail);
      } else if (detail.job?.verification) {
        setSelectedJob(detail.job);
      }
    } catch { /* ignore */ }
  };

  const handleUploadResume = async (file: File) => {
    try {
      setLoading(true);
      const result = await api.uploadResume(file);
      showToast(result.message || 'Resume uploaded and analyzed!', 'success');
      if (result.profile) {
        setCandidateProfile(result.profile);
        try {
          localStorage.setItem('jobpulse_candidate_profile', JSON.stringify(result.profile));
          if (result.resume) {
            localStorage.setItem('jobpulse_resume_data', JSON.stringify({ hasResume: true, resume: result.resume, profile: result.profile }));
          }
        } catch {}
      }
      await loadResumeAndProfile();
      await loadJobs();
      await loadStats();
    } catch (err: any) {
      showToast('Upload failed: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (updatedProfile: Partial<CandidateProfile>) => {
    try {
      setLoading(true);
      const result = await api.updateProfile(updatedProfile);
      if (result.profile) {
        setCandidateProfile(result.profile);
        try {
          localStorage.setItem('jobpulse_candidate_profile', JSON.stringify(result.profile));
        } catch {}
      }
      showToast('Candidate profile updated! Recommendations recalculated.', 'success');
      await Promise.all([loadJobs(), loadStats()]);
    } catch (err: any) {
      showToast('Failed to update candidate profile: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (updates: Partial<UserSettings>) => {
    try {
      const result = await api.updateSettings(updates);
      setSettings(result.settings);
      showToast('Settings saved!', 'success');
    } catch (err: any) {
      showToast('Failed to save settings: ' + err.message, 'error');
    }
  };

  const handleTestEmail = async () => {
    try {
      const result = await api.sendTestEmail(settings?.emailAddress);
      showToast(result.message, result.success ? 'success' : 'error');
    } catch (err: any) {
      showToast('Email test failed: ' + err.message, 'error');
    }
  };

  const handleRunAutomation = async () => {
    try {
      setRunningAutomation(true);
      showToast('🚀 Running full automation cycle (Discover → Match → Deduplicate → Alert)...', 'info');
      const result = await api.triggerAutomation();
      if (result.success) {
        showToast(result.message || 'Automation cycle completed successfully!', 'success');
      } else {
        showToast(result.message || 'Automation notice', 'info');
      }
      await Promise.all([loadStats(), loadJobs()]);
    } catch (err: any) {
      showToast('Automation failed: ' + err.message, 'error');
    } finally {
      setRunningAutomation(false);
    }
  };

  // ============ Helper Formatting ============
  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-surface-400';
    if (score >= 80) return 'text-emerald-400';
    if (score >= 65) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number | null) => {
    if (!score) return '';
    if (score >= 80) return '🔥 Excellent Match';
    if (score >= 65) return '🟢 Good Match';
    if (score >= 50) return '🟡 Possible Match';
    return '🔴 Low Match';
  };

  const getScoreBg = (score: number | null) => {
    if (!score) return 'bg-surface-700';
    if (score >= 80) return 'bg-gradient-to-r from-emerald-600 to-emerald-500';
    if (score >= 65) return 'bg-gradient-to-r from-green-600 to-green-500';
    if (score >= 50) return 'bg-gradient-to-r from-yellow-600 to-yellow-500';
    return 'bg-gradient-to-r from-red-600 to-red-500';
  };

  return (
    <div className="min-h-screen bg-surface-950 text-white">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-accent-600/8 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => { setPage('dashboard'); setSelectedJob(null); }}
            >
              <Rocket className="w-6 h-6 text-primary-400" />
              <span className="font-bold text-lg tracking-tight">
                <span className="text-primary-400">JobPulse</span>
                <span className="text-white"> AI</span>
              </span>
              <span className="hidden sm:inline-flex ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary-500/15 text-primary-300 border border-primary-500/20">
                🇮🇳 India-First
              </span>
              {backendStatus === 'connected' ? (
                <span className="hidden md:inline-flex items-center gap-1.5 ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Backend Online
                </span>
              ) : backendStatus === 'checking' ? (
                <span className="hidden md:inline-flex items-center gap-1.5 ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-surface-700 text-surface-300 border border-white/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-surface-400 animate-pulse"></span>
                  Checking...
                </span>
              ) : (
                <button
                  onClick={() => { setPage('settings'); setSelectedJob(null); }}
                  className="hidden md:inline-flex items-center gap-1.5 ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-500/15 text-red-300 border border-red-500/25 hover:bg-red-500/25 transition-all cursor-pointer"
                  title={backendError || 'Backend unreachable. Click to configure in Settings.'}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                  Backend Offline (Connect)
                </button>
              )}
              {stats?.demoMode ? (
                <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider" title="Demo mode enabled: Using sample job listings. Provide API keys in settings to fetch live vacancies.">
                  Demo Mode
                </span>
              ) : stats?.realSourceConfigured ? (
                <span className="hidden lg:inline-flex items-center gap-1 ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" title={`Connected to live vacancies: ${stats?.jobProvider || 'Live Provider'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Live Vacancies
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-1">
              {([
                { key: 'dashboard', icon: BarChart3, label: 'Dashboard' },
                { key: 'jobs', icon: Briefcase, label: 'Jobs' },
                { key: 'resume', icon: FileText, label: 'Resume & Profile' },
                { key: 'settings', icon: Settings, label: 'Settings' },
              ] as const).map(item => (
                <button
                  key={item.key}
                  onClick={() => { setPage(item.key); setSelectedJob(null); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    page === item.key
                      ? 'bg-primary-600/20 text-primary-300 shadow-lg shadow-primary-600/10'
                      : 'text-surface-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border animate-slide-up max-w-sm ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-red-900/90 border-red-500/30 text-red-200'
              : 'bg-primary-900/90 border-primary-500/30 text-primary-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span className="text-sm">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {selectedJob ? (
          <JobDetailView
            job={selectedJob}
            stats={stats}
            analysis={jobAnalysis}
            analyzing={analyzing}
            verifying={verifyingId === selectedJob.id}
            onBack={() => setSelectedJob(null)}
            onAnalyze={() => handleAnalyzeJob(selectedJob.id)}
            onVerify={() => handleVerifyJob(selectedJob.id)}
            getScoreColor={getScoreColor}
            getScoreLabel={getScoreLabel}
            getScoreBg={getScoreBg}
          />
        ) : page === 'dashboard' ? (
          <DashboardView
            stats={stats}
            jobs={jobs}
            loading={loading}
            analyzing={analyzing}
            runningAutomation={runningAutomation}
            candidateProfile={candidateProfile}
            backendStatus={backendStatus}
            backendError={backendError}
            onRefresh={handleRefreshJobs}
            onAnalyzeAll={handleAnalyzeAll}
            onRunAutomation={handleRunAutomation}
            onViewJob={handleViewJob}
            onGoToJobs={() => setPage('jobs')}
            onGoToResume={() => setPage('resume')}
            onGoToSettings={() => setPage('settings')}
            onSelectCity={(city: string) => {
              setFilterCity(city);
              setPage('jobs');
            }}
            getScoreColor={getScoreColor}
            getScoreBg={getScoreBg}
          />
        ) : page === 'jobs' ? (
          <JobsView
            jobs={jobs}
            stats={stats}
            loading={loading}
            analyzing={analyzing}
            verifyingId={verifyingId}
            searchQuery={searchQuery}
            filterCity={filterCity}
            filterWorkMode={filterWorkMode}
            filterMaxAge={filterMaxAge}
            filterMinScore={filterMinScore}
            filterVerifiedOnly={filterVerifiedOnly}
            filterIncludeInternational={filterIncludeInternational}
            sortBy={sortBy}
            showFilters={showFilters}
            onSearchChange={setSearchQuery}
            onCityChange={setFilterCity}
            onWorkModeChange={setFilterWorkMode}
            onMaxAgeChange={setFilterMaxAge}
            onMinScoreChange={setFilterMinScore}
            onVerifiedOnlyChange={setFilterVerifiedOnly}
            onIncludeInternationalChange={setFilterIncludeInternational}
            onSortChange={setSortBy}
            onToggleFilters={() => setShowFilters(!showFilters)}
            onViewJob={handleViewJob}
            onVerifyJob={handleVerifyJob}
            onAnalyzeAll={handleAnalyzeAll}
            onRefresh={handleRefreshJobs}
            getScoreColor={getScoreColor}
            getScoreBg={getScoreBg}
          />
        ) : page === 'resume' ? (
          <ResumeView
            resume={resume}
            candidateProfile={candidateProfile}
            loading={loading}
            onUpload={handleUploadResume}
            onUpdateProfile={handleUpdateProfile}
            onDelete={async () => {
              await api.deleteResume();
              try {
                localStorage.removeItem('jobpulse_candidate_profile');
                localStorage.removeItem('jobpulse_resume_data');
              } catch {}
              setResume(null);
              setCandidateProfile(null);
              await loadResumeAndProfile();
              showToast('Resume and candidate profile removed', 'info');
            }}
          />
        ) : page === 'settings' ? (
          <SettingsView
            settings={settings}
            stats={stats}
            runningAutomation={runningAutomation}
            backendStatus={backendStatus}
            backendError={backendError}
            onCheckBackend={checkBackendHealth}
            onReloadAll={reloadAllData}
            showToast={showToast}
            onSave={handleSaveSettings}
            onTestEmail={handleTestEmail}
            onRunAutomation={handleRunAutomation}
          />
        ) : null}
      </main>
    </div>
  );
}

// ============ Verification Status Badge Component ============
function VerificationBadge({ status }: { status?: VerificationStatus }) {
  if (status === 'VERIFIED_OPEN') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <ShieldCheck className="w-3 h-3 text-emerald-400" />
        Verified Active
      </span>
    );
  }
  if (status === 'LIKELY_OPEN') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <Clock className="w-3 h-3 text-amber-400" />
        Accessible (Likely Open)
      </span>
    );
  }
  if (status === 'EXPIRED_OR_CLOSED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
        <ShieldAlert className="w-3 h-3 text-red-400" />
        Closed / Expired
      </span>
    );
  }
  if (status === 'INVALID_LINK') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-900/30 text-red-300 border border-red-700/30">
        <AlertTriangle className="w-3 h-3 text-red-300" />
        Invalid Link
      </span>
    );
  }
  if (status === 'VERIFICATION_BLOCKED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
        <ShieldAlert className="w-3 h-3 text-purple-300" />
        Verification Blocked
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-800 text-surface-400 border border-white/5">
      <Clock className="w-3 h-3 text-surface-400" />
      Unverified
    </span>
  );
}

// ============ Dashboard View ============
function DashboardView({
  stats, jobs, loading, analyzing, runningAutomation, candidateProfile,
  backendStatus, backendError,
  onRefresh, onAnalyzeAll, onRunAutomation, onViewJob, onGoToJobs, onGoToResume, onGoToSettings,
  onSelectCity,
  getScoreColor, getScoreBg
}: any) {
  const topJobs = jobs
    .filter((j: Job) => j.matchScore !== null)
    .sort((a: Job, b: Job) => (b.matchScore || 0) - (a.matchScore || 0))
    .slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Backend Disconnected Notice Banner */}
      {backendStatus === 'disconnected' && (
        <div className="glass-card p-5 border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-surface-900 to-amber-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-up">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-200">Express Backend Offline / Unreachable</p>
              <p className="text-xs text-surface-300 mt-0.5 leading-relaxed">
                Express API is currently offline or unreachable. Real job discovery, PDF resume parsing, and email alerts require the backend API.
              </p>
            </div>
          </div>
          <button
            onClick={onGoToSettings}
            className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/30 transition-all shrink-0 cursor-pointer"
          >
            Connect Backend in Settings →
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-900/60 via-surface-900 to-accent-900/40 border border-white/5 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
        <div className="relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-primary-300 via-primary-400 to-accent-400 bg-clip-text text-transparent">JobPulse AI</span>
                  <span className="ml-2">🚀</span>
                </h1>
                {backendStatus === 'connected' ? (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Backend Live
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Static Frontend Mode
                  </span>
                )}
              </div>
              <p className="mt-2 text-surface-400 text-sm sm:text-base">
                Resume-Driven Job Discovery • Live Vacancy Verification • India-First Recommendations
              </p>
              {candidateProfile && (
                <div className="flex items-center gap-2 mt-3 text-xs text-primary-300">
                  <span className="font-semibold">Candidate:</span>
                  <span className="bg-primary-500/15 px-2 py-0.5 rounded border border-primary-500/20">
                    {candidateProfile.experienceLevel}
                  </span>
                  <span>• Target: {candidateProfile.targetRoles.slice(0, 3).join(', ')}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onRefresh}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Jobs
              </button>
              <button
                onClick={onAnalyzeAll}
                disabled={analyzing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 transition-all shadow-lg shadow-primary-600/25 disabled:opacity-50"
              >
                <Zap className={`w-4 h-4 ${analyzing ? 'animate-pulse' : ''}`} />
                {analyzing ? 'Analyzing...' : 'AI Analyze All'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Background Automation Control Banner */}
      <div className="glass-card p-6 border-primary-500/30 bg-gradient-to-r from-primary-950/40 via-surface-900 to-primary-950/20 animate-fade-in">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                backendStatus === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-surface-800 text-surface-400 border border-white/5'
              }`}>
                <span className={`w-2 h-2 rounded-full ${backendStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-surface-500'}`}></span>
                {backendStatus === 'connected' ? 'Automation Pipeline Ready' : 'Backend Disconnected'}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-500/15 text-primary-300 border border-primary-500/20">
                💼 Provider: {stats?.jobProvider || 'Live Sources (Adzuna + Remotive)'}
              </span>
              {stats?.scheduler?.dailyTime && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-surface-800 text-surface-300 border border-white/5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-primary-400" />
                  Scheduled Daily at {stats.scheduler.dailyTime} IST
                </span>
              )}
            </div>

            <div className="text-sm text-surface-300">
              {stats?.scheduler?.lastRun?.message ? (
                <p className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{stats.scheduler.lastRun.message}</span>
                </p>
              ) : (
                <p className="text-surface-400">
                  Background automation cycle runs daily to discover matching roles, verify vacancy status, and alert you.
                </p>
              )}
              {stats?.scheduler?.lastRun?.timestamp && (
                <p className="text-xs text-surface-500 mt-1">
                  Last cycle: {new Date(stats.scheduler.lastRun.timestamp).toLocaleTimeString()} • Next cycle: {stats?.scheduler?.nextRunEstimated ? new Date(stats.scheduler.nextRunEstimated).toLocaleTimeString() : 'Tomorrow 09:00 AM'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onRunAutomation}
              disabled={runningAutomation || loading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${runningAutomation ? 'animate-spin' : ''}`} />
              {runningAutomation ? 'Executing Automation...' : '⚡ Run Full Automation Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Jobs Found', value: stats?.totalJobs || 0, icon: '💼', color: 'text-primary-400' },
          { label: 'Verified Open', value: stats?.verifiedOpenJobs || 0, icon: '🛡️', color: 'text-emerald-400' },
          { label: 'India Priority', value: stats?.indiaJobsCount || 0, icon: '🇮🇳', color: 'text-blue-400' },
          { label: 'Excellent (80%+)', value: stats?.excellentMatch || 0, icon: '🔥', color: 'text-emerald-400' },
          { label: 'Good Match', value: stats?.goodMatch || 0, icon: '🟢', color: 'text-green-400' },
          { label: 'Possible Match', value: stats?.possibleMatch || 0, icon: '🟡', color: 'text-yellow-400' },
        ].map((stat, i) => (
          <div key={i} className={`glass-card p-4 animate-fade-in stagger-${Math.min(i + 1, 4)}`}>
            <div className="text-lg mb-1">{stat.icon}</div>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-surface-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Resume Call-to-action */}
      {!stats?.hasResume && (
        <div className="glass-card p-6 border-amber-500/20 bg-amber-950/20 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Upload className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-200">Upload Your Resume to Begin</h3>
              <p className="text-sm text-amber-300/60">
                Upload your resume (PDF/DOCX) to automatically generate your candidate profile and calculate transparent match scores.
              </p>
            </div>
            <button
              onClick={onGoToResume}
              className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-all"
            >
              Upload Now
            </button>
          </div>
        </div>
      )}

      {/* India-First Job Discovery Hub & City Breakdown */}
      <div className="glass-card p-6 border-blue-500/20 bg-gradient-to-r from-blue-950/30 via-surface-900 to-indigo-950/20 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span>🇮🇳</span> India Job Discovery Hub
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {stats?.indiaJobsCount || 0} Priority Positions
              </span>
            </h3>
            <p className="text-xs text-surface-400 mt-1">
              Live vacancies prioritized for Bengaluru, Pune, Mumbai, Maharashtra, Delhi NCR, Hyderabad, Chennai, Bidar, and Remote India.
            </p>
          </div>
          <button
            onClick={() => {
              if (onSelectCity) onSelectCity('');
              else onGoToJobs();
            }}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 shrink-0"
          >
            Explore All India Jobs <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* City Distribution Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {[
            { name: 'Bengaluru', label: 'Bengaluru' },
            { name: 'Pune', label: 'Pune' },
            { name: 'Mumbai', label: 'Mumbai' },
            { name: 'Delhi NCR', label: 'Delhi NCR' },
            { name: 'Hyderabad', label: 'Hyderabad' },
            { name: 'Chennai', label: 'Chennai' },
            { name: 'Bidar', label: 'Bidar' },
            { name: 'Nagpur', label: 'Nagpur' },
            { name: 'Nashik', label: 'Nashik' },
            { name: 'Remote (India)', label: 'Remote (India)' },
          ].map(c => {
            const count = stats?.cityBreakdown?.[c.name] || 0;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => {
                  if (onSelectCity) onSelectCity(c.name === 'Remote (India)' ? 'Remote' : c.name);
                  else onGoToJobs();
                }}
                className="px-3 py-1.5 rounded-xl bg-surface-800/80 hover:bg-surface-700 border border-white/5 text-xs flex items-center gap-2 transition-all hover:border-blue-500/30"
              >
                <span className="text-surface-300 font-medium">{c.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  count > 0 ? 'bg-blue-500/20 text-blue-300' : 'bg-surface-700/60 text-surface-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Matched Jobs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-400" />
            Top Matched Positions
          </h2>
          <button onClick={onGoToJobs} className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {topJobs.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold mb-2">No Analyzed Matches Yet</h3>
            <p className="text-surface-400 text-sm mb-4">
              Upload your resume and click "AI Analyze All" to evaluate jobs against your profile.
            </p>
            <button onClick={onGoToJobs} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-500 transition-all">
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topJobs.map((job: Job, i: number) => (
              <JobCard
                key={job.id}
                job={job}
                index={i}
                stats={stats}
                onView={onViewJob}
                getScoreColor={getScoreColor}
                getScoreBg={getScoreBg}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Job Card Component ============
function JobCard({ job, index, stats, onView, getScoreColor, getScoreBg }: any) {
  return (
    <div
      className="glass-card p-5 cursor-pointer group animate-fade-in hover:border-primary-500/40 transition-all flex flex-col justify-between"
      style={{ animationDelay: `${index * 0.04}s` }}
      onClick={() => onView(job)}
    >
      <div>
        {/* Verification Status & India Location Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <VerificationBadge status={job.verification?.status} />

          {job.isIndiaLocation ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/20">
              <MapPin className="w-3 h-3 text-blue-400" />
              {job.city || 'India'}
            </span>
          ) : job.isRemoteEligibleIndia ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
              <Globe className="w-3 h-3 text-emerald-400" />
              Remote (India-Eligible)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-800 text-surface-400">
              <Globe className="w-3 h-3" />
              {job.country || 'International'}
            </span>
          )}
        </div>

        {/* Match Score */}
        {job.matchScore !== null && (
          <div className="flex items-center justify-between mb-2">
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${getScoreBg(job.matchScore)} text-white`}>
              {job.matchScore}% Match
            </span>
            <span className="text-xs text-surface-400">
              {job.matchScore >= 80 ? '🔥' : job.matchScore >= 65 ? '🟢' : job.matchScore >= 50 ? '🟡' : '🔴'}
            </span>
          </div>
        )}

        {/* Title & Company */}
        <h3 className="font-semibold text-white group-hover:text-primary-300 transition-colors line-clamp-1">
          {job.title}
        </h3>
        <p className="text-sm text-surface-400 mt-0.5">{job.company}</p>

        {/* Details & Recency */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 text-xs text-surface-400">
          <span>📍 {job.location}</span>
          <span title={`Posted: ${job.postedDate || 'Date unverified'}`}>
            🕐 {job.timeAgo}
          </span>
          <span>💼 {job.experienceLevel}</span>
        </div>

        {/* Work Mode */}
        <div className="mt-2">
          <span
            className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
              job.workMode === 'Remote'
                ? 'bg-emerald-500/15 text-emerald-400'
                : job.workMode === 'Hybrid'
                ? 'bg-blue-500/15 text-blue-400'
                : 'bg-surface-700 text-surface-300'
            }`}
          >
            {job.workMode}
          </span>
          <span className="text-[10px] text-surface-500 ml-2">via {job.source}</span>
        </div>

        {/* Eligibility Warning Notice */}
        {job.eligibilityConcerns && job.eligibilityConcerns.length > 0 && (
          <div className="mt-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{job.eligibilityConcerns[0]}</span>
          </div>
        )}

        {/* Skills Matched Pills */}
        <div className="flex flex-wrap gap-1 mt-3">
          {job.requiredSkills.slice(0, 4).map((skill: string, i: number) => (
            <span
              key={i}
              className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                job.skillsMatched?.includes(skill)
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'bg-surface-800 text-surface-400'
              }`}
            >
              {skill}
            </span>
          ))}
          {job.requiredSkills.length > 4 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] text-surface-500">
              +{job.requiredSkills.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* Footer View Link */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-[11px] text-surface-400">
          {job.salary || 'Competitive'}
        </span>
        <span className="text-xs text-primary-400 group-hover:text-primary-300 flex items-center gap-1 font-medium">
          View & Verify <ArrowUpRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}

// ============ Jobs View ============
function JobsView({
  jobs, stats, loading, analyzing, verifyingId, searchQuery, filterCity,
  filterWorkMode, filterMaxAge, filterMinScore, filterVerifiedOnly,
  filterIncludeInternational, sortBy, showFilters, onSearchChange, onCityChange,
  onWorkModeChange, onMaxAgeChange, onMinScoreChange, onVerifiedOnlyChange,
  onIncludeInternationalChange, onSortChange, onToggleFilters, onViewJob,
  onVerifyJob, onAnalyzeAll, onRefresh, getScoreColor, getScoreBg
}: any) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary-400" />
            Live Job Listings
          </h1>
          <p className="text-sm text-surface-400 mt-1">
            {jobs.length} positions matched against verified live sources
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Jobs
          </button>
          <button
            onClick={onAnalyzeAll}
            disabled={analyzing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-500 transition-all disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${analyzing ? 'animate-pulse' : ''}`} />
            {analyzing ? 'Analyzing...' : 'AI Analyze All'}
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search jobs, tech skills, locations (e.g. SOC Analyst, Cybersecurity, Bengaluru)..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-800/50 border border-white/5 rounded-xl text-sm text-white placeholder-surface-500 focus:outline-none focus:border-primary-500/50"
            />
          </div>
          <button
            onClick={onToggleFilters}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm transition-all ${
              showFilters
                ? 'bg-primary-600/20 border-primary-500/30 text-primary-300'
                : 'bg-surface-800/50 border-white/5 text-surface-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

        {/* India-First Priority Cities Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-surface-400 font-semibold uppercase tracking-wider mr-1">
            🇮🇳 Priority Locations:
          </span>
          {[
            { key: '', label: 'All India' },
            { key: 'Bengaluru', label: 'Bengaluru' },
            { key: 'Pune', label: 'Pune' },
            { key: 'Mumbai', label: 'Mumbai' },
            { key: 'Delhi NCR', label: 'Delhi NCR' },
            { key: 'Hyderabad', label: 'Hyderabad' },
            { key: 'Chennai', label: 'Chennai' },
            { key: 'Bidar', label: 'Bidar' },
            { key: 'Nagpur', label: 'Nagpur' },
            { key: 'Nashik', label: 'Nashik' },
            { key: 'Remote', label: 'Remote (India)' },
          ].map(city => (
            <button
              key={city.key}
              type="button"
              onClick={() => onCityChange(city.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                filterCity === city.key
                  ? 'bg-primary-600 text-white shadow-sm ring-1 ring-primary-400/40'
                  : 'bg-surface-800/80 hover:bg-surface-700 text-surface-300 border border-white/5'
              }`}
            >
              {city.label}
            </button>
          ))}
        </div>

        {/* Filter Quick Toggles */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium bg-surface-800/60 hover:bg-surface-800 px-3 py-1.5 rounded-lg border border-white/5">
            <input
              type="checkbox"
              checked={filterVerifiedOnly}
              onChange={e => onVerifiedOnlyChange(e.target.checked)}
              className="rounded bg-surface-900 border-white/20 text-primary-600 focus:ring-0"
            />
            <span className="flex items-center gap-1 text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Verified Open Only
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium bg-surface-800/60 hover:bg-surface-800 px-3 py-1.5 rounded-lg border border-white/5">
            <input
              type="checkbox"
              checked={filterIncludeInternational}
              onChange={e => onIncludeInternationalChange(e.target.checked)}
              className="rounded bg-surface-900 border-white/20 text-primary-600 focus:ring-0"
            />
            <span className="flex items-center gap-1 text-surface-300">
              <Globe className="w-3.5 h-3.5 text-surface-400" />
              Include International Roles
            </span>
          </label>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/5 animate-fade-in">
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Work Mode</label>
              <select
                value={filterWorkMode}
                onChange={e => onWorkModeChange(e.target.value)}
                className="w-full px-3 py-2 bg-surface-800 border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500/50"
              >
                <option value="all">All Modes</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Strict Recency</label>
              <select
                value={filterMaxAge}
                onChange={e => onMaxAgeChange(e.target.value)}
                className="w-full px-3 py-2 bg-surface-800 border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500/50"
              >
                <option value="">All Time</option>
                <option value="24">Last 24 Hours</option>
                <option value="72">Last 3 Days</option>
                <option value="168">Last 7 Days</option>
                <option value="336">Last 14 Days</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Min Match Score</label>
              <select
                value={filterMinScore}
                onChange={e => onMinScoreChange(e.target.value)}
                className="w-full px-3 py-2 bg-surface-800 border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500/50"
              >
                <option value="">Any Score</option>
                <option value="80">80%+ (Excellent)</option>
                <option value="65">65%+ (Good)</option>
                <option value="50">50%+ (Possible)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Sort By</label>
              <select
                value={sortBy}
                onChange={e => onSortChange(e.target.value)}
                className="w-full px-3 py-2 bg-surface-800 border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500/50"
              >
                <option value="match">Highest Match Score</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="company">Company Name</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Jobs Grid */}
      {jobs.length === 0 ? (
        <div className="glass-card p-12 text-center max-w-xl mx-auto my-8 animate-fade-in">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-lg font-semibold text-white mb-2">No Matching Vacancies Found</h3>
          <p className="text-surface-400 text-sm leading-relaxed mb-4">
            No vacancies currently match the selected filters or recency threshold. We adhere to honest vacancy reporting and never display manufactured records.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                onVerifiedOnlyChange(false);
                onMaxAgeChange('');
                onMinScoreChange('');
                onSearchChange('');
                if (onCityChange) onCityChange('');
              }}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 transition-all"
            >
              Reset Filters
            </button>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh from Live Sources
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job: Job, i: number) => (
            <JobCard
              key={job.id}
              job={job}
              index={i}
              stats={stats}
              onView={onViewJob}
              getScoreColor={getScoreColor}
              getScoreBg={getScoreBg}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Job Detail View ============
function JobDetailView({
  job, stats, analysis, analyzing, verifying, onBack, onAnalyze, onVerify,
  getScoreColor, getScoreLabel, getScoreBg
}: any) {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-surface-400 hover:text-white transition-colors"
      >
        <ChevronRight className="w-4 h-4 rotate-180" /> Back to Job Listings
      </button>

      {/* Main Job Info Card */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <VerificationBadge status={job.verification?.status} />
              {job.isIndiaLocation && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/20">
                  🇮🇳 India Location ({job.city || job.location})
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold">{job.title}</h1>
            <p className="text-surface-300 mt-1 text-lg font-medium">{job.company}</p>

            <div className="flex flex-wrap gap-3 mt-3 text-sm text-surface-400">
              <span>📍 {job.location}</span>
              <span>
                📅 {job.postedDate ? new Date(job.postedDate).toLocaleDateString() : 'Date unverified'} ({job.timeAgo})
              </span>
              <span>💼 {job.experienceLevel}</span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  job.workMode === 'Remote'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : job.workMode === 'Hybrid'
                    ? 'bg-blue-500/15 text-blue-400'
                    : 'bg-surface-700 text-surface-300'
                }`}
              >
                {job.workMode}
              </span>
            </div>

            {job.salary && <p className="mt-2 text-sm text-primary-300">💰 {job.salary}</p>}
            <p className="mt-2 text-xs text-surface-400">
              <span className="text-surface-500">Source:</span> <span className="text-white font-medium">{job.source}</span>
            </p>
          </div>

          {analysis && (
            <div className={`px-5 py-3 rounded-xl text-center shrink-0 ${getScoreBg(analysis.matchScore)}`}>
              <div className="text-3xl font-bold text-white">{analysis.matchScore}%</div>
              <div className="text-xs font-medium text-white/80 mt-1">Match Score</div>
            </div>
          )}
        </div>

        {/* Live Verification Status Card */}
        <div className="mt-5 p-4 rounded-xl bg-surface-900/90 border border-white/10 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white">Live Vacancy Verification</span>
                <VerificationBadge status={job.verification?.status} />
              </div>
              <p className="text-xs text-surface-400 mt-1">
                {job.verification?.evidence || 'No verification check has been conducted yet.'}
              </p>
              {job.verification?.checkedAt && (
                <p className="text-[11px] text-surface-500 mt-0.5">
                  Last verified: {new Date(job.verification.checkedAt).toLocaleString()}
                  {job.verification.responseTimeMs ? ` • Response: ${job.verification.responseTimeMs}ms` : ''}
                </p>
              )}
            </div>

            <button
              onClick={onVerify}
              disabled={verifying}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-600/30 transition-all shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
              {verifying ? 'Verifying URL...' : 'Check Live Status'}
            </button>
          </div>

          {/* Application URL */}
          <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 overflow-hidden w-full">
              <span className="font-semibold text-primary-300 shrink-0">🔗 Direct Apply URL:</span>
              <a
                href={job.applyUrl || job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300 hover:underline truncate max-w-full"
                title={job.applyUrl || job.url}
              >
                {job.applyUrl || job.url}
              </a>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-5">
          <a
            href={job.applyUrl || job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 transition-all shadow-lg shadow-primary-600/25"
          >
            Apply on Official Platform <ArrowUpRight className="w-4 h-4" />
          </a>
          <button
            onClick={onAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${analyzing ? 'animate-pulse' : ''}`} />
            {analyzing ? 'Evaluating...' : analysis ? 'Re-Evaluate Match' : 'AI Match Analysis'}
          </button>
        </div>
      </div>

      {/* Eligibility Warning Banner */}
      {job.eligibilityConcerns && job.eligibilityConcerns.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 animate-fade-in">
          <h3 className="text-sm font-semibold text-amber-200 flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Eligibility Assessment Notes
          </h3>
          <ul className="space-y-1 text-xs text-amber-300/90 list-disc list-inside">
            {job.eligibilityConcerns.map((concern: string, idx: number) => (
              <li key={idx}>{concern}</li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Analysis Details */}
      {analysis && (
        <div className="glass-card p-6 space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            🤖 Candidate Match Assessment
            <span className={`ml-2 text-sm font-normal ${getScoreColor(analysis.matchScore)}`}>
              {getScoreLabel(analysis.matchScore)}
            </span>
          </h2>

          {/* 5-Factor Score Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[
              { label: 'Job Family', value: analysis.scoreBreakdown.jobFamilyMatch ?? analysis.scoreBreakdown.roleMatch ?? 0, max: 25, color: 'bg-blue-500' },
              { label: 'Skills', value: analysis.scoreBreakdown.skillsMatch, max: 35, color: 'bg-emerald-500' },
              { label: 'Experience', value: analysis.scoreBreakdown.experienceMatch, max: 15, color: 'bg-violet-500' },
              { label: 'Education', value: analysis.scoreBreakdown.educationMatch, max: 15, color: 'bg-amber-500' },
              { label: 'Location', value: analysis.scoreBreakdown.locationMatch ?? 10, max: 10, color: 'bg-teal-500' },
            ].map(item => (
              <div key={item.label} className="bg-surface-800/50 rounded-lg p-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-surface-400">{item.label}</span>
                  <span className="text-white font-medium">{item.value}/{item.max}</span>
                </div>
                <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-700`}
                    style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Skills Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Demonstrated Skills Matched ({analysis.skillsMatched.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {analysis.skillsMatched.map((skill: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    ✅ {skill}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Missing / Unmatched Skills ({analysis.skillsMissing.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {analysis.skillsMissing.map((skill: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/15">
                    ⚠️ {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Experience Compatibility */}
          <div className="bg-surface-800/30 rounded-xl p-4">
            <h3 className="text-sm font-medium text-surface-300 mb-2">🎓 Experience & Role Fit</h3>
            <p className="text-sm text-surface-400">{analysis.experienceMatch}</p>
          </div>

          {/* Why Matched */}
          <div className="bg-surface-800/30 rounded-xl p-4">
            <h3 className="text-sm font-medium text-surface-300 mb-2">🎯 Why This Role Matches Your Profile</h3>
            <p className="text-sm text-surface-400">{analysis.whyMatch}</p>
          </div>

          {/* Suggestions */}
          {analysis.resumeSuggestions && (
            <div className="bg-primary-900/20 rounded-xl p-4 border border-primary-500/10">
              <h3 className="text-sm font-medium text-primary-300 mb-2">💡 Resume Optimization Tip</h3>
              <p className="text-sm text-primary-200/70">{analysis.resumeSuggestions}</p>
            </div>
          )}
        </div>
      )}

      {/* Full Job Description */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          📄 Authentic Job Description
        </h2>
        <div className="prose prose-invert max-w-none text-sm text-surface-300 whitespace-pre-wrap leading-relaxed">
          {job.description}
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-surface-300 mb-2">Required Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {job.requiredSkills.map((s: string, i: number) => (
                <span key={i} className="px-2 py-0.5 rounded text-xs bg-surface-800 text-surface-300">{s}</span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-surface-300 mb-2">Preferred Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {job.preferredSkills.map((s: string, i: number) => (
                <span key={i} className="px-2 py-0.5 rounded text-xs bg-surface-800 text-surface-400">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Resume & Candidate Profile View ============
function ResumeView({ resume, candidateProfile, loading, onUpload, onUpdateProfile, onDelete }: any) {
  const [dragOver, setDragOver] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Partial<CandidateProfile> | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newLocation, setNewLocation] = useState('');

  useEffect(() => {
    if (candidateProfile) {
      setEditingProfile(candidateProfile);
    }
  }, [candidateProfile]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  const handleSaveProfile = () => {
    if (editingProfile) {
      onUpdateProfile(editingProfile);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary-400" />
          Resume & Candidate Profile
        </h1>
        {candidateProfile && (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Universal Profile Active
          </span>
        )}
      </div>

      {/* Upload Box */}
      <div
        className={`glass-card p-8 text-center border-2 border-dashed transition-all cursor-pointer ${
          dragOver
            ? 'border-primary-400 bg-primary-900/20'
            : 'border-white/10 hover:border-primary-500/30'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('resume-input')?.click()}
      >
        <Upload className="w-10 h-10 text-primary-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold mb-1">
          {resume?.hasResume ? 'Upload a New Resume Document' : 'Upload Your Resume (PDF or DOCX)'}
        </h3>
        <p className="text-sm text-surface-400 mb-3">
          Drag and drop your file here, or click to browse. Universal parsing extracts degree, skills, and projects.
        </p>
        <p className="text-xs text-surface-500">Supported formats: PDF, DOCX • Magic byte validated</p>
        <input
          id="resume-input"
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Current Resume Metadata */}
      {resume?.hasResume && resume.resume && (
        <div className="glass-card p-5 animate-fade-in flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-300 text-sm">Resume File Analyzed</h3>
              <p className="text-xs text-surface-400">{resume.resume.filename}</p>
              <p className="text-[11px] text-surface-500 mt-0.5">Uploaded: {new Date(resume.resume.uploadedAt).toLocaleString()}</p>
            </div>
          </div>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Remove resume"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Universal Candidate Profile Review and Editor */}
      {editingProfile && (
        <div className="glass-card p-6 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Award className="w-5 h-5 text-primary-400" />
                Structured Candidate Profile
              </h2>
              <p className="text-xs text-surface-400 mt-0.5">
                Review and customize the extracted profile. Recommendations will automatically adapt to your changes.
              </p>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold shadow-lg shadow-primary-600/20 transition-all disabled:opacity-50"
            >
              Save & Recalculate
            </button>
          </div>

          {/* Extracted Education & Documented Projects Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-800/40 p-4 rounded-xl border border-white/5 space-y-2">
              <h3 className="text-xs font-semibold text-primary-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-primary-400" />
                Education & Degree
              </h3>
              {editingProfile.education && editingProfile.education.length > 0 ? (
                editingProfile.education.map((edu: EducationEntry, idx: number) => (
                  <div key={idx} className="text-xs text-surface-300">
                    <p className="font-semibold text-white">{edu.degree} in {edu.branch}</p>
                    <p className="text-surface-400">{edu.institution} {edu.graduationYear ? `(${edu.graduationYear})` : ''}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-surface-500">Degree details extracted from profile summary.</p>
              )}
            </div>

            <div className="bg-surface-800/40 p-4 rounded-xl border border-white/5 space-y-2">
              <h3 className="text-xs font-semibold text-primary-300 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-primary-400" />
                Key Documented Projects
              </h3>
              {editingProfile.projects && editingProfile.projects.length > 0 ? (
                editingProfile.projects.slice(0, 3).map((proj: ProjectEntry, idx: number) => (
                  <div key={idx} className="text-xs text-surface-300">
                    <p className="font-semibold text-white">{proj.title}</p>
                    <p className="text-surface-400 line-clamp-1">{proj.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-surface-500">No specific projects identified.</p>
              )}
            </div>
          </div>

          {/* Experience Level & Work Mode Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Experience Level</label>
              <select
                value={editingProfile.experienceLevel || 'Fresher'}
                onChange={e => setEditingProfile({ ...editingProfile, experienceLevel: e.target.value as any })}
                className="w-full px-3 py-2 bg-surface-800 border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500/50"
              >
                <option value="Fresher">Fresher (Entry Level)</option>
                <option value="Intern">Intern</option>
                <option value="Junior (0-2 years)">Junior (0-2 years)</option>
                <option value="Mid-Level (2-5 years)">Mid-Level (2-5 years)</option>
                <option value="Senior (5+ years)">Senior (5+ years)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-surface-400 mb-1 block">Work Mode Preference</label>
              <select
                value={editingProfile.workModePreference || 'All'}
                onChange={e => setEditingProfile({ ...editingProfile, workModePreference: e.target.value as any })}
                className="w-full px-3 py-2 bg-surface-800 border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500/50"
              >
                <option value="All">All Modes</option>
                <option value="Remote">Remote Only</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-surface-400 mb-1 block">Target Country</label>
              <input
                type="text"
                value={editingProfile.countryPreference || 'India'}
                onChange={e => setEditingProfile({ ...editingProfile, countryPreference: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500/50"
              />
            </div>
          </div>

          {/* Target Job Roles */}
          <div>
            <label className="text-xs text-surface-400 mb-1.5 block">
              Target Job Roles (Add or remove to tailor recommendations)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Add target role (e.g. Cybersecurity Intern, SOC Analyst, MERN Developer)..."
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newRole.trim()) {
                    const roles = editingProfile.targetRoles || [];
                    if (!roles.includes(newRole.trim())) {
                      setEditingProfile({ ...editingProfile, targetRoles: [...roles, newRole.trim()] });
                    }
                    setNewRole('');
                  }
                }}
                className="flex-1 px-3 py-2 bg-surface-800 border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500/50"
              />
              <button
                onClick={() => {
                  if (newRole.trim()) {
                    const roles = editingProfile.targetRoles || [];
                    if (!roles.includes(newRole.trim())) {
                      setEditingProfile({ ...editingProfile, targetRoles: [...roles, newRole.trim()] });
                    }
                    setNewRole('');
                  }
                }}
                className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg text-xs font-semibold"
              >
                Add Role
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(editingProfile.targetRoles || []).map((role: string, idx: number) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary-500/15 text-primary-300 border border-primary-500/20"
                >
                  {role}
                  <button
                    onClick={() => {
                      setEditingProfile({
                        ...editingProfile,
                        targetRoles: (editingProfile.targetRoles || []).filter(r => r !== role)
                      });
                    }}
                    className="hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Demonstrated Skills */}
          <div>
            <label className="text-xs text-surface-400 mb-1.5 block">
              Demonstrated Technical Skills
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Add technical skill (e.g. Docker, Python, OWASP, AWS)..."
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newSkill.trim()) {
                    const skills = editingProfile.demonstratedSkills || [];
                    if (!skills.includes(newSkill.trim())) {
                      setEditingProfile({ ...editingProfile, demonstratedSkills: [...skills, newSkill.trim()] });
                    }
                    setNewSkill('');
                  }
                }}
                className="flex-1 px-3 py-2 bg-surface-800 border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500/50"
              />
              <button
                onClick={() => {
                  if (newSkill.trim()) {
                    const skills = editingProfile.demonstratedSkills || [];
                    if (!skills.includes(newSkill.trim())) {
                      setEditingProfile({ ...editingProfile, demonstratedSkills: [...skills, newSkill.trim()] });
                    }
                    setNewSkill('');
                  }
                }}
                className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg text-xs font-semibold"
              >
                Add Skill
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {(editingProfile.demonstratedSkills || []).map((skill: string, idx: number) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                >
                  {skill}
                  <button
                    onClick={() => {
                      setEditingProfile({
                        ...editingProfile,
                        demonstratedSkills: (editingProfile.demonstratedSkills || []).filter(s => s !== skill)
                      });
                    }}
                    className="hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Preferred Locations */}
          <div>
            <label className="text-xs text-surface-400 mb-1.5 block">
              Preferred Locations (India-First)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Add preferred location (e.g. Bengaluru, Hyderabad, Delhi NCR, Pune)..."
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newLocation.trim()) {
                    const locs = editingProfile.preferredLocations || [];
                    if (!locs.includes(newLocation.trim())) {
                      setEditingProfile({ ...editingProfile, preferredLocations: [...locs, newLocation.trim()] });
                    }
                    setNewLocation('');
                  }
                }}
                className="flex-1 px-3 py-2 bg-surface-800 border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500/50"
              />
              <button
                onClick={() => {
                  if (newLocation.trim()) {
                    const locs = editingProfile.preferredLocations || [];
                    if (!locs.includes(newLocation.trim())) {
                      setEditingProfile({ ...editingProfile, preferredLocations: [...locs, newLocation.trim()] });
                    }
                    setNewLocation('');
                  }
                }}
                className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg text-xs font-semibold"
              >
                Add Location
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(editingProfile.preferredLocations || []).map((loc: string, idx: number) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-500/20"
                >
                  📍 {loc}
                  <button
                    onClick={() => {
                      setEditingProfile({
                        ...editingProfile,
                        preferredLocations: (editingProfile.preferredLocations || []).filter(l => l !== loc)
                      });
                    }}
                    className="hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Save Profile Button */}
          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm shadow-lg shadow-primary-600/25 transition-all disabled:opacity-50"
          >
            Save Candidate Profile & Recalculate Recommendations
          </button>
        </div>
      )}
    </div>
  );
}

// ============ Settings View ============
function SettingsView({
  settings, stats, runningAutomation, backendStatus, backendError, onCheckBackend, onReloadAll, showToast, onSave, onTestEmail, onRunAutomation
}: any) {
  const [localSettings, setLocalSettings] = useState<UserSettings | null>(settings);
  const [newRole, setNewRole] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(() => {
    if (typeof window === 'undefined') return '';
    const stored = localStorage.getItem('jobpulse_backend_url') || '';
    if (stored.includes('onrender.com') || stored.includes('render.com')) {
      try { localStorage.removeItem('jobpulse_backend_url'); } catch {}
      return '';
    }
    return stored;
  });
  const [connectionFeedback, setConnectionFeedback] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (settings) setLocalSettings(settings);
  }, [settings]);

  if (!localSettings) return null;

  const handleChange = (key: string, value: any) => {
    setLocalSettings({ ...localSettings, [key]: value });
  };

  const handleSave = () => {
    onSave(localSettings);
  };

  const addRole = () => {
    if (newRole.trim() && !localSettings.targetRoles.includes(newRole.trim())) {
      handleChange('targetRoles', [...localSettings.targetRoles, newRole.trim()]);
      setNewRole('');
    }
  };

  const removeRole = (role: string) => {
    handleChange('targetRoles', localSettings.targetRoles.filter((r: string) => r !== role));
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setConnectionFeedback(null);
      const urlToTest = customApiUrl.trim();
      if (urlToTest) {
        api.setApiBaseUrl(urlToTest);
      }
      const startTime = Date.now();
      const res = await api.checkHealth();
      const latency = Date.now() - startTime;
      if (res && (res.status === 'ok' || res.status === 'UP')) {
        setConnectionFeedback({
          success: true,
          message: `✅ Connected successfully! (Latency: ${latency}ms | Status: ${res.status} | Service: ${res.service || 'JobPulse AI'})`
        });
        showToast('Backend connection verified!', 'success');
        if (onCheckBackend) await onCheckBackend();
      } else {
        setConnectionFeedback({
          success: false,
          message: 'Backend responded with an unexpected status.'
        });
      }
    } catch (err: any) {
      setConnectionFeedback({
        success: false,
        message: `❌ Connection failed: ${err.message}`
      });
      showToast('Backend connection failed: ' + err.message, 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveBackendUrl = async () => {
    const url = customApiUrl.trim();
    api.setApiBaseUrl(url || null);
    showToast('Backend URL saved. Testing connection and reloading data...', 'info');
    await handleTestConnection();
    if (onReloadAll) await onReloadAll();
  };

  const handleResetBackendUrl = async () => {
    api.setApiBaseUrl(null);
    setCustomApiUrl('');
    setConnectionFeedback(null);
    showToast('Backend URL reset to default. Reloading...', 'info');
    if (onCheckBackend) await onCheckBackend();
    if (onReloadAll) await onReloadAll();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings className="w-6 h-6 text-primary-400" />
        Application & Alert Settings
      </h1>

      {/* Backend API Server Connection */}
      <div className="glass-card p-6 space-y-4 border-primary-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold">Backend API Server Connection</h2>
          </div>
          {backendStatus === 'connected' ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Connected
            </span>
          ) : backendStatus === 'checking' ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-surface-700 text-surface-300 border border-white/5">
              <span className="w-2 h-2 rounded-full bg-surface-400 animate-pulse"></span>
              Checking...
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
              Disconnected
            </span>
          )}
        </div>

        <p className="text-sm text-surface-400 leading-relaxed">
          JobPulse AI Express API is unified with this application on Vercel at <code className="text-primary-300">/api</code>. If you are running a custom development server or separate instance, you can override the base URL below.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-surface-400 block font-medium mb-1.5">Backend Base URL</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={customApiUrl}
                onChange={e => setCustomApiUrl(e.target.value)}
                placeholder="/api (Default unified Vercel deployment) or http://localhost:5000"
                className="flex-1 px-4 py-2.5 bg-surface-800/60 border border-white/10 rounded-xl text-sm text-white placeholder-surface-500 focus:outline-none focus:border-primary-500/60 font-mono"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                  Test
                </button>
                <button
                  type="button"
                  onClick={handleSaveBackendUrl}
                  className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold shadow-lg shadow-primary-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save & Connect
                </button>
              </div>
            </div>
          </div>

          {connectionFeedback && (
            <div className={`p-3 rounded-lg text-xs font-mono border ${
              connectionFeedback.success
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-red-950/40 border-red-500/30 text-red-300'
            }`}>
              {connectionFeedback.message}
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-surface-500 pt-1">
            <span>Active base path: <code className="text-primary-300 font-mono">{api.getApiBaseUrl()}</code></span>
            <button
              type="button"
              onClick={handleResetBackendUrl}
              className="text-surface-400 hover:text-white underline cursor-pointer"
            >
              Reset to Default (/api)
            </button>
          </div>
        </div>
      </div>

      {/* Scheduler Status */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold">Background Automation Schedule</h2>
          </div>
          <button
            onClick={onRunAutomation}
            disabled={runningAutomation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-600/30 transition-all disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${runningAutomation ? 'animate-spin' : ''}`} />
            Run Cycle Now
          </button>
        </div>
        <p className="text-sm text-surface-400">
          JobPulse AI runs in the background using node-cron to automatically discover new jobs, verify vacancy status, match them against your resume, and dispatch deduplicated email digests.
        </p>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-surface-800/50 border border-white/5">
            <span className="text-surface-400 block mb-1">Schedule Frequency</span>
            <span className="text-white font-medium">Daily at 09:00 AM</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-800/50 border border-white/5">
            <span className="text-surface-400 block mb-1">Timezone</span>
            <span className="text-white font-medium">Asia/Kolkata (IST)</span>
          </div>
        </div>
      </div>

      {/* Job Provider Status */}
      <div className="glass-card p-6 space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary-400" />
          Job Listings API Source
        </h2>
        <div className="p-3 rounded-xl bg-surface-800/50 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-white">Active Provider:</span>
            <span className="text-sm text-primary-400 font-semibold ml-2">
              {stats?.jobProvider || 'Adzuna API + Remotive'}
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Live
          </span>
        </div>
        <p className="text-xs text-surface-400 leading-relaxed">
          JobPulse AI connects to legitimate job providers and conducts automated SSRF-guarded HTTP vacancy checks to guarantee authentic application links.
        </p>
      </div>

      {/* Email Alert Preferences */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary-400" />
          Email Alerts
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">Email Alerts</span>
            <p className="text-xs text-surface-400">Receive automated job digest emails</p>
          </div>
          <button
            onClick={() => handleChange('emailEnabled', !localSettings.emailEnabled)}
            className={`w-12 h-6 rounded-full transition-all ${
              localSettings.emailEnabled ? 'bg-primary-600' : 'bg-surface-600'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                localSettings.emailEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            ></div>
          </button>
        </div>

        <div>
          <label className="text-sm text-surface-400 mb-1 block">Email Address</label>
          <input
            type="email"
            value={localSettings.emailAddress}
            onChange={e => handleChange('emailAddress', e.target.value)}
            placeholder="your.email@example.com"
            className="w-full px-4 py-2.5 bg-surface-800/50 border border-white/5 rounded-xl text-sm text-white placeholder-surface-500 focus:outline-none focus:border-primary-500/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-surface-400 mb-1 block">Minimum Match Score</label>
            <input
              type="number"
              min={0}
              max={100}
              value={localSettings.minMatchScore}
              onChange={e => handleChange('minMatchScore', parseInt(e.target.value))}
              className="w-full px-4 py-2.5 bg-surface-800/50 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-primary-500/50"
            />
          </div>
          <div>
            <label className="text-sm text-surface-400 mb-1 block">Max Jobs per Email</label>
            <input
              type="number"
              min={1}
              max={50}
              value={localSettings.maxJobsPerEmail}
              onChange={e => handleChange('maxJobsPerEmail', parseInt(e.target.value))}
              className="w-full px-4 py-2.5 bg-surface-800/50 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-primary-500/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-surface-400 mb-1 block">Frequency</label>
            <select
              value={localSettings.emailFrequency}
              onChange={e => handleChange('emailFrequency', e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-800 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-primary-500/50"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-surface-400 mb-1 block">Recency Filter</label>
            <select
              value={localSettings.preferredJobAge}
              onChange={e => handleChange('preferredJobAge', parseInt(e.target.value))}
              className="w-full px-4 py-2.5 bg-surface-800 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-primary-500/50"
            >
              <option value={24}>Last 24 hours</option>
              <option value={72}>Last 3 days</option>
              <option value={168}>Last 7 days</option>
              <option value={336}>Last 14 days</option>
            </select>
          </div>
        </div>

        <button
          onClick={onTestEmail}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-all"
        >
          <Mail className="w-4 h-4" /> Send Test Email Digest
        </button>
      </div>

      {/* Target Roles */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          🎯 Target Job Roles
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newRole}
            onChange={e => setNewRole(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRole()}
            placeholder="Add a new role (e.g. Cybersecurity Intern, Junior DevOps)..."
            className="flex-1 px-4 py-2.5 bg-surface-800/50 border border-white/5 rounded-xl text-sm text-white placeholder-surface-500 focus:outline-none focus:border-primary-500/50"
          />
          <button
            onClick={addRole}
            className="px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 transition-all"
          >
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {localSettings.targetRoles.map((role: string, i: number) => (
            <span
              key={i}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500/15 text-primary-300 text-sm border border-primary-500/20"
            >
              {role}
              <button onClick={() => removeRole(role)} className="text-primary-400 hover:text-red-400 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* India Priority Locations */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            🇮🇳 India Priority Locations
          </h2>
          <span className="text-xs text-surface-400">Click to toggle preferred cities</span>
        </div>
        <p className="text-xs text-surface-400">
          JobPulse AI prioritizes live vacancies in these cities. Select your preferred locations for high-priority matching and email digests:
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            'Bengaluru',
            'Pune',
            'Mumbai',
            'Nagpur',
            'Nashik',
            'Delhi NCR',
            'Hyderabad',
            'Chennai',
            'Bidar',
            'Remote (India)',
          ].map(city => {
            const current = localSettings.preferredCities || localSettings.preferredLocations || [];
            const isSelected = current.some((c: string) => c.toLowerCase() === city.toLowerCase());
            return (
              <button
                key={city}
                type="button"
                onClick={() => {
                  const updated = isSelected
                    ? current.filter((c: string) => c.toLowerCase() !== city.toLowerCase())
                    : [...current, city];
                  setLocalSettings({
                    ...localSettings,
                    preferredCities: updated,
                    preferredLocations: updated,
                  });
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary-600 text-white shadow-sm ring-1 ring-primary-400/40'
                    : 'bg-surface-800/80 hover:bg-surface-700 text-surface-400 border border-white/5'
                }`}
              >
                <span>{city}</span>
                {isSelected ? <Check className="w-3 h-3 text-white" /> : <Plus className="w-3 h-3 opacity-40" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-500 transition-all shadow-lg shadow-primary-600/25"
      >
        Save Settings
      </button>
    </div>
  );
}
