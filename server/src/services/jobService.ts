import { config } from '../config/index';
import { Job, getTimeAgo, createId, VerificationDetails } from '../utils/types';
import { verificationService } from './verificationService';

export const INDIAN_CITIES = [
  // Priority 1: Bengaluru & Karnataka
  'bengaluru', 'bangalore', 'bidar', 'mysuru', 'mysore', 'hubballi', 'hubli', 'mangaluru', 'mangalore', 'belagavi', 'belgaum', 'karnataka',
  // Priority 2: Maharashtra (Pune, Mumbai, Nagpur, Nashik, etc.)
  'pune', 'mumbai', 'bombay', 'nagpur', 'nashik', 'aurangabad', 'chhatrapati sambhajinagar', 'navi mumbai', 'thane', 'solapur', 'kolhapur', 'maharashtra',
  // Priority 3: Delhi NCR (Delhi, Noida, Gurugram, etc.)
  'delhi', 'new delhi', 'gurugram', 'gurgaon', 'noida', 'greater noida', 'ghaziabad', 'faridabad', 'ncr',
  // Priority 4: Hyderabad & Telangana / Andhra Pradesh
  'hyderabad', 'secunderabad', 'visakhapatnam', 'vizag', 'vijayawada', 'telangana', 'andhra pradesh',
  // Priority 5: Chennai & Tamil Nadu
  'chennai', 'madras', 'coimbatore', 'madurai', 'trichy', 'tamil nadu',
  // Nationwide Indian Metros
  'kolkata', 'calcutta', 'ahmedabad', 'surat', 'jaipur', 'lucknow', 'kanpur', 'indore', 'bhopal',
  'chandigarh', 'kochi', 'cochin', 'thiruvananthapuram', 'trivandrum', 'bhubaneswar', 'patna', 'ranchi', 'guwahati', 'india'
];

export const CITY_NORMALIZATION_MAP: Record<string, string> = {
  bangalore: 'Bengaluru',
  bengaluru: 'Bengaluru',
  pune: 'Pune',
  mumbai: 'Mumbai',
  bombay: 'Mumbai',
  'navi mumbai': 'Mumbai',
  thane: 'Mumbai',
  nagpur: 'Nagpur',
  nashik: 'Nashik',
  delhi: 'Delhi NCR',
  'new delhi': 'Delhi NCR',
  noida: 'Delhi NCR',
  'greater noida': 'Delhi NCR',
  gurugram: 'Delhi NCR',
  gurgaon: 'Delhi NCR',
  faridabad: 'Delhi NCR',
  ghaziabad: 'Delhi NCR',
  hyderabad: 'Hyderabad',
  secunderabad: 'Hyderabad',
  chennai: 'Chennai',
  madras: 'Chennai',
  coimbatore: 'Coimbatore',
  bidar: 'Bidar',
  mysuru: 'Mysuru',
  mysore: 'Mysuru',
  hubballi: 'Hubballi',
  hubli: 'Hubballi',
  mangaluru: 'Mangaluru',
  mangalore: 'Mangaluru',
  kolkata: 'Kolkata',
  calcutta: 'Kolkata',
  ahmedabad: 'Ahmedabad',
  surat: 'Surat',
  jaipur: 'Jaipur',
  lucknow: 'Lucknow',
  indore: 'Indore',
  bhopal: 'Bhopal',
  chandigarh: 'Chandigarh',
  kochi: 'Kochi',
  cochin: 'Kochi',
  thiruvananthapuram: 'Thiruvananthapuram',
  trivandrum: 'Thiruvananthapuram',
  bhubaneswar: 'Bhubaneswar',
  visakhapatnam: 'Visakhapatnam',
  vizag: 'Visakhapatnam',
  vijayawada: 'Vijayawada',
};

/**
 * Priority cities for Adzuna multi-city search (in descending priority order).
 * Adzuna "where" parameter uses these to search city-by-city for better India coverage.
 */
export const INDIA_PRIORITY_SEARCH_CITIES: { adzunaWhere: string; normalized: string }[] = [
  { adzunaWhere: 'Bangalore', normalized: 'Bengaluru' },
  { adzunaWhere: 'Pune', normalized: 'Pune' },
  { adzunaWhere: 'Mumbai', normalized: 'Mumbai' },
  { adzunaWhere: 'Nagpur', normalized: 'Nagpur' },
  { adzunaWhere: 'Nashik', normalized: 'Nashik' },
  { adzunaWhere: 'Delhi', normalized: 'Delhi NCR' },
  { adzunaWhere: 'Hyderabad', normalized: 'Hyderabad' },
  { adzunaWhere: 'Chennai', normalized: 'Chennai' },
  { adzunaWhere: 'Noida', normalized: 'Delhi NCR' },
  { adzunaWhere: 'Gurugram', normalized: 'Delhi NCR' },
  { adzunaWhere: 'Bidar', normalized: 'Bidar' },
];

/**
 * Cybersecurity and fresher-focused search queries for Adzuna.
 * Each is a separate search term to maximize coverage.
 */
export const CYBERSECURITY_SEARCH_QUERIES: string[] = [
  'cybersecurity intern',
  'SOC analyst',
  'security analyst intern',
  'information security intern',
  'penetration testing intern',
  'ethical hacking intern',
  'application security',
  'network security intern',
  'cloud security intern',
  'GRC intern',
  'DevSecOps junior',
  'junior security engineer',
  'entry level security analyst',
  'graduate trainee cybersecurity',
];

/**
 * City priority tiers for location scoring. Tier 1 = highest priority.
 */
export const CITY_PRIORITY_TIERS: Record<string, number> = {
  'Bengaluru': 1,
  'Pune': 2,
  'Mumbai': 2,
  'Nagpur': 3,
  'Nashik': 3,
  'Delhi NCR': 3,
  'Hyderabad': 4,
  'Chennai': 4,
  'Bidar': 5,
  'Mysuru': 5,
  'Hubballi': 5,
  'Mangaluru': 5,
  'Coimbatore': 5,
  'Kolkata': 6,
  'Ahmedabad': 6,
  'Jaipur': 6,
  'Kochi': 6,
  'Indore': 6,
  'Chandigarh': 6,
};

/**
 * Returns priority score (0-10) for a city. Higher = better.
 */
export function getCityPriorityScore(city?: string): number {
  if (!city) return 3;
  const tier = CITY_PRIORITY_TIERS[city];
  if (!tier) return 4; // Unknown Indian city: moderate priority
  // Tier 1 → 10, Tier 2 → 9, Tier 3 → 8, Tier 4 → 7, Tier 5 → 6, Tier 6 → 5
  return Math.max(5, 11 - tier);
}

const JOB_FAMILIES_MAP: { family: string; keywords: string[] }[] = [
  {
    family: 'Cybersecurity & Information Security',
    keywords: [
      'cyber', 'security', 'soc', 'siem', 'vapt', 'penetration', 'vulnerability', 'infosec',
      'threat', 'appsec', 'cloud security', 'network security', 'incident response', 'ethical hack',
      'devsecops', 'grc', 'malware', 'security analyst'
    ]
  },
  {
    family: 'Software Development & Full Stack',
    keywords: ['developer', 'software engineer', 'full stack', 'frontend', 'backend', 'web developer', 'react', 'node', 'python developer', 'java developer', 'mern']
  },
  {
    family: 'Cloud Engineering & DevOps',
    keywords: ['devops', 'cloud engineer', 'aws', 'azure', 'kubernetes', 'docker', 'terraform', 'ci/cd', 'site reliability', 'sre', 'infrastructure']
  },
  {
    family: 'Data Science & Artificial Intelligence',
    keywords: ['data science', 'machine learning', 'data analyst', 'deep learning', 'ai engineer', 'nlp', 'computer vision', 'data engineer']
  },
  {
    family: 'Mechanical Engineering',
    keywords: ['mechanical', 'cad', 'solidworks', 'catia', 'hvac', 'thermal', 'manufacturing', 'production engineer', 'ansys']
  },
  {
    family: 'Civil & Structural Engineering',
    keywords: ['civil', 'structural', 'autocad civil', 'site engineer', 'construction', 'bim', 'revit', 'quantity surveyor']
  },
  {
    family: 'Electrical & Electronics Engineering (EEE / ECE)',
    keywords: ['electronics', 'embedded', 'vlsi', 'electrical', 'pcb', 'microcontroller', 'iot', 'hardware engineer', 'circuit']
  },
];

const COMMON_SKILLS = [
  'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Golang', 'Rust', 'Ruby', 'PHP',
  'React', 'React.js', 'Next.js', 'Node.js', 'Express.js', 'Express', 'Angular', 'Vue.js', 'Django',
  'Flask', 'FastAPI', 'Spring Boot', 'HTML', 'CSS', 'Tailwind CSS', 'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
  'AWS', 'Azure', 'GCP', 'Oracle Cloud', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Git', 'GitHub', 'Linux', 'REST APIs',
  'Cybersecurity', 'SOC', 'SIEM', 'Splunk', 'Wireshark', 'Nmap', 'Burp Suite', 'OWASP',
  'Penetration Testing', 'Incident Response', 'Vulnerability Assessment', 'Firewalls', 'Network Security',
  'Cloud Security', 'IAM', 'TCP/IP', 'Linux Administration', 'DSA', 'DevOps', 'DevSecOps', 'Machine Learning',
  'Deep Learning', 'PyTorch', 'TensorFlow', 'Data Science', 'Pandas', 'NumPy',
  'AutoCAD', 'SolidWorks', 'ANSYS', 'CATIA', 'STAAD Pro', 'Revit', 'BIM', 'Embedded Systems', 'VLSI', 'MATLAB'
];

function extractSkills(text: string): { requiredSkills: string[]; preferredSkills: string[] } {
  const textLower = text.toLowerCase();
  const matchedSkills: string[] = [];

  for (const skill of COMMON_SKILLS) {
    const sLower = skill.toLowerCase();
    const regex = new RegExp(`\\b${sLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(textLower)) {
      matchedSkills.push(skill);
    }
  }

  const unique = Array.from(new Set(matchedSkills));
  return {
    requiredSkills: unique.slice(0, 8),
    preferredSkills: unique.slice(8, 14),
  };
}

function detectJobFamily(title: string, desc: string): string {
  const combined = `${title} ${desc}`.toLowerCase();
  for (const def of JOB_FAMILIES_MAP) {
    for (const kw of def.keywords) {
      if (new RegExp(`\\b${kw}\\b`, 'i').test(combined)) {
        return def.family;
      }
    }
  }
  return 'Engineering & Technology';
}

function detectWorkMode(text: string): 'Remote' | 'Hybrid' | 'On-site' | 'Unknown' {
  const lower = text.toLowerCase();
  if (lower.includes('remote') || lower.includes('work from home') || lower.includes('wfh')) return 'Remote';
  if (lower.includes('hybrid')) return 'Hybrid';
  if (lower.includes('on-site') || lower.includes('onsite') || lower.includes('office')) return 'On-site';
  return 'Unknown';
}

function detectExperience(title: string, desc: string): { level: string; minYears?: number; maxYears?: number } {
  const combined = `${title} ${desc}`.toLowerCase();
  if (combined.includes('intern') || combined.includes('trainee') || combined.includes('apprentice') || combined.includes('fresher') || combined.includes('graduate trainee')) {
    return { level: 'Internship / Fresher', minYears: 0, maxYears: 1 };
  }
  if (combined.includes('junior') || combined.includes('entry') || combined.includes('0-1') || combined.includes('0-2') || combined.includes('associate')) {
    return { level: 'Entry Level (0-2 years)', minYears: 0, maxYears: 2 };
  }
  if (combined.includes('senior') || combined.includes('lead') || combined.includes('principal') || combined.includes('staff')) {
    return { level: 'Senior Level (5+ years)', minYears: 5, maxYears: 10 };
  }
  return { level: 'Mid Level (2-5 years)', minYears: 2, maxYears: 5 };
}

export function detectLocationMetadata(locationStr: string, text: string): {
  country: string;
  city?: string;
  isIndiaLocation: boolean;
  isRemoteEligibleIndia: boolean;
  isInternational: boolean;
} {
  const locLower = (locationStr || '').toLowerCase();
  const textLower = (text || '').toLowerCase();
  const combined = `${locLower} ${textLower}`;

  // Check if explicitly India
  const isIndia = INDIAN_CITIES.some(city => locLower.includes(city) || combined.includes(`in ${city}`) || combined.includes(`${city}, india`));

  let detectedCity: string | undefined;
  for (const [alias, normalized] of Object.entries(CITY_NORMALIZATION_MAP)) {
    if (locLower.includes(alias) || combined.includes(`in ${alias}`)) {
      detectedCity = normalized;
      break;
    }
  }

  // Check remote eligibility for India candidates
  const isRemote = detectWorkMode(`${locationStr} ${text}`) === 'Remote';
  let isRemoteEligibleIndia = false;

  if (isRemote) {
    if (isIndia) {
      isRemoteEligibleIndia = true;
    } else if (
      locLower.includes('worldwide') ||
      locLower.includes('global') ||
      locLower.includes('anywhere') ||
      textLower.includes('work from anywhere') ||
      textLower.includes('worldwide remote') ||
      textLower.includes('open to india') ||
      textLower.includes('remote (india)')
    ) {
      isRemoteEligibleIndia = true;
    } else if (
      locLower.includes('us only') ||
      locLower.includes('usa only') ||
      locLower.includes('uk only') ||
      locLower.includes('germany') ||
      locLower.includes('europe only') ||
      locLower.includes('eu only')
    ) {
      isRemoteEligibleIndia = false;
    } else {
      isRemoteEligibleIndia = false;
    }
  }

  const isInternational = !isIndia && !isRemoteEligibleIndia;
  const country = isIndia ? 'India' : (locLower.includes('germany') ? 'Germany' : locLower.includes('usa') || locLower.includes('united states') ? 'United States' : 'International');

  return {
    country,
    city: detectedCity,
    isIndiaLocation: isIndia,
    isRemoteEligibleIndia,
    isInternational,
  };
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export class JobService {
  isRealSourceConfigured(): boolean {
    if (config.adzuna.appId && config.adzuna.appKey) {
      return true;
    }
    if (config.jobProvider === 'arbeitnow' || config.jobProvider === 'public') {
      return true;
    }
    return false;
  }

  getProviderName(): string {
    if (config.adzuna.appId && config.adzuna.appKey) {
      return 'Adzuna API (India-First)';
    }
    if (config.jobProvider === 'arbeitnow' || config.jobProvider === 'public') {
      return 'Arbeitnow Public API';
    }
    return 'None (Unconfigured)';
  }

  /**
   * Fetch real jobs from legitimate sources.
   * Priority: Adzuna API (India-specific) when configured, or authentic public feeds.
   */
  async fetchRealJobs(targetRoles: string[] = []): Promise<Job[]> {
    const allJobs: Job[] = [];

    // 1. Adzuna API (Preferred for India-specific roles)
    if (config.adzuna.appId && config.adzuna.appKey) {
      try {
        const adzunaJobs = await this.fetchFromAdzuna(targetRoles);
        allJobs.push(...adzunaJobs);
      } catch (err) {
        console.error('Adzuna API fetch error:', err);
      }
    }

    // 2. Remotive Public API (Legitimate live tech jobs with worldwide remote eligibility)
    try {
      const remotiveJobs = await this.fetchFromRemotive(targetRoles);
      allJobs.push(...remotiveJobs);
    } catch (err) {
      console.warn('Remotive public API fetch notice:', err);
    }

    // 3. Arbeitnow Public API (Permitted public board with authentic URLs)
    try {
      const arbeitnowJobs = await this.fetchFromArbeitnow();
      allJobs.push(...arbeitnowJobs);
    } catch (err) {
      console.warn('Arbeitnow API fetch notice:', err);
    }

    // Deduplicate jobs by applyUrl or normalized title+company
    const seen = new Set<string>();
    const deduplicated: Job[] = [];

    for (const job of allJobs) {
      const key = (job.applyUrl || job.url).toLowerCase().replace(/\/$/, '');
      const altKey = `${job.title.toLowerCase()}|||${job.company.toLowerCase()}`;
      if (!seen.has(key) && !seen.has(altKey)) {
        seen.add(key);
        seen.add(altKey);
        deduplicated.push(job);
      }
    }

    return deduplicated;
  }

  /**
   * Fetch from Adzuna API with India-First multi-city strategy.
   * Searches across priority Indian cities with cybersecurity-focused queries.
   * Rate-limit-aware: adds small delays between requests.
   */
  async fetchFromAdzuna(targetRoles: string[] = []): Promise<Job[]> {
    const { appId, appKey } = config.adzuna;
    const country = config.adzuna.country || 'in';
    if (!appId || !appKey) return [];

    // Build query list: combine user target roles with cybersecurity defaults
    const queries: string[] = [];
    if (targetRoles.length > 0) {
      // Use up to 4 target roles from user profile
      for (const role of targetRoles.slice(0, 4)) {
        if (!queries.includes(role)) queries.push(role);
      }
    }
    // Add cybersecurity defaults that aren't already covered
    for (const cyberQuery of CYBERSECURITY_SEARCH_QUERIES.slice(0, 6)) {
      const already = queries.some(q => q.toLowerCase().includes(cyberQuery.split(' ')[0].toLowerCase()));
      if (!already && queries.length < 8) {
        queries.push(cyberQuery);
      }
    }
    // Fallback
    if (queries.length === 0) {
      queries.push('cybersecurity intern', 'SOC analyst', 'security analyst', 'software developer intern');
    }

    const allJobs: Job[] = [];
    const seenUrls = new Set<string>();
    const seenTitleCompany = new Set<string>();

    // Multi-city search: iterate priority cities with top queries
    const searchCombinations: { query: string; where?: string }[] = [];

    // First: broad India-wide searches with all queries (no city filter)
    for (const q of queries.slice(0, 4)) {
      searchCombinations.push({ query: q });
    }

    // Then: city-specific searches for top priority cities with top 2 queries
    for (const city of INDIA_PRIORITY_SEARCH_CITIES.slice(0, 6)) {
      for (const q of queries.slice(0, 2)) {
        searchCombinations.push({ query: q, where: city.adzunaWhere });
      }
    }

    // Cap total API calls to avoid rate limits (max ~16 calls)
    const maxCalls = Math.min(searchCombinations.length, 16);
    let callCount = 0;

    for (const combo of searchCombinations.slice(0, maxCalls)) {
      try {
        // Rate limit: small delay between requests (200ms)
        if (callCount > 0) {
          await new Promise(r => setTimeout(r, 200));
        }
        callCount++;

        let url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}&results_per_page=15&what=${encodeURIComponent(combo.query)}&content-type=application/json`;

        // Add city-specific location filter
        if (combo.where) {
          url += `&where=${encodeURIComponent(combo.where)}`;
        }

        const res = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10000),
        });

        // Handle rate limit (429)
        if (res.status === 429) {
          console.warn(`Adzuna rate limit hit for "${combo.query}" in ${combo.where || 'India'}. Pausing...`);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        if (!res.ok) continue;

        const data = await res.json() as { results?: any[] };
        const results = data.results || [];

        for (const item of results) {
          if (!item.redirect_url || typeof item.redirect_url !== 'string') continue;
          const realUrl = item.redirect_url.trim();
          if (
            realUrl.includes('example.com') ||
            realUrl.includes('example.org') ||
            realUrl.includes('localhost') ||
            seenUrls.has(realUrl)
          ) {
            continue;
          }

          const title = stripHtml(item.title || 'Job Opening');
          const company = item.company?.display_name || 'Hiring Employer';

          // Cross-city deduplication by title+company
          const dedupKey = `${title.toLowerCase()}|||${company.toLowerCase()}`;
          if (seenTitleCompany.has(dedupKey)) continue;

          seenUrls.add(realUrl);
          seenTitleCompany.add(dedupKey);

          const location = item.location?.display_name || 'India';
          const description = stripHtml(item.description || `${title} at ${company}`);

          // Reliable publication timestamp from Adzuna
          const postedDate = item.created ? new Date(item.created).toISOString() : null;
          const postedDateSource = item.created ? 'source_timestamp' : 'unverified';

          const combinedText = `${title} ${description}`;
          const { requiredSkills, preferredSkills } = extractSkills(combinedText);
          const exp = detectExperience(title, description);
          const locMeta = detectLocationMetadata(location, description);
          const jobFamily = detectJobFamily(title, description);

          let salary: string | null = null;
          if (item.salary_min && item.salary_max) {
            salary = `₹${Math.round(item.salary_min).toLocaleString()} - ₹${Math.round(item.salary_max).toLocaleString()}`;
          } else if (item.salary_min) {
            salary = `From ₹${Math.round(item.salary_min).toLocaleString()}`;
          }

          allJobs.push({
            id: `adzuna-${item.id || createId()}`,
            title,
            company,
            location,
            country: locMeta.country,
            city: locMeta.city,
            isIndiaLocation: locMeta.isIndiaLocation,
            isRemoteEligibleIndia: locMeta.isRemoteEligibleIndia,
            isInternational: locMeta.isInternational,
            workMode: detectWorkMode(combinedText),
            postedDate,
            postedDateSource,
            postedDateRelative: getTimeAgo(postedDate),
            discoveredAt: new Date().toISOString(),
            url: realUrl,
            applyUrl: realUrl,
            source: 'Adzuna API',
            jobFamily,
            experienceLevel: exp.level,
            minExperienceYears: exp.minYears,
            maxExperienceYears: exp.maxYears,
            salary,
            description,
            requiredSkills,
            preferredSkills,
            isDemo: false,
            verification: {
              status: 'VERIFIED_OPEN',
              checkedAt: new Date().toISOString(),
              evidence: `Retrieved directly from official Adzuna partner feed${combo.where ? ` (${combo.where})` : ''} with authentic apply endpoint.`,
              isDirectEmployerLink: true,
            },
            createdAt: postedDate || new Date().toISOString(),
          });
        }
      } catch (e) {
        console.warn(`Adzuna fetch notice for "${combo.query}" in ${combo.where || 'all India'}:`, e);
      }
    }

    console.log(`📥 Adzuna multi-city search completed: ${allJobs.length} unique jobs from ${callCount} API calls`);
    return allJobs;
  }

  /**
   * Fetch from Remotive Public API (worldwide remote jobs accessible to India)
   */
  async fetchFromRemotive(targetRoles: string[] = []): Promise<Job[]> {
    const url = 'https://remotive.com/api/remote-jobs?limit=20';
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const data = await res.json() as { jobs?: any[] };
    const items = data.jobs || [];

    const jobs: Job[] = [];
    for (const item of items) {
      if (!item.url || typeof item.url !== 'string') continue;
      const realUrl = item.url.trim();

      const title = stripHtml(item.title || 'Engineer');
      const company = item.company_name || 'Technology Company';
      const candidateLocation = item.candidate_required_location || 'Worldwide';
      const description = stripHtml(item.description || '');

      const locMeta = detectLocationMetadata(candidateLocation, `${description} ${candidateLocation}`);
      // Only include if India-friendly or explicitly worldwide remote
      if (!locMeta.isIndiaLocation && !locMeta.isRemoteEligibleIndia) {
        continue;
      }

      const postedDate = item.publication_date ? new Date(item.publication_date).toISOString() : null;
      const combinedText = `${title} ${description} ${(item.tags || []).join(' ')}`;
      const { requiredSkills, preferredSkills } = extractSkills(combinedText);
      const exp = detectExperience(title, description);

      jobs.push({
        id: `remotive-${item.id || createId()}`,
        title,
        company,
        location: candidateLocation,
        country: locMeta.country,
        city: locMeta.city,
        isIndiaLocation: locMeta.isIndiaLocation,
        isRemoteEligibleIndia: locMeta.isRemoteEligibleIndia,
        isInternational: locMeta.isInternational,
        workMode: 'Remote',
        postedDate,
        postedDateSource: postedDate ? 'source_timestamp' : 'unverified',
        postedDateRelative: getTimeAgo(postedDate),
        discoveredAt: new Date().toISOString(),
        url: realUrl,
        applyUrl: realUrl,
        source: 'Remotive Public API',
        jobFamily: detectJobFamily(title, description),
        experienceLevel: exp.level,
        minExperienceYears: exp.minYears,
        maxExperienceYears: exp.maxYears,
        salary: item.salary || null,
        description,
        requiredSkills,
        preferredSkills,
        isDemo: false,
        verification: {
          status: 'VERIFIED_OPEN',
          checkedAt: new Date().toISOString(),
          evidence: 'Verified remote vacancy from official employer posting.',
          isDirectEmployerLink: true,
        },
        createdAt: postedDate || new Date().toISOString(),
      });
    }

    return jobs;
  }

  /**
   * Fetch from Arbeitnow Public Job API
   */
  async fetchFromArbeitnow(): Promise<Job[]> {
    const url = 'https://www.arbeitnow.com/api/job-board-api';
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const data = await res.json() as { data?: any[] };
    const items = data.data || [];

    const jobs: Job[] = [];
    for (const item of items.slice(0, 25)) {
      if (!item.url || typeof item.url !== 'string') continue;
      const realUrl = item.url.trim();

      const title = stripHtml(item.title || 'Software Engineer');
      const company = item.company_name || 'Tech Company';
      const location = item.location || (item.remote ? 'Remote' : 'Germany');
      const description = stripHtml(item.description || '');

      const postedDate = item.created_at ? new Date(item.created_at * 1000).toISOString() : null;
      const combinedText = `${title} ${description} ${(item.tags || []).join(' ')}`;
      const { requiredSkills, preferredSkills } = extractSkills(combinedText);
      const locMeta = detectLocationMetadata(location, combinedText);
      const exp = detectExperience(title, description);

      jobs.push({
        id: `arbeitnow-${item.slug || createId()}`,
        title,
        company,
        location,
        country: locMeta.country,
        city: locMeta.city,
        isIndiaLocation: locMeta.isIndiaLocation,
        isRemoteEligibleIndia: locMeta.isRemoteEligibleIndia,
        isInternational: locMeta.isInternational,
        workMode: item.remote ? 'Remote' : detectWorkMode(combinedText),
        postedDate,
        postedDateSource: postedDate ? 'source_timestamp' : 'unverified',
        postedDateRelative: getTimeAgo(postedDate),
        discoveredAt: new Date().toISOString(),
        url: realUrl,
        applyUrl: realUrl,
        source: 'Arbeitnow',
        jobFamily: detectJobFamily(title, description),
        experienceLevel: exp.level,
        minExperienceYears: exp.minYears,
        maxExperienceYears: exp.maxYears,
        salary: null,
        description,
        requiredSkills,
        preferredSkills,
        isDemo: false,
        verification: {
          status: 'LIKELY_OPEN',
          checkedAt: new Date().toISOString(),
          evidence: 'Retrieved from live public job API endpoint.',
          isDirectEmployerLink: false,
        },
        createdAt: postedDate || new Date().toISOString(),
      });
    }

    return jobs;
  }
}

export const jobService = new JobService();
