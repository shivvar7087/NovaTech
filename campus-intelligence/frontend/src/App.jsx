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
  submitQuery
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

  // Initial load
  useEffect(() => {
    initApp();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('campus-theme', theme);
  }, [theme]);

  const initApp = async () => {
    try {
      const health = await fetchHealth();
      setBackendHealth(health);
    } catch (err) {
      console.warn('Backend not yet reachable:', err);
    }

    try {
      const summary = await fetchDatasetSummary();
      setDatasetSummary(summary);
      const sample = await fetchDatasetSample(10000);
      setAllRecords(sample.records || []);
    } catch (err) {
      console.warn('Could not load summary:', err);
    }
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

