import React, { useState } from 'react';

export default function ChatPanel({ onQuerySubmit, loading, buildings, datasetSummary }) {
  const [question, setQuestion] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const metric = (datasetSummary?.primary_metric || 'kwh_usage').replaceAll('_', ' ');
  const suggestions = [
    `What is the total ${metric}?`,
    `Which location has the highest ${metric}?`,
    `What is the average ${metric}?`,
    `Show the ${metric} trend over time`,
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim() || loading) return;
    onQuerySubmit(question.trim(), selectedBuilding || null);
  };

  const handleChipClick = (suggestion) => {
    setQuestion(suggestion);
    onQuerySubmit(suggestion, selectedBuilding || null);
  };

  return (
    <div className="card">
      <div className="card-title">
        <span>💬</span> Resource Intelligence Query
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
          {buildings && buildings.length > 0 && (
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                borderRadius: '0.5rem',
                padding: '0.5rem 0.75rem',
                fontSize: '0.82rem',
                outline: 'none',
                maxWidth: '180px'
              }}
            >
              <option value="">All Locations</option>
              {buildings.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}

          <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="chat-input"
              placeholder={`Ask a question about ${metric} in this CSV...`}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="send-btn"
              disabled={!question.trim() || loading}
              title="Submit query"
            >
              {loading ? '⏳' : '⚡'}
            </button>
          </div>
        </div>
      </form>

      {loading && (
        <div className="loading-indicator">
          <div className="spinner" />
          <span>Gemma interpreting question & Python calculating verified metrics...</span>
        </div>
      )}

      <div>
        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
          Suggested Inquiries:
        </div>
        <div className="suggestions">
            {suggestions.map((s, idx) => (
            <button
              key={idx}
              className="suggestion-chip"
              onClick={() => handleChipClick(s)}
              disabled={loading}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

