import React from 'react';

export default function Navbar({ backendHealth, datasetSummary, theme = 'dark', onToggleTheme }) {
  const isOnline = backendHealth?.status === 'healthy';
  const isOllamaConnected = backendHealth?.ollama_connected;

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <span className="logo-icon">⚡</span>
        <div>
          <h1>Campus Resource Intelligence</h1>
          <span>React + FastAPI + Pandas + Gemma 4</span>
        </div>
      </div>

      <div className="navbar-status">
        <button className="theme-toggle" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
        {datasetSummary?.total_records > 0 && (
          <div style={{
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            borderRadius: '1rem',
            padding: '0.2rem 0.75rem',
            fontSize: '0.75rem',
            color: '#a5b4fc',
            marginRight: '0.5rem'
          }}>
            📁 {datasetSummary.filename} ({datasetSummary.total_records} rows)
          </div>
        )}

        <div style={{
          background: isOllamaConnected ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
          border: `1px solid ${isOllamaConnected ? '#22c55e' : '#f59e0b'}`,
          borderRadius: '1rem',
          padding: '0.2rem 0.65rem',
          fontSize: '0.75rem',
          color: isOllamaConnected ? '#4ade80' : '#fbbf24',
          marginRight: '0.5rem'
        }}>
          🤖 {isOllamaConnected ? 'Gemma 4 (Ollama)' : 'Verified Rule Engine'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div className={`status-dot ${isOnline ? '' : 'offline'}`} />
          <span style={{ fontSize: '0.8rem', color: isOnline ? '#4ade80' : '#f87171' }}>
            {isOnline ? 'API Connected' : 'Connecting API...'}
          </span>
        </div>
      </div>
    </header>
  );
}

