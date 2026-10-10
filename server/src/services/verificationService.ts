import dns from 'dns';
import { URL } from 'url';
import { VerificationDetails, VerificationStatus } from '../utils/types';

// ============ SSRF Protection ============
// Private & loopback IP patterns
const PRIVATE_IPV4_PATTERNS = [
  /^127\./,                         // Loopback
  /^10\./,                          // Class A private
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Class B private
  /^192\.168\./,                    // Class C private
  /^169\.254\./,                    // Link-local / Cloud metadata (AWS, GCP, Azure)
  /^0\./,                           // Current network
  /^224\./,                         // Multicast
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'instance-data',
];

/**
 * Checks if an IP or hostname is safe to fetch (prevents SSRF)
 */
export async function isSafeUrl(urlString: string): Promise<{ safe: boolean; reason?: string }> {
  try {
    const parsed = new URL(urlString);

    // Only HTTP and HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Protocol must be http: or https:' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check blocklisted hostnames
    if (BLOCKED_HOSTNAMES.includes(hostname) || hostname.endsWith('.internal') || hostname.endsWith('.local')) {
      return { safe: false, reason: `Disallowed hostname: ${hostname}` };
    }

    // Check if hostname is an IP directly
    for (const pattern of PRIVATE_IPV4_PATTERNS) {
      if (pattern.test(hostname)) {
        return { safe: false, reason: `Private/reserved IP address: ${hostname}` };
      }
    }

    // Resolve DNS to verify resolved IP is safe (prevents DNS rebinding to internal addresses)
    return new Promise((resolve) => {
      dns.lookup(hostname, { all: true }, (err, addresses) => {
        if (err || !addresses || addresses.length === 0) {
          // If DNS fails completely, mark unsafe
          resolve({ safe: false, reason: `DNS lookup failed for ${hostname}` });
          return;
        }

        for (const addr of addresses) {
          for (const pattern of PRIVATE_IPV4_PATTERNS) {
            if (pattern.test(addr.address)) {
              resolve({ safe: false, reason: `Resolved IP is private/internal: ${addr.address}` });
              return;
            }
          }
          if (addr.address === '::1' || addr.address.startsWith('fe80:') || addr.address.startsWith('fc00:')) {
            resolve({ safe: false, reason: `Resolved IP is IPv6 loopback/link-local: ${addr.address}` });
            return;
          }
        }

        resolve({ safe: true });
      });
    });
  } catch (e: any) {
    return { safe: false, reason: `Invalid URL: ${e.message}` };
  }
}

// Phrases indicating a vacancy is definitely closed or expired
const EXPIRED_PHRASES = [
  'job is no longer available',
  'position has been filled',
  'no longer accepting applications',
  'this vacancy has closed',
  'this posting has expired',
  'job has expired',
  'job posting has expired',
  'this job is closed',
  'application deadline has passed',
  'this listing is no longer active',
  'the job you are looking for has been removed',
  '404 job not found',
];

// Well-known applicant tracking systems and direct careers portals
const KNOWN_ATS_DOMAINS = [
  'greenhouse.io',
  'lever.co',
  'workday.com',
  'smartrecruiters.com',
  'workable.com',
  'bamboohr.com',
  'ashbyhq.com',
  'icims.com',
  'jobvite.com',
  'taleo.net',
  'arbeitnow.com',
  'adzuna.com',
  'adzuna.in',
  'myworkdayjobs.com',
];

export class JobVerificationService {
  private cache: Map<string, { details: VerificationDetails; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours cache

  /**
   * Verify an application URL safely
   */
  async verifyUrl(targetUrl: string, forceRefresh = false): Promise<VerificationDetails> {
    if (!targetUrl || typeof targetUrl !== 'string') {
      return {
        status: 'INVALID_LINK',
        checkedAt: new Date().toISOString(),
        evidence: 'Empty or non-string URL provided.',
        isDirectEmployerLink: false,
      };
    }

    const trimmedUrl = targetUrl.trim();

    // Check cache
    if (!forceRefresh) {
      const cached = this.cache.get(trimmedUrl);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.details;
      }
    }

    // SSRF Check
    const safetyCheck = await isSafeUrl(trimmedUrl);
    if (!safetyCheck.safe) {
      const details: VerificationDetails = {
        status: 'INVALID_LINK',
        checkedAt: new Date().toISOString(),
        evidence: `Blocked by SSRF / safety guard: ${safetyCheck.reason}`,
        isDirectEmployerLink: false,
      };
      this.cache.set(trimmedUrl, { details, expiresAt: Date.now() + this.CACHE_TTL_MS });
      return details;
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const res = await fetch(trimmedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 JobPulseVerificationBot/2.0',
          'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;
      const finalUrl = res.url || trimmedUrl;
      const httpStatus = res.status;

      // Verify the final redirected URL is also SSRF-safe
      if (finalUrl !== trimmedUrl) {
        const redirectedSafety = await isSafeUrl(finalUrl);
        if (!redirectedSafety.safe) {
          const details: VerificationDetails = {
            status: 'INVALID_LINK',
            checkedAt: new Date().toISOString(),
            finalUrl,
            httpStatus,
            responseTimeMs,
            evidence: `Redirected to disallowed URL: ${redirectedSafety.reason}`,
            isDirectEmployerLink: false,
          };
          this.cache.set(trimmedUrl, { details, expiresAt: Date.now() + this.CACHE_TTL_MS });
          return details;
        }
      }

      const isKnownAts = KNOWN_ATS_DOMAINS.some(domain => {
        try {
          return new URL(finalUrl).hostname.includes(domain);
        } catch {
          return false;
        }
      });

      // 1. Explicit closed HTTP status codes
      if (httpStatus === 404 || httpStatus === 410) {
        const details: VerificationDetails = {
          status: 'EXPIRED_OR_CLOSED',
          checkedAt: new Date().toISOString(),
          httpStatus,
          finalUrl,
          responseTimeMs,
          evidence: `HTTP ${httpStatus}: Destination page has been removed or is no longer found.`,
          isDirectEmployerLink: isKnownAts,
        };
        this.cache.set(trimmedUrl, { details, expiresAt: Date.now() + this.CACHE_TTL_MS });
        return details;
      }

      // 2. Access blocked / bot prevention
      if (httpStatus === 403 || httpStatus === 429) {
        const details: VerificationDetails = {
          status: 'VERIFICATION_BLOCKED',
          checkedAt: new Date().toISOString(),
          httpStatus,
          finalUrl,
          responseTimeMs,
          evidence: `HTTP ${httpStatus}: Access restricted by server WAF/Cloudflare or rate limit. Link remains accessible in user browser.`,
          isDirectEmployerLink: isKnownAts,
        };
        this.cache.set(trimmedUrl, { details, expiresAt: Date.now() + this.CACHE_TTL_MS });
        return details;
      }

      // 3. Other non-200 server errors
      if (!res.ok) {
        const details: VerificationDetails = {
          status: 'UNKNOWN',
          checkedAt: new Date().toISOString(),
          httpStatus,
          finalUrl,
          responseTimeMs,
          evidence: `HTTP ${httpStatus}: Server returned error response.`,
          isDirectEmployerLink: isKnownAts,
        };
        this.cache.set(trimmedUrl, { details, expiresAt: Date.now() + this.CACHE_TTL_MS });
        return details;
      }

      // 4. HTTP 200 OK — Inspect page content
      let bodySnippet = '';
      try {
        const text = await res.text();
        bodySnippet = text.slice(0, 50000).toLowerCase(); // Check first 50KB
      } catch {
        // If body reading fails, rely on status code
      }

      // Check if page contains explicit closed / expired phrases
      for (const phrase of EXPIRED_PHRASES) {
        if (bodySnippet.includes(phrase)) {
          const details: VerificationDetails = {
            status: 'EXPIRED_OR_CLOSED',
            checkedAt: new Date().toISOString(),
            httpStatus,
            finalUrl,
            responseTimeMs,
            evidence: `Page returned HTTP 200 but contained closed notice: "${phrase}".`,
            isDirectEmployerLink: isKnownAts,
          };
          this.cache.set(trimmedUrl, { details, expiresAt: Date.now() + this.CACHE_TTL_MS });
          return details;
        }
      }

      // Check if active application elements or authentic ATS domain exist
      const hasApplyKeywords =
        bodySnippet.includes('apply now') ||
        bodySnippet.includes('apply for this job') ||
        bodySnippet.includes('submit application') ||
        bodySnippet.includes('application form') ||
        bodySnippet.includes('apply on company site') ||
        bodySnippet.includes('apply with');

      if (isKnownAts || hasApplyKeywords) {
        const details: VerificationDetails = {
          status: 'VERIFIED_OPEN',
          checkedAt: new Date().toISOString(),
          httpStatus,
          finalUrl,
          responseTimeMs,
          evidence: isKnownAts
            ? `Verified active listing on authorized employer ATS (${new URL(finalUrl).hostname})`
            : 'Page verified active with functional application call-to-action.',
          isDirectEmployerLink: isKnownAts,
        };
        this.cache.set(trimmedUrl, { details, expiresAt: Date.now() + this.CACHE_TTL_MS });
        return details;
      }

      // Default for 200 without explicit apply or closed tags
      const details: VerificationDetails = {
        status: 'LIKELY_OPEN',
        checkedAt: new Date().toISOString(),
        httpStatus,
        finalUrl,
        responseTimeMs,
        evidence: 'Destination responded with HTTP 200 OK. Active vacancy status likely, pending direct applicant interaction.',
        isDirectEmployerLink: isKnownAts,
      };
      this.cache.set(trimmedUrl, { details, expiresAt: Date.now() + this.CACHE_TTL_MS });
      return details;
    } catch (err: any) {
      const responseTimeMs = Date.now() - startTime;
      if (err.name === 'AbortError') {
        const details: VerificationDetails = {
          status: 'VERIFICATION_BLOCKED',
          checkedAt: new Date().toISOString(),
          responseTimeMs,
          evidence: 'Request timed out after 6 seconds. Endpoint may have firewall or strict connection delays.',
          isDirectEmployerLink: false,
        };
        this.cache.set(trimmedUrl, { details, expiresAt: Date.now() + this.CACHE_TTL_MS });
        return details;
      }

      const details: VerificationDetails = {
        status: 'UNKNOWN',
        checkedAt: new Date().toISOString(),
        responseTimeMs,
        evidence: `Network verification issue: ${err.message}`,
        isDirectEmployerLink: false,
      };
      this.cache.set(trimmedUrl, { details, expiresAt: Date.now() + this.CACHE_TTL_MS });
      return details;
    }
  }

  /**
   * Batch verify multiple jobs concurrently with a concurrency limit
   */
  async verifyJobsBatch(jobs: Array<{ applyUrl: string }>, limit = 5): Promise<Map<string, VerificationDetails>> {
    const results = new Map<string, VerificationDetails>();
    const queue = [...jobs];

    const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item || !item.applyUrl) continue;
        if (results.has(item.applyUrl)) continue;

        try {
          const detail = await this.verifyUrl(item.applyUrl);
          results.set(item.applyUrl, detail);
        } catch {
          results.set(item.applyUrl, {
            status: 'UNKNOWN',
            checkedAt: new Date().toISOString(),
            evidence: 'Verification worker error',
            isDirectEmployerLink: false,
          });
        }
      }
    });

    await Promise.all(workers);
    return results;
  }
}

export const verificationService = new JobVerificationService();
