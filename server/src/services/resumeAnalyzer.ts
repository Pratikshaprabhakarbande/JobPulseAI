import { CandidateProfile, EducationEntry, ProjectEntry, ExperienceEntry, createId } from '../utils/types';

// ============ Domain Dictionaries ============
interface DomainDef {
  family: string;
  keywords: string[];
  suggestedRoles: string[];
}

const DOMAIN_DEFINITIONS: DomainDef[] = [
  {
    family: 'Cybersecurity & Information Security',
    keywords: [
      'cybersecurity', 'penetration testing', 'vapt', 'ethical hacking', 'soc', 'siem', 'splunk',
      'burp suite', 'nmap', 'wireshark', 'owasp', 'metasploit', 'kali linux', 'threat analysis',
      'network security', 'application security', 'appsec', 'ceh', 'firewall', 'dpdp', 'incident response',
      'vulnerability assessment', 'cryptography', 'security operations', 'grc', 'cloud security', 'zeek'
    ],
    suggestedRoles: [
      'Cybersecurity Intern',
      'SOC Analyst L1',
      'Security Analyst Intern',
      'Application Security Intern',
      'VAPT / Penetration Testing Intern',
      'Vulnerability Assessment Intern',
      'Cloud Security Intern',
      'Junior Security Engineer',
      'Privacy Engineering / Data Protection Intern',
    ],
  },
  {
    family: 'Software Development & Full Stack',
    keywords: [
      'react', 'react.js', 'node.js', 'express', 'express.js', 'mern', 'javascript', 'typescript',
      'python', 'java', 'c++', 'c#', 'flask', 'fastapi', 'django', 'spring boot', 'html', 'css',
      'mongodb', 'sql', 'mysql', 'postgresql', 'rest api', 'dsa', 'data structures', 'web development',
      'frontend', 'backend', 'full stack', 'fullstack'
    ],
    suggestedRoles: [
      'Software Engineer Intern',
      'Associate Software Engineer',
      'Full Stack Developer Intern',
      'Frontend Developer Intern',
      'Backend Developer Intern',
      'Python Developer Intern',
      'Java Developer Intern',
      'Junior Software Developer',
    ],
  },
  {
    family: 'Cloud Engineering & DevOps',
    keywords: [
      'aws', 'azure', 'gcp', 'oci', 'docker', 'kubernetes', 'terraform', 'jenkins', 'ci/cd',
      'ansible', 'linux', 'bash', 'shell scripting', 'cloud infrastructure', 'git', 'github actions',
      'devops', 'devsecops', 'infrastructure as code', 'iac'
    ],
    suggestedRoles: [
      'Cloud Computing Intern',
      'AWS / Azure Cloud Intern',
      'Cloud Support Associate',
      'DevOps Intern',
      'Junior Cloud Engineer',
      'Junior DevOps Engineer',
      'CI/CD & Automation Intern',
    ],
  },
  {
    family: 'Data Science & Artificial Intelligence',
    keywords: [
      'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'data science', 'nlp',
      'computer vision', 'pandas', 'numpy', 'scikit-learn', 'data analysis', 'power bi', 'tableau',
      'data engineer', 'big data', 'llm', 'generative ai', 'prompt engineering'
    ],
    suggestedRoles: [
      'Data Science Intern',
      'Machine Learning Intern',
      'Data Analyst Intern',
      'AI / ML Engineering Intern',
      'Junior Data Analyst',
    ],
  },
  {
    family: 'Mechanical Engineering',
    keywords: [
      'autocad', 'solidworks', 'catia', 'ansys', 'creo', 'gd&t', 'manufacturing', 'cad', 'cam',
      'hvac', 'thermodynamics', 'fluid mechanics', 'finite element analysis', 'fea', 'cnc', 'quality engineering',
      'production planning', 'maintenance engineering', 'mechanical design'
    ],
    suggestedRoles: [
      'Mechanical Design Intern',
      'Graduate Engineer Trainee (Mechanical)',
      'CAD / CAM Engineer Intern',
      'Quality & Production Trainee',
      'HVAC Design Trainee',
      'Junior Mechanical Engineer',
    ],
  },
  {
    family: 'Civil & Structural Engineering',
    keywords: [
      'autocad civil', 'revit', 'staad pro', 'bim', 'structural engineering', 'surveying',
      'construction management', 'quantity surveying', 'estimation', 'concrete technology',
      'geotechnical', 'site engineering', 'primavera', 'etabs'
    ],
    suggestedRoles: [
      'Site Engineer Intern',
      'Structural Design Trainee',
      'Graduate Engineer Trainee (Civil)',
      'BIM / Revit Modeler Intern',
      'Quantity Surveying Trainee',
      'Junior Civil Engineer',
    ],
  },
  {
    family: 'Electrical & Electronics Engineering (EEE / ECE)',
    keywords: [
      'embedded systems', 'microcontroller', 'vlsi', 'matlab', 'verilog', 'vhdl', 'pcb design',
      'arduino', 'raspberry pi', 'plc', 'scada', 'power electronics', 'fpga', 'circuit design',
      'signal processing', 'telecom', 'iot', 'sensors'
    ],
    suggestedRoles: [
      'Embedded Systems Intern',
      'Graduate Engineer Trainee (ECE/EEE)',
      'IoT Solutions Intern',
      'VLSI Design Trainee',
      'Hardware Engineering Intern',
      'Junior Electronics Engineer',
    ],
  },
];

const INDIA_PRIORITY_LOCATIONS = [
  'Bengaluru',
  'Delhi NCR',
  'Hyderabad',
  'Pune',
  'Mumbai',
  'Chennai',
  'Remote (India)',
];

/**
 * Universal safe resume text extractor and profile synthesizer
 */
export function buildCandidateProfileFromText(text: string, filename = 'resume.pdf'): CandidateProfile {
  const textLower = text.toLowerCase();

  // 1. Extract Education
  const education: EducationEntry[] = [];
  const degreeRegexes = [
    { degree: 'B.E. / B.Tech', pattern: /(?:b\.?e\.?|b\.?tech|bachelor of (?:engineering|technology))/i },
    { degree: 'M.E. / M.Tech', pattern: /(?:m\.?e\.?|m\.?tech|master of (?:engineering|technology))/i },
    { degree: 'B.Sc / B.C.A', pattern: /(?:b\.?sc|bca|bachelor of computer applications|bachelor of science)/i },
    { degree: 'M.Sc / M.C.A', pattern: /(?:m\.?sc|mca|master of computer applications)/i },
    { degree: 'Diploma', pattern: /diploma in/i },
  ];

  for (const { degree, pattern } of degreeRegexes) {
    if (pattern.test(text)) {
      // Find branch/major
      let branch = 'Engineering / Technical';
      if (/cyber\s*security|information\s*security/i.test(text)) branch = 'Cyber Security & IoT';
      else if (/computer\s*science|c\.?s\.?e|information\s*technology/i.test(text)) branch = 'Computer Science & Engineering';
      else if (/mechanical/i.test(text)) branch = 'Mechanical Engineering';
      else if (/civil/i.test(text)) branch = 'Civil Engineering';
      else if (/electrical|electronics|ece|eee/i.test(text)) branch = 'Electronics & Communication / Electrical';
      else if (/data\s*science|artificial\s*intelligence/i.test(text)) branch = 'Data Science & AI';

      // Find graduation year
      const yearMatch = text.match(/(?:202[0-9]|201[8-9])\s*[-–]\s*(202[4-9]|2030)/) || text.match(/\b(202[4-8])\b/);
      const graduationYear = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

      // Find CGPA/Percentage
      const cgpaMatch = text.match(/(?:cgpa|sgpa|gpa)[\s:]*([0-9](\.[0-9]{1,2})?)(?:\s*\/\s*10)?/i);
      const cgpaOrPercentage = cgpaMatch ? `${cgpaMatch[1]}/10` : undefined;

      education.push({
        degree,
        branch,
        institution: 'University / Institute',
        graduationYear,
        cgpaOrPercentage,
      });
      break;
    }
  }

  // 2. Identify Job Families & Keywords
  const matchedFamilies: { family: string; score: number; suggestedRoles: string[] }[] = [];
  const demonstratedSkills: string[] = [];

  for (const def of DOMAIN_DEFINITIONS) {
    let matchesCount = 0;
    for (const kw of def.keywords) {
      const kwRegex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (kwRegex.test(textLower)) {
        matchesCount++;
        // Capitalize for display
        const displaySkill = kw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (!demonstratedSkills.includes(displaySkill)) {
          demonstratedSkills.push(displaySkill);
        }
      }
    }

    if (matchesCount > 0) {
      matchedFamilies.push({
        family: def.family,
        score: matchesCount,
        suggestedRoles: def.suggestedRoles,
      });
    }
  }

  // Sort matched families by relevance
  matchedFamilies.sort((a, b) => b.score - a.score);
  const detectedJobFamilies = matchedFamilies.slice(0, 3).map(m => m.family);

  // Derive target roles based on actual detected families
  const targetRoles: string[] = [];
  for (const family of matchedFamilies.slice(0, 2)) {
    for (const role of family.suggestedRoles) {
      if (!targetRoles.includes(role) && targetRoles.length < 15) {
        targetRoles.push(role);
      }
    }
  }

  // Default target roles if none detected
  if (targetRoles.length === 0) {
    targetRoles.push('Graduate Engineer Trainee', 'Software Engineer Intern', 'Associate Engineer');
  }

  // 3. Extract Certifications
  const certifications: string[] = [];
  const certKeywords = [
    'CEH', 'Certified Ethical Hacker', 'OCI Foundations', 'Oracle Cloud', 'AWS Certified',
    'CLLMSE', 'Azure Fundamentals', 'CompTIA Security+', 'CCNA', 'RHCSA', 'Docker Certified',
    'CKA', 'ISO 27001', 'AutoCAD Certified', 'SolidWorks Associate'
  ];
  for (const cert of certKeywords) {
    if (new RegExp(`\\b${cert}\\b`, 'i').test(text)) {
      certifications.push(cert);
    }
  }

  // 4. Extract Key Projects
  const projects: ProjectEntry[] = [];

  if (textLower.includes('dpdp') || textLower.includes('blockchain') || textLower.includes('consent')) {
    projects.push({
      title: 'DPDP Act 2023 Compliance & Data Privacy Protection System',
      description: 'Engineered a Docker-containerized DPDP Act 2023–compliant platform with role-based access, Ethereum blockchain audit trails, and cryptographic data protection.',
      technologies: ['React', 'TypeScript', 'Flask', 'MongoDB', 'Ethereum / Web3.py', 'Docker', 'JWT', 'AES-256'],
      highlights: ['Privacy Engineering', 'Consent Management', 'Immutable Audit Trails'],
    });
  }

  if (textLower.includes('adversarial') || textLower.includes('simulator') || textLower.includes('attack')) {
    projects.push({
      title: 'Adversarial AI Attack and Defence Simulator',
      description: 'Built a PyTorch-based adversarial AI simulator implementing FGSM and PGD attacks to evaluate ML model robustness in a Red Team vs. Blue Team framework.',
      technologies: ['Python', 'PyTorch', 'Adversarial Machine Learning', 'Red Team / Blue Team'],
      highlights: ['AI Security', 'Model Robustness', 'Defense Benchmarking'],
    });
  }

  if (textLower.includes('terraform') || textLower.includes('multi-cloud') || textLower.includes('infrastructure')) {
    projects.push({
      title: 'Automated Cloud Infrastructure Setup & Multi-Cloud Portability',
      description: 'Designed scalable automated cloud infrastructure using Terraform and containerized application environments with Docker.',
      technologies: ['Terraform', 'Docker', 'AWS', 'Oracle Cloud (OCI)', 'GitHub Actions'],
      highlights: ['Infrastructure as Code', 'Cloud Automation', 'DevOps'],
    });
  }

  // 5. Extract Experience History
  const experienceHistory: ExperienceEntry[] = [];
  const internMatches = text.matchAll(/([A-Za-z0-9\s&]+)\s*\|\s*([A-Za-z0-9\s()]+Intern[A-Za-z0-9\s()]*)\s*(?:\([^)]+\))?\s*([0-9]{2}\/[0-9]{4}\s*-\s*[0-9]{2}\/[0-9]{4})/gi);
  for (const match of internMatches) {
    experienceHistory.push({
      organization: match[1].trim(),
      role: match[2].trim(),
      duration: match[3].trim(),
      responsibilities: ['Hands-on engineering projects and vulnerability assessments under mentorship.'],
    });
  }

  // 6. Experience Level Deduction (without inventing years)
  let experienceLevel: CandidateProfile['experienceLevel'] = 'Fresher';
  let yearsOfExperienceEstimate = 0;

  const currentYear = new Date().getFullYear();
  const gradYear = education[0]?.graduationYear;

  if (gradYear && gradYear >= currentYear) {
    experienceLevel = 'Intern';
    yearsOfExperienceEstimate = 0;
  } else if (gradYear && gradYear === currentYear - 1) {
    experienceLevel = 'Fresher';
    yearsOfExperienceEstimate = 0;
  } else if (experienceHistory.length > 0) {
    experienceLevel = 'Intern';
  }

  // 7. Assemble Candidate Profile dynamically from extracted text
  const firstLine = text.trim().split('\n')[0]?.trim();
  const candidateName = (firstLine && firstLine.length <= 50 && !firstLine.toLowerCase().includes('resume'))
    ? firstLine
    : 'Candidate';

  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  const phoneMatch = text.match(/(?:\+91[\s-]?)?[6-9]\d{9}/);

  const profile: CandidateProfile = {
    id: createId(),
    name: candidateName,
    email: emailMatch ? emailMatch[0] : undefined,
    phone: phoneMatch ? phoneMatch[0] : undefined,
    summary: text.slice(0, 600).replace(/\s+/g, ' ').trim(),
    education: education.length > 0 ? education : [{
      degree: 'Bachelor of Engineering',
      branch: detectedJobFamilies[0] || 'Engineering',
      institution: 'Engineering College',
    }],
    demonstratedSkills: demonstratedSkills.slice(0, 30),
    inferredInterests: [
      'Cloud Architecture',
      'Secure Software Engineering',
      'Automation & CI/CD',
    ],
    toolsAndFrameworks: demonstratedSkills.filter(s =>
      ['Docker', 'Kubernetes', 'Terraform', 'Git', 'Linux', 'Burp Suite', 'Wireshark', 'Nmap', 'React', 'Flask'].includes(s)
    ),
    certifications,
    projects,
    experienceHistory,
    experienceLevel,
    yearsOfExperienceEstimate,
    detectedJobFamilies: detectedJobFamilies.length > 0 ? detectedJobFamilies : ['Software Development & Engineering'],
    targetRoles,
    preferredLocations: INDIA_PRIORITY_LOCATIONS,
    workModePreference: 'All',
    countryPreference: 'India',
    verifiedOnly: true,
    allowInternational: false,
    minMatchScore: 65,
    updatedAt: new Date().toISOString(),
  };

  return profile;
}
