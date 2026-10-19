import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import UploadPanel from './components/UploadPanel';
import ChatPanel from './components/ChatPanel';
import AnswerCard from './components/AnswerCard';
import ChartPanel from './components/ChartPanel';
import DataTable from './components/DataTable';
import { AnalyticsPage, BuildingsPage, ReportsPage } from './components/DataPages';
import {
  fetchHealth,
  fetchDatasetSummary,
  fetchDatasetSample,
  submitQuery,
  getApiBase,
  setApiBaseOverride
} from './services/api';

export default function App() {
  const [backendHealth, setBackendHealth] = useState(null);
  const [datasetSummary, setDatasetSummary] = useState(null);
  const [queryResponse, setQueryResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewRecords, setPreviewRecords] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activePage, setActivePage] = useState('overview');
  const [allRecords, setAllRecords] = useState([]);
  const [theme, setTheme] = useState(() => window.localStorage.getItem('campus-theme') || 'dark');
  const [retryingApi, setRetryingApi] = useState(false);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('CAMPUS_API_BASE') || '';
    }
    return '';
  });

  // Initial load
  useEffect(() => {
    initApp();
  }, []);

  // Auto-retry polling when backend is offline (e.g. Render free tier cold start)
  useEffect(() => {
    if (backendHealth) return;
    const interval = setInterval(() => {
      initApp();
    }, 10000);
    return () => clearInterval(interval);
  }, [backendHealth]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('campus-theme', theme);
  }, [theme]);

  const initApp = async () => {
    setRetryingApi(true);
    let success = false;
    try {
      const health = await fetchHealth();
      setBackendHealth(health);
      success = true;
    } catch (err) {
      console.warn('Backend not yet reachable:', err);
      setBackendHealth(null);
    }

    if (success) {
      try {
        const summary = await fetchDatasetSummary();
        setDatasetSummary(summary);
        const sample = await fetchDatasetSample(10000);
        setAllRecords(sample.records || []);
      } catch (err) {
        console.warn('Could not load summary:', err);
      }
    }
    setRetryingApi(false);
  };

  const handleSaveApiUrl = async (e) => {
    e.preventDefault();
    setApiBaseOverride(customApiUrl);
    await initApp();
  };

  const handleResetApiUrl = async () => {
    setCustomApiUrl('');
    setApiBaseOverride('');
    await initApp();
  };

  const handleDatasetUpdated = (newSummary) => {
    setDatasetSummary(newSummary);
    setQueryResponse(null);
    setShowPreview(false);
    setPreviewRecords(null);
    setAllRecords([]);
    fetchDatasetSample(10000).then((sample) => setAllRecords(sample.records || [])).catch((err) => console.warn('Could not refresh dataset records:', err));
  };

  const handlePreviewRequested = async () => {
    try {
      const sample = await fetchDatasetSample(20);
      setPreviewRecords(sample.records);
      setShowPreview(true);
    } catch (err) {
      alert('Failed to load dataset preview: ' + err.message);
    }
  };

  const handleQuerySubmit = async (question, buildingFilter) => {
    setLoading(true);
    setShowPreview(false);
    try {
      const resp = await submitQuery(question, buildingFilter);
      setQueryResponse(resp);
    } catch (err) {
      alert('Query failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar
        backendHealth={backendHealth}
        datasetSummary={datasetSummary}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
      />

      {!backendHealth && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.12), rgba(245, 158, 11, 0.12))',
          borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
          padding: '0.65rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          fontSize: '0.82rem',
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <div>
                <strong>Backend API Offline / Connecting</strong> &mdash; Endpoint: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#fca5a5' }}>{getApiBase()}</code>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94a3b8)', marginTop: '0.15rem' }}>
                  {typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? (
                    <span>Netlify is a static web host and cannot run Python. Deploy FastAPI on Render, or wait ~40s if waking up from free-tier sleep.</span>
                  ) : (
                    <span>Ensure FastAPI backend is running: <code>uvicorn app.main:app --reload</code> on port 8000.</span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => initApp()}
                disabled={retryingApi}
                style={{
                  background: 'var(--accent-color, #6366f1)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.35rem 0.75rem',
                  cursor: retryingApi ? 'not-allowed' : 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                {retryingApi ? '⏳ Checking...' : '🔄 Retry Connection'}
              </button>

              <button
                onClick={() => setShowApiConfig(!showApiConfig)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'inherit',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  padding: '0.35rem 0.75rem',
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                ⚙️ {showApiConfig ? 'Close' : 'Set Backend URL'}
              </button>
            </div>
          </div>

          {showApiConfig && (
            <form onSubmit={handleSaveApiUrl} style={{
              marginTop: '0.3rem',
              padding: '0.6rem 0.8rem',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              flexWrap: 'wrap'
            }}>
              <label style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>Render / Cloud API URL:</label>
              <input
                type="text"
                placeholder="https://your-service.onrender.com"
                value={customApiUrl}
                onChange={(e) => setCustomApiUrl(e.target.value)}
                style={{
                  flex: '1 1 260px',
                  padding: '0.35rem 0.6rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.25)',
                  background: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  fontSize: '0.8rem'
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#22c55e',
                  color: '#0f172a',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.35rem 0.75rem',
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Save & Connect
              </button>
              {customApiUrl && (
                <button
                  type="button"
                  onClick={handleResetApiUrl}
                  style={{
                    background: 'transparent',
                    color: '#f87171',
                    border: '1px solid #f87171',
                    borderRadius: '4px',
                    padding: '0.35rem 0.6rem',
                    cursor: 'pointer',
                    fontSize: '0.76rem'
                  }}
                >
                  Reset Default
                </button>
              )}
            </form>
          )}
        </div>
      )}

      <nav className="page-nav" aria-label="Main navigation">
        {[
          ['overview', 'Overview'],
          ['analytics', 'Analytics'],
          ['buildings', 'Buildings'],
          ['reports', 'Reports'],
        ].map(([page, label]) => (
          <button key={page} className={`page-nav-link ${activePage === page ? 'active' : ''}`} onClick={() => setActivePage(page)}>
            {label}
          </button>
        ))}
      </nav>

      {activePage === 'overview' && <main className="app-content">
        {/* Left Column: Dataset Upload & Controls */}
        <aside className="left-panel">
          <UploadPanel
            datasetSummary={datasetSummary}
            onDatasetUpdated={handleDatasetUpdated}
            onPreviewRequested={handlePreviewRequested}
          />

          <div className="card" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <div className="card-title" style={{ marginBottom: '0.5rem' }}>
              <span>🛡️</span> Architecture Principle
            </div>
            <p>
              <strong>Gemma 4</strong> extracts question intent and structure.
            </p>
            <p style={{ marginTop: '0.4rem' }}>
              <strong>Python Pandas</strong> executes 100% of arithmetic calculations, averages, and rankings.
            </p>
            <p style={{ marginTop: '0.4rem' }}>
              Zero hallucinated numbers. Verified figures only.
            </p>
          </div>
        </aside>

        {/* Right Column: Chat, Answers, Charts, Records */}
        <section className="right-panel">
          <ChatPanel
            onQuerySubmit={handleQuerySubmit}
            loading={loading}
            buildings={datasetSummary?.buildings || []}
            datasetSummary={datasetSummary}
          />

          {/* Answer Card with Numerical Highlights & Caveats */}
          <AnswerCard queryResponse={queryResponse} />

          {/* Interactive Recharts Visualization */}
          {queryResponse?.verified_result?.chart && (
            <ChartPanel chartPayload={queryResponse.verified_result.chart} />
          )}

          {/* Supporting Evidence Records from Query */}
          {queryResponse?.verified_result?.supporting_records?.length > 0 && !showPreview && (
            <DataTable
              records={queryResponse.verified_result.supporting_records}
              title="Verified Supporting Meter Records"
              subtitle={`Extracted ${queryResponse.verified_result.supporting_records.length} records supporting this calculation`}
            />
          )}

          {/* Raw Dataset Preview Table */}
          {showPreview && previewRecords && (
            <DataTable
              records={previewRecords}
              title={`Dataset Preview: ${datasetSummary?.filename}`}
              subtitle="Showing first 20 raw meter intervals"
            />
          )}
        </section>
      </main>}
      {activePage === 'analytics' && <AnalyticsPage summary={datasetSummary} records={allRecords} />}
      {activePage === 'buildings' && <BuildingsPage summary={datasetSummary} records={allRecords} />}
      {activePage === 'reports' && <ReportsPage summary={datasetSummary} records={allRecords} />}
    </div>
  );
}

