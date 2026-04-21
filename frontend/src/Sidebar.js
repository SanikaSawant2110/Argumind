import React from 'react';
import './App.css';

export default function Sidebar({ activePage, setPage }) {
  const navItems = [
    { key: 'newdebate', icon: '✦', label: 'New Debate' },
    { key: 'argument', icon: '🧩', label: 'Argument Builder' },
    { key: 'rebuttal', icon: '⚔️', label: 'Rebuttal Analyzer' },
    { key: 'evidence', icon: '📚', label: 'Evidence Panel' },
    { key: 'persona', icon: '🎭', label: 'Persona Simulator' },
    { key: 'insights', icon: '📊', label: 'Decision Insights' },
    { key: 'hallucination', icon: '🧬', label: 'Hallucination Analytics' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🧠</div>
        <div className="sidebar-logo-name">ArgüMind</div>
        <div className="sidebar-logo-badge">BETA</div>
      </div>

      <div className="sidebar-section-label">Core Workspace</div>
      <div className="sidebar-nav">
        {navItems.map(item => (
          <div
            key={item.key}
            className={`nav-item ${activePage === item.key ? 'active' : ''}`}
            onClick={() => setPage(item.key)}
          >
            <div className="nav-item-icon">{item.icon}</div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-plan">
          <div className="sidebar-plan-avatar">S</div>
          <div>
            <div className="sidebar-plan-name">Sanika</div>
            <div className="sidebar-plan-tier">Pro Plan</div>
          </div>
        </div>
      </div>
    </div>
  );
}