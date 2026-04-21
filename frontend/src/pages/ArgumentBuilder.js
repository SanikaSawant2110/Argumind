import React, { useState, useEffect } from 'react';
import '../App.css';
import { useDebate } from '../DebateContext';

export default function ArgumentBuilder() {
  const { debateTopic, lastDebate, buildArgument, argumentData } = useDebate();

  const [topic, setTopic] = useState(debateTopic || '');
  const [side, setSide] = useState('PRO');
  const [audience, setAudience] = useState('General Public');
  const [tone, setTone] = useState('Academic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(argumentData || null);

  // If a debate was run, pre-populate the first PRO argument as proposition
  useEffect(() => {
    if (debateTopic && !topic) setTopic(debateTopic);
  }, [debateTopic]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await buildArgument({ topic, side, audience, tone });
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const strength = data?.strength ?? 0;

  const severityColor = (s) => s === 'high' ? 'var(--red)' : s === 'medium' ? 'var(--amber)' : 'var(--green)';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>
      {/* Main canvas */}
      <div>
        <div className="section-header">
          <div className="section-header-eyebrow">Logic Workspace</div>
          <h1>Argument Builder</h1>
          <p>Generate a structured logical argument with premises, reasoning flow, and counter-analysis.</p>
        </div>

        {/* Config card */}
        <div className="card mb-20">
          <div className="card-grid-2">
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label className="field-label">Debate Topic</label>
              <input
                className="input"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Enter topic to build argument for…"
              />
            </div>
            <div className="field">
              <label className="field-label">Side</label>
              <select className="select" value={side} onChange={e => setSide(e.target.value)}>
                <option>PRO</option>
                <option>CON</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Audience</label>
              <select className="select" value={audience} onChange={e => setAudience(e.target.value)}>
                <option>General Public</option>
                <option>Academic</option>
                <option>Policy Makers</option>
                <option>Business</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Tone</label>
              <select className="select" value={tone} onChange={e => setTone(e.target.value)}>
                <option>Academic</option>
                <option>Persuasive</option>
                <option>Neutral</option>
                <option>Aggressive</option>
              </select>
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>
              ⚠ {error}
            </div>
          )}

          <button
            className="btn btn-primary btn-full"
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
          >
            {loading ? <><span className="spin-ring" /> Building Argument…</> : '🧩 Generate Argument'}
          </button>
        </div>

        {!data && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🧩</div>
            <div style={{ fontSize: 14 }}>Configure your parameters above and click Generate to build a structured argument.</div>
            {debateTopic && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>Topic pre-filled from your last debate ↑</div>}
          </div>
        )}

        {data && (
          <>
            {/* Core proposition */}
            <div className="card mb-16">
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🏁</span> Opening Thesis
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>Core Proposition</div>
              <div style={{ padding: '16px 18px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent)', fontStyle: 'italic', fontSize: 14, lineHeight: 1.65, color: 'var(--text)' }}>
                {data.proposition}
              </div>
              <div className="flex gap-8 mt-12">
                <span className="badge badge-green">Status: Validated</span>
                <span className={`badge ${side === 'PRO' ? 'badge-green' : 'badge-red'}`}>{side} Side</span>
                <span className="badge badge-accent">{tone} Tone</span>
              </div>
            </div>

            {/* Premises */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(data.premises || []).map((premise, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--text-muted)', fontSize: 12 }}>
                    <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 auto' }} />
                  </div>
                  <div className="card">
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.1, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>
                      {i + 1} · Premise
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{premise}</div>
                  </div>
                </div>
              ))}

              {/* Reasoning flow */}
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, margin: '4px 0' }}>
                <div>+</div>
                <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '4px auto' }} />
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)' }}>Reasoning Flow</div>
              </div>

              <div className="card" style={{ background: 'var(--accent-dim)', borderColor: 'rgba(91,127,255,0.2)', fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                {data.reasoning}
              </div>
            </div>

            <div className="flex gap-8 mt-20">
              <button className="btn btn-ghost" onClick={handleGenerate} disabled={loading}>↺ Regenerate</button>
              <button className="btn btn-primary" onClick={() => { setData(null); setTopic(''); }}>+ New Argument</button>
            </div>
          </>
        )}
      </div>

      {/* Right: Analytics */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
          Argument Analytics
        </div>

        <div className="card mb-16">
          <div className="flex justify-between items-center mb-12">
            <span style={{ fontSize: 13, fontWeight: 600 }}>Logical Strength</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: strength > 70 ? 'var(--green)' : strength > 40 ? 'var(--amber)' : 'var(--red)' }}>{strength}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${strength}%`, background: strength > 70 ? 'var(--green)' : strength > 40 ? 'var(--amber)' : 'var(--red)', transition: 'width 0.6s' }} />
          </div>
          {!data && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>Generate an argument to see score</div>}
        </div>

        {data?.counters && data.counters.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
              Counters Detected
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {data.counters.map((c, i) => (
                <div key={i} className="card" style={{ padding: '13px 15px', borderLeft: `3px solid ${severityColor(c.severity)}` }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: severityColor(c.severity), marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {data?.tips && data.tips.length > 0 && (
          <div className="card" style={{ padding: '13px 15px', background: 'var(--accent-dim)', borderColor: 'rgba(91,127,255,0.2)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
              ✦ Optimizer Tips
            </div>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {data.tips.map((tip, i) => (
                <li key={i} style={{ fontSize: 12, color: 'var(--text)', padding: '4px 0', borderBottom: i < data.tips.length - 1 ? '1px solid rgba(91,127,255,0.15)' : 'none' }}>
                  → {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {lastDebate && (
          <div className="card mt-16" style={{ padding: '13px 15px', background: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.2)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 6 }}>
              Last Debate Result
            </div>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>Winner: <strong>{lastDebate.final_decision}</strong></div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {Math.round((lastDebate.confidence ?? 0.65) * 100)}% confidence
            </div>
          </div>
        )}
      </div>
    </div>
  );
}