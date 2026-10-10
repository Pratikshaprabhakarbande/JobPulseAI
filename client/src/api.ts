const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint: string, options?: RequestInit) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed: ${res.status}`);
  }
  return res.json();
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
  const formData = new FormData();
  formData.append('resume', file);
  const url = `${API_BASE}/resume/upload`;
  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Upload failed');
  }
  return res.json();
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
