const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export async function fetchDatasetSummary() {
  const res = await fetch(`${API_BASE}/dataset/summary`);
  if (!res.ok) throw new Error('Failed to fetch dataset summary');
  return res.json();
}

export async function fetchDatasetSample(limit = 15) {
  const res = await fetch(`${API_BASE}/dataset/sample?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch sample records');
  return res.json();
}

export async function fetchBuildings() {
  const res = await fetch(`${API_BASE}/buildings`);
  if (!res.ok) throw new Error('Failed to fetch buildings list');
  return res.json();
}

export async function uploadDatasetFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/dataset/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to upload dataset');
  }
  return res.json();
}

export async function resetDataset() {
  const res = await fetch(`${API_BASE}/dataset/reset`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset dataset');
  return res.json();
}

export async function submitQuery(question, buildingFilter = null) {
  const res = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      building_filter: buildingFilter || null,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Query processing failed');
  }
  return res.json();
}

