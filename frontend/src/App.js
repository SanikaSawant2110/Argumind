import React, { useState } from 'react';
import './App.css';
import { DebateProvider } from './DebateContext';

import Sidebar from './Sidebar';
import NewDebate from './pages/NewDebate';
import ArgumentBuilder from './pages/ArgumentBuilder';
import RebuttalAnalyzer from './pages/RebuttalAnalyzer';
import EvidencePanel from './pages/EvidencePanel';
import PersonaSimulator from './pages/PersonaSimulator';
import DecisionInsights from './pages/DecisionInsights';
import HallucinationAnalytics from './pages/HallucinationAnalytics';

export default function App() {
  const [page, setPage] = useState('newdebate');

  const renderPage = () => {
    switch (page) {
      case 'newdebate':      return <NewDebate />;
      case 'argument':       return <ArgumentBuilder />;
      case 'rebuttal':       return <RebuttalAnalyzer />;
      case 'evidence':       return <EvidencePanel />;
      case 'persona':        return <PersonaSimulator />;
      case 'insights':       return <DecisionInsights />;
      case 'hallucination':  return <HallucinationAnalytics />;
      default:               return <NewDebate />;
    }
  };

  return (
    <DebateProvider>
      <div className="app-shell">
        <Sidebar activePage={page} setPage={setPage} />
        <main className="page-content">
          {renderPage()}
        </main>
      </div>
    </DebateProvider>
  );
}