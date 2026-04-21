import React, { useState, useEffect } from 'react';
import '../App.css';
import { useDebate } from '../DebateContext';

export default function HallucinationAnalytics() {
  const { API, history: ctxHistory } = useDebate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(`${API}/history`)
      .then(r => r.json())
      .then(d => { setHistory(d); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [API]);

  // Merge API history with context history for live updates
  const allHistory = history.length > 0 ? history : ctxHistory.map(h => ({
    query: h.topic,
    final_decision: h.result?.final_decision,
    confidence: h.result?.confidence,
    ...(h.result?.hallucination_scores?.reduce((acc, s) => ({ ...acc, [`${s.model}_score`]: s.hallucination_score }), {}) || {}),
  }));

  // Demo fallback
  const data = allHistory.length > 0 ? allHistory : [
    {
      query: 'Should AI be granted personhood?', final_decision: 'PRO', confidence: 0.78,
      'Mistral-7B_score': 0.22, 'Gemini Flash_score': 0.18, 'Llama-3-8B_score': 0.22,
    },
  ];

  const modelKeys = [...new Set(data.flatMap(d => Object.keys(d).filter(k => k.endsWith('_score'))))];
  const modelNames = modelKeys.map(k => k.replace('_score', ''));

  const avgScores = modelNames.map((name, i) => {
    const vals = data.map(d => d[modelKeys[i]] || 0);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { name, avg: parseFloat(avg.toFixed(3)) };
  }).sort((a, b) => b.avg - a.avg);

  const worst = avgScores[0];
  const best = avgScores[avgScores.length - 1];
  const maxScore = avgScores[0]?.avg || 1;

  const barColor = (score) => {
    if (score > 0.25) return 'var(--red)';
    if (score > 0.12) return 'var(--amber)';
    return 'var(--green)';
  };

  const safeConf = (c) => {
    if (!Number.isFinite(c)) return '—';
    return `${Math.round(c <= 1 ? c * 100 : c)}%`;
  };

  return (
    <div>
      <div className="section-header">
        <div className="section-header-eyebrow">Analytics</div>
        <h1>Hallucination Analytics</h1>
        <p>Track which LLMs deviate most from consensus across all debate sessions.</p>
      </div>

      {loading && <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '20px 0' }}>Loading data…</div>}

      {/* Summary cards */}
      <div className="card-grid-3 mb-20">
        <div className="stat-card">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Most Hallucinating</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--red)', marginBottom: 4 }}>{worst?.name || '—'}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Avg score: {worst?.avg ?? 0}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Debates Analyzed</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.04em' }}>{data.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{data.length === 1 ? 'session' : 'sessions'} total</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Most Reliable</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)', marginBottom: 4 }}>{best?.name || '—'}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Avg score: {best?.avg ?? 0}</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="card mb-20">
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 20 }}>
          Average Hallucination Score by Model
          <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-dim)' }}>(lower = more reliable)</span>
        </div>
        {avgScores.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>No model data available yet.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {avgScores.map((m, i) => (
            <div key={i}>
              <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: barColor(m.avg) }}>{m.avg}</span>
              </div>
              <div className="progress-track">
                <div className="progress-bar" style={{
                  width: `${(m.avg / maxScore) * 100}%`,
                  background: barColor(m.avg),
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-16 mt-16" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          <span><span style={{ color: 'var(--green)' }}>■</span> Low (&lt;0.12)</span>
          <span><span style={{ color: 'var(--amber)' }}>■</span> Medium (0.12–0.25)</span>
          <span><span style={{ color: 'var(--red)' }}>■</span> High (&gt;0.25)</span>
        </div>
      </div>

      {/* Per-debate table */}
      <div className="card">
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>
          Per-Debate Breakdown
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr>
                {['Query', 'Decision', 'Confidence', ...modelNames].map((h, i) => (
                  <th key={i} style={{
                    padding: '10px 14px', textAlign: 'left',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text-muted)', fontWeight: 700,
                    fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} onClick={() => setSelected(selected === i ? null : i)}
                  style={{ cursor: 'pointer', background: selected === i ? 'var(--accent-dim)' : 'transparent', transition: 'background 0.15s' }}
                >
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                    {row.query}
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                    <span className={`badge ${row.final_decision === 'PRO' ? 'badge-green' : 'badge-red'}`}>{row.final_decision}</span>
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--accent)', fontWeight: 700 }}>
                    {safeConf(row.confidence)}
                  </td>
                  {modelKeys.map((k, j) => (
                    <td key={j} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: barColor(row[k] || 0), fontWeight: 600 }}>
                      {(row[k] || 0).toFixed(3)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export */}
      <div className="flex gap-8 mt-20">
        <a href={`${API}/export`} download>
          <button className="btn btn-primary">↓ Export Excel</button>
        </a>
      </div>
    </div>
  );
}