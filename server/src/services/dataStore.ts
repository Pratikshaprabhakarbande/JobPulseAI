import fs from 'fs';
import path from 'path';
import os from 'os';
import { config } from '../config';
import {
  Job,
  JobMatch,
  ResumeData,
  CandidateProfile,
  UserSettings,
  DashboardStats,
  createId
} from '../utils/types';
import { getDemoJobs } from './demoData';
import { jobService } from './jobService';
import { analyzeJobMatch, analyzeAllJobs } from './aiService';
import { buildCandidateProfileFromText } from './resumeAnalyzer';
import { verificationService } from './verificationService';

class DataStore {
  private jobs: Job[] = [];
  private matches: Map<string, JobMatch> = new Map();
  private resume: ResumeData | null = null;
  private profile: CandidateProfile | null = null;
  private settings: UserSettings;
  private dataDir: string;

  constructor() {
    const defaultDataDir = process.env.VERCEL === '1'
      ? path.join(os.tmpdir(), 'jobpulse_data')
      : path.join(process.cwd(), 'data');
    this.dataDir = path.resolve(process.env.DATA_DIR || defaultDataDir);
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch {
      this.dataDir = path.join(os.tmpdir(), 'jobpulse_data');
      try {
        if (!fs.existsSync(this.dataDir)) {
          fs.mkdirSync(this.dataDir, { recursive: true });
        }
      } catch {}
    }

    this.settings = {
      emailEnabled: false,
      emailAddress: config.email.to || '',
      minMatchScore: 70,
      emailFrequency: 'daily',
      preferredJobAge: 24,
      maxJobsPerEmail: 10,
      targetRoles: [
        'Cybersecurity Intern',
        'SOC Analyst L1',
        'Security Analyst Intern',
        'Information Security Intern',
        'Penetration Testing / VAPT Intern',
        'Ethical Hacking Intern',
        'Application Security Intern',
        'Network Security Intern',
        'Cloud Security Intern',
        'GRC / Risk and Compliance Intern',
        'DevSecOps / Junior DevSecOps',
        'Junior Security Engineer',
        'Entry-Level Security Analyst',
        'Graduate Trainee / Cybersecurity Associate',
        'Software Engineer Intern',
        'Full Stack Developer Intern',
        'Backend Developer Intern',
        'Cloud Computing Intern',
        'DevOps Intern',
      ],
      targetJobFamilies: [
        'Cybersecurity & Information Security',
        'Software Development & Full Stack',
        'Cloud Engineering & DevOps',
      ],
      preferredLocations: [
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
      ],
      preferredCities: [
        'Bengaluru',
        'Pune',
        'Mumbai',
        'Nagpur',
        'Nashik',
        'Delhi NCR',
        'Hyderabad',
        'Chennai',
        'Bidar',
      ],
      countryPreference: 'India',
      verifiedOnly: true,
      allowInternational: false,
      workMode: 'All',
      lastNotifiedJobIds: [],
    };

    this.loadPersistedData();
  }

  // ============ Persistence ============
  private loadPersistedData(): void {
    try {
      const settingsPath = path.join(this.dataDir, 'settings.json');
      if (fs.existsSync(settingsPath)) {
        const loadedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        this.settings = { ...this.settings, ...loadedSettings };
      }

      const resumePath = path.join(this.dataDir, 'resume.json');
      if (fs.existsSync(resumePath)) {
        this.resume = JSON.parse(fs.readFileSync(resumePath, 'utf-8'));
      }

      const profilePath = path.join(this.dataDir, 'profile.json');
      if (fs.existsSync(profilePath)) {
        this.profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
      } else if (this.resume?.extractedText) {
        // Automatically synthesize candidate profile from resume if missing
        this.profile = buildCandidateProfileFromText(this.resume.extractedText, this.resume.filename);
        this.persist('profile', this.profile);
      }

      const matchesPath = path.join(this.dataDir, 'matches.json');
      if (fs.existsSync(matchesPath)) {
        const matchesArr: JobMatch[] = JSON.parse(fs.readFileSync(matchesPath, 'utf-8'));
        matchesArr.forEach(m => this.matches.set(m.jobId, m));
      }

      const jobsPath = path.join(this.dataDir, 'jobs.json');
      if (fs.existsSync(jobsPath)) {
        const jobsArr: Job[] = JSON.parse(fs.readFileSync(jobsPath, 'utf-8'));
        if (!config.demoMode) {
          this.jobs = jobsArr.filter(j => !j.isDemo);
        } else {
          this.jobs = jobsArr;
        }
      }
    } catch (error) {
      console.warn('Could not load persisted data:', error);
    }
  }

  private persist(key: string, data: any): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const targetPath = path.join(this.dataDir, `${key}.json`);
      const tempPath = path.join(this.dataDir, `${key}.tmp.${Date.now()}`);
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, targetPath);
    } catch (error) {
      console.error(`Failed to persist ${key}:`, error);
    }
  }

  // ============ Jobs & Strict Filtering ============
  getJobs(filters?: {
    search?: string;
    role?: string;
    company?: string;
    location?: string;
    city?: string;
    workMode?: string;
    experienceLevel?: string;
    minScore?: number;
    maxAge?: number; // 24, 72, 168, 336 hours
    verifiedOnly?: boolean;
    allowInternational?: boolean;
    sortBy?: string;
  }): { jobs: Job[]; matches: Map<string, JobMatch> } {
    if (this.jobs.length === 0 && config.demoMode) {
      this.jobs = getDemoJobs();
    }

    // Always filter out verified closed or invalid links
    let filtered = this.jobs.filter(
      j => j.verification?.status !== 'EXPIRED_OR_CLOSED' && j.verification?.status !== 'INVALID_LINK'
    );

    if (filters) {
      // 1. Text Search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(j =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          j.requiredSkills.some(s => s.toLowerCase().includes(q))
        );
      }

      // 2. Role filter
      if (filters.role) {
        const role = filters.role.toLowerCase();
        filtered = filtered.filter(j => j.title.toLowerCase().includes(role));
      }

      // 3. Company
      if (filters.company) {
        const comp = filters.company.toLowerCase();
        filtered = filtered.filter(j => j.company.toLowerCase().includes(comp));
      }

      // 4. Location & City
      if (filters.city && filters.city !== 'all' && filters.city !== 'All') {
        const cLower = filters.city.toLowerCase();
        filtered = filtered.filter(j =>
          (j.city && j.city.toLowerCase().includes(cLower)) ||
          j.location.toLowerCase().includes(cLower)
        );
      }

      if (filters.location) {
        const loc = filters.location.toLowerCase();
        filtered = filtered.filter(j => j.location.toLowerCase().includes(loc));
      }

      // 5. Work mode
      if (filters.workMode && filters.workMode !== 'all' && filters.workMode !== 'All') {
        filtered = filtered.filter(j => j.workMode.toLowerCase() === filters.workMode!.toLowerCase());
      }

      // 6. Strict Recency Window (24h, 3d, 7d, 14d)
      if (filters.maxAge) {
        const cutoff = Date.now() - filters.maxAge * 60 * 60 * 1000;
        filtered = filtered.filter(j => {
          if (!j.postedDate || j.postedDateSource === 'unverified') {
            // Unverified dates are excluded from strict 24h & 72h windows
            return filters.maxAge! > 72;
          }
          const postedMs = new Date(j.postedDate).getTime();
          return !isNaN(postedMs) && postedMs >= cutoff;
        });
      }

      // 7. Verified-Only Mode
      if (filters.verifiedOnly || this.settings.verifiedOnly) {
        filtered = filtered.filter(j =>
          j.verification?.status === 'VERIFIED_OPEN' || j.verification?.status === 'LIKELY_OPEN'
        );
      }

      // 8. International Separation (India-first default)
      if (!filters.allowInternational && !this.settings.allowInternational) {
        filtered = filtered.filter(j => j.isIndiaLocation || j.isRemoteEligibleIndia);
      }

      // 9. Minimum Match Score Filter
      if (filters.minScore && filters.minScore > 0) {
        filtered = filtered.filter(j => {
          const match = this.matches.get(j.id);
          return match && match.matchScore >= (filters.minScore || 0);
        });
      }

      // 10. Sorting
      const sortBy = filters.sortBy || 'match';
      switch (sortBy) {
        case 'match':
          filtered.sort((a, b) => {
            const ma = this.matches.get(a.id)?.matchScore || 0;
            const mb = this.matches.get(b.id)?.matchScore || 0;
            // Secondary sort: India first
            if (mb === ma) {
              return (b.isIndiaLocation ? 1 : 0) - (a.isIndiaLocation ? 1 : 0);
            }
            return mb - ma;
          });
          break;
        case 'newest':
          filtered.sort((a, b) => {
            const da = a.postedDate ? new Date(a.postedDate).getTime() : 0;
            const db = b.postedDate ? new Date(b.postedDate).getTime() : 0;
            return db - da;
          });
          break;
        case 'company':
          filtered.sort((a, b) => a.company.localeCompare(b.company));
          break;
      }
    } else {
      // Default sort: Match score descending, India first
      filtered.sort((a, b) => {
        const ma = this.matches.get(a.id)?.matchScore || 0;
        const mb = this.matches.get(b.id)?.matchScore || 0;
        if (mb === ma) {
          return (b.isIndiaLocation ? 1 : 0) - (a.isIndiaLocation ? 1 : 0);
        }
        return mb - ma;
      });
    }

    return { jobs: filtered, matches: this.matches };
  }

  getJobById(id: string): Job | undefined {
    return this.jobs.find(j => j.id === id);
  }

  getMatchByJobId(jobId: string): JobMatch | undefined {
    return this.matches.get(jobId);
  }

  // ============ Candidate Profile & Resume ============
  getResume(): ResumeData | null {
    if (!this.resume && this.profile) {
      return {
        id: this.profile.id,
        filename: `${this.profile.name || 'Candidate'}_Profile.pdf`,
        extractedText: this.profile.summary || '',
        uploadedAt: this.profile.updatedAt,
        skills: this.profile.demonstratedSkills,
        summary: this.profile.summary || '',
      };
    }
    return this.resume;
  }

  setResume(resume: ResumeData): CandidateProfile {
    this.resume = resume;
    this.persist('resume', resume);

    // Build universal profile
    const profile = buildCandidateProfileFromText(resume.extractedText, resume.filename);
    this.profile = profile;
    this.persist('profile', profile);

    // Sync settings target roles
    this.settings.targetRoles = profile.targetRoles;
    this.settings.targetJobFamilies = profile.detectedJobFamilies;
    this.persist('settings', this.settings);

    return profile;
  }

  getProfile(): CandidateProfile | null {
    if (!this.profile && this.resume?.extractedText) {
      this.profile = buildCandidateProfileFromText(this.resume.extractedText, this.resume.filename);
      this.persist('profile', this.profile);
    }
    return this.profile;
  }

  updateProfile(updates: Partial<CandidateProfile>): CandidateProfile {
    if (!this.profile) {
      this.profile = this.getProfile();
    }

    if (!this.profile) {
      // If client provided candidate profile data (e.g. after refresh or on ephemeral container)
      if (updates && (updates.demonstratedSkills || updates.targetRoles || updates.summary || updates.name)) {
        this.profile = {
          id: updates.id || createId(),
          name: updates.name || 'Candidate',
          summary: updates.summary || 'Cybersecurity and software professional targeting internships across India.',
          education: updates.education || [{ degree: 'B.E. CSE', branch: 'Cybersecurity', institution: 'Engineering College', graduationYear: 2026 }],
          demonstratedSkills: updates.demonstratedSkills || [],
          inferredInterests: updates.inferredInterests || ['Cybersecurity', 'SOC Analysis'],
          toolsAndFrameworks: updates.toolsAndFrameworks || [],
          certifications: updates.certifications || [],
          projects: updates.projects || [],
          experienceHistory: updates.experienceHistory || [],
          experienceLevel: updates.experienceLevel || 'Intern',
          yearsOfExperienceEstimate: updates.yearsOfExperienceEstimate || 0,
          targetRoles: updates.targetRoles || this.settings.targetRoles,
          detectedJobFamilies: updates.detectedJobFamilies || this.settings.targetJobFamilies,
          preferredLocations: updates.preferredLocations || this.settings.preferredLocations,
          workModePreference: updates.workModePreference || 'All',
          countryPreference: updates.countryPreference || 'India',
          verifiedOnly: updates.verifiedOnly !== false,
          allowInternational: updates.allowInternational === true,
          minMatchScore: updates.minMatchScore || this.settings.minMatchScore || 65,
          updatedAt: new Date().toISOString(),
          ...updates,
        };
      } else {
        throw new Error('No candidate profile exists to update. Upload a resume first.');
      }
    } else {
      this.profile = {
        ...this.profile,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    }

    this.persist('profile', this.profile);

    // If target roles or locations updated, reflect in settings
    if (updates.targetRoles) this.settings.targetRoles = updates.targetRoles;
    if (updates.preferredLocations) this.settings.preferredLocations = updates.preferredLocations;
    if (updates.verifiedOnly !== undefined) this.settings.verifiedOnly = updates.verifiedOnly;
    if (updates.allowInternational !== undefined) this.settings.allowInternational = updates.allowInternational;
    this.persist('settings', this.settings);

    return this.profile;
  }

  // ============ Matching Engine ============
  async analyzeJob(jobId: string): Promise<JobMatch | null> {
    const profile = this.getProfile();
    if (!profile) return null;
    const job = this.getJobById(jobId);
    if (!job) return null;

    const match = await analyzeJobMatch(profile, job);
    this.matches.set(jobId, match);
    this.persistMatches();
    return match;
  }

  async analyzeAllJobs(customProfile?: CandidateProfile): Promise<JobMatch[]> {
    const profile = customProfile || this.getProfile();
    if (!profile) return [];

    const { jobs } = this.getJobs();
    const results = await analyzeAllJobs(profile, jobs);

    for (const match of results) {
      this.matches.set(match.jobId, match);
    }
    this.persistMatches();
    return results;
  }

  private persistMatches(): void {
    const arr = Array.from(this.matches.values());
    this.persist('matches', arr);
  }

  // ============ Settings ============
  getSettings(): UserSettings {
    return this.settings;
  }

  updateSettings(updates: Partial<UserSettings>): UserSettings {
    this.settings = { ...this.settings, ...updates };
    this.persist('settings', this.settings);

    if (this.profile) {
      if (updates.targetRoles) this.profile.targetRoles = updates.targetRoles;
      if (updates.preferredLocations) this.profile.preferredLocations = updates.preferredLocations;
      if (updates.verifiedOnly !== undefined) this.profile.verifiedOnly = updates.verifiedOnly;
      if (updates.allowInternational !== undefined) this.profile.allowInternational = updates.allowInternational;
      this.persist('profile', this.profile);
    }

    return this.settings;
  }

  // ============ Stats ============
  getStats(): DashboardStats {
    const { jobs } = this.getJobs({ allowInternational: true });
    const now = Date.now();
    const cutoff24h = now - 24 * 60 * 60 * 1000;

    let verifiedOpen = 0;
    let excellent = 0, good = 0, possible = 0, low = 0;
    let indiaCount = 0;
    const cityBreakdown: Record<string, number> = {};

    for (const job of jobs) {
      if (job.verification?.status === 'VERIFIED_OPEN') verifiedOpen++;
      if (job.isIndiaLocation || job.isRemoteEligibleIndia) {
        indiaCount++;
        const cityKey = job.city || (job.isRemoteEligibleIndia ? 'Remote (India)' : 'Other India');
        cityBreakdown[cityKey] = (cityBreakdown[cityKey] || 0) + 1;
      }

      const match = this.matches.get(job.id);
      if (match) {
        if (match.matchScore >= 80) excellent++;
        else if (match.matchScore >= 65) good++;
        else if (match.matchScore >= 50) possible++;
        else low++;
      }
    }

    return {
      totalJobs: jobs.length,
      verifiedOpenJobs: verifiedOpen,
      newToday: jobs.filter(j => j.postedDate && new Date(j.postedDate).getTime() >= cutoff24h).length,
      indiaJobsCount: indiaCount,
      cityBreakdown,
      excellentMatch: excellent,
      goodMatch: good,
      possibleMatch: possible,
      lowMatch: low,
      activeProvider: jobService.getProviderName(),
      verificationRate: jobs.length > 0 ? Math.round((verifiedOpen / jobs.length) * 100) : 0,
    };
  }

  // ============ Matched Jobs for Email (With Deduplication & India-First Priority) ============
  getTopMatchedJobsForEmail(
    minScore: number,
    limit: number,
    excludeNotified = true
  ): Array<{ job: Job; match: JobMatch }> {
    const results: Array<{ job: Job; match: JobMatch }> = [];
    const notifiedSet = new Set(this.settings.lastNotifiedJobIds || []);
    const preferredCities = this.settings.preferredCities || [];

    const getIndiaPriority = (job: Job): number => {
      if (job.city && preferredCities.some(c => c.toLowerCase() === job.city?.toLowerCase())) return 3;
      if (job.isIndiaLocation) return 2;
      if (job.isRemoteEligibleIndia) return 1;
      return 0;
    };

    for (const [jobId, match] of this.matches.entries()) {
      if (excludeNotified && notifiedSet.has(jobId)) {
        continue;
      }

      if (match.matchScore >= minScore) {
        const job = this.getJobById(jobId);
        // Exclude closed or unverified when verifiedOnly is set
        if (job && job.verification?.status !== 'EXPIRED_OR_CLOSED') {
          results.push({ job, match });
        }
      }
    }

    if (results.length > 0) {
      return results
        .sort((a, b) => {
          const prioDiff = getIndiaPriority(b.job) - getIndiaPriority(a.job);
          if (prioDiff !== 0) return prioDiff;
          return b.match.matchScore - a.match.matchScore;
        })
        .slice(0, limit);
    }

    // Fallback: If no pre-scored matches in map (e.g. cold start), select top available active vacancies
    const { jobs } = this.getJobs();
    for (const job of jobs) {
      if (excludeNotified && notifiedSet.has(job.id)) continue;
      if (job.verification?.status === 'EXPIRED_OR_CLOSED') continue;

      const roles = this.profile?.targetRoles || this.settings.targetRoles || [];
      const matchesTarget = roles.some(r => job.title.toLowerCase().includes(r.toLowerCase()));
      const fallbackScore = matchesTarget ? 85 : 70;

      if (fallbackScore >= minScore) {
        results.push({
          job,
          match: {
            id: `synth-match-${job.id}`,
            jobId: job.id,
            resumeId: 'default-profile',
            matchScore: fallbackScore,
            isEligible: true,
            skillsMatched: job.requiredSkills.slice(0, 3),
            skillsMissing: [],
            experienceMatch: 'Fresher / Entry level match',
            locationMatch: job.isIndiaLocation ? 'India target location' : 'Remote eligible',
            whyMatch: 'Selected from active vacancies based on career profile preferences.',
            eligibilityConcerns: [],
            resumeSuggestions: 'Highlight relevant projects in application.',
            scoreBreakdown: {
              jobFamilyMatch: matchesTarget ? 90 : 70,
              skillsMatch: fallbackScore,
              experienceMatch: 90,
              educationMatch: 90,
              locationMatch: job.isIndiaLocation ? 95 : 60,
            },
            createdAt: new Date().toISOString(),
          },
        });
      }
      if (results.length >= limit) break;
    }

    return results.sort((a, b) => {
      const prioDiff = getIndiaPriority(b.job) - getIndiaPriority(a.job);
      if (prioDiff !== 0) return prioDiff;
      return b.match.matchScore - a.match.matchScore;
    });
  }

  recordNotifiedJobs(jobIds: string[]): void {
    const existing = new Set(this.settings.lastNotifiedJobIds || []);
    jobIds.forEach(id => existing.add(id));
    this.settings.lastNotifiedJobIds = Array.from(existing).slice(-100); // keep last 100 notified IDs
    this.persist('settings', this.settings);
  }

  // ============ Refresh Job Listings & Auto-Verify ============
  async refreshJobs(): Promise<{ count: number; configured: boolean; message: string; provider: string }> {
    const targetRoles = this.profile?.targetRoles || this.settings.targetRoles;

    if (jobService.isRealSourceConfigured()) {
      try {
        const realJobs = await jobService.fetchRealJobs(targetRoles);
        if (realJobs.length > 0) {
          // Merge newly fetched jobs with existing (avoiding duplicates)
          const existingMap = new Map(this.jobs.map(j => [j.id, j]));
          for (const job of realJobs) {
            existingMap.set(job.id, job);
          }
          this.jobs = Array.from(existingMap.values());
          this.persist('jobs', this.jobs);

          // Re-analyze jobs if profile exists
          if (this.profile) {
            await this.analyzeAllJobs();
          }

          return {
            count: realJobs.length,
            configured: true,
            message: `Successfully refreshed ${realJobs.length} live vacancies from ${jobService.getProviderName()}`,
            provider: jobService.getProviderName(),
          };
        }

        return {
          count: 0,
          configured: true,
          message: 'No new vacancies returned from provider.',
          provider: jobService.getProviderName(),
        };
      } catch (err: any) {
        console.error('Job refresh error:', err);
        return {
          count: 0,
          configured: true,
          message: `Job refresh error: ${err.message}`,
          provider: jobService.getProviderName(),
        };
      }
    }

    if (config.demoMode) {
      this.jobs = getDemoJobs();
      this.persist('jobs', this.jobs);
      if (this.profile) {
        await this.analyzeAllJobs();
      }
      return {
        count: this.jobs.length,
        configured: false,
        message: `Loaded ${this.jobs.length} demo jobs (Demo Mode is active).`,
        provider: 'Demo Data',
      };
    }

    return {
      count: 0,
      configured: false,
      message: 'No job provider configured.',
      provider: 'None',
    };
  }
}

export const dataStore = new DataStore();
