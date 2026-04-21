from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time
import re
import json
import asyncio
from dotenv import load_dotenv

from debate_engine import DebateEngine
from export import build_excel, auto_save_excel
from llm_clients import call_openrouter, call_gemini_safe

load_dotenv()

print("✅ Argumind Backend Starting...")

app = FastAPI(title="Argumind", version="3.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = DebateEngine()
debate_history: list = []


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
    pro_args: list
    con_args: list


def _strip_json_fences(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def _extract_json(raw: str) -> dict:
    cleaned = _strip_json_fences(raw)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = cleaned[start:end + 1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

        try:
            fixed = re.sub(r",\s*([}\]])", r"\1", candidate)
            return json.loads(fixed)
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not parse JSON from response. Raw (first 300 chars): {raw[:300]}")


async def llm_json(prompt: str, use_gemini_first: bool = False) -> dict:
    providers = (
        [
            ("gemini", call_gemini_safe),
            ("openrouter", lambda p: call_openrouter(p, label="json-task")),
        ]
        if use_gemini_first
        else [
            ("openrouter", lambda p: call_openrouter(p, label="json-task")),
            ("gemini", call_gemini_safe),
        ]
    )

    last_err = None
    for name, provider in providers:
        for attempt in range(2):
            try:
                raw = await provider(prompt)
                return _extract_json(raw)
            except ValueError as e:
                print(f"  ⚠ JSON parse failed ({name}, attempt {attempt + 1}): {e}")
                last_err = e
                if attempt == 0:
                    await asyncio.sleep(1)
            except Exception as e:
                print(f"  ⚠ LLM call failed ({name}, attempt {attempt + 1}): {e}")
                last_err = e
                break

    raise Exception(f"All LLM providers failed to return valid JSON. Last error: {last_err}")


@app.get("/health")
def health():
    return {"status": "ok", "version": "3.5.0"}


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    if not req.query.strip():
        raise HTTPException(400, "Query is empty")

    try:
        print(f"🔥 New debate: {req.query}")
        result = await engine.run(req.query)

        record = {
            "query": req.query,
            "timestamp": time.time(),
            "final_decision": result["final_decision"],
            "confidence": result["confidence"],
            "reasoning": result.get("reasoning", ""),
            "pro_arguments": result.get("pro_arguments", []),
            "con_arguments": result.get("con_arguments", []),
            "rebuttals": result.get("rebuttals", {}),
            "judge_votes": result.get("judge_votes", {}),
            "individual_verdicts": result.get("individual_verdicts", []),
            "hallucination_scores": result.get("hallucination_scores", []),
            "most_hallucinating_model": result.get("most_hallucinating_model", "None"),
            "pro_votes": result.get("judge_votes", {}).get("PRO", 0),
            "con_votes": result.get("judge_votes", {}).get("CON", 0),
        }

        for s in result.get("hallucination_scores", []):
            key = s["model"].replace(" ", "_").replace("/", "_") + "_score"
            record[key] = s["hallucination_score"]

        debate_history.append(record)
        auto_save_excel(debate_history)
        return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Debate engine error: {str(e)}")


@app.post("/argument")
async def build_argument(req: ArgumentRequest):
    prompt = f"""You are an expert debate coach.
Topic: {req.topic}
Side: {req.side}
Audience: {req.audience}
Tone: {req.tone}

Return ONLY a valid JSON object. No markdown, no preamble, no explanation — ONLY the JSON.

{{
  "proposition": "One-sentence core thesis for the {req.side} side.",
  "premises": ["Premise 1", "Premise 2", "Premise 3"],
  "reasoning": "Two-sentence logical bridge connecting the premises to the proposition.",
  "strength": 78,
  "counters": [
    {{"label": "Strawman Risk", "severity": "medium", "desc": "Opponent may oversimplify your position."}},
    {{"label": "Evidence Gap", "severity": "low", "desc": "Ensure statistics are up-to-date."}}
  ],
  "tips": ["Use concrete statistics.", "Anticipate the strongest counter.", "Close with a call to action."]
}}"""
    try:
        data = await llm_json(prompt)
        data.setdefault("proposition", f"{req.side} side argument for: {req.topic}")
        data.setdefault("premises", ["Supporting premise 1", "Supporting premise 2"])
        data.setdefault("reasoning", "The premises collectively support the proposition.")
        data.setdefault("strength", 70)
        data.setdefault("counters", [])
        data.setdefault("tips", ["Build on each premise systematically."])
        return data
    except Exception as e:
        raise HTTPException(500, f"Argument builder error: {str(e)}")


@app.post("/rebuttal")
async def analyze_rebuttal(req: RebuttalRequest):
    prompt = f"""You are an expert debate analyst.
Argument to analyze:
{req.argument}

Return ONLY a valid JSON object. No markdown, no explanation, no preamble — ONLY the JSON.

{{
  "fallacies": ["Ad Hominem", "False Dichotomy"],
  "strength_score": 55,
  "strength_label": "Medium",
  "confidence": 82,
  "rebuttals": [
    {{"title": "Counter 1", "body": "Detailed rebuttal text here."}},
    {{"title": "Counter 2", "body": "Another rebuttal here."}},
    {{"title": "Counter 3", "body": "Third rebuttal here."}}
  ]
}}"""
    try:
        data = await llm_json(prompt)
        data.setdefault("fallacies", [])
        data.setdefault("strength_score", 50)
        data.setdefault("strength_label", "Medium")
        data.setdefault("confidence", 75)
        data.setdefault("rebuttals", [{"title": "General Counter", "body": "The argument lacks sufficient evidence."}])
        return data
    except Exception as e:
        raise HTTPException(500, f"Rebuttal error: {str(e)}")


@app.post("/persona")
async def simulate_persona(req: PersonaRequest):
    prompt = f"""You are simulating {req.persona_name}: {req.persona_desc}
Topic: {req.topic}

Return ONLY a valid JSON object. No markdown, no explanation — ONLY the JSON.

{{
  "risk_level": 62,
  "conflict_level": "Medium",
  "key_concern": "One sentence describing the main concern this persona has.",
  "agreement_markers": ["Point they agree with 1", "Point they agree with 2"],
  "disagreement_markers": ["Point they disagree with 1", "Point they disagree with 2"],
  "optimal_strategy": "Two sentences on how to best persuade this persona."
}}"""
    try:
        data = await llm_json(prompt, use_gemini_first=True)
        data.setdefault("risk_level", 50)
        data.setdefault("conflict_level", "Medium")
        data.setdefault("key_concern", "This proposal needs more careful evaluation.")
        data.setdefault("agreement_markers", ["Acknowledges the core problem"])
        data.setdefault("disagreement_markers", ["Questions implementation feasibility"])
        data.setdefault("optimal_strategy", "Lead with data. Address concerns directly.")
        return data
    except Exception as e:
        raise HTTPException(500, f"Persona error: {str(e)}")


@app.post("/evidence")
async def fetch_evidence(req: EvidenceRequest):
    prompt = f"""You are a research assistant.
Topic: {req.topic}
Category: {req.category}

Return ONLY a valid JSON object. No markdown, no explanation — ONLY the JSON.

{{
  "evidence": [
    {{
      "title": "Evidence claim 1",
      "snippet": "2-3 sentence supporting detail with specifics.",
      "source": "Source or institution name",
      "cat": "{req.category}",
      "conf": 88
    }},
    {{
      "title": "Evidence claim 2",
      "snippet": "2-3 sentence supporting detail.",
      "source": "Source or institution name",
      "cat": "{req.category}",
      "conf": 75
    }},
    {{
      "title": "Evidence claim 3",
      "snippet": "2-3 sentence supporting detail.",
      "source": "Source or institution name",
      "cat": "{req.category}",
      "conf": 82
    }}
  ]
}}"""
    try:
        data = await llm_json(prompt, use_gemini_first=True)
        data.setdefault("evidence", [])
        return data
    except Exception as e:
        raise HTTPException(500, f"Evidence error: {str(e)}")


@app.post("/insights")
async def generate_insights(req: InsightsRequest):
    conf_display = round(req.confidence * 100 if req.confidence <= 1 else req.confidence, 1)
    prompt = f"""You are a strategic decision analyst.
Debate Topic: {req.topic}
Winner: {req.winner}
Confidence: {conf_display}%
PRO Arguments: {req.pro_args}
CON Arguments: {req.con_args}

Return ONLY a valid JSON object. No markdown, no explanation — ONLY the JSON.

{{
  "logical_strength": 74,
  "risk_score": 38,
  "recommendation": "GO",
  "summary": "3-4 sentence executive summary of the debate outcome.",
  "supporting_evidence": ["Key supporting point 1", "Key supporting point 2", "Key supporting point 3"],
  "critical_adjustments": ["Important caveat 1", "Important caveat 2"],
  "biases": [
    {{"name": "Confirmation Bias", "level": "Medium"}},
    {{"name": "Recency Bias", "level": "Low"}}
  ]
}}

recommendation must be exactly one of: GO, NO-GO, REVIEW"""
    try:
        data = await llm_json(prompt)
        if data.get("recommendation") not in ("GO", "NO-GO", "REVIEW"):
            data["recommendation"] = "REVIEW"
        data.setdefault("logical_strength", 65)
        data.setdefault("risk_score", 40)
        data.setdefault("summary", f"The debate on '{req.topic}' concluded with {req.winner} winning.")
        data.setdefault("supporting_evidence", [])
        data.setdefault("critical_adjustments", [])
        data.setdefault("biases", [])
        return data
    except Exception as e:
        raise HTTPException(500, f"Insights error: {str(e)}")


@app.get("/history")
def get_history():
    return debate_history


@app.get("/export")
def export():
    return build_excel(debate_history)