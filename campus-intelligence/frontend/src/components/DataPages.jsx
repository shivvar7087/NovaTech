import React, { useEffect, useMemo, useState } from 'react';
import ChartPanel from './ChartPanel';
import DataTable from './DataTable';

const metric = (row, key) => Number(row?.[key]) || 0;
const recordDate = (row) => String(row?.date || row?.timestamp || '').slice(0, 10);
const money = (value) => `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const number = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const metricLabel = (key) => String(key || 'value').replaceAll('_', ' ');

function PageHeader({ eyebrow, title, description }) {
  return <header className="page-heading"><div className="page-eyebrow">{eyebrow}</div><h2>{title}</h2><p>{description}</p></header>;
}

function MetricCard({ label, value, note }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function DateRange({ start, end, onChange }) {
  return <div className="date-filter">
    <label>From <input type="date" value={start} onChange={(event) => onChange('start', event.target.value)} /></label>
    <label>To <input type="date" value={end} onChange={(event) => onChange('end', event.target.value)} /></label>
  </div>;
}

function useRecordsInRange(records) {
  const dates = useMemo(() => records.map(recordDate).filter(Boolean).sort(), [records]);
  const [range, setRange] = useState({ start: '', end: '' });
  useEffect(() => {
    setRange({ start: dates[0] || '', end: dates.at(-1) || '' });
  }, [records, dates]);
  const update = (key, value) => setRange((current) => ({ ...current, [key]: value }));
  const filtered = useMemo(() => records.filter((row) => {
    const date = recordDate(row);
    if (!range.start && !range.end) return true;
    return Boolean(date) && (!range.start || date >= range.start) && (!range.end || date <= range.end);
  }), [records, range]);
  return { dates, range, update, filtered };
}

function aggregateByBuilding(records, metricKey = 'kwh_usage', aggregation = 'sum', entityKey = 'building') {
  const grouped = new Map();
  records.forEach((row) => {
    const name = row?.[entityKey] ?? 'Unknown';
    const current = grouped.get(name) || { building: name, records: 0, total: 0, metricCount: 0, cost: 0, peak: 0, occupancy: 0 };
    current.records += 1;
    const value = Number(row?.[metricKey]);
    if (Number.isFinite(value) && row?.[metricKey] !== null && row?.[metricKey] !== '') {
      current.total += value;
      current.metricCount += 1;
    }
    current.cost += metric(row, 'cost_usd');
    current.peak = Math.max(current.peak, metric(row, 'peak_demand_kw'));
    current.occupancy += metric(row, 'occupancy');
    grouped.set(name, current);
  });
  return [...grouped.values()].map((item) => ({
    ...item,
    total: aggregation === 'mean' ? (item.metricCount ? item.total / item.metricCount : 0) : item.total,
  })).sort((a, b) => b.total - a.total);
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(rows, filename) {
  if (!rows.length) return;
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const csv = [columns.map(csvCell).join(','), ...rows.map((row) => columns.map((key) => csvCell(row[key])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AnalyticsPage({ summary, records }) {
  const { dates, range, update, filtered } = useRecordsInRange(records);
  const metricKey = summary?.primary_metric || 'kwh_usage';
  const unit = summary?.primary_unit || 'kWh';
  const aggregation = summary?.primary_aggregation || 'sum';
  const entityKey = summary?.entity_column || 'building';
  const buildings = useMemo(() => aggregateByBuilding(filtered, metricKey, aggregation, entityKey), [filtered, metricKey, aggregation, entityKey]);
  const metricValues = filtered.map((row) => row?.[metricKey]).filter((value) => value !== null && value !== '' && Number.isFinite(Number(value))).map(Number);
  const metricSum = metricValues.reduce((sum, value) => sum + value, 0);
  const totalValue = aggregation === 'mean' ? (metricValues.length ? metricSum / metricValues.length : 0) : metricSum;
  const totalCost = filtered.reduce((sum, row) => sum + metric(row, 'cost_usd'), 0);
  const avgValue = metricValues.length ? metricSum / metricValues.length : 0;
  const operation = aggregation === 'mean' ? 'Average' : 'Total';
  const chart = { chart_type: 'bar', title: `${operation} ${metricLabel(metricKey)} by location`, series: [{ key: 'value', name: `${operation} ${metricLabel(metricKey)} (${unit})`, color: '#818cf8' }], data: buildings.map((item) => ({ name: item.building, value: Number(item.total.toFixed(2)) })) };
  const costChart = { chart_type: 'bar', title: 'Recorded cost by location', series: [{ key: 'value', name: 'Cost ($)', color: '#34d399' }], data: buildings.map((item) => ({ name: item.building, value: Number(item.cost.toFixed(2)) })) };
  return <main className="page-content">
    <PageHeader eyebrow="Campus performance" title="Analytics" description={`Explore ${metricLabel(metricKey)} across the selected date range.`} />
    <div className="page-toolbar"><DateRange start={range.start || dates[0] || ''} end={range.end || dates.at(-1) || ''} onChange={update} /><span className="muted">{filtered.length.toLocaleString()} of {(records.length || summary?.total_records || 0).toLocaleString()} records</span></div>
    <section className="metric-grid">
      <MetricCard label={`${operation} ${metricLabel(metricKey)}`} value={`${number(totalValue)} ${unit}`} note="For selected dates" />
      {summary?.metric_columns?.includes('cost_usd') && <MetricCard label="Recorded cost" value={money(totalCost)} note="For selected dates" />}
      <MetricCard label="Average per record" value={`${number(avgValue)} ${unit}`} note="Across selected records" />
      <MetricCard label="Locations tracked" value={buildings.length} note="With records in this range" />
    </section>
    {(summary?.missing_primary_values > 0 || summary?.missing_date_values > 0) && <div className="data-quality-note" role="note">{summary?.missing_primary_values > 0 && <div>{summary.missing_primary_values.toLocaleString()} rows are missing a value for {metricLabel(metricKey)}; totals and averages exclude those values.</div>}{summary?.missing_date_values > 0 && <div>{summary.missing_date_values.toLocaleString()} rows have no usable date and are excluded when a date filter is active.</div>}</div>}
    {records.length ? <div className="page-chart-grid"><ChartPanel chartPayload={chart} />{summary?.metric_columns?.includes('cost_usd') && <ChartPanel chartPayload={costChart} />}</div> : <div className="card empty-state">Upload a dataset to see analytics.</div>}
  </main>;
}

export function BuildingsPage({ summary, records }) {
  const [selectedBuilding, setSelectedBuilding] = useState('All locations');
  const metricKey = summary?.primary_metric || 'kwh_usage';
  const unit = summary?.primary_unit || 'kWh';
  const aggregation = summary?.primary_aggregation || 'sum';
  const entityKey = summary?.entity_column || 'building';
  const [savedThreshold, setSavedThreshold] = useState('');
  const [thresholdDraft, setThresholdDraft] = useState('');
  const [thresholdError, setThresholdError] = useState('');
  useEffect(() => {
    const saved = window.localStorage.getItem(`campus-alert-${metricKey}`) || '';
    setSavedThreshold(saved);
    setThresholdDraft(saved);
  }, [metricKey]);
  const activeBuilding = summary?.buildings?.includes(selectedBuilding) ? selectedBuilding : 'All locations';
  const filtered = activeBuilding === 'All locations' ? records : records.filter((row) => String(row?.[entityKey]) === activeBuilding);
  const buildings = aggregateByBuilding(filtered, metricKey, aggregation, entityKey);
  const alertLimit = Number(savedThreshold);
  const overLimit = savedThreshold ? buildings.filter((item) => item.total > alertLimit) : [];
  const selected = activeBuilding === 'All locations' ? null : buildings[0];
  const operation = aggregation === 'mean' ? 'Average' : 'Total';
  const chart = { chart_type: 'bar', title: `${operation} ${metricLabel(metricKey)} comparison`, series: [{ key: 'value', name: `${operation} ${metricLabel(metricKey)} (${unit})`, color: '#38bdf8' }], data: aggregateByBuilding(records, metricKey, aggregation, entityKey).map((item) => ({ name: item.building, value: Number(item.total.toFixed(2)) })) };
  const rows = buildings.map((item) => ({
    [entityKey.replaceAll('_', ' ')]: item.building,
    'Rows': item.records,
    [`${operation} ${metricLabel(metricKey)} (${unit})`]: Number(item.total.toFixed(2)),
    ...(summary?.metric_columns?.includes('cost_usd') ? { 'Cost ($)': Number(item.cost.toFixed(2)) } : {}),
    ...(summary?.metric_columns?.includes('peak_demand_kw') ? { 'Peak demand (kW)': Number(item.peak.toFixed(2)) } : {}),
    ...(summary?.metric_columns?.includes('occupancy') ? { 'Average occupancy': item.records ? Math.round(item.occupancy / item.records) : 0 } : {}),
    ...(savedThreshold ? { 'Resource alert': item.total > alertLimit ? 'Over limit' : 'Within limit' } : {}),
  }));
  const saveThreshold = () => {
    const parsed = Number(thresholdDraft);
    if (!thresholdDraft || !Number.isFinite(parsed) || parsed <= 0) {
      setThresholdError('Enter a limit greater than zero.');
      return;
    }
    const value = String(parsed);
    window.localStorage.setItem(`campus-alert-${metricKey}`, value);
    setSavedThreshold(value);
    setThresholdDraft(value);
    setThresholdError('');
  };
  return <main className="page-content">
    <PageHeader eyebrow="Facilities" title="Buildings" description={`Compare ${metricLabel(metricKey)} across campus locations.`} />
    <div className="page-toolbar"><label className="select-filter">Location <select value={activeBuilding} onChange={(event) => setSelectedBuilding(event.target.value)}><option>All locations</option>{(summary?.buildings || []).map((building) => <option key={building}>{building}</option>)}</select></label><span className="muted">{filtered.length.toLocaleString()} rows</span></div>
    <section className="card alert-settings">
      <div><div className="card-title">Resource alert</div><p className="muted">Get a visual flag when a location’s total {metricLabel(metricKey)} exceeds your limit.</p></div>
      <div className="alert-controls"><label>Alert above <input aria-label={`Resource alert threshold in ${unit}`} type="number" min="0.01" step="any" placeholder="Enter a limit" value={thresholdDraft} onChange={(event) => setThresholdDraft(event.target.value)} /> {unit}</label><button className="btn btn-primary alert-save" onClick={saveThreshold}>Save limit</button></div>
      {thresholdError && <div className="alert-error" role="alert">{thresholdError}</div>}
      {savedThreshold && <div className={`alert-summary ${overLimit.length ? 'has-alerts' : 'all-clear'}`} role="status">{overLimit.length ? `${overLimit.length} location${overLimit.length === 1 ? '' : 's'} over ${number(alertLimit)} ${unit}: ${overLimit.map((item) => item.building).join(', ')}` : `No locations exceed ${number(alertLimit)} ${unit}.`}</div>}
    </section>
    {selected ? <section className="metric-grid building-detail"><MetricCard label={`${operation} ${metricLabel(metricKey)}`} value={`${number(selected.total)} ${unit}`} note={selected.building} /><MetricCard label="Records" value={number(selected.records)} note="In active dataset" />{summary?.metric_columns?.includes('cost_usd') && <MetricCard label="Recorded cost" value={money(selected.cost)} note="Total in active dataset" />}{summary?.metric_columns?.includes('peak_demand_kw') && <MetricCard label="Peak demand" value={`${number(selected.peak)} kW`} note="Highest recorded value" />}</section> : <section className="page-chart-grid"><ChartPanel chartPayload={chart} /></section>}
    <DataTable records={rows} title={selected ? `${selected.building} summary` : 'Location comparison'} subtitle="Totals calculated from the active dataset." />
  </main>;
}

export function ReportsPage({ summary, records }) {
  const { dates, range, update, filtered } = useRecordsInRange(records);
  const metricKey = summary?.primary_metric || 'kwh_usage';
  const unit = summary?.primary_unit || 'kWh';
  const aggregation = summary?.primary_aggregation || 'sum';
  const operation = aggregation === 'mean' ? 'average' : 'total';
  const entityKey = summary?.entity_column || 'building';
  const buildings = aggregateByBuilding(filtered, metricKey, aggregation, entityKey);
  const metricValues = filtered.map((row) => row?.[metricKey]).filter((value) => value !== null && value !== '' && Number.isFinite(Number(value))).map(Number);
  const metricSum = metricValues.reduce((sum, value) => sum + value, 0);
  const reportMetricValue = aggregation === 'mean' ? (metricValues.length ? metricSum / metricValues.length : 0) : metricSum;
  const reportRows = buildings.map(({ building, records: count, total, cost, peak, occupancy }) => ({
    [entityKey]: building,
    rows: count,
    [`${operation}_${metricKey}`]: Number(total.toFixed(2)),
    ...(summary?.metric_columns?.includes('cost_usd') ? { total_cost_usd: Number(cost.toFixed(2)) } : {}),
    ...(summary?.metric_columns?.includes('peak_demand_kw') ? { max_peak_demand_kw: Number(peak.toFixed(2)) } : {}),
    ...(summary?.metric_columns?.includes('occupancy') ? { average_occupancy: Math.round(count ? occupancy / count : 0) } : {}),
  }));
  const filename = `campus-report-${range.start || dates[0] || 'all'}-to-${range.end || dates.at(-1) || 'dates'}.csv`;
  return <main className="page-content">
    <PageHeader eyebrow="Exports" title="Reports" description="Prepare a location summary for the chosen period, or export the underlying CSV records." />
    <div className="page-toolbar report-toolbar"><DateRange start={range.start || dates[0] || ''} end={range.end || dates.at(-1) || ''} onChange={update} /><div className="report-actions"><button className="btn btn-ghost" onClick={() => window.print()}>Print report</button><button className="btn btn-primary export-button" disabled={!filtered.length} onClick={() => downloadCsv(reportRows, filename)}>Download summary CSV</button><button className="btn btn-ghost" disabled={!filtered.length} onClick={() => downloadCsv(filtered, `campus-records-${filename}`)}>Download records CSV</button></div></div>
    <section className="metric-grid"><MetricCard label="Dataset" value={summary?.filename || 'No dataset'} note="Active data source" /><MetricCard label="Report records" value={filtered.length.toLocaleString()} note="Records in selected period" /><MetricCard label="Locations" value={buildings.length} note="Included in report" /><MetricCard label={`${operation} ${metricLabel(metricKey)}`} value={`${number(reportMetricValue)} ${unit}`} note="Selected period" /></section>
    <DataTable records={reportRows} title="Location report" subtitle="Summary based on the selected date range." />
    {!records.length && <div className="card empty-state">Upload a dataset to create a report.</div>}
  </main>;
}
