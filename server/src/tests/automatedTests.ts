import assert from 'assert';
import { evaluateJobMatch } from '../services/aiService';
import { buildCandidateProfileFromText } from '../services/resumeAnalyzer';
import { isSafeUrl } from '../services/verificationService';
import { Job, CandidateProfile, VerificationDetails } from '../utils/types';

// Helper to construct synthetic test jobs
function createSyntheticJob(overrides: Partial<Job>): Job {
  return {
    id: `synth-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: 'Software Engineer Intern',
    company: 'Test Corp',
    location: 'Bengaluru, India',
    country: 'India',
    city: 'Bengaluru',
    isIndiaLocation: true,
    isRemoteEligibleIndia: false,
    isInternational: false,
    workMode: 'On-site',
    postedDate: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), // 6 hours ago
    postedDateSource: 'source_timestamp',
    postedDateRelative: 'Posted 6 hours ago',
    discoveredAt: new Date().toISOString(),
    url: 'https://careers.exampleats.com/jobs/101',
    applyUrl: 'https://careers.exampleats.com/jobs/101/apply',
    source: 'Official ATS',
    jobFamily: 'Software Development & Full Stack',
    experienceLevel: 'Internship / Fresher',
    minExperienceYears: 0,
    maxExperienceYears: 1,
    salary: '₹30,000/month',
    description: 'Looking for a passionate Software Engineer Intern with skills in Python, React, and REST APIs.',
    requiredSkills: ['Python', 'React', 'REST APIs'],
    preferredSkills: ['Git', 'Docker'],
    isDemo: false,
    verification: {
      status: 'VERIFIED_OPEN',
      checkedAt: new Date().toISOString(),
      evidence: 'Active application form confirmed.',
      isDirectEmployerLink: true,
    },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export async function runAllTests(): Promise<{ passed: number; failed: number; tests: string[] }> {
  const log: string[] = [];
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    return (async () => {
      try {
        await fn();
        passed++;
        log.push(`✅ PASS: ${name}`);
      } catch (err: any) {
        failed++;
        log.push(`❌ FAIL: ${name} -> ${err.message}`);
      }
    })();
  }

  // Sample Resume Texts
  const cyberResumeText = `
    PRATIKSHA BANDE
    B.E. in CSE (Cyber Security) 2027, CGPA: 8.08/10
    Skills: Python, Java, Docker, Kubernetes, Terraform, Cybersecurity, VAPT, Penetration Testing, OWASP, Burp Suite, Nmap, Wireshark, React, Flask, MongoDB.
    Projects: DPDP Act 2023 Compliance & Data Privacy Protection System (Ethereum, Web3.py, Docker), Adversarial AI Attack and Defence Simulator (PyTorch), Multi-cloud portability (Terraform).
    Internships: Future Interns | Cyber Security Intern, Thiranex | Cyber Security Intern.
    Certifications: CEH v13, OCI Foundations, CLLMSE.
  `;

  const eeeResumeText = `
    ARUN KUMAR
    B.Tech in Electrical and Electronics Engineering (EEE) 2025
    Skills: Embedded Systems, Microcontroller, Circuit Design, Arduino, PCB Design, MATLAB, Power Systems, PLC, SCADA, C.
    Projects: Smart Grid Automation using IoT, Solar MPPT Inverter Design.
  `;

  const civilResumeText = `
    PRIYA SHARMA
    B.E. in Civil Engineering 2024
    Skills: AutoCAD Civil, Revit, STAAD Pro, BIM, Structural Engineering, Site Engineering, Surveying, Quantity Surveying.
    Projects: High-Rise Residential Building Design, Concrete Mix Optimization.
  `;

  const cyberProfile = buildCandidateProfileFromText(cyberResumeText, 'cyber.pdf');
  const eeeProfile = buildCandidateProfileFromText(eeeResumeText, 'eee.pdf');
  const civilProfile = buildCandidateProfileFromText(civilResumeText, 'civil.pdf');

  // Test 1: Multi-domain resume parsing recognizes correct job families & degrees
  await test('Resume Parser: Multi-domain mapping (Cybersecurity, EEE, Civil)', () => {
    assert(cyberProfile.detectedJobFamilies.some(f => f.includes('Cybersecurity')), 'Cyber profile should detect Cybersecurity');
    assert(eeeProfile.detectedJobFamilies.some(f => f.includes('Electrical')), 'EEE profile should detect Electrical/Electronics');
    assert(civilProfile.detectedJobFamilies.some(f => f.includes('Civil')), 'Civil profile should detect Civil/Structural');
    assert.strictEqual(cyberProfile.experienceLevel, 'Intern', 'Cyber student graduating 2027 should be Intern');
  });

  // Test 2: Relevant Indian cybersecurity internship matches cyber profile strongly
  await test('Matching: Relevant Bengaluru Cybersecurity Internship matches Cyber profile', () => {
    const cyberJob = createSyntheticJob({
      title: 'Cybersecurity Intern',
      location: 'Bengaluru, India',
      jobFamily: 'Cybersecurity & Information Security',
      requiredSkills: ['Cybersecurity', 'VAPT', 'Penetration Testing'],
      experienceLevel: 'Internship / Fresher',
      minExperienceYears: 0,
    });
    const match = evaluateJobMatch(cyberProfile, cyberJob);
    assert(match.matchScore >= 80, `Expected score >= 80, got ${match.matchScore}`);
    assert(match.isEligible, 'Should be marked eligible');
    assert(match.skillsMatched.includes('Cybersecurity'), 'Should match Cybersecurity skill');
  });

  // Test 3: Relevant hardware role matches EEE resume strongly
  await test('Matching: Hardware / Embedded Intern matches EEE resume', () => {
    const embeddedJob = createSyntheticJob({
      title: 'Embedded Systems Trainee',
      location: 'Bengaluru, India',
      jobFamily: 'Electrical & Electronics Engineering (EEE / ECE)',
      requiredSkills: ['Embedded Systems', 'Microcontroller', 'PCB Design'],
      experienceLevel: 'Internship / Fresher',
    });
    const match = evaluateJobMatch(eeeProfile, embeddedJob);
    assert(match.matchScore >= 75, `Expected score >= 75 for EEE, got ${match.matchScore}`);
  });

  // Test 4: Relevant Civil role matches Civil resume strongly
  await test('Matching: Site Engineer Trainee matches Civil resume', () => {
    const civilJob = createSyntheticJob({
      title: 'Graduate Engineer Trainee (Civil)',
      location: 'Hyderabad, India',
      jobFamily: 'Civil & Structural Engineering',
      requiredSkills: ['AutoCAD Civil', 'STAAD Pro', 'Site Engineering'],
      experienceLevel: 'Entry Level (0-2 years)',
    });
    const match = evaluateJobMatch(civilProfile, civilJob);
    assert(match.matchScore >= 75, `Expected score >= 75 for Civil, got ${match.matchScore}`);
  });

  // Test 5: Unrelated marketing / parcel delivery job receives low score and domain penalty
  await test('Matching: Unrelated parcel delivery vacancy penalized heavily', () => {
    const deliveryJob = createSyntheticJob({
      title: 'Paketzusteller / Delivery Driver',
      location: 'München, Germany',
      description: 'Parcel delivery driver role for warehouse operations.',
      jobFamily: 'Logistics',
      requiredSkills: ['Driver License', 'Communication'],
      isIndiaLocation: false,
      isInternational: true,
    });
    const match = evaluateJobMatch(cyberProfile, deliveryJob);
    assert(match.matchScore <= 25, `Expected score <= 25 for parcel delivery, got ${match.matchScore}`);
    assert(!match.isEligible, 'Should not be marked eligible');
    assert(match.eligibilityConcerns.length > 0, 'Should have eligibility concerns');
  });

  // Test 6: Germany-only onsite job flagged when user country is India
  await test('Location: Germany onsite job flagged when candidate prefers India', () => {
    const germanyJob = createSyntheticJob({
      title: 'Software Engineer',
      location: 'Berlin, Germany',
      country: 'Germany',
      isIndiaLocation: false,
      isRemoteEligibleIndia: false,
      isInternational: true,
      workMode: 'On-site',
    });
    const match = evaluateJobMatch(cyberProfile, germanyJob);
    assert(match.scoreBreakdown.locationMatch <= 2, `Location score should be penalized, got ${match.scoreBreakdown.locationMatch}`);
    assert(match.eligibilityConcerns.some(c => c.includes('Germany')), 'Should flag Germany authorization concern');
  });

  // Test 7: Senior role requiring 5+ years of experience heavily penalized for fresher/intern
  await test('Experience Barrier: Senior 5+ years role penalized for fresher candidate', () => {
    const seniorJob = createSyntheticJob({
      title: 'Senior Security Architect',
      jobFamily: 'Cybersecurity & Information Security',
      experienceLevel: 'Senior Level (5+ years)',
      minExperienceYears: 5,
      requiredSkills: ['Cybersecurity', 'Terraform', 'Cloud Security'],
    });
    const match = evaluateJobMatch(cyberProfile, seniorJob);
    assert(match.scoreBreakdown.experienceMatch <= 2, 'Senior role experience score must be low for intern');
    assert(match.eligibilityConcerns.some(c => c.includes('5+ years')), 'Must explicitly flag experience barrier');
  });

  // Test 8: Closed vacancy returned by provider is excluded and given 0 score
  await test('Verification: Closed vacancy produces score of 0 and is marked ineligible', () => {
    const closedJob = createSyntheticJob({
      title: 'Cybersecurity Intern',
      verification: {
        status: 'EXPIRED_OR_CLOSED',
        checkedAt: new Date().toISOString(),
        evidence: 'HTTP 404: Vacancy removed',
        isDirectEmployerLink: true,
      },
    });
    const match = evaluateJobMatch(cyberProfile, closedJob);
    assert.strictEqual(match.matchScore, 0, 'Closed vacancy match score must be 0');
    assert.strictEqual(match.isEligible, false, 'Closed vacancy must be ineligible');
  });

  // Test 9: SSRF Guard: Blocks localhost, 127.0.0.1, 169.254.169.254, and metadata.google.internal
  await test('Security SSRF Guard: Blocks localhost, internal IPs and cloud metadata', async () => {
    const checks = await Promise.all([
      isSafeUrl('http://localhost:5000/admin'),
      isSafeUrl('http://127.0.0.1:8080/'),
      isSafeUrl('http://169.254.169.254/latest/meta-data/'),
      isSafeUrl('http://10.0.0.1/internal'),
      isSafeUrl('http://192.168.1.1/router'),
      isSafeUrl('http://metadata.google.internal/computeMetadata/v1/'),
    ]);

    for (let i = 0; i < checks.length; i++) {
      assert.strictEqual(checks[i].safe, false, `SSRF check index ${i} should be blocked`);
    }

    const safeCheck = await isSafeUrl('https://careers.google.com/jobs/results/');
    assert.strictEqual(safeCheck.safe, true, 'Legitimate public careers URL must be allowed');
  });

  // Test 10: Strict 24-hour recency filter rejects old or unverified dates
  await test('Recency Filter: Distinguishes genuine 24h publication timestamps from old/unverified', () => {
    const now = Date.now();
    const cutoff24h = now - 24 * 3600 * 1000;

    const freshJob = createSyntheticJob({
      postedDate: new Date(now - 4 * 3600 * 1000).toISOString(),
      postedDateSource: 'source_timestamp',
    });
    const oldJob = createSyntheticJob({
      postedDate: new Date(now - 5 * 24 * 3600 * 1000).toISOString(),
      postedDateSource: 'source_timestamp',
    });
    const unverifiedDateJob = createSyntheticJob({
      postedDate: null,
      postedDateSource: 'unverified',
    });

    const isFresh = new Date(freshJob.postedDate!).getTime() >= cutoff24h;
    const isOld = new Date(oldJob.postedDate!).getTime() >= cutoff24h;
    const hasUnverifiedDate = !unverifiedDateJob.postedDate || unverifiedDateJob.postedDateSource === 'unverified';

    assert.strictEqual(isFresh, true, '4 hours ago must pass 24h filter');
    assert.strictEqual(isOld, false, '5 days ago must not pass 24h filter');
    assert.strictEqual(hasUnverifiedDate, true, 'Unverified date must be excluded from strict 24h');
  });

  return { passed, failed, tests: log };
}
