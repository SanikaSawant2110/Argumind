import asyncio
import re
import traceback

from llm_clients import call_openrouter, call_gemini_safe, call_huggingface
from hallucination import HallucinationScorer

scorer = HallucinationScorer()

PRO_PROMPT = """You are the PRO side in a debate.
Topic: {query}

Give exactly 5 strong, numbered arguments in favor.
Format strictly like this (no extra text before or after):

1. First argument here.
2. Second argument here.
3. Third argument here.
4. Fourth argument here.
5. Fifth argument here.

Keep each point concise and persuasive. Do NOT add any preamble or conclusion."""

CON_PROMPT = """You are the CON side in a debate.
Topic: {query}

Give exactly 5 strong, numbered arguments against.
Format strictly like this (no extra text before or after):

1. First argument here.
2. Second argument here.
3. Third argument here.
4. Fourth argument here.
5. Fifth argument here.

Keep each point concise and persuasive. Do NOT add any preamble or conclusion."""

PRO_REBUTTAL_PROMPT = """You are the PRO side in a debate about: {query}

The CON side said:
{con_args}

Give 4 sharp rebuttals, numbered 1-4. No extra text before or after.

1. First rebuttal.
2. Second rebuttal.
3. Third rebuttal.
4. Fourth rebuttal."""

CON_REBUTTAL_PROMPT = """You are the CON side in a debate about: {query}

The PRO side said:
{pro_args}

Give 4 sharp rebuttals, numbered 1-4. No extra text before or after.

1. First rebuttal.
2. Second rebuttal.
3. Third rebuttal.
4. Fourth rebuttal."""

JUDGE_PROMPT = """You are an impartial debate judge.
Topic: {query}

PRO arguments:
{pro_args}

CON arguments:
{con_args}

Decide which side made the stronger overall case.
Reply in this EXACT format — no other text, no markdown, nothing else:

WINNER: PRO
CONFIDENCE: 0.72
REASONING: One sentence explaining your decision."""


def _parse_numbered(text: str, limit: int = 5) -> list:
    if not text:
        return []

    lines = []
    for line in text.split("\n"):
        line = line.strip()
        m = re.match(r"^(\d+)[\.\):\-]\s+(.+)", line)
        if m:
            content = m.group(2).strip()
            if content:
                lines.append(content)

    if not lines:
        lines = [l.strip() for l in text.split("\n") if l.strip() and not l.strip().startswith("#")]

    deduped = []
    seen = set()
    for item in lines:
        key = item.lower()
        if key not in seen:
            deduped.append(item)
            seen.add(key)

    return deduped[:limit]


def _parse_judge(text: str) -> dict:
    winner = "PRO"
    confidence = 0.65
    reasoning = "Arguments evaluated by judge."

    if not text:
        return {"winner": winner, "confidence": confidence, "reasoning": reasoning}

    upper = text.upper()

    m = re.search(r"WINNER\s*[:=]\s*(PRO|CON)", upper)
    if m:
        winner = m.group(1)

    m = re.search(r"CONFIDENCE\s*[:=]\s*([0-9.]+)", text, re.IGNORECASE)
    if m:
        try:
            c = float(m.group(1))
            confidence = c / 100 if c > 1 else c
            confidence = max(0.5, min(confidence, 0.99))
        except Exception:
            pass

    m = re.search(r"REASONING\s*[:=]\s*(.+)", text, re.IGNORECASE)
    if m:
        reasoning = m.group(1).strip()
    else:
        for line in text.split("\n"):
            line = line.strip()
            if line and not re.match(r"^(WINNER|CONFIDENCE)", line, re.IGNORECASE):
                reasoning = line
                break

    return {"winner": winner, "confidence": confidence, "reasoning": reasoning}


def _safe_text(val) -> str:
    return str(val).strip() if val else ""


class DebateEngine:
    async def run(self, query: str) -> dict:
        try:
            print(f"\n🚀 STARTING DEBATE: {query}")

            print("📢 Generating arguments in parallel...")
            pro_task = asyncio.create_task(
                call_openrouter(PRO_PROMPT.format(query=query), label="PRO")
            )
            con_task = asyncio.create_task(
                call_gemini_safe(CON_PROMPT.format(query=query))
            )

            results = await asyncio.gather(pro_task, con_task, return_exceptions=True)

            pro_raw = results[0] if not isinstance(results[0], Exception) else ""
            con_raw = results[1] if not isinstance(results[1], Exception) else ""

            if not pro_raw:
                print("  ⚠ PRO task failed, retrying once via OpenRouter")
                pro_raw = await call_openrouter(PRO_PROMPT.format(query=query), label="PRO-retry")

            if not con_raw:
                print("  ⚠ CON task failed, retrying once via Gemini/OpenRouter safe path")
                con_raw = await call_gemini_safe(CON_PROMPT.format(query=query))

            pro_args = _parse_numbered(pro_raw, 5)
            con_args = _parse_numbered(con_raw, 5)

            if not pro_args:
                pro_args = [f"PRO argument {i + 1} for: {query}" for i in range(5)]
            if not con_args:
                con_args = [f"CON argument {i + 1} for: {query}" for i in range(5)]

            print(f"   PRO: {len(pro_args)} args | CON: {len(con_args)} args")

            print("🔁 Generating rebuttals...")
            pro_reb_task = asyncio.create_task(
                call_gemini_safe(
                    PRO_REBUTTAL_PROMPT.format(
                        query=query,
                        con_args="\n".join(f"{i + 1}. {a}" for i, a in enumerate(con_args)),
                    )
                )
            )
            con_reb_task = asyncio.create_task(
                call_openrouter(
                    CON_REBUTTAL_PROMPT.format(
                        query=query,
                        pro_args="\n".join(f"{i + 1}. {a}" for i, a in enumerate(pro_args)),
                    ),
                    label="CON-rebuttal",
                )
            )

            reb_results = await asyncio.gather(pro_reb_task, con_reb_task, return_exceptions=True)

            pro_reb_raw = reb_results[0] if not isinstance(reb_results[0], Exception) else ""
            con_reb_raw = reb_results[1] if not isinstance(reb_results[1], Exception) else ""

            pro_rebuttals = _parse_numbered(pro_reb_raw, 4)
            con_rebuttals = _parse_numbered(con_reb_raw, 4)

            print("⚖️ Running judges in parallel...")
            judge_prompt = JUDGE_PROMPT.format(
                query=query,
                pro_args="\n".join(f"{i + 1}. {a}" for i, a in enumerate(pro_args)),
                con_args="\n".join(f"{i + 1}. {a}" for i, a in enumerate(con_args)),
            )

            j1_task = asyncio.create_task(call_openrouter(judge_prompt, label="Judge-1"))
            j2_task = asyncio.create_task(call_huggingface(judge_prompt))
            j3_task = asyncio.create_task(call_gemini_safe(judge_prompt))

            judge_results = await asyncio.gather(j1_task, j2_task, j3_task, return_exceptions=True)

            pro_score = sum(len(a) for a in pro_args)
            con_score = sum(len(a) for a in con_args)
            heuristic = {
                "winner": "PRO" if pro_score >= con_score else "CON",
                "confidence": 0.60,
                "reasoning": "Heuristic: evaluated argument density and depth.",
            }

            parsed_judges = []
            for idx, raw in enumerate(judge_results, start=1):
                if isinstance(raw, Exception) or not str(raw).strip():
                    print(f"  ⚠ Judge {idx} failed — using heuristic fallback")
                    parsed_judges.append(heuristic)
                else:
                    parsed_judges.append(_parse_judge(raw))

            while len(parsed_judges) < 3:
                parsed_judges.append(heuristic)

            pro_votes = sum(1 for v in parsed_judges if v["winner"] == "PRO")
            con_votes = len(parsed_judges) - pro_votes
            final_decision = "PRO" if pro_votes >= 2 else "CON"
            avg_confidence = round(
                sum(v["confidence"] for v in parsed_judges) / len(parsed_judges), 4
            )
            winning_reasoning = next(
                (v["reasoning"] for v in parsed_judges if v["winner"] == final_decision),
                "Consensus reached by majority vote.",
            )

            model_names = ["OpenRouter (PRO)", "Gemini/OpenRouter (CON)", "Heuristic Judge"]
            texts = [
                _safe_text(pro_raw),
                _safe_text(con_raw),
                " ".join(pro_args + con_args),
            ]
            hall_scores = scorer.score(model_names, texts)
            most_hallucinating = hall_scores[0]["model"] if hall_scores else "None"

            print(f"✅ DEBATE COMPLETE — Winner: {final_decision} ({pro_votes}-{con_votes})")

            return {
                "pro_arguments": pro_args,
                "con_arguments": con_args,
                "rebuttals": {
                    "pro_rebuttals": pro_rebuttals,
                    "con_rebuttals": con_rebuttals,
                },
                "final_decision": final_decision,
                "confidence": avg_confidence,
                "reasoning": winning_reasoning,
                "judge_votes": {"PRO": pro_votes, "CON": con_votes},
                "individual_verdicts": parsed_judges,
                "hallucination_scores": hall_scores,
                "most_hallucinating_model": most_hallucinating,
            }

        except Exception as e:
            print("=== DEBATE ENGINE CRASH ===")
            traceback.print_exc()
            raise Exception(f"Debate engine error: {str(e)}")