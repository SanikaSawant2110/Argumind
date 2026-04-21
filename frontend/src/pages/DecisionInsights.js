import React, { useState, useEffect } from 'react';
import '../App.css';
import { useDebate } from '../DebateContext';

export default function DecisionInsights() {
  const { generateInsights, insightsData, lastDebate, debateTopic, history, API } = useDebate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(insightsData || null);
  const [activeHistoryIdx, setActiveHistoryIdx] = useState(0);

  const handleGenerate = async () => {
    if (!lastDebate) {
      setError('Please run a debate first in the New Debate page.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await generateInsights();
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const strength = data?.logical_strength ?? 0;
  const riskScore = data?.risk_score ?? 0;
  const recColor = data?.recommendation === 'GO' ? 'var(--green)' : data?.recommendation === 'NO-GO' ? 'var(--red)' : 'var(--amber)';
  const confidencePct = lastDebate ? Math.round((lastDebate.confidence ?? 0.65) * 100) : 0;

  const biasLevel = (level) => level === 'High' ? 'badge-red' : level === 'Low' ? 'badge-green' : 'badge-amber';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'start' }}>
      {/* Left sidebar */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Workspace</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 20 }}>
          {['Dashboard', 'Debates', 'Projects', 'Global Insights'].map((item, i) => (
            <div key={i} className={`nav-item ${i === 1 ? 'active' : ''}`} style={{ padding: '8px 10px', fontSize: 12.5 }}>
              {['🏠', '⚡', '📁', '🌐'][i]} {item}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
          Recent Debates ({history.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {history.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '8px 10px' }}>No debates yet</div>
          )}
          {history.slice(0, 5).map((h, i) => (
            <div key={i} onClick={() => setActiveHistoryIdx(i)}
              style={{
                padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                color: activeHistoryIdx === i ? 'var(--accent)' : 'var(--text-muted)',
                background: activeHistoryIdx === i ? 'var(--accent-dim)' : 'transparent',
                transition: 'all 0.15s', lineHeight: 1.4,
              }}
            >
              · {h.topic?.length > 30 ? h.topic.substring(0, 30) + '…' : h.topic}
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div>
        <div className="section-header">
          <div className="section-header-eyebrow">Decision Insights</div>
          <h1>Decision Insights{debateTopic ? `: ${debateTopic.length > 40 ? debateTopic.substring(0, 40) + '…' : debateTopic}` : ''}</h1>
          <p>Comprehensive analysis of your debate. Logical strength, risk assessment, bias detection, and executive recommendation.</p>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-8 mb-20">
          <a href={`${API}/export`} download>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '8px 14px' }}>↓ Export Excel</button>
          </a>
          <button
            className="btn btn-primary"
            style={{ fontSize: 12, padding: '8px 14px' }}
            onClick={handleGenerate}
            disabled={loading || !lastDebate}
          >
            {loading ? <><span className="spin-ring" /> Generating…</> : data ? '↺ Regenerate Insights' : '📊 Generate Insights'}
          </button>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', fontSize: 13, marginBottom: 20 }}>
            ⚠ {error}
          </div>
        )}

        {!lastDebate && !data && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>No debate data available.</div>
            <div style={{ fontSize: 12 }}>Go to <strong style={{ color: 'var(--accent)' }}>New Debate</strong> and run a debate first, then come back here for insights.</div>
          </div>
        )}

        {lastDebate && !data && !loading && (
          <div className="card mb-20" style={{ padding: '20px', background: 'var(--accent-dim)', borderColor: 'rgba(91,127,255,0.2)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Debate Ready for Analysis</div>
            <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>Topic: <strong>{debateTopic}</strong></div>
            <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 12 }}>
              Winner: <strong style={{ color: lastDebate.final_decision === 'PRO' ? 'var(--green)' : 'var(--red)' }}>{lastDebate.final_decision}</strong> · {confidencePct}% confidence
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>{lastDebate.reasoning}</p>
          </div>
        )}

        {data && (
          <>
            {/* Metrics row */}
            <div className="card-grid-3 mb-20">
              {/* Logical strength ring */}
              <div className="stat-card">
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>Logical Strength</div>
                <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto 12px' }}>
                  <svg width="90" height="90" viewBox="0 0 90 90">
                    <circle cx="45" cy="45" r="36" fill="none" stroke="var(--border)" strokeWidth="7" />
                    <circle cx="45" cy="45" r="36" fill="none" stroke="var(--accent)" strokeWidth="7"
                      strokeDasharray={`${2 * Math.PI * 36 * strength / 100} ${2 * Math.PI * 36 * (1 - strength / 100)}`}
                      strokeDashoffset={2 * Math.PI * 36 * 0.25}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{strength}%</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: strength > 70 ? 'var(--green)' : 'var(--amber)', letterSpacing: '0.08em' }}>
                      {strength > 70 ? 'Robust' : strength > 40 ? 'Moderate' : 'Weak'}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Based on argument quality, evidence depth, and rebuttal strength.
                </div>
              </div>

              {/* Risk assessment */}
              <div className="stat-card">
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>Risk Assessment</div>
                <div style={{ fontSize: 48, fontWeight: 800, color: riskScore < 30 ? 'var(--green)' : riskScore < 60 ? 'var(--amber)' : 'var(--red)', letterSpacing: '-0.04em', marginBottom: 4 }}>{riskScore}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>/100</div>
                <div style={{ fontSize: 12, color: riskScore < 30 ? 'var(--green)' : 'var(--amber)' }}>
                  {riskScore < 30 ? '✓ Low risk detected' : riskScore < 60 ? '⚠ Moderate exposure' : '✗ High risk factors'}
                </div>
              </div>

              {/* Bias alerts */}
              <div className="stat-card">
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>Bias Alerts</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(data.biases || []).map((b, i) => (
                    <div key={i} className="bias-row">
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>{b.name}</span>
                      <span className={`badge ${biasLevel(b.level)}`}>{b.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Final Recommendation */}
            <div className="card" style={{ background: `rgba(${data.recommendation === 'GO' ? '34,197,94' : data.recommendation === 'NO-GO' ? '239,68,68' : '245,158,11'},0.05)`, borderColor: `rgba(${data.recommendation === 'GO' ? '34,197,94' : data.recommendation === 'NO-GO' ? '239,68,68' : '245,158,11'},0.2)` }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: recColor, marginBottom: 12 }}>
                ✦ Final Recommendation: {data.recommendation}
              </div>
              <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 12 }}>Executive Summary</div>
              <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.75, marginBottom: 20 }}>{data.summary}</p>

              <div className="card-grid-2">
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 10 }}>Key Supporting Evidence</div>
                  {(data.supporting_evidence || []).map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <span style={{ color: 'var(--green)', flexShrink: 0 }}>•</span>
                      <span style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>{s}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 10 }}>Critical Adjustments</div>
                  {(data.critical_adjustments || []).map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <span style={{ color: 'var(--amber)', flexShrink: 0 }}>→</span>
                      <span style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}