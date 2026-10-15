import { config } from '../config';
import { Job, JobMatch, ResumeData, CandidateProfile, createId } from '../utils/types';

interface AIMatchResult {
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
}

// Unrelated domains that must be heavily penalized unless resume explicitly matches
const UNRELATED_KEYWORDS = [
  'parcel delivery', 'paketzusteller', 'warehouse', 'call center', 'driver',
  'sales executive', 'fashion designer', 'culinary', 'chef', 'restaurant',
  'hair stylist', 'real estate agent', 'retail cashier'
];

/**
 * Universal Structured & Semantic Matching Engine
 */
export function evaluateJobMatch(profile: CandidateProfile, job: Job): AIMatchResult {
  const jobTitleLower = job.title.toLowerCase();
  const jobDescLower = job.description.toLowerCase();
  const combinedJobText = `${jobTitleLower} ${jobDescLower}`;

  const eligibilityConcerns: string[] = [];

  // 1. Safety check: Expired or Invalid links are non-eligible
  if (job.verification?.status === 'EXPIRED_OR_CLOSED') {
    return {
      matchScore: 0,
      isEligible: false,
      skillsMatched: [],
      skillsMissing: job.requiredSkills,
      experienceMatch: 'Vacancy is closed or expired.',
      locationMatch: 'Not applicable (listing closed).',
      whyMatch: 'This job vacancy has been verified as expired or closed.',
      eligibilityConcerns: ['Listing expired or closed on employer portal.'],
      resumeSuggestions: 'Look for active vacancies.',
      scoreBreakdown: { jobFamilyMatch: 0, skillsMatch: 0, experienceMatch: 0, educationMatch: 0, locationMatch: 0 },
    };
  }

  // 2. Unrelated Domain Filter
  const isExplicitlyUnrelated = UNRELATED_KEYWORDS.some(k => combinedJobText.includes(k));
  if (isExplicitlyUnrelated) {
    eligibilityConcerns.push('Job domain is unrelated to your technical / engineering education.');
  }

  // 3. Job Family Alignment (25 Points)
  let jobFamilyMatchScore = 5;
  const isCybersecurity = profile.detectedJobFamilies.some(f => f.includes('Cybersecurity'));
  const isSoftware = profile.detectedJobFamilies.some(f => f.includes('Software'));
  const isCloud = profile.detectedJobFamilies.some(f => f.includes('Cloud'));
  const isMechanical = profile.detectedJobFamilies.some(f => f.includes('Mechanical'));
  const isCivil = profile.detectedJobFamilies.some(f => f.includes('Civil'));
  const isEEE = profile.detectedJobFamilies.some(f => f.includes('Electrical'));

  if (job.jobFamily.includes('Cybersecurity') && isCybersecurity) {
    jobFamilyMatchScore = 25;
  } else if (job.jobFamily.includes('Software') && (isSoftware || isCybersecurity)) {
    jobFamilyMatchScore = 24;
  } else if (job.jobFamily.includes('Cloud') && (isCloud || isCybersecurity || isSoftware)) {
    jobFamilyMatchScore = 23;
  } else if (job.jobFamily.includes('Mechanical') && isMechanical) {
    jobFamilyMatchScore = 25;
  } else if (job.jobFamily.includes('Civil') && isCivil) {
    jobFamilyMatchScore = 25;
  } else if (job.jobFamily.includes('Electrical') && isEEE) {
    jobFamilyMatchScore = 25;
  } else if (profile.targetRoles.some(r => jobTitleLower.includes(r.toLowerCase()))) {
    jobFamilyMatchScore = 22;
  } else if (isExplicitlyUnrelated) {
    jobFamilyMatchScore = 0;
  }

  // 4. Skills Matching (35 Points)
  const skillsMatched: string[] = [];
  const skillsMissing: string[] = [];
  const candidateSkillsLower = profile.demonstratedSkills.map(s => s.toLowerCase());

  for (const req of job.requiredSkills) {
    const reqLower = req.toLowerCase();
    const hasSkill = candidateSkillsLower.some(s => s === reqLower || s.includes(reqLower) || reqLower.includes(s));
    if (hasSkill) {
      skillsMatched.push(req);
    } else {
      skillsMissing.push(req);
    }
  }

  let skillsScore = 10;
  if (job.requiredSkills.length > 0) {
    const matchRatio = skillsMatched.length / job.requiredSkills.length;
    skillsScore = Math.round(matchRatio * 35);
  } else if (skillsMatched.length > 0) {
    skillsScore = 25;
  }

  // 5. Experience Level Match (15 Points)
  let experienceScore = 10;
  let experienceExplanation = '';
  const isCandidateFresherOrIntern = profile.experienceLevel === 'Fresher' || profile.experienceLevel === 'Intern';

  if (job.minExperienceYears && job.minExperienceYears >= 5) {
    // Senior position
    if (isCandidateFresherOrIntern) {
      experienceScore = 2;
      eligibilityConcerns.push(`Role requires ${job.minExperienceYears}+ years of experience; candidate is a ${profile.experienceLevel}.`);
      experienceExplanation = `High experience barrier: requires ${job.experienceLevel}.`;
    } else {
      experienceScore = 12;
      experienceExplanation = 'Matches mid-to-senior profile.';
    }
  } else if (job.experienceLevel.includes('Intern') || job.experienceLevel.includes('Entry') || job.experienceLevel.includes('Fresher')) {
    experienceScore = 15;
    experienceExplanation = `High eligibility: Role is open to ${job.experienceLevel}, perfectly aligning with your profile.`;
  } else {
    experienceScore = isCandidateFresherOrIntern ? 9 : 14;
    experienceExplanation = `Requires ${job.experienceLevel}. Entry-level candidates with strong project portfolios can be considered.`;
  }

  // 6. Education & Domain Relevance (15 Points)
  let educationScore = 12;
  if (isExplicitlyUnrelated) {
    educationScore = 2;
  } else if (profile.education.length > 0) {
    educationScore = 15;
  }

  // 7. Location & Country Alignment (10 Points)
  let locationScore = 6;
  let locationExplanation = '';

  if (job.isIndiaLocation) {
    const isPreferredCity = profile.preferredLocations.some(
      loc => (job.city && loc.toLowerCase().includes(job.city.toLowerCase())) ||
             job.location.toLowerCase().includes(loc.toLowerCase())
    );
    locationScore = isPreferredCity ? 10 : 9;
    locationExplanation = isPreferredCity
      ? `Priority target location match: ${job.city || job.location} aligns with your preferred cities.`
      : `Prime location match in India (${job.location}).`;
  } else if (job.workMode === 'Remote' && job.isRemoteEligibleIndia) {
    locationScore = 10;
    locationExplanation = 'Verified 100% remote opportunity with worldwide / India eligibility.';
  } else if (job.isInternational) {
    if (profile.allowInternational) {
      locationScore = 8;
      locationExplanation = `International vacancy in ${job.country} (user has enabled international positions).`;
    } else {
      locationScore = 2;
      eligibilityConcerns.push(`Onsite/regional role located in ${job.location} may require local work authorization.`);
      locationExplanation = `Located in ${job.country} (${job.location}) without verified remote eligibility in India.`;
    }
  }

  // Total Score calculation
  let totalScore = jobFamilyMatchScore + skillsScore + experienceScore + educationScore + locationScore;
  if (isExplicitlyUnrelated) {
    totalScore = Math.min(25, totalScore);
  }

  totalScore = Math.max(5, Math.min(100, totalScore));
  const isEligible = eligibilityConcerns.length === 0 || totalScore >= 60;

  // Synthesize rationale
  let whyMatch = '';
  if (totalScore >= 80) {
    whyMatch = `Strong match: ${job.title} directly matches your background in ${profile.detectedJobFamilies[0]}. You demonstrate key requirements (${skillsMatched.slice(0, 4).join(', ')}) with suitable experience alignment.`;
  } else if (totalScore >= 65) {
    whyMatch = `Good match: Aligns well with your technical skills. Highlight your projects in ${profile.toolsAndFrameworks.slice(0, 3).join(', ')} to stand out.`;
  } else if (totalScore >= 50) {
    whyMatch = `Possible opportunity: Partial alignment with your profile. Review missing prerequisites (${skillsMissing.slice(0, 3).join(', ')}) before applying.`;
  } else {
    whyMatch = `Limited alignment: Direct overlap is low. ${eligibilityConcerns[0] || 'Prerequisites differ from your current profile.'}`;
  }

  // Tailored resume suggestions
  const suggestions = skillsMissing.length > 0
    ? `For this role, ensure your application highlights practical exposure or coursework in ${skillsMissing.slice(0, 3).join(', ')}. Never fabricate experience.`
    : 'Your documented skills cover the core requirements for this position. Emphasize your key project deliverables and verifiable metrics.';

  return {
    matchScore: totalScore,
    isEligible,
    skillsMatched,
    skillsMissing,
    experienceMatch: experienceExplanation,
    locationMatch: locationExplanation,
    whyMatch,
    eligibilityConcerns,
    resumeSuggestions: suggestions,
    scoreBreakdown: {
      jobFamilyMatch: jobFamilyMatchScore,
      skillsMatch: skillsScore,
      experienceMatch: experienceScore,
      educationMatch: educationScore,
      locationMatch: locationScore,
    },
  };
}

/**
 * Public match API
 */
export async function analyzeJobMatch(
  profileOrResume: CandidateProfile | ResumeData,
  job: Job
): Promise<JobMatch> {
  const profile: CandidateProfile = (profileOrResume as any).profile || profileOrResume;
  const evaluation = evaluateJobMatch(profile, job);

  return {
    id: createId(),
    jobId: job.id,
    resumeId: (profileOrResume as any).id || profile.id,
    matchScore: evaluation.matchScore,
    isEligible: evaluation.isEligible,
    skillsMatched: evaluation.skillsMatched,
    skillsMissing: evaluation.skillsMissing,
    experienceMatch: evaluation.experienceMatch,
    locationMatch: evaluation.locationMatch,
    whyMatch: evaluation.whyMatch,
    eligibilityConcerns: evaluation.eligibilityConcerns,
    resumeSuggestions: evaluation.resumeSuggestions,
    scoreBreakdown: evaluation.scoreBreakdown,
    createdAt: new Date().toISOString(),
  };
}

export async function analyzeAllJobs(
  profileOrResume: CandidateProfile | ResumeData,
  jobs: Job[]
): Promise<JobMatch[]> {
  const matches: JobMatch[] = [];
  for (const job of jobs) {
    try {
      const match = await analyzeJobMatch(profileOrResume, job);
      matches.push(match);
    } catch (e) {
      console.error(`Error matching job ${job.id}:`, e);
    }
  }
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}
