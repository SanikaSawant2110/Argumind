import asyncio
import re
import traceback
from llm_clients import call_openrouter, call_gemini
from hallucination import HallucinationScorer

scorer = HallucinationScorer()

# ====================== PROMPTS ======================

PRO_PROMPT = """You are the PRO side in a debate.
Topic: {query}

Give exactly 5 strong, numbered arguments in favor.
Format strictly like this (no extra text):

1. First argument...
2. Second argument...
3. ...

Keep each point concise and persuasive."""

CON_PROMPT = """You are the CON side in a debate.
Topic: {query}

Give exactly 5 strong, numbered arguments against.
Format strictly like this (no extra text):

1. First argument...
2. Second argument...
3. ...

Keep each point concise and persuasive."""

PRO_REBUTTAL = """You are the PRO side.
Topic: {query}

Rebut the following CON arguments:
{con}

Give 4-5 numbered rebuttals.
Format strictly like this:

1. Rebuttal...
2. Rebuttal...
"""

CON_REBUTTAL = """You are the CON side.
Topic: {query}

Rebut the following PRO arguments:
{pro}

Give 4-5 numbered rebuttals.
Format strictly like this:

1. Rebuttal...
2. Rebuttal...
"""

JUDGE_PROMPT = """You are an impartial debate judge.

Topic: {query}

PRO arguments:
{pro}

CON arguments:
{con}

PRO rebuttals:
{pro_reb}

CON rebuttals:
{con_reb}

Decide the winner and respond in EXACTLY this format (nothing else):

WINNER: PRO or CON
CONFIDENCE: 0.xx
REASONING: [2-3 sentence explanation]"""

# ====================== PARSERS ======================

def parse_numbered(text: str):
    if not text or isinstance(text, Exception):
        return ["Failed to get response from LLM."]
    matches = re.findall(r'^\s*\d+\.\s*(.+)', text, re.MULTILINE)
    if matches:
        return [m.strip() for m in matches][:6]
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    return lines[:6] or ["No clear arguments generated."]


def parse_judge(raw: str):
    if not raw or isinstance(raw, Exception):
        return {
            "winner": "PRO",
            "confidence": 0.6,
            "reasoning": "Judge could not process the debate."
        }
    winner_match = re.search(r'WINNER:\s*(PRO|CON)', raw, re.IGNORECASE)
    conf_match = re.search(r'CONFIDENCE:\s*([0-9.]+)', raw)
    reasoning_match = re.search(r'REASONING:\s*(.+)', raw, re.DOTALL | re.IGNORECASE)
    return {
        "winner": winner_match.group(1).upper() if winner_match else "PRO",
        "confidence": float(conf_match.group(1)) if conf_match else 0.65,
        "reasoning": reasoning_match.group(1).strip() if reasoning_match else raw[:300]
    }

# ====================== MAIN ENGINE ======================

class DebateEngine:
    async def run(self, query: str) -> dict:
        try:
            print("\n🚀 STARTING DEBATE ENGINE")
            print("🧠 Topic:", query)

            # ===== PRO: OpenRouter =====
            print("\n📢 [OpenRouter] Generating PRO arguments...")
            try:
                pro_raw = await call_openrouter(PRO_PROMPT.format(query=query))
                print("✅ PRO RAW:", pro_raw[:200])
            except Exception as e:
                print("❌ PRO ERROR:", str(e))
                pro_raw = e

            # ===== CON: Gemini =====
            print("\n📢 [Gemini] Generating CON arguments...")
            try:
                con_raw = await call_gemini(CON_PROMPT.format(query=query))
                print("✅ CON RAW:", con_raw[:200])
            except Exception as e:
                print("❌ CON ERROR (Gemini):", str(e))
                # Fallback to OpenRouter if Gemini fails
                try:
                    print("🔄 Falling back to OpenRouter for CON...")
                    con_raw = await call_openrouter(CON_PROMPT.format(query=query))
                except Exception as e2:
                    print("❌ CON FALLBACK ERROR:", str(e2))
                    con_raw = e2

            pro_args = parse_numbered(pro_raw)
            con_args = parse_numbered(con_raw)

            # ===== PRO Rebuttals: Gemini =====
            print("\n⚔️ [Gemini] Generating PRO rebuttals...")
            try:
                pro_reb_raw = await call_gemini(
                    PRO_REBUTTAL.format(query=query, con="\n".join(con_args[:4]))
                )
                print("✅ PRO REBUTTALS RAW:", pro_reb_raw[:200])
            except Exception as e:
                print("❌ PRO REBUTTAL ERROR (Gemini):", str(e))
                try:
                    print("🔄 Falling back to OpenRouter for PRO rebuttals...")
                    pro_reb_raw = await call_openrouter(
                        PRO_REBUTTAL.format(query=query, con="\n".join(con_args[:4]))
                    )
                except Exception as e2:
                    pro_reb_raw = e2

            # ===== CON Rebuttals: OpenRouter =====
            print("\n⚔️ [OpenRouter] Generating CON rebuttals...")
            try:
                con_reb_raw = await call_openrouter(
                    CON_REBUTTAL.format(query=query, pro="\n".join(pro_args[:4]))
                )
                print("✅ CON REBUTTALS RAW:", con_reb_raw[:200])
            except Exception as e:
                print("❌ CON REBUTTAL ERROR:", str(e))
                con_reb_raw = e

            pro_rebuttals = parse_numbered(pro_reb_raw)
            con_rebuttals = parse_numbered(con_reb_raw)

            # ===== Judge: Gemini (neutral third party) =====
            print("\n⚖️ [Gemini] Generating JUDGE decision...")
            try:
                judge_prompt = JUDGE_PROMPT.format(
                    query=query,
                    pro="\n".join(pro_args),
                    con="\n".join(con_args),
                    pro_reb="\n".join(pro_rebuttals),
                    con_reb="\n".join(con_rebuttals)
                )
                judge_raw = await call_gemini(judge_prompt)
                print("✅ JUDGE RAW:", judge_raw[:200])
            except Exception as e:
                print("❌ JUDGE ERROR (Gemini):", str(e))
                try:
                    print("🔄 Falling back to OpenRouter for judge...")
                    judge_raw = await call_openrouter(judge_prompt)
                except Exception as e2:
                    judge_raw = e2

            verdict = parse_judge(judge_raw)

            # ===== Hallucination Scoring =====
            print("\n🧪 Scoring hallucination...")
            h_scores = scorer.score(
                ["OpenRouter (PRO)", "Gemini (CON)", "Gemini (Judge)"],
                [
                    pro_raw if isinstance(pro_raw, str) else "",
                    con_raw if isinstance(con_raw, str) else "",
                    judge_raw if isinstance(judge_raw, str) else "",
                ]
            )
            worst = max(h_scores, key=lambda x: x["hallucination_score"])["model"]

            print("\n🎯 DEBATE COMPLETE\n")

            return {
                "pro_arguments": pro_args,
                "con_arguments": con_args,
                "rebuttals": {
                    "pro_rebuttals": pro_rebuttals,
                    "con_rebuttals": con_rebuttals
                },
                "final_decision": verdict["winner"],
                "confidence": verdict["confidence"],
                "reasoning": verdict["reasoning"],
                "hallucination_scores": h_scores,
                "most_hallucinating_model": worst,
            }

        except Exception as e:
            print("=== DEBATE ENGINE CRASH ===")
            traceback.print_exc()
            raise Exception(f"Internal Error: {str(e)}")