import { useEffect, useMemo, useState } from 'react';

export default function Analytics() {
  const [metrics, setMetrics] = useState<any>(null);
  const [bucket, setBucket] = useState<'day' | 'week' | 'month'>('day');
  const [start, setStart] = useState<string>(() => new Date(Date.now() - 30*86400000).toISOString().slice(0,10));
  const [end, setEnd] = useState<string>(() => new Date().toISOString().slice(0,10));

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set('bucket', bucket);
    p.set('start', new Date(start).toISOString());
    p.set('end', new Date(end).toISOString());
    return p.toString();
  }, [bucket, start, end]);

  useEffect(() => {
    fetch(`/api/analytics/metrics?${query}`, { headers: { 'cache-control': 'no-cache' }})
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setMetrics)
      .catch(() => setMetrics({ recoveredRevenue: 0 }));
  }, [query]);

  return (
    <main className="container">
      <h1>Analytics</h1>
  <div className="flex items-center mb-16">
        <label>Start <input type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
        <label>End <input type="date" value={end} onChange={e => setEnd(e.target.value)} /></label>
        <label>
          Bucket
          <select value={bucket} onChange={e => setBucket(e.target.value as any)}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </label>
  <a href={`/api/analytics/metrics?${query}&format=csv`} target="_blank" rel="noreferrer">Download CSV</a>
      </div>
      {metrics && (
        <>
          <p>Total recovered revenue: ${(metrics.recoveredRevenue/100 || 0).toFixed(2)}</p>
          {metrics.count != null && <p>Attributions: {metrics.count}</p>}
          {metrics.perBucket && (
            <div>
              <h3>Per-{bucket} recovered</h3>
              {/* simple bars without external libs */}
              <div className="grid gap-6">
                {(() => {
                  const entries = Object.entries(metrics.perBucket as Record<string, number>);
                  const max = Math.max(1, ...entries.map(([,v]) => v));
                  return entries.map(([k, v]: any) => {
                    const pct = (v / max) * 100;
                    const pctRounded = Math.max(0, Math.min(100, Math.round(pct / 5) * 5));
                    return (
                      <div key={k} className="flex items-center gap-8">
                        <div className="mono w-100px">{k}</div>
                        <div className="bar flex-1">
                          <div className={`fill w-pct-${pctRounded}`} />
                        </div>
                        <div className="mono text-right w-80px">${(v/100).toFixed(2)}</div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
