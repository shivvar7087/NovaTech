export function normalizeApiBase(url) {
  if (!url) return '/api';
  let cleaned = url.trim().replace(/\/+$/, '');
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    if (!cleaned.endsWith('/api')) {
      cleaned = `${cleaned}/api`;
    }
  }
  return cleaned;
}

export function getApiBase() {
  if (typeof window !== 'undefined') {
    const override = window.localStorage.getItem('CAMPUS_API_BASE');
    if (override && override.trim()) {
      return normalizeApiBase(override);
    }
  }
  const rawBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';
  return normalizeApiBase(rawBase);
}

export function setApiBaseOverride(newUrl) {
  if (typeof window !== 'undefined') {
    if (newUrl && newUrl.trim()) {
      window.localStorage.setItem('CAMPUS_API_BASE', newUrl.trim());
    } else {
      window.localStorage.removeItem('CAMPUS_API_BASE');
    }
  }
}

export const API_BASE = getApiBase();

async function handleResponse(res, fallbackMessage) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    if (text.includes('<!doctype') || text.includes('<html')) {
      throw new Error(`API endpoint returned HTML instead of JSON. The backend is not connected at "${getApiBase()}".`);
    }
    throw new Error(fallbackMessage || `Server responded with ${res.status}`);
  }
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || fallbackMessage || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchHealth() {
  const res = await fetch(`${getApiBase()}/health`);
  return handleResponse(res, 'Backend health check failed');
}

export async function fetchDatasetSummary() {
  const res = await fetch(`${getApiBase()}/dataset/summary`);
  return handleResponse(res, 'Failed to fetch dataset summary');
}

export async function fetchDatasetSample(limit = 15) {
  const res = await fetch(`${getApiBase()}/dataset/sample?limit=${limit}`);
  return handleResponse(res, 'Failed to fetch sample records');
}

export async function fetchBuildings() {
  const res = await fetch(`${getApiBase()}/buildings`);
  return handleResponse(res, 'Failed to fetch buildings list');
}

export async function uploadDatasetFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${getApiBase()}/dataset/upload`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(res, 'Failed to upload dataset');
}

export async function resetDataset() {
  const res = await fetch(`${getApiBase()}/dataset/reset`, {
    method: 'POST',
  });
  return handleResponse(res, 'Failed to reset dataset');
}

export async function submitQuery(question, buildingFilter = null) {
  const res = await fetch(`${getApiBase()}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      building_filter: buildingFilter || null,
    }),
  });
  return handleResponse(res, 'Query processing failed');
}
