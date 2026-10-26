import React, { useState, useMemo } from 'react';

export default function DataTable({ records, title = "Supporting Meter Records", subtitle }) {
  const [filterText, setFilterText] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  if (!records || records.length === 0) return null;

  const columns = useMemo(() => Object.keys(records[0] || {}), [records]);

  // Filter rows
  const filteredRecords = useMemo(() => {
    if (!filterText.trim()) return records;
    const lower = filterText.toLowerCase();
    return records.filter(row =>
      Object.values(row).some(val =>
        String(val ?? '').toLowerCase().includes(lower)
      )
    );
  }, [records, filterText]);

  // Sort rows
  const sortedRecords = useMemo(() => {
    if (!sortConfig.key) return filteredRecords;
    return [...filteredRecords].sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA ?? '').toLowerCase();
      const strB = String(valB ?? '').toLowerCase();
      if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRecords, sortConfig]);

  // Pagination & Range Segments calculation
  const totalCount = sortedRecords.length;
  const effectivePageSize = pageSize === 'all' ? Math.max(1, totalCount) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(totalCount / effectivePageSize));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIdx = (activePage - 1) * effectivePageSize;
  const endIdx = Math.min(startIdx + effectivePageSize, totalCount);
  const currentRows = useMemo(() => {
    return sortedRecords.slice(startIdx, endIdx);
  }, [sortedRecords, startIdx, endIdx]);

  // Generate range segments
  const segments = useMemo(() => {
    const list = [];
    for (let p = 1; p <= totalPages; p++) {
      const segStart = (p - 1) * effectivePageSize + 1;
      const segEnd = Math.min(p * effectivePageSize, totalCount);
      list.push({
        page: p,
        start: segStart,
        end: segEnd,
        label: `${segStart}–${segEnd}`
      });
    }
    return list;
  }, [totalPages, effectivePageSize, totalCount]);

  const handleSort = (col) => {
    setSortConfig(prev => {
      if (prev.key === col) {
        return { key: col, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key: col, direction: 'asc' };
    });
  };

  const handleFilterChange = (e) => {
    setFilterText(e.target.value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (e) => {
    const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
    setPageSize(val);
    setCurrentPage(1);
  };

  const renderBadge = (key, val) => {
    const s = String(val);
    if (key === 'period') {
      return (
        <span className={`pill ${val === 'Peak' ? 'warn' : 'info'}`}>
          {val}
        </span>
      );
    }
    if (key === 'is_weekend') {
      const isWk = s.toLowerCase() === 'true';
      return (
        <span className={`pill ${isWk ? 'warn' : ''}`}>
          {isWk ? 'Weekend' : 'Weekday'}
        </span>
      );
    }
    return val;
  };

  return (
    <div className="card dt-card">
      {/* Top Controls Header */}
      <div className="dt-head">
        <div>
          <h4 className="dt-title">
            <span>📋</span> {title}
          </h4>
          <div className="dt-subtitle">
            {subtitle || `Showing range ${totalCount > 0 ? startIdx + 1 : 0} – ${endIdx} of ${totalCount} records`}
          </div>
        </div>

        <div className="dt-head-actions">
          {/* Real-time search filter */}
          <div className="dt-search">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search table rows..."
              value={filterText}
              onChange={handleFilterChange}
            />
            {filterText && (
              <button
                className="dt-clear-btn"
                title="Clear filter"
                onClick={() => { setFilterText(''); setCurrentPage(1); }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Rows per page selector */}
          <div className="dt-select-wrap">
            <label htmlFor="dt-pagesize">Rows:</label>
            <select
              id="dt-pagesize"
              className="select dt-select"
              value={pageSize}
              onChange={handlePageSizeChange}
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">All ({totalCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Interactive Range Segments Bar */}
      {totalPages > 1 && (
        <div className="dt-range-bar">
          <div className="dt-range-left">
            <span className="dt-range-label">Range Segment:</span>
            {/* Quick Segment Buttons (Swipeable on mobile) */}
            <div className="dt-segments">
              {segments.slice(0, 10).map((seg) => (
                <button
                  key={seg.page}
                  className={`dt-seg-btn ${activePage === seg.page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(seg.page)}
                >
                  {seg.label}
                </button>
              ))}
            </div>

            {/* Dropdown jump for datasets with many segments */}
            {segments.length > 5 && (
              <select
                className="select dt-seg-select"
                value={activePage}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                title="Select specific range segment"
              >
                {segments.map((seg) => (
                  <option key={seg.page} value={seg.page}>
                    Segment {seg.page}: Rows {seg.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Stepper Buttons */}
          <div className="dt-stepper">
            <button
              className="dt-nav-btn"
              disabled={activePage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              title="Previous range segment"
            >
              ◀ Prev
            </button>
            <span className="dt-page-indicator">
              <b>{activePage}</b> / {totalPages}
            </span>
            <button
              className="dt-nav-btn"
              disabled={activePage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              title="Next range segment"
            >
              Next ▶
            </button>
          </div>
        </div>
      )}

      {/* Table Container - Strictly Bounded and Horizontally Scrollable on Mobile */}
      <div className="dt-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>#</th>
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="dt-sortable-th"
                  title={`Click to sort by ${col}`}
                >
                  <div className="dt-th-content">
                    <span>{col.replace(/_/g, ' ')}</span>
                    <span className="dt-sort-arrow">
                      {sortConfig.key === col
                        ? sortConfig.direction === 'asc' ? ' ▲' : ' ▼'
                        : ' ↕'}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                  No matching records found for "{filterText}".
                </td>
              </tr>
            ) : (
              currentRows.map((row, idx) => {
                const globalIndex = startIdx + idx + 1;
                return (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '10px' }}>
                      {globalIndex}
                    </td>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Verified Count and Range Summary */}
      <div className="dt-footer">
        <div>
          Showing <strong>{totalCount > 0 ? startIdx + 1 : 0}–{endIdx}</strong> of <strong>{totalCount}</strong> records
          {filterText && ` (filtered from ${records.length} total)`}
          &nbsp;&middot;&nbsp; Verified source: Campus Submetering Log.
        </div>
        {totalPages > 1 && (
          <div className="dt-footer-nav">
            <button
              className="textbtn"
              disabled={activePage <= 1}
              onClick={() => setCurrentPage(1)}
              style={{ opacity: activePage <= 1 ? 0.4 : 1 }}
            >
              ⇤ First
            </button>
            <button
              className="textbtn"
              disabled={activePage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{ opacity: activePage <= 1 ? 0.4 : 1 }}
            >
              ← Prev
            </button>
            <button
              className="textbtn"
              disabled={activePage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{ opacity: activePage >= totalPages ? 0.4 : 1 }}
            >
              Next →
            </button>
            <button
              className="textbtn"
              disabled={activePage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              style={{ opacity: activePage >= totalPages ? 0.4 : 1 }}
            >
              Last ⇥
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
