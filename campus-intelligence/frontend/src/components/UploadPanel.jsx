import React, { useState, useRef } from 'react';
import { uploadDatasetFile, resetDataset } from '../services/api';

export default function UploadPanel({ datasetSummary, onDatasetUpdated, onPreviewRequested }) {
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const primaryMetric = datasetSummary?.primary_metric || 'kwh_usage';
  const metricLabel = primaryMetric.replaceAll('_', ' ');
  const primaryUnit = datasetSummary?.primary_unit || 'kWh';
  const primaryOperation = datasetSummary?.primary_aggregation === 'mean' ? 'Average' : 'Total';

  const handleFileChange = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setErrorMsg('Please upload a valid CSV file.');
      return;
    }
    setErrorMsg('');
    setUploading(true);
    try {
      const resp = await uploadDatasetFile(file);
      if (resp?.summary) {
        onDatasetUpdated(resp.summary);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error uploading file.');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = async () => {
    setUploading(true);
    setErrorMsg('');
    try {
      const resp = await resetDataset();
      if (resp?.summary) {
        onDatasetUpdated(resp.summary);
      }
    } catch (err) {
      setErrorMsg('Failed to reset dataset.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <span>📊</span> Campus Dataset Management
      </div>

      <div
        className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="upload-icon">📁</div>
        <p><strong>Click to browse</strong> or drag and drop</p>
        <p style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>Any CSV with column headers; numeric fields are detected automatically.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange(e.target.files?.[0])}
        />
      </div>

      {uploading && (
        <div className="loading-indicator">
          <div className="spinner" />
          <span>Processing dataset records...</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.6rem' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {datasetSummary && datasetSummary.total_records > 0 && (
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <div className="file-info">
            <span>✅</span>
            <span className="file-name">{datasetSummary.filename}</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
            background: 'var(--bg-primary)',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            fontSize: '0.78rem'
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Records:</span>
              <p style={{ fontWeight: 600 }}>{datasetSummary.total_records.toLocaleString()}</p>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Locations:</span>
              <p style={{ fontWeight: 600 }}>{datasetSummary.buildings?.length || 0}</p>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{primaryOperation} {metricLabel}:</span>
              <p style={{ fontWeight: 600, color: '#818cf8' }}>{Number(datasetSummary.primary_total ?? datasetSummary.total_kwh ?? 0).toLocaleString()} {primaryUnit}</p>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Numeric fields:</span>
              <p style={{ fontWeight: 600 }}>{(datasetSummary.metric_columns || []).length}</p>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Missing {metricLabel} values:</span>
              <p style={{ fontWeight: 600, color: datasetSummary.missing_primary_values ? 'var(--warning)' : 'var(--success)' }}>{Number(datasetSummary.missing_primary_values || 0).toLocaleString()}</p>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Rows without a date:</span>
              <p style={{ fontWeight: 600, color: datasetSummary.missing_date_values ? 'var(--warning)' : 'var(--success)' }}>{Number(datasetSummary.missing_date_values || 0).toLocaleString()}</p>
            </div>
          </div>
          {datasetSummary.metric_columns?.length > 0 && <div className="detected-fields"><span>Detected numeric fields:</span> {datasetSummary.metric_columns.slice(0, 6).map((field) => <span className="field-chip" key={field}>{field.replaceAll('_', ' ')}</span>)}{datasetSummary.metric_columns.length > 6 && <span className="muted">+{datasetSummary.metric_columns.length - 6} more</span>}</div>}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
            <button
              className="btn btn-ghost"
              style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
              onClick={onPreviewRequested}
            >
              👁️ View Records
            </button>
            <button
              className="btn btn-ghost"
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
              onClick={handleReset}
              title="Reset back to default campus dataset"
            >
              🔄 Reset Default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

