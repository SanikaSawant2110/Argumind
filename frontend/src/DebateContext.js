import React, { createContext, useContext, useState, useCallback } from 'react';

const API = 'http://localhost:8001';

const DebateContext = createContext(null);

export function DebateProvider({ children }) {
  // Shared state
  const [lastDebate, setLastDebate] = useState(null);      // result from /analyze
  const [debateTopic, setDebateTopic] = useState('');       // current topic string
  const [history, setHistory] = useState([]);               // all past debates
  const [argumentData, setArgumentData] = useState(null);   // /argument result
  const [rebuttalData, setRebuttalData] = useState(null);   // /rebuttal result
  const [insightsData, setInsightsData] = useState(null);   // /insights result
  const [personaData, setPersonaData] = useState({});       // keyed by persona name
  const [evidenceData, setEvidenceData] = useState([]);     // /evidence result

  const addToHistory = useCallback((item) => {
    setHistory(prev => [item, ...prev]);
  }, []);

  const runDebate = useCallback(async (topic) => {
    const res = await fetch(`${API}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: topic }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Backend error');
    }
    const data = await res.json();
    setLastDebate(data);
    setDebateTopic(topic);
    setArgumentData(null);
    setRebuttalData(null);
    setInsightsData(null);
    setPersonaData({});
    setEvidenceData([]);
    addToHistory({ topic, result: data, timestamp: Date.now() });
    return data;
  }, [addToHistory]);

  const buildArgument = useCallback(async (params) => {
    const res = await fetch(`${API}/argument`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Error');
    const data = await res.json();
    setArgumentData(data);
    return data;
  }, []);

  const analyzeRebuttal = useCallback(async (argument) => {
    const res = await fetch(`${API}/rebuttal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ argument }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Error');
    const data = await res.json();
    setRebuttalData(data);
    return data;
  }, []);

  const simulatePersona = useCallback(async (params) => {
    const res = await fetch(`${API}/persona`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Error');
    const data = await res.json();
    setPersonaData(prev => ({ ...prev, [params.persona_name]: data }));
    return data;
  }, []);

  const fetchEvidence = useCallback(async (topic, category = 'General') => {
    const res = await fetch(`${API}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, category }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Error');
    const data = await res.json();
    setEvidenceData(prev => [...prev, ...(data.evidence || [])]);
    return data;
  }, []);

  const generateInsights = useCallback(async () => {
    if (!lastDebate || !debateTopic) throw new Error('Run a debate first');
    const res = await fetch(`${API}/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: debateTopic,
        winner: lastDebate.final_decision,
        confidence: lastDebate.confidence,
        pro_args: lastDebate.pro_arguments,
        con_args: lastDebate.con_arguments,
      }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Error');
    const data = await res.json();
    setInsightsData(data);
    return data;
  }, [lastDebate, debateTopic]);

  return (
    <DebateContext.Provider value={{
      API,
      lastDebate, debateTopic, history,
      argumentData, rebuttalData, insightsData, personaData, evidenceData,
      runDebate, buildArgument, analyzeRebuttal, simulatePersona, fetchEvidence, generateInsights,
      setDebateTopic,
    }}>
      {children}
    </DebateContext.Provider>
  );
}

export function useDebate() {
  const ctx = useContext(DebateContext);
  if (!ctx) throw new Error('useDebate must be used inside DebateProvider');
  return ctx;
}