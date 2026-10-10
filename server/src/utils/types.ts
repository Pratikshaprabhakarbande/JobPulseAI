import { v4 as uuidv4 } from 'uuid';

// ============ Verification Statuses ============
export type VerificationStatus =
  | 'VERIFIED_OPEN'
  | 'LIKELY_OPEN'
  | 'UNKNOWN'
  | 'EXPIRED_OR_CLOSED'
  | 'INVALID_LINK'
  | 'VERIFICATION_BLOCKED';

export interface VerificationDetails {
  status: VerificationStatus;
  checkedAt: string;
  httpStatus?: number;
  finalUrl?: string;
  evidence: string;
  responseTimeMs?: number;
  isDirectEmployerLink: boolean;
}

// ============ Job Types ============
export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  country: string;
  city?: string;
  isIndiaLocation: boolean;
  isRemoteEligibleIndia: boolean;
  isInternational: boolean;
  workMode: 'Remote' | 'Hybrid' | 'On-site' | 'Unknown';
  postedDate: string | null; // ISO string if source provides reliable timestamp, else null
  postedDateSource: 'source_timestamp' | 'source_date' | 'unverified';
  postedDateRelative: string;
  discoveredAt: string; // Discovery timestamp
  url: string;
  applyUrl: string;
  source: string;
  jobFamily: string;
  experienceLevel: string;
  minExperienceYears?: number;
  maxExperienceYears?: number;
  salary: string | null;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  isDemo: boolean;
  verification: VerificationDetails;
  createdAt: string;
}

export interface JobMatch {
  id: string;
  jobId: string;
  resumeId: string;
  matchScore: number;
  isEligible: boolean;
  skillsMatched: string[];
  skillsMissing: string[];
  experienceMatch: string;
  locationMatch: string;
  whyMatch: string;
  eligibilityConcerns: string[];
  resumeSuggestions: string;
  scoreBreakdown: {
    jobFamilyMatch: number;
    skillsMatch: number;
    experienceMatch: number;
    educationMatch: number;
    locationMatch: number;
  };
  createdAt: string;
}

// ============ Universal Candidate Profile ============
export interface EducationEntry {
  degree: string;
  branch: string;
  institution: string;
  graduationYear?: number;
  cgpaOrPercentage?: string;
}

export interface ProjectEntry {
  title: string;
  description: string;
  technologies: string[];
  highlights?: string[];
}

export interface ExperienceEntry {
  role: string;
  organization: string;
  duration: string;
  responsibilities: string[];
}

export interface CandidateProfile {
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
  experienceHistory: ExperienceEntry[];
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

export interface ResumeData {
  id: string;
  filename: string;
  extractedText: string;
  uploadedAt: string;
  skills: string[];
  summary: string;
  profile?: CandidateProfile;
}

export interface UserSettings {
  emailEnabled: boolean;
  emailAddress: string;
  minMatchScore: number;
  emailFrequency: 'daily' | 'weekly';
  preferredJobAge: number; // hours: 24, 72, 168, 336
  maxJobsPerEmail: number;
  targetRoles: string[];
  targetJobFamilies: string[];
  preferredLocations: string[];
  countryPreference: string;
  verifiedOnly: boolean;
  allowInternational: boolean;
  workMode: 'All' | 'Remote' | 'Hybrid' | 'On-site';
  lastNotifiedJobIds?: string[];
}

export interface DashboardStats {
  totalJobs: number;
  verifiedOpenJobs: number;
  newToday: number;
  indiaJobsCount: number;
  excellentMatch: number;
  goodMatch: number;
  possibleMatch: number;
  lowMatch: number;
  activeProvider: string;
  verificationRate: number; // percentage
}

export function createId(): string {
  return uuidv4();
}

/**
 * Returns human-readable relative time string
 */
export function getTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Posting date unverified';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (isNaN(diffMs)) return 'Posting date unverified';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Posted just now';
  if (diffHours < 24) return `Posted ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `Posted ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `Posted ${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return `Posted ${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
}

/**
 * Freshness indicator dot based strictly on verified publication age
 */
export function getFreshnessColor(dateStr: string | null): string {
  if (!dateStr) return '⚪';

  const date = new Date(dateStr);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  if (isNaN(diffHours) || diffHours < 0) return '⚪';

  if (diffHours <= 24) return '🟢';
  if (diffHours <= 72) return '🟢';
  if (diffHours <= 168) return '🟡';
  return '🟠';
}
