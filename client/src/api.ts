export function getApiBaseUrl(): string {
  const custom = typeof window !== 'undefined' ? localStorage.getItem('jobpulse_backend_url') : null;
  const raw = custom || import.meta.env.VITE_API_URL || '/api';
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed || trimmed === '/api') return '/api';
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export function setApiBaseUrl(url: string | null): void {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('jobpulse_backend_url', url.trim());
    } else {
      localStorage.removeItem('jobpulse_backend_url');
    }
  }
}

async function request(endpoint: string, options?: RequestInit) {
  const base = getApiBaseUrl();
  const url = `${base}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const msg = errorData.error || errorData.message || `Request failed: ${res.status}`;
      throw new Error(msg);
    }
    return res.json();
  } catch (err: any) {
    // If request to static host failed with 404/405 or network connection refused
    const isStaticSubpath = base === '/api' || (typeof window !== 'undefined' && base.includes(window.location.hostname));
    if (isStaticSubpath && (err.message?.includes('404') || err.message?.includes('405') || err.message?.includes('Failed to fetch'))) {
      throw new Error(
        `Backend unreachable at ${base}. GitHub Pages hosts only the static frontend. Please configure your deployed backend URL in Settings.`
      );
    }
    throw err;
  }
}

// ============ Dashboard ============
export const getDashboardStats = () => request('/dashboard/stats');

// ============ Jobs ============
export const getJobs = (params?: Record<string, string>) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return request(`/jobs${query}`);
};

export const getJobById = (id: string) => request(`/jobs/${id}`);

export const analyzeJob = (id: string) =>
  request(`/jobs/${id}/analyze`, { method: 'POST' });

export const analyzeAllJobs = () =>
  request('/jobs/analyze-all', { method: 'POST' });

export const refreshJobs = () =>
  request('/jobs/refresh', { method: 'POST' });

export const verifyJob = (id: string) =>
  request(`/jobs/${id}/verify`, { method: 'POST' });

// ============ Resume & Candidate Profile ============
export const getResume = () => request('/resume');
export const getProfile = () => request('/resume/profile');
export const updateProfile = (profile: any) =>
  request('/resume/profile', { method: 'PUT', body: JSON.stringify(profile) });

export const uploadResume = async (file: File) => {
  const base = getApiBaseUrl();
  const formData = new FormData();
  formData.append('resume', file);
  const url = `${base}/resume/upload`;
  try {
    const res = await fetch(url, { method: 'POST', body: formData });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed (${res.status})`);
    }
    return res.json();
  } catch (err: any) {
    const isStaticSubpath = base === '/api' || (typeof window !== 'undefined' && base.includes(window.location.hostname));
    if (isStaticSubpath && (err.message?.includes('404') || err.message?.includes('405') || err.message?.includes('Failed to fetch'))) {
      throw new Error(
        `Backend unreachable at ${base}. Connect your live backend server in Settings to enable resume parsing.`
      );
    }
    throw err;
  }
};

export const deleteResume = () =>
  request('/resume', { method: 'DELETE' });

// ============ Settings ============
export const getSettings = () => request('/settings');

export const updateSettings = (settings: any) =>
  request('/settings', { method: 'PUT', body: JSON.stringify(settings) });

export const sendTestEmail = (email?: string) =>
  request('/settings/email/test', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

// ============ Scheduler / Automation ============
export const getSchedulerStatus = () => request('/scheduler/status');

export const triggerAutomation = () =>
  request('/scheduler/trigger', { method: 'POST' });

export const startScheduler = () =>
  request('/scheduler/start', { method: 'POST' });

export const stopScheduler = () =>
  request('/scheduler/stop', { method: 'POST' });

// ============ Health ============
export const checkHealth = () => request('/health');
