# JobPulse AI — Complete REST API Documentation

Base URL in local development: `http://localhost:5000/api`
Frontend requests via Vite proxy route directly to `/api/*`.

All responses return standard JSON.

---

## 1. System & Health Endpoints

### `GET /api/health`
Checks backend server status, active job providers, and scheduler state.

**Response `200 OK`**:
```json
{
  "status": "ok",
  "timestamp": "2026-10-10T16:21:16.240Z",
  "demoMode": false,
  "aiProvider": "demo",
  "jobProvider": "Adzuna API + Remotive",
  "realSourceConfigured": true,
  "schedulerRunning": true
}
```

---

## 2. Dashboard Endpoints

### `GET /api/dashboard/stats`
Retrieves aggregated metrics, candidate profile existence, and background automation status.

**Response `200 OK`**:
```json
{
  "totalJobs": 29,
  "verifiedOpenJobs": 18,
  "newToday": 5,
  "indiaJobsCount": 24,
  "excellentMatch": 4,
  "goodMatch": 12,
  "possibleMatch": 9,
  "lowMatch": 4,
  "activeProvider": "Adzuna API + Remotive",
  "verificationRate": 62,
  "hasResume": true,
  "resumeFilename": "Resume.pdf",
  "hasProfile": true,
  "candidateName": "Pratiksha Bande",
  "targetRoles": [
    "Cybersecurity Intern",
    "SOC Analyst L1",
    "Software Engineer Intern"
  ],
  "aiProvider": "demo",
  "demoMode": false,
  "realSourceConfigured": true,
  "jobProvider": "Adzuna API + Remotive",
  "scheduler": {
    "enabled": true,
    "dailyTime": "09:00",
    "timezone": "Asia/Kolkata",
    "cronExpression": "0 9 * * *",
    "isRunning": true,
    "lastRun": {
      "timestamp": "2026-10-10T15:18:13.624Z",
      "trigger": "manual",
      "status": "success",
      "jobsDiscovered": 29,
      "jobsMatched": 29,
      "emailSent": true,
      "emailRecipient": "candidate@example.com",
      "message": "Automation cycle completed."
    },
    "nextRunEstimated": "2026-10-11T03:30:00.000Z"
  }
}
```

---

## 3. Resume & Candidate Profile Endpoints

### `POST /api/resume/upload`
Uploads a candidate resume in PDF or DOCX format.
*Rate limited to 10 uploads per 15 minutes.*

- **Headers**: `Content-Type: multipart/form-data`
- **Body**: `resume` (Binary file, max 5MB)
- **Validation**:
  - File extension check (`.pdf` or `.docx`).
  - Binary magic byte validation (`%PDF-` for PDF, `PK\x03\x04` for DOCX).
  - Immediate deletion of uploaded disk file after extraction.

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "Resume successfully analyzed & universal profile generated ✅",
  "resume": {
    "id": "c1f7a048-b4b1-419b-bb99-36a4eb821f58",
    "filename": "Pratiksha_Resume.pdf",
    "uploadedAt": "2026-10-10T16:00:00.000Z",
    "skills": ["Cybersecurity", "React", "Python", "Docker"],
    "textLength": 4200
  },
  "profile": { ... }
}
```

### `GET /api/resume`
Returns current resume file metadata.

**Response `200 OK`**:
```json
{
  "hasResume": true,
  "resume": {
    "id": "c1f7a048-b4b1-419b-bb99-36a4eb821f58",
    "filename": "Pratiksha_Resume.pdf",
    "uploadedAt": "2026-10-10T16:00:00.000Z",
    "skills": ["Cybersecurity", "React", "Python", "Docker"],
    "summary": "Final-year B.E. student in Cyber Security & IoT..."
  }
}
```

### `GET /api/resume/profile`
Returns the structured, editable universal candidate profile.

**Response `200 OK`**:
```json
{
  "success": true,
  "profile": {
    "id": "0a654b18-7995-4e0e-8f01-86e3eea44424",
    "name": "Pratiksha Bande",
    "email": "candidate@example.com",
    "education": [
      {
        "degree": "B.E. / B.Tech",
        "branch": "Cyber Security & IoT",
        "institution": "University / Institute",
        "graduationYear": 2027,
        "cgpaOrPercentage": "8.08/10"
      }
    ],
    "demonstratedSkills": ["Cybersecurity", "VAPT", "Python", "React", "Docker"],
    "certifications": ["CEH", "Oracle Cloud"],
    "projects": [
      {
        "title": "DPDP Act 2023 Compliance & Data Privacy Protection",
        "description": "Docker-containerized DPDP-compliant platform with blockchain audit trails.",
        "technologies": ["React", "Flask", "MongoDB", "Ethereum", "Docker"]
      }
    ],
    "experienceLevel": "Intern",
    "targetRoles": ["Cybersecurity Intern", "SOC Analyst L1", "Software Engineer Intern"],
    "preferredLocations": ["Bengaluru", "Delhi NCR", "Hyderabad", "Pune", "Remote (India)"],
    "countryPreference": "India",
    "verifiedOnly": true,
    "allowInternational": false,
    "minMatchScore": 65
  }
}
```

### `PUT /api/resume/profile`
Updates candidate profile preferences and automatically recalculates match scores.

- **Headers**: `Content-Type: application/json`
- **Body**: Partial or complete `CandidateProfile` object.

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "Profile preferences updated and recommendations recalculated.",
  "profile": { ... }
}
```

### `DELETE /api/resume`
Deletes the active resume and candidate profile.

---

## 4. Job Listings & Verification Endpoints

### `GET /api/jobs`
Lists job postings matching query filters.

**Query Parameters**:
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `search` | `string` | Text query matching title, company, or skills. |
| `role` | `string` | Title/role substring filter. |
| `company` | `string` | Company name substring filter. |
| `location` | `string` | Location name substring filter. |
| `workMode` | `string` | `'Remote'`, `'Hybrid'`, `'On-site'`, or `'all'`. |
| `experienceLevel` | `string` | Target experience tier. |
| `maxAge` | `number` | Recency filter in hours (`24`, `72`, `168`, `336`). (Unverified timestamps excluded from 24h & 72h). |
| `minScore` | `number` | Minimum match score threshold (`0`–`100`). |
| `verifiedOnly` | `boolean` | When `'true'`, returns only `VERIFIED_OPEN` and `LIKELY_OPEN` vacancies. |
| `allowInternational` | `boolean` | When `'true'`, includes non-India international listings. Default `'false'` (India-first). |
| `sortBy` | `string` | `'match'` (default), `'newest'`, or `'company'`. |

**Response `200 OK`**:
```json
{
  "total": 25,
  "verifiedCount": 16,
  "indiaCount": 22,
  "jobs": [
    {
      "id": "adzuna-48291039",
      "title": "Cybersecurity Analyst Intern",
      "company": "SecureTech Solutions",
      "location": "Bengaluru, Karnataka, India",
      "city": "Bengaluru",
      "isIndiaLocation": true,
      "isRemoteEligibleIndia": false,
      "isInternational": false,
      "workMode": "Hybrid",
      "postedDate": "2026-10-10T12:00:00.000Z",
      "postedDateSource": "source_timestamp",
      "timeAgo": "Posted 4 hours ago",
      "applyUrl": "https://careers.securetech.com/jobs/101/apply",
      "source": "Adzuna API",
      "matchScore": 88,
      "isEligible": true,
      "skillsMatched": ["Cybersecurity", "VAPT", "Python"],
      "skillsMissing": ["Splunk"],
      "eligibilityConcerns": [],
      "verification": {
        "status": "VERIFIED_OPEN",
        "checkedAt": "2026-10-10T14:30:00.000Z",
        "evidence": "Verified active application form on official ATS.",
        "isDirectEmployerLink": true
      }
    }
  ],
  "demoMode": false,
  "realSourceConfigured": true,
  "provider": "Adzuna API + Remotive"
}
```

### `GET /api/jobs/:id`
Retrieves a specific job with full analysis details.

### `POST /api/jobs/:id/verify`
Triggers an on-demand, SSRF-guarded HTTP verification check against the job's application link.

**Response `200 OK`**:
```json
{
  "success": true,
  "jobId": "adzuna-48291039",
  "verification": {
    "status": "VERIFIED_OPEN",
    "checkedAt": "2026-10-10T16:30:15.120Z",
    "httpStatus": 200,
    "finalUrl": "https://careers.securetech.com/jobs/101/apply",
    "evidence": "HTTP 200: Accessible employer career destination.",
    "responseTimeMs": 340,
    "isDirectEmployerLink": true
  }
}
```

### `POST /api/jobs/:id/analyze`
Evaluates a single job against the candidate profile.

### `POST /api/jobs/analyze-all`
Evaluates all loaded vacancies against the candidate profile.

### `POST /api/jobs/refresh`
Refreshes vacancies from configured providers (Adzuna, Remotive, Arbeitnow).
*Rate limited to 10 refreshes per 15 minutes.*

---

## 5. Settings & Alerts Endpoints

### `GET /api/settings`
Retrieves email and alert preferences.

### `PUT /api/settings`
Updates email address, match score threshold, frequency, and target roles.

### `POST /api/settings/email/test`
Dispatches a test job digest to the configured email address.
*Rate limited to 5 test emails per 15 minutes.*

**Body**:
```json
{
  "email": "candidate@example.com"
}
```

---

## 6. Automation Scheduler Endpoints

### `GET /api/scheduler/status`
Returns scheduler configuration, running state, and last execution details.

### `POST /api/scheduler/trigger`
Manually triggers an immediate full automation cycle:
`Discover Jobs` $\rightarrow$ `Score Matches` $\rightarrow$ `Verify Vacancies` $\rightarrow$ `Deduplicate` $\rightarrow$ `Send Email Digest`.

### `POST /api/scheduler/start`
Starts or restarts the cron scheduler.

### `POST /api/scheduler/stop`
Pauses the cron scheduler.
