import React, { useState, useEffect } from 'react';
import '../App.css';
import { useDebate } from '../DebateContext';

const DEFAULT_PERSONAS = [
  { emoji: '👩‍💼', name: 'Product Manager', desc: 'Delivering value on time and measuring high user retention through utility-first thinking.' },
  { emoji: '🧑‍🔬', name: 'Research Lead', desc: 'Focused on data validity, peer-reviewed methodologies, and rigorous empirical analysis.' },
  { emoji: '💼', name: 'CFO / Finance Lead', desc: 'Prioritizes ROI, cost efficiency, financial risk management, and budget impact.' },
  { emoji: '⚖️', name: 'Legal Counsel', desc: 'Focused on compliance, liability, regulatory risk, and contractual obligations.' },
  { emoji: '🌍', name: 'Sustainability Officer', desc: 'Champions ESG metrics, environmental impact, and long-term societal responsibility.' },
];

export default function PersonaSimulator() {
  const { simulatePersona, personaData, debateTopic } = useDebate();

  const [topic, setTopic] = useState(debateTopic || '');
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(personaData || {});
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    if (debateTopic && !topic) setTopic(debateTopic);
  }, [debateTopic]);

  const persona = DEFAULT_PERSONAS[selected];
  const currentResult = results[persona.name];

  const handleSimulate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await simulatePersona({
        topic,
        persona_name: persona.name,
        persona_desc: persona.desc,
      });
      setResults(prev => ({ ...prev, [persona.name]: result }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChat = () => {
    if (!chatInput.trim() || !currentResult) return;
    setChatHistory(prev => [
      ...prev,
      { from: 'user', text: chatInput },
      { from: persona.name, text: currentResult.key_concern || 'I have concerns about this approach.' },
    ]);
    setChatInput('');
  };

  const riskColor = (r) => r > 65 ? 'var(--red)' : r > 35 ? 'var(--amber)' : 'var(--green)';
  const conflictBadge = (c) => c === 'Low' ? 'badge-green' : c === 'Medium' ? 'badge-amber' : 'badge-red';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
      {/* Main */}
      <div>
        <div className="section-header">
          <div className="section-header-eyebrow">Simulations</div>
          <h1>Persona Simulator</h1>
          <p>Simulate how different stakeholder personas will respond to your argument. Anticipate objections before the debate.</p>
        </div>

        {/* Topic + simulate */}
        <div className="card mb-20">
          <div className="flex gap-8 items-center" style={{ flexWrap: 'wrap' }}>
            <input
              className="input"
              style={{ flex: 1, minWidth: 220 }}
              placeholder="Enter topic to simulate persona for…"
              value={topic}
              onChange={e => setTopic(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleSimulate} disabled={loading || !topic.trim()}>
              {loading ? <><span className="spin-ring" /> Simulating…</> : `🎭 Simulate ${persona.name}`}
            </button>
          </div>
          {error && <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 6, color: 'var(--red)', fontSize: 12.5, marginTop: 10 }}>⚠ {error}</div>}
          {debateTopic && !topic && <div style={{ fontSize: 11.5, color: 'var(--accent)', marginTop: 8 }}>💡 Topic pre-filled from your last debate.</div>}
        </div>

        {/* Persona header */}
        <div className="card mb-20">
          <div className="persona-header">
            <div className="persona-avatar">{persona.emoji}</div>
            <div className="persona-meta">
              <h3>{persona.name}</h3>
              <p>{persona.desc}</p>
            </div>
            {currentResult && (
              <div style={{ marginLeft: 'auto' }}>
                <span className={`badge ${conflictBadge(currentResult.conflict_level)}`}>
                  {currentResult.conflict_level} Conflict
                </span>
              </div>
            )}
          </div>

          {currentResult && (
            <div className="card-grid-3" style={{ marginBottom: 0, marginTop: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Risk Level</div>
                <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto' }}>
                  <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="var(--border)" strokeWidth="5" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke={riskColor(currentResult.risk_level)} strokeWidth="5"
                      strokeDasharray={`${2 * Math.PI * 26 * currentResult.risk_level / 100} ${2 * Math.PI * 26 * (1 - currentResult.risk_level / 100)}`}
                      strokeDashoffset={2 * Math.PI * 26 * 0.25} strokeLinecap="round"
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: riskColor(currentResult.risk_level) }}>
                    {currentResult.risk_level}%
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Conflict</div>
                <span className={`badge ${conflictBadge(currentResult.conflict_level)}`} style={{ fontSize: 15, fontWeight: 800, padding: '10px 16px' }}>
                  {currentResult.conflict_level}
                </span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Agreement</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>{100 - currentResult.risk_level}%</div>
              </div>
            </div>
          )}

          {!currentResult && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: 13 }}>
              Click "Simulate" to generate {persona.name}'s response to your topic.
            </div>
          )}
        </div>

        {currentResult && (
          <>
            {/* Markers grid */}
            <div className="marker-grid mb-20">
              <div className="marker-card">
                <div className="marker-title" style={{ color: 'var(--green)' }}>Agreement Markers</div>
                {(currentResult.agreement_markers || []).map((a, i) => (
                  <div key={i} className="marker-item">✓ {a}</div>
                ))}
              </div>
              <div className="marker-card">
                <div className="marker-title" style={{ color: 'var(--red)' }}>Disagreement Markers</div>
                {(currentResult.disagreement_markers || []).map((d, i) => (
                  <div key={i} className="marker-item">✗ {d}</div>
                ))}
              </div>
            </div>

            {/* Key concern */}
            <div className="card mb-20">
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Key Concern</div>
              <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.7, fontStyle: 'italic', padding: '12px 16px', background: 'var(--surface)', borderRadius: 8, borderLeft: '3px solid var(--amber)' }}>
                "{currentResult.key_concern}"
              </div>
            </div>

            {/* Simulated chat */}
            <div className="card">
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
                {persona.emoji} Simulated Conversation
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
                {chatHistory.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>
                    Ask this persona a question to simulate their response.
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} style={{
                    padding: '8px 12px', borderRadius: 8, marginBottom: 8, fontSize: 12.5, lineHeight: 1.5,
                    background: msg.from === 'user' ? 'var(--accent-dim)' : 'var(--surface)',
                    color: 'var(--text)',
                    marginLeft: msg.from === 'user' ? '20%' : 0,
                    marginRight: msg.from !== 'user' ? '20%' : 0,
                    borderLeft: msg.from !== 'user' ? `3px solid var(--amber)` : 'none',
                  }}>
                    {msg.from !== 'user' && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', marginBottom: 4 }}>{persona.emoji} {msg.from}</div>}
                    {msg.text}
                  </div>
                ))}
              </div>
              <div className="flex gap-8">
                <input
                  className="input"
                  style={{ flex: 1 }}
                  placeholder={`Ask ${persona.name} something…`}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChat()}
                />
                <button className="btn btn-primary" onClick={handleChat} disabled={!chatInput.trim()}>Send</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right: Persona list + optimal */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
          Stakeholder Personas
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {DEFAULT_PERSONAS.map((p, i) => (
            <div key={i} onClick={() => setSelected(i)}
              className={`card ${selected === i ? 'glow' : ''}`}
              style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <div style={{ fontSize: 22 }}>{p.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  {results[p.name] ? `Risk: ${results[p.name].risk_level}% · ${results[p.name].conflict_level} conflict` : 'Not simulated'}
                </div>
              </div>
              {results[p.name] && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />}
            </div>
          ))}
        </div>

        {currentResult && (
          <div className="card" style={{ background: 'var(--accent-dim)', borderColor: 'rgba(91,127,255,0.25)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>Optimal Strategy</div>
            <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.6 }}>{currentResult.optimal_strategy}</div>
          </div>
        )}

        {currentResult && (
          <div className="card mt-16" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Quick Stats</div>
            <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Agreement Rate</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--green)' }}>{100 - currentResult.risk_level}%</span>
            </div>
            <div className="progress-track mb-8">
              <div className="progress-bar" style={{ width: `${100 - currentResult.risk_level}%`, background: 'var(--green)' }} />
            </div>
            <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Conflict Risk</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: riskColor(currentResult.risk_level) }}>{currentResult.risk_level}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${currentResult.risk_level}%`, background: riskColor(currentResult.risk_level) }} />
            </div>
          </div>
        )}

        <button className="btn btn-primary mt-16" style={{ width: '100%', justifyContent: 'center', fontSize: 13 }} onClick={handleSimulate} disabled={loading || !topic.trim()}>
          🎭 Run Persona Simulation
        </button>
      </div>
    </div>
  );
}