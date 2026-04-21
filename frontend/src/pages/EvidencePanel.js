import React, { useState, useEffect } from 'react';
import '../App.css';
import { useDebate } from '../DebateContext';

const CATEGORIES = ['General', 'Financials', 'Tech Insights', 'Workforce', 'Healthcare', 'Policy', 'Sustainability'];

export default function EvidencePanel() {
  const { fetchEvidence, evidenceData, debateTopic } = useDebate();

  const [topic, setTopic] = useState(debateTopic || '');
  const [activeCategory, setActiveCategory] = useState('General');
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cards, setCards] = useState(evidenceData || []);

  useEffect(() => {
    if (debateTopic && !topic) setTopic(debateTopic);
  }, [debateTopic]);

  const handleFetch = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await fetchEvidence(topic, activeCategory);
      setCards(prev => {
        const newItems = result.evidence || [];
        // Avoid duplicate titles
        const existingTitles = new Set(prev.map(c => c.title));
        return [...prev, ...newItems.filter(c => !existingTitles.has(c.title))];
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = cards.filter(e =>
    (e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.snippet?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="section-header">
        <div className="section-header-eyebrow">Research Workspace</div>
        <h1>Evidence Explorer</h1>
        <p>Generate and manage AI-sourced evidence cards for your debate topic. Filter by category or search by claim.</p>
      </div>

      {/* Fetch bar */}
      <div className="card mb-20" style={{ padding: '16px 20px' }}>
        <div className="flex gap-8 items-center" style={{ flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 220 }}
            placeholder="Enter topic to fetch evidence for…"
            value={topic}
            onChange={e => setTopic(e.target.value)}
          />
          <select className="select" style={{ width: 160 }} value={activeCategory} onChange={e => setActiveCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <button className="btn btn-primary" onClick={handleFetch} disabled={loading || !topic.trim()}>
            {loading ? <><span className="spin-ring" /> Fetching…</> : '📚 Fetch Evidence'}
          </button>
          {cards.length > 0 && (
            <button className="btn btn-ghost" onClick={() => setCards([])}>Clear All</button>
          )}
        </div>
        {debateTopic && (
          <div style={{ fontSize: 11.5, color: 'var(--accent)', marginTop: 10 }}>
            💡 Topic pre-filled from your last debate. Change category and click Fetch Evidence to add more cards.
          </div>
        )}
        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', fontSize: 12.5, marginTop: 10 }}>
            ⚠ {error}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-16" style={{ gap: 12 }}>
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="🔍  Search claims…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-8">
          <button className={`btn ${view === 'grid' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => setView('grid')}>⊞ Grid</button>
          <button className={`btn ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => setView('list')}>☰ List</button>
        </div>
      </div>

      {/* Results count */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        Showing {filtered.length} of {cards.length} results
      </div>

      {/* Empty state */}
      {cards.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
          <div style={{ fontSize: 14 }}>No evidence yet. Enter a topic and click Fetch Evidence to generate AI-sourced research cards.</div>
        </div>
      )}

      {/* Evidence grid/list */}
      {filtered.length > 0 && (
        <div className={view === 'grid' ? 'evidence-grid' : ''} style={view === 'list' ? { display: 'flex', flexDirection: 'column', gap: 12 } : {}}>
          {filtered.map((e, i) => (
            <div key={i} className="evidence-card" style={view === 'list' ? { display: 'flex', gap: 20, alignItems: 'flex-start' } : {}}>
              <div style={view === 'list' ? { flex: 1 } : {}}>
                <div className="evidence-cat">{e.cat || activeCategory}</div>
                <div className="evidence-title">{e.title}</div>
                <div className="evidence-snippet">{e.snippet}</div>
                <div className="evidence-confidence">
                  <div className="progress-track" style={{ flex: 1 }}>
                    <div className="progress-bar" style={{ width: `${e.conf}%`, background: e.conf > 85 ? 'var(--green)' : 'var(--amber)' }} />
                  </div>
                  <span className="conf-val">{e.conf}%</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>{e.source}</div>
              </div>
            </div>
          ))}

          {/* Add new */}
          <div
            style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', cursor: 'pointer', transition: 'border-color 0.15s', minHeight: 200 }}
            onClick={handleFetch}
            onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ fontSize: 28, marginBottom: 8, color: 'var(--text-dim)' }}>+</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Fetch More Evidence</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>Click to generate more cards for this topic</div>
          </div>
        </div>
      )}

      {/* Storage */}
      <div className="card mt-24" style={{ padding: '14px 20px' }}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Evidence Cards</div>
            <div className="progress-track" style={{ width: 180 }}>
              <div className="progress-bar" style={{ width: `${Math.min((cards.length / 20) * 100, 100)}%`, background: 'var(--accent)' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{cards.length} cards collected</div>
          </div>
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleFetch} disabled={loading || !topic.trim()}>
            + Add Evidence
          </button>
        </div>
      </div>
    </div>
  );
}