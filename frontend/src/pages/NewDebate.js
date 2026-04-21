import React, { useState, useEffect } from 'react';
import '../App.css';
import { useDebate } from '../DebateContext';

const STRUCTURE_PHASES = [
  { label: 'Introduction & Framework', sub: 'Definition, current legal status, and ethical imperative.' },
  { label: 'Key Arguments (Proponent)', sub: 'Responsibility & Liability · Moral Agency · Economic Contribution' },
  { label: 'Rebuttal Phase', sub: 'Addressing counter-arguments and alternative perspectives.' },
  { label: '3-Judge Consensus Decision', sub: 'Gemini · OpenRouter/Llama · Mistral vote independently.' },
];

const AUTO_GEN_STEPS = [
  { key: 'argument',  label: 'Building Argument…',        icon: '🧩' },
  { key: 'rebuttal',  label: 'Analyzing Rebuttals…',      icon: '⚡' },
  { key: 'evidence',  label: 'Fetching Evidence…',        icon: '📚' },
  { key: 'persona',   label: 'Simulating Personas…',      icon: '🎭' },
  { key: 'insights',  label: 'Generating Insights…',      icon: '📊' },
];

export default function NewDebate() {
  const {
    runDebate, lastDebate, debateTopic, setDebateTopic, API,
    buildArgument, analyzeRebuttal, fetchEvidence, simulatePersona, generateInsights,
  } = useDebate();

  const [topic, setTopic] = useState(debateTopic || 'Should AI be granted personhood?');
  const [debateType, setDebateType] = useState('Competitive');
  const [role, setRole] = useState('Proponent');
  const [audience, setAudience] = useState('General Public');
  const [tone, setTone] = useState('Academic');
  const [evidence, setEvidence] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(lastDebate || null);

  // Auto-generation state
  const [autoGenRunning, setAutoGenRunning] = useState(false);
  const [autoGenStep, setAutoGenStep] = useState(-1);      // index into AUTO_GEN_STEPS
  const [autoGenDone, setAutoGenDone] = useState([]);       // completed step keys
  const [autoGenErrors, setAutoGenErrors] = useState({});   // step key → error msg

  const handleStart = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setAutoGenDone([]);
    setAutoGenErrors({});
    setAutoGenStep(-1);
    try {
      setDebateTopic(topic);
      const data = await runDebate(topic);
      setResult(data);
      // Kick off background auto-generation for all other tabs
      triggerAutoGen(data, topic);
    } catch (e) {
      setError(e.message || 'Backend error – make sure backend is running on port 8001');
    } finally {
      setLoading(false);
    }
  };

  const triggerAutoGen = async (debateData, currentTopic) => {
    setAutoGenRunning(true);

    // Step 0 — Argument Builder (PRO side)
    setAutoGenStep(0);
    try {
      await buildArgument({ topic: currentTopic, side: 'PRO', audience, tone });
      setAutoGenDone(prev => [...prev, 'argument']);
    } catch (e) {
      setAutoGenErrors(prev => ({ ...prev, argument: e.message }));
    }

    // Step 1 — Rebuttal Analyzer (pre-fill CON args)
    setAutoGenStep(1);
    try {
      const conText = (debateData.con_arguments || []).join('\n\n');
      if (conText.trim()) await analyzeRebuttal(conText);
      setAutoGenDone(prev => [...prev, 'rebuttal']);
    } catch (e) {
      setAutoGenErrors(prev => ({ ...prev, rebuttal: e.message }));
    }

    // Step 2 — Evidence Panel
    setAutoGenStep(2);
    try {
      await fetchEvidence(currentTopic, 'General');
      setAutoGenDone(prev => [...prev, 'evidence']);
    } catch (e) {
      setAutoGenErrors(prev => ({ ...prev, evidence: e.message }));
    }

    // Step 3 — Persona Simulator (first persona: Product Manager)
    setAutoGenStep(3);
    try {
      await simulatePersona({
        topic: currentTopic,
        persona_name: 'Product Manager',
        persona_desc: 'Delivering value on time and measuring high user retention through utility-first thinking.',
      });
      setAutoGenDone(prev => [...prev, 'persona']);
    } catch (e) {
      setAutoGenErrors(prev => ({ ...prev, persona: e.message }));
    }

    // Step 4 — Decision Insights
    setAutoGenStep(4);
    try {
      await generateInsights();
      setAutoGenDone(prev => [...prev, 'insights']);
    } catch (e) {
      setAutoGenErrors(prev => ({ ...prev, insights: e.message }));
    }

    setAutoGenStep(-1);
    setAutoGenRunning(false);
  };

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
          <p>Configure your debate parameters. Three independent AI judges vote on the winner.</p>
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
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', background: 'var(--surface)',
            borderRadius: 'var(--radius-sm)', marginBottom: 20,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Evidence Reinforcement</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Automatically source credible citations for every claim.
              </div>
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
            <div style={{
              padding: '12px 16px', background: 'rgba(239,68,68,0.1)', borderRadius: 8,
              border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', fontSize: 13, marginBottom: 16,
            }}>
              ⚠ {error}
            </div>
          )}

          <button
            className="btn btn-primary btn-full"
            onClick={handleStart}
            disabled={loading || !topic.trim()}
          >
            {loading ? <><span className="spin-ring" /> Running 3 AI Judges…</> : <>▶ Start Debate Analysis</>}
          </button>
        </div>

        {/* Auto-generation progress panel */}
        {(autoGenRunning || autoGenDone.length > 0) && (
          <div className="card mt-16" style={{ padding: '16px 20px', background: 'var(--surface)', borderColor: 'rgba(91,127,255,0.25)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>
              {autoGenRunning ? '⚡ Auto-populating all tabs…' : '✦ All tabs ready'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {AUTO_GEN_STEPS.map((step, i) => {
                const isDone = autoGenDone.includes(step.key);
                const isActive = autoGenStep === i;
                const hasError = !!autoGenErrors[step.key];
                return (
                  <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: isDone ? 'var(--green)' : hasError ? 'var(--red)' : isActive ? 'var(--accent)' : 'var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, transition: 'background 0.3s',
                    }}>
                      {isDone && <span style={{ color: '#fff' }}>✓</span>}
                      {hasError && <span style={{ color: '#fff' }}>✗</span>}
                      {isActive && <span className="spin-ring" style={{ width: 10, height: 10 }} />}
                    </div>
                    <span style={{ fontSize: 12.5, color: isDone ? 'var(--text)' : isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {step.icon} {isDone ? step.label.replace('…', ' ✓') : step.label}
                    </span>
                    {hasError && (
                      <span style={{ fontSize: 11, color: 'var(--red)', marginLeft: 4 }}>
                        ({autoGenErrors[step.key]?.slice(0, 40)}…)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {!autoGenRunning && autoGenDone.length === AUTO_GEN_STEPS.length && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--green)' }}>
                ✦ All pages have been pre-loaded — switch any tab to see results instantly.
              </div>
            )}
          </div>
        )}

        {/* Result Display */}
        {result && (
          <>
            {/* 3-Judge Panel */}
            <div className="card mt-20" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>
                ⚖️ 3-Judge Panel Votes
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {(result.individual_verdicts || []).slice(0, 3).map((v, i) => {
                  const judgeNames = ['Gemini', 'OpenRouter/Llama', 'Mistral'];
                  const confPct = Number.isFinite(v.confidence) ? Math.round(v.confidence <= 1 ? v.confidence * 100 : v.confidence) : 65;
                  return (
                    <div key={i} style={{
                      padding: '14px 16px', borderRadius: 8,
                      background: v.winner === 'PRO' ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                      border: `1px solid ${v.winner === 'PRO' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>{judgeNames[i]}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: v.winner === 'PRO' ? 'var(--green)' : 'var(--red)' }}>{v.winner}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{confPct}%</div>
                    </div>
                  );
                })}
              </div>
              {result.judge_votes && (
                <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
                  <span>Tally:</span>
                  <span style={{ fontWeight: 700, color: 'var(--green)' }}>PRO: {result.judge_votes.PRO}</span>
                  <span style={{ color: 'var(--text-dim)' }}>·</span>
                  <span style={{ fontWeight: 700, color: 'var(--red)' }}>CON: {result.judge_votes.CON}</span>
                </div>
              )}
            </div>

            {/* Consensus verdict */}
            <div className="card mt-12" style={{
              background: result.final_decision === 'PRO' ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
              borderColor: result.final_decision === 'PRO' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: result.final_decision === 'PRO' ? 'var(--green)' : 'var(--red)', marginBottom: 8 }}>
                ✦ Consensus Decision: {result.final_decision}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{confidencePct}% Avg Confidence</div>
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

              <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(34,197,94,0.08)', borderRadius: 6, border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--green)' }}>
                  💾 Results auto-saved to Excel (argumind_debates.xlsx)
                </div>
                <a href={`${API}/export`} download="argumind_debates.xlsx">
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: '6px 12px' }}>↓ Download Now</button>
                </a>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right: Live Preview + Hallucination */}
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

        {loading && (
          <div className="card mt-16" style={{ padding: '14px 16px', background: 'var(--accent-dim)', borderColor: 'rgba(91,127,255,0.2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10, letterSpacing: '0.1em' }}>
              Judges Deliberating…
            </div>
            {['Gemini (CON + PRO Rebuttals)', 'OpenRouter / Llama 3.1 (PRO + CON Rebuttals)', 'Mistral (Heuristic Judge)'].map((j, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span className="spin-ring" style={{ width: 10, height: 10, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{j}</span>
              </div>
            ))}
          </div>
        )}

        {result && (
          <>
            <div className="card mt-16" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10 }}>Hallucination Scores</div>
              {(result.hallucination_scores || []).map((s, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div className="flex justify-between" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.model}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: s.hallucination_score > 0.25 ? 'var(--red)' : s.hallucination_score > 0.12 ? 'var(--amber)' : 'var(--green)' }}>
                      {s.hallucination_score.toFixed(3)}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-bar" style={{
                      width: `${Math.min(s.hallucination_score * 200, 100)}%`,
                      background: s.hallucination_score > 0.25 ? 'var(--red)' : s.hallucination_score > 0.12 ? 'var(--amber)' : 'var(--green)',
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {result.most_hallucinating_model && (
              <div className="card mt-8" style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--red)', letterSpacing: '0.1em', marginBottom: 4 }}>
                  ⚠ Highest Hallucination
                </div>
                <div style={{ fontSize: 12, color: 'var(--text)' }}>{result.most_hallucinating_model}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}