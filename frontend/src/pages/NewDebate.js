import React, { useState } from 'react';
import '../App.css';
import { useDebate } from '../DebateContext';

const STRUCTURE_PHASES = [
  { label: 'Introduction & Framework', sub: 'Definition, current legal status, and ethical imperative.' },
  { label: 'Key Arguments (Proponent)', sub: 'Responsibility & Liability · Moral Agency · Economic Contribution' },
  { label: 'Rebuttal Phase', sub: 'Addressing counter-arguments and alternative perspectives.' },
  { label: 'Strategic Conclusion', sub: 'Summary of long-term societal benefits and risk mitigation.' },
];

export default function NewDebate() {
  const { runDebate, lastDebate, debateTopic, setDebateTopic } = useDebate();

  const [topic, setTopic] = useState(debateTopic || 'Should AI be granted personhood?');
  const [debateType, setDebateType] = useState('Competitive');
  const [role, setRole] = useState('Proponent');
  const [audience, setAudience] = useState('General Public');
  const [tone, setTone] = useState('Academic');
  const [evidence, setEvidence] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(lastDebate || null);

  const handleStart = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setDebateTopic(topic);
      const data = await runDebate(topic);
      setResult(data);
    } catch (e) {
      setError(e.message || 'Backend error – make sure backend is running on port 8000');
    } finally {
      setLoading(false);
    }
  };

  // Safe confidence display
  const confidencePct = result
    ? Number.isFinite(result.confidence)
      ? Math.round(result.confidence <= 1 ? result.confidence * 100 : result.confidence)
      : 65
    : null;

  const doneCount = result ? 4 : 1;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
      {/* Left: Form */}
      <div>
        <div className="section-header">
          <div className="section-header-eyebrow">Configure</div>
          <h1>New Debate</h1>
          <p>Configure your debate parameters to generate a strategic AI-powered analysis.</p>
        </div>

        <div className="card">
          <div className="field">
            <label className="field-label">Debate Topic</label>
            <textarea
              className="textarea"
              rows={3}
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Enter a topic to debate…"
            />
          </div>

          <div className="card-grid-2">
            <div className="field">
              <label className="field-label">Debate Type</label>
              <select className="select" value={debateType} onChange={e => setDebateType(e.target.value)}>
                <option>Competitive</option>
                <option>Collaborative</option>
                <option>Socratic</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Your Role</label>
              <select className="select" value={role} onChange={e => setRole(e.target.value)}>
                <option>Proponent</option>
                <option>Opponent</option>
                <option>Mediator</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Target Audience</label>
              <select className="select" value={audience} onChange={e => setAudience(e.target.value)}>
                <option>General Public</option>
                <option>Academic</option>
                <option>Policy Makers</option>
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

          {/* Evidence toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Evidence Reinforcement</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Automatically source credible citations for every claim.</div>
            </div>
            <div
              onClick={() => setEvidence(!evidence)}
              style={{
                width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                background: evidence ? 'var(--accent)' : 'var(--border)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: evidence ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }} />
            </div>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>
              ⚠ {error}
            </div>
          )}

          <button
            className="btn btn-primary btn-full"
            onClick={handleStart}
            disabled={loading || !topic.trim()}
          >
            {loading ? (
              <><span className="spin-ring" /> Generating Framework…</>
            ) : (
              <>▶ Start Debate Analysis</>
            )}
          </button>
        </div>

        {/* Result Display */}
        {result && (
          <div className="card mt-20" style={{
            background: result.final_decision === 'PRO' ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
            borderColor: result.final_decision === 'PRO' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: result.final_decision === 'PRO' ? 'var(--green)' : 'var(--red)', marginBottom: 8 }}>
              ✦ Judge Decision: {result.final_decision}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{confidencePct}% Confidence</div>
            <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, marginBottom: 16 }}>{result.reasoning}</p>

            <div className="card-grid-2">
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--green)', marginBottom: 8 }}>PRO Arguments</div>
                {(result.pro_arguments || []).map((a, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: 'var(--text)', marginBottom: 6, lineHeight: 1.5 }}>• {a}</div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--red)', marginBottom: 8 }}>CON Arguments</div>
                {(result.con_arguments || []).map((a, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: 'var(--text)', marginBottom: 6, lineHeight: 1.5 }}>• {a}</div>
                ))}
              </div>
            </div>

            {result.rebuttals && (
              <div className="card-grid-2 mt-16" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>PRO Rebuttals</div>
                  {(result.rebuttals.pro_rebuttals || []).map((a, i) => (
                    <div key={i} style={{ fontSize: 12.5, color: 'var(--text)', marginBottom: 6, lineHeight: 1.5 }}>↳ {a}</div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--violet)', marginBottom: 8 }}>CON Rebuttals</div>
                  {(result.rebuttals.con_rebuttals || []).map((a, i) => (
                    <div key={i} style={{ fontSize: 12.5, color: 'var(--text)', marginBottom: 6, lineHeight: 1.5 }}>↳ {a}</div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--surface)', borderRadius: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              💡 Now visit <strong style={{ color: 'var(--accent)' }}>Argument Builder</strong>, <strong style={{ color: 'var(--accent)' }}>Rebuttal Analyzer</strong>, or <strong style={{ color: 'var(--accent)' }}>Decision Insights</strong> — your debate results are automatically loaded.
            </div>
          </div>
        )}
      </div>

      {/* Right: Live Preview */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Debate Structure Outline</span>
          <span className={`badge ${loading ? 'badge-amber' : result ? 'badge-green' : 'badge-accent'}`}>
            {loading ? 'Running…' : result ? 'Complete' : 'Live Preview'}
          </span>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          {STRUCTURE_PHASES.map((phase, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i < STRUCTURE_PHASES.length - 1 ? 18 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: i < doneCount ? 'var(--accent)' : loading && i === doneCount ? 'var(--amber)' : 'var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.4s',
                }}>
                  {i < doneCount && <span style={{ fontSize: 10, color: '#fff' }}>✓</span>}
                  {loading && i === doneCount && <span className="spin-ring" style={{ width: 10, height: 10 }} />}
                </div>
                {i < STRUCTURE_PHASES.length - 1 && (
                  <div style={{ width: 1, flex: 1, background: 'var(--border)', marginTop: 4 }} />
                )}
              </div>
              <div style={{ paddingBottom: i < STRUCTURE_PHASES.length - 1 ? 18 : 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: i < doneCount ? 'var(--text)' : 'var(--text-muted)', marginBottom: 3 }}>{phase.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{phase.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {result && (
          <div className="card mt-16" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10 }}>Hallucination Scores</div>
            {(result.hallucination_scores || []).map((s, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div className="flex justify-between" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text)' }}>{s.model}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: s.hallucination_score > 0.25 ? 'var(--red)' : s.hallucination_score > 0.12 ? 'var(--amber)' : 'var(--green)' }}>
                    {s.hallucination_score.toFixed(3)}
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-bar" style={{
                    width: `${s.hallucination_score * 200}%`,
                    background: s.hallucination_score > 0.25 ? 'var(--red)' : s.hallucination_score > 0.12 ? 'var(--amber)' : 'var(--green)',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}