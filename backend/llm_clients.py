import os
import asyncio
from typing import Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

TIMEOUT = httpx.Timeout(90.0, connect=20.0)
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

# Safer defaults:
# - Gemini: current broadly documented text model
# - OpenRouter: auto router instead of brittle hardcoded free slugs
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
OPENROUTER_PRIMARY_MODEL = os.getenv("OPENROUTER_PRIMARY_MODEL", "openrouter/auto").strip()
OPENROUTER_FALLBACK_MODEL = os.getenv("OPENROUTER_FALLBACK_MODEL", "openrouter/auto").strip()

DEFAULT_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "900"))
DEFAULT_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.7"))


async def _retry(coro_factory, retries: int = 3, base_delay: float = 2.0):
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            return await coro_factory()
        except Exception as e:
            last_err = e
            if attempt < retries:
                wait = base_delay * (2 ** (attempt - 1))
                print(f"  ↻ Retry {attempt}/{retries - 1} after {wait:.0f}s — {e}")
                await asyncio.sleep(wait)
    raise last_err


def _safe_text_from_openrouter(data: dict) -> str:
    choices = data.get("choices") or []
    if not choices:
        raise ValueError("OpenRouter response had no choices")

    msg = choices[0].get("message") or {}
    content = msg.get("content")

    if isinstance(content, str):
        return content.strip()

    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                parts.append(item.get("text", ""))
        joined = "".join(parts).strip()
        if joined:
            return joined

    raise ValueError(f"OpenRouter returned empty/unexpected content: {data}")


def _safe_text_from_gemini(data: dict) -> str:
    candidates = data.get("candidates") or []
    if not candidates:
        raise ValueError(f"Gemini response had no candidates: {data}")

    content = candidates[0].get("content") or {}
    parts = content.get("parts") or []

    texts = []
    for part in parts:
        if isinstance(part, dict) and "text" in part:
            texts.append(part["text"])

    joined = "".join(texts).strip()
    if not joined:
        raise ValueError(f"Gemini returned empty/unexpected content: {data}")
    return joined


async def _call_openrouter_once(
    prompt: str,
    model: str,
    label: str,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    temperature: float = DEFAULT_TEMPERATURE,
) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY is missing from .env")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Argumind",
    }

    body = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(OPENROUTER_URL, headers=headers, json=body)

    if response.status_code != 200:
        raise Exception(f"OpenRouter {response.status_code} for {model}: {response.text[:400]}")

    data = response.json()
    text = _safe_text_from_openrouter(data)
    model_used = data.get("model", model)
    print(f"  ✅ OpenRouter succeeded for {label} using {model_used}")
    return text


async def call_openrouter(
    prompt: str,
    label: str = "task",
    model: Optional[str] = None,
) -> str:
    chosen = model or OPENROUTER_PRIMARY_MODEL

    try:
        return await _retry(
            lambda: _call_openrouter_once(prompt, chosen, label),
            retries=3,
            base_delay=2.0,
        )
    except Exception as primary_err:
        if OPENROUTER_FALLBACK_MODEL and OPENROUTER_FALLBACK_MODEL != chosen:
            print(f"  ⚠ OpenRouter primary failed, trying fallback model: {OPENROUTER_FALLBACK_MODEL}")
            return await _retry(
                lambda: _call_openrouter_once(prompt, OPENROUTER_FALLBACK_MODEL, f"{label}-fallback"),
                retries=2,
                base_delay=2.0,
            )
        raise Exception(f"OpenRouter failed for {label}: {primary_err}")


async def _call_gemini_once(
    prompt: str,
    model: str = GEMINI_MODEL,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    temperature: float = DEFAULT_TEMPERATURE,
) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ValueError("GEMINI_API_KEY is missing from .env")

    url = f"{GEMINI_API_BASE}/{model}:generateContent?key={api_key}"
    body = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
        },
    }

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(url, json=body)

    if response.status_code != 200:
        try:
            payload = response.json()
        except Exception:
            payload = {"raw": response.text[:400]}
        raise Exception(f"Gemini {response.status_code}: {payload}")

    data = response.json()
    text = _safe_text_from_gemini(data)
    print(f"  ✅ Gemini succeeded using {model}")
    return text


async def call_gemini(prompt: str) -> str:
    return await _retry(
        lambda: _call_gemini_once(prompt),
        retries=2,
        base_delay=2.0,
    )


async def call_gemini_safe(prompt: str) -> str:
    try:
        return await call_gemini(prompt)
    except Exception as e:
        print(f"  ⚠ Gemini failed ({e}) — falling back to OpenRouter")
        return await call_openrouter(prompt, label="gemini-fallback")


async def call_huggingface(prompt: str) -> str:
    # Keep your existing name so the rest of the app does not break.
    # Backend route is OpenRouter for now.
    return await call_openrouter(prompt, label="judge")