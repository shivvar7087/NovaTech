import React from 'react';

export default function AnswerCard({ queryResponse }) {
  if (!queryResponse) {
    return (
      <div className="card empty-state">
        <div className="empty-icon">💡</div>
        <p>Ask a question or select a suggestion above to analyze campus resource data.</p>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Gemma 4 interprets intent · Pandas computes certified figures · Recharts renders interactive visualizations
        </span>
      </div>
    );
  }

  const { question, intent, verified_result, explanation, ai_provider, processing_time_ms } = queryResponse;

  return (
    <div className="card answer-card-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div className="card-title" style={{ marginBottom: '0.2rem' }}>
            <span>🎯</span> Evidence-Backed Intelligence Briefing
          </div>
          <div className="answer-intent">
            Q: "{question}"
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{
            background: 'rgba(99, 102, 241, 0.15)',
            color: '#a5b4fc',
            padding: '0.2rem 0.5rem',
            borderRadius: '0.3rem',
            fontSize: '0.72rem',
            fontWeight: 600
          }}>
            Intent: {intent?.intent_type?.toUpperCase()}
          </span>

          <span style={{
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            padding: '0.2rem 0.5rem',
            borderRadius: '0.3rem',
            fontSize: '0.72rem',
            fontWeight: 600
          }}>
            Metric: {intent?.metric?.replace('_', ' ')}
          </span>

          <span style={{
            background: 'rgba(34, 197, 94, 0.15)',
            color: '#4ade80',
            padding: '0.2rem 0.5rem',
            borderRadius: '0.3rem',
            fontSize: '0.72rem',
            fontWeight: 600
          }}>
            ⏱️ {processing_time_ms} ms
          </span>
        </div>
      </div>

      {/* Numerical Verified Metric Box */}
      <div className="answer-result">
        <div>
          <div className="result-label">Verified Python Calculation</div>
          <div className="result-value">
            {verified_result?.formatted_value} <span className="result-unit">{verified_result?.unit}</span>
          </div>
          {verified_result?.comparison_summary && (
            <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, marginTop: '0.2rem' }}>
              📊 {verified_result.comparison_summary}
            </div>
          )}
        </div>
      </div>

      {/* Model Narrative / Explanation */}
      <div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
          EXECUTIVE SUMMARY ({ai_provider}):
        </div>
        <div className="answer-main">
          {explanation}
        </div>
      </div>

      {/* Caveats and Supporting Data Notes */}
      {verified_result?.caveats?.length > 0 && (
        <div className="answer-caveats">
          <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>🛡️ Audit & Caveats:</div>
          <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
            {verified_result.caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

