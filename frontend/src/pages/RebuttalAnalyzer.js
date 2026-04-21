import React, { useState, useEffect, useRef } from 'react';
import '../App.css';
import { useDebate } from '../DebateContext';

export default function RebuttalAnalyzer() {
  const { analyzeRebuttal, rebuttalData, lastDebate } = useDebate();

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(rebuttalData || null);
  const [analyzed, setAnalyzed] = useState(!!rebuttalData);
  const prefilled = useRef(false);

  // Pre-fill ONCE with CON arguments from last debate
  useEffect(() => {
    if (lastDebate?.con_arguments && !prefilled.current) {
      setInputText(lastDebate.con_arguments.join('\n\n'));
      prefilled.current = true;
    }
  }, [lastDebate]);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await analyzeRebuttal(inputText);
      setData(result);
      setAnalyzed(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNewAnalysis = () => {
    setAnalyzed(false);
    setData(null);
    setInputText('');
    prefilled.current = false; // allow re-prefill if desired
  };

  const barColor = (score) => {
    if (score > 65) return 'var(--red)';
    if (score > 35) return 'var(--amber)';
    return 'var(--green)';
  };

  const fallacyColors = ['var(--red)', 'var(--amber)', 'var(--violet)', 'var(--teal)'];

  if (!analyzed) {
    return (
      <div>
        <div className="section-header">
          <div className="section-header-eyebrow">Rebuttal AI</div>
          <h1>Rebuttal Analyzer</h1>
          <p>Paste your opponent's argument and get AI-powered rebuttals with fallacy detection and confidence scoring.</p>
        </div>

        {lastDebate && (
          <div style={{ padding: '10px 14px', background: 'var(--accent-dim)', borderRadius: 8, border: '1px solid rgba(91,127,255,0.2)', fontSize: 12.5, color: 'var(--accent)', marginBottom: 16 }}>
            💡 CON arguments from your last debate have been pre-loaded. You can edit or replace them.
          </div>
        )}

        <div className="card">
          <div className="field">
            <label className="field-label">Opponent Argument</label>
            <textarea
              className="textarea"
              rows={10}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Paste opponent's argument here…"
            />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>
              ⚠ {error}
            </div>
          )}

          <button
            className="btn btn-primary btn-full"
            onClick={handleAnalyze}
            disabled={loading || !inputText.trim()}
          >
            {loading ? <><span className="spin-ring" /> Analyzing Argument…</> : '⚡ Analyze Argument'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <div className="section-header-eyebrow">Rebuttal AI</div>
        <h1>Rebuttal Analyzer</h1>
        <p>Fallacy detection, argument weakness scoring, and AI-generated rebuttals.</p>
      </div>

      {/* Header bar */}
      <div className="card mb-20" style={{ padding: '14px 20px' }}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Argument Analysis Complete</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              {data?.fallacies?.length || 0} fallacies detected · {data?.confidence || 0}% confidence in rebuttals
            </div>
          </div>
          <div className="flex gap-8">
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '8px 14px' }}
              onClick={() => {
                const text = data?.rebuttals?.map(r => `${r.title}: ${r.body}`).join('\n\n') || '';
                navigator.clipboard.writeText(text);
              }}
            >
              Copy Rebuttals
            </button>
            <button
              className="btn btn-primary"
              style={{ fontSize: 12, padding: '8px 14px' }}
              onClick={handleNewAnalysis}
            >
              ↺ New Analysis
            </button>
          </div>
        </div>
      </div>

      <div className="rebuttal-split">
        {/* Left: Opponent Argument */}
        <div>
          <div className="flex items-center justify-between mb-12">
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Opponent Argument</div>
            <span className="badge badge-accent">Analyzed</span>
          </div>
          <div className="card" style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
            {inputText}
          </div>

          {/* Fallacy tags */}
          {data?.fallacies && data.fallacies.length > 0 && (
            <div className="mt-12">
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Detected Fallacies</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.fallacies.map((f, i) => (
                  <span key={i} className="fallacy-tag" style={{ borderColor: fallacyColors[i % fallacyColors.length], color: fallacyColors[i % fallacyColors.length] }}>
                    ⚠ {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Strength meter */}
          <div className="card mt-12" style={{ padding: '12px 16px' }}>
            <div className="flex items-center justify-between mb-8">
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Argument Strength</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: barColor(data?.strength_score || 50) }}>{data?.strength_label || 'Medium'}</span>
            </div>
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${data?.strength_score || 50}%`, background: barColor(data?.strength_score || 50), transition: 'width 0.6s' }} />
            </div>
          </div>
        </div>

        {/* Right: AI Rebuttal */}
        <div>
          <div className="flex items-center justify-between mb-12">
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>AI Rebuttal</div>
            <div className="flex gap-8">
              <span className="badge badge-green">{data?.confidence || 85}% Confidence</span>
            </div>
          </div>

          <div className="card" style={{ background: 'rgba(91,127,255,0.05)', borderColor: 'rgba(91,127,255,0.2)' }}>
            {data?.fallacies && data.fallacies.length > 0 && (
              <div className="flex gap-8 mb-16" style={{ flexWrap: 'wrap' }}>
                {data.fallacies.slice(0, 2).map((f, i) => (
                  <span key={i} className={i === 0 ? 'badge badge-amber' : 'badge badge-red'}>⚠ {f}</span>
                ))}
              </div>
            )}
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Recommended Responses</div>

            {(data?.rebuttals || []).map((r, i) => (
              <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < (data.rebuttals.length - 1) ? '1px solid var(--border)' : 'none' }}>
                <div className="flex items-center gap-8" style={{ marginBottom: 6 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{r.title}</div>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.6, paddingLeft: 28 }}>{r.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}