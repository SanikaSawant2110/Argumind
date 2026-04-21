from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import time
import os
import json
import re
from dotenv import load_dotenv
from debate_engine import DebateEngine
from hallucination import HallucinationScorer
from export import build_excel
from llm_clients import call_openrouter, call_gemini

load_dotenv()

app = FastAPI(title="Argumind Debate API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = DebateEngine()
scorer = HallucinationScorer()
debate_history = []


# ─── Models ───────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    query: str

class ArgumentRequest(BaseModel):
    topic: str
    side: str = "PRO"
    audience: str = "General Public"
    tone: str = "Academic"

class RebuttalRequest(BaseModel):
    argument: str

class PersonaRequest(BaseModel):
    topic: str
    persona_name: str
    persona_desc: str

class EvidenceRequest(BaseModel):
    topic: str
    category: str = "General"

class InsightsRequest(BaseModel):
    topic: str
    winner: str
    confidence: float
    pro_args: Optional[List[str]] = []
    con_args: Optional[List[str]] = []


# ─── Helpers ──────────────────────────────────────────────────────────────────

def safe_json(text: str) -> dict:
    """Extract JSON from LLM response, stripping markdown fences."""
    text = text.strip()
    text = re.sub(r'^```[a-zA-Z]*\n?', '', text)
    text = re.sub(r'\n?```$', '', text)
    return json.loads(text.strip())


async def call_with_fallback(prompt: str, primary: str = "gemini") -> str:
    """Call Gemini first, fall back to OpenRouter on failure."""
    if primary == "gemini":
        try:
            return await call_gemini(prompt)
        except Exception as e:
            print(f"⚠️ Gemini failed ({e}), falling back to OpenRouter...")
            return await call_openrouter(prompt)
    else:
        try:
            return await call_openrouter(prompt)
        except Exception as e:
            print(f"⚠️ OpenRouter failed ({e}), falling back to Gemini...")
            return await call_gemini(prompt)


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": time.time()}


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    if not req.query.strip():
        raise HTTPException(400, "Query cannot be empty")
    try:
        result = await engine.run(req.query)
        debate_history.append({
            "query": req.query,
            "final_decision": result["final_decision"],
            "confidence": result["confidence"],
            **{f"{s['model']}_score": s["hallucination_score"] for s in result["hallucination_scores"]},
        })
        return result
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/argument")
async def argument(req: ArgumentRequest):
    prompt = f"""You are an expert debate coach. Build a structured logical argument.

Topic: {req.topic}
Side: {req.side}
Audience: {req.audience}
Tone: {req.tone}

Respond with ONLY a valid JSON object (no markdown, no explanation) in this exact format:
{{
  "proposition": "One clear thesis statement for the {req.side} side",
  "premises": [
    "First supporting premise",
    "Second supporting premise",
    "Third supporting premise"
  ],
  "reasoning": "2-3 sentences explaining how the premises logically lead to the proposition",
  "strength": 78,
  "counters": [
    {{"label": "Counter-argument name", "desc": "Brief description of the challenge", "severity": "high"}},
    {{"label": "Another counter", "desc": "Brief description", "severity": "medium"}}
  ],
  "tips": [
    "One tip to strengthen this argument",
    "Another optimization tip",
    "Third tip"
  ]
}}

strength must be a number 0-100. severity must be "high", "medium", or "low"."""

    try:
        # Use OpenRouter for argument building
        raw = await call_with_fallback(prompt, primary="openrouter")
        data = safe_json(raw)
        data.setdefault("proposition", "A strong case exists for this position.")
        data.setdefault("premises", ["Evidence supports this view.", "Historical precedent aligns.", "Expert consensus agrees."])
        data.setdefault("reasoning", "These premises collectively build a compelling logical case.")
        data.setdefault("strength", 72)
        data.setdefault("counters", [])
        data.setdefault("tips", [])
        return data
    except Exception as e:
        raise HTTPException(500, f"Argument generation failed: {str(e)}")


@app.post("/rebuttal")
async def rebuttal(req: RebuttalRequest):
    prompt = f"""You are an expert debate analyst. Analyze this argument and generate rebuttals.

Argument to analyze:
{req.argument}

Respond with ONLY a valid JSON object (no markdown) in this exact format:
{{
  "fallacies": ["Ad Hominem", "Straw Man"],
  "strength_score": 62,
  "strength_label": "Moderate",
  "confidence": 85,
  "rebuttals": [
    {{"title": "Rebuttal Title", "body": "Detailed rebuttal response here"}},
    {{"title": "Second Rebuttal", "body": "Another detailed response"}},
    {{"title": "Third Rebuttal", "body": "Third detailed response"}}
  ]
}}

strength_score: 0-100 (how strong the opponent's argument is).
strength_label: "Weak", "Moderate", or "Strong".
confidence: 0-100 (confidence in the rebuttals).
fallacies: list up to 4 logical fallacies detected (empty array if none)."""

    try:
        # Use Gemini for rebuttal analysis
        raw = await call_with_fallback(prompt, primary="gemini")
        data = safe_json(raw)
        data.setdefault("fallacies", [])
        data.setdefault("strength_score", 50)
        data.setdefault("strength_label", "Moderate")
        data.setdefault("confidence", 80)
        data.setdefault("rebuttals", [{"title": "General Counter", "body": "The argument lacks sufficient evidence."}])
        return data
    except Exception as e:
        raise HTTPException(500, f"Rebuttal analysis failed: {str(e)}")


@app.post("/persona")
async def persona(req: PersonaRequest):
    prompt = f"""You are simulating a stakeholder persona in a debate scenario.

Topic: {req.topic}
Persona: {req.persona_name}
Persona Description: {req.persona_desc}

Simulate how this persona would respond. Respond with ONLY a valid JSON object (no markdown):
{{
  "risk_level": 45,
  "conflict_level": "Medium",
  "key_concern": "The persona's most important concern as a direct quote in their voice",
  "agreement_markers": [
    "Point they agree with",
    "Another point of agreement",
    "Third agreement"
  ],
  "disagreement_markers": [
    "Point they disagree with",
    "Another disagreement",
    "Third disagreement"
  ],
  "optimal_strategy": "2-3 sentences on the best strategy to persuade this persona"
}}

risk_level: 0-100 (how opposed this persona is).
conflict_level: "Low", "Medium", or "High"."""

    try:
        # Use Gemini for persona simulation
        raw = await call_with_fallback(prompt, primary="gemini")
        data = safe_json(raw)
        data.setdefault("risk_level", 50)
        data.setdefault("conflict_level", "Medium")
        data.setdefault("key_concern", "This approach needs more thorough evaluation.")
        data.setdefault("agreement_markers", ["Some aspects are promising"])
        data.setdefault("disagreement_markers", ["More evidence is needed"])
        data.setdefault("optimal_strategy", "Address their core concerns directly with data-backed evidence.")
        return data
    except Exception as e:
        raise HTTPException(500, f"Persona simulation failed: {str(e)}")


@app.post("/evidence")
async def evidence(req: EvidenceRequest):
    prompt = f"""You are a research assistant generating evidence cards for a debate.

Topic: {req.topic}
Category: {req.category}

Generate 4 specific, credible evidence cards. Respond with ONLY a valid JSON object (no markdown):
{{
  "evidence": [
    {{
      "title": "Evidence claim title",
      "snippet": "2-3 sentence summary of the evidence or finding",
      "source": "Journal/Organization Name, Year",
      "cat": "{req.category}",
      "conf": 87
    }},
    {{
      "title": "Second evidence title",
      "snippet": "Another 2-3 sentence evidence summary",
      "source": "Source name, Year",
      "cat": "{req.category}",
      "conf": 92
    }},
    {{
      "title": "Third evidence",
      "snippet": "Third evidence summary",
      "source": "Source, Year",
      "cat": "{req.category}",
      "conf": 78
    }},
    {{
      "title": "Fourth evidence",
      "snippet": "Fourth evidence summary",
      "source": "Source, Year",
      "cat": "{req.category}",
      "conf": 83
    }}
  ]
}}

conf: 0-100 confidence/reliability score."""

    try:
        # Alternate: use OpenRouter for evidence
        raw = await call_with_fallback(prompt, primary="openrouter")
        data = safe_json(raw)
        if "evidence" not in data:
            data = {"evidence": []}
        return data
    except Exception as e:
        raise HTTPException(500, f"Evidence fetch failed: {str(e)}")


@app.post("/insights")
async def insights(req: InsightsRequest):
    pro_text = "\n".join(req.pro_args) if req.pro_args else "No PRO arguments provided."
    con_text = "\n".join(req.con_args) if req.con_args else "No CON arguments provided."
    conf_pct = round(req.confidence * 100 if req.confidence <= 1 else req.confidence)

    prompt = f"""You are an expert strategic analyst providing decision insights on a debate.

Topic: {req.topic}
Debate Winner: {req.winner}
Confidence: {conf_pct}%

PRO Arguments:
{pro_text}

CON Arguments:
{con_text}

Provide comprehensive decision insights. Respond with ONLY a valid JSON object (no markdown):
{{
  "logical_strength": 74,
  "risk_score": 32,
  "recommendation": "GO",
  "summary": "3-4 sentence executive summary of the debate outcome and strategic recommendation",
  "biases": [
    {{"name": "Confirmation Bias", "level": "Low"}},
    {{"name": "Availability Heuristic", "level": "Medium"}},
    {{"name": "Anchoring Bias", "level": "Low"}}
  ],
  "supporting_evidence": [
    "Key supporting evidence point 1",
    "Key supporting evidence point 2",
    "Key supporting evidence point 3"
  ],
  "critical_adjustments": [
    "Critical adjustment recommendation 1",
    "Critical adjustment recommendation 2",
    "Critical adjustment recommendation 3"
  ]
}}

logical_strength: 0-100. risk_score: 0-100.
recommendation: "GO", "NO-GO", or "REVIEW".
bias level: "Low", "Medium", or "High"."""

    try:
        # Use Gemini for insights (strategic analysis)
        raw = await call_with_fallback(prompt, primary="gemini")
        data = safe_json(raw)
        data.setdefault("logical_strength", 70)
        data.setdefault("risk_score", 35)
        data.setdefault("recommendation", "REVIEW")
        data.setdefault("summary", "The debate analysis indicates a nuanced outcome requiring further consideration.")
        data.setdefault("biases", [{"name": "Confirmation Bias", "level": "Medium"}])
        data.setdefault("supporting_evidence", ["Strong logical foundation identified."])
        data.setdefault("critical_adjustments", ["Consider additional evidence before final decision."])
        return data
    except Exception as e:
        raise HTTPException(500, f"Insights generation failed: {str(e)}")


@app.get("/export")
def export():
    return build_excel(debate_history)


@app.get("/history")
def history():
    return debate_history