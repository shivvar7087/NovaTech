import React, { useState } from 'react';

export default function DataTable({ records, title = "Supporting Meter Records", subtitle }) {
  const [filterText, setFilterText] = useState('');

  if (!records || records.length === 0) return null;

  const columns = Object.keys(records[0]);

  const filteredRecords = records.filter(row => {
    if (!filterText) return true;
    return Object.values(row).some(val =>
      String(val).toLowerCase().includes(filterText.toLowerCase())
    );
  });

  const renderBadge = (key, val) => {
    if (key === 'period') {
      return (
        <span className={`badge ${val === 'Peak' ? 'badge-high' : 'badge-low'}`}>
          {val}
        </span>
      );
    }
    if (key === 'is_weekend') {
      return (
        <span className={`badge ${String(val).toLowerCase() === 'true' ? 'badge-medium' : 'badge-low'}`}>
          {String(val).toLowerCase() === 'true' ? 'Weekend' : 'Weekday'}
        </span>
      );
    }
    return val;
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div className="card-title" style={{ margin: 0 }}>
            <span>📋</span> {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              {subtitle}
            </div>
          )}
        </div>

        <input
          type="text"
          placeholder="Filter rows..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '0.4rem',
            padding: '0.35rem 0.65rem',
            color: 'var(--text-primary)',
            fontSize: '0.78rem',
            outline: 'none',
            maxWidth: '180px'
          }}
        />
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col.replace('_', ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((row, idx) => (
              <tr key={idx}>
                {columns.map((col) => {
                  const val = row[col];
                  let formatted = val;
                  if (typeof val === 'number') {
                    if (col.includes('cost')) formatted = `$${val.toFixed(2)}`;
                    else formatted = val.toLocaleString();
                  }
                  return (
                    <td key={col}>
                      {renderBadge(col, formatted)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-note">
        Showing {filteredRecords.length} of {records.length} records. Verified source: Campus Submetering Log.
      </div>
    </div>
  );
}

