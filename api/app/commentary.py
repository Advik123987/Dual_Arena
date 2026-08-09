"""Short AI-generated commentary lines reacting to duel events.

Kept intentionally cheap/fast (small model, short max_tokens, no fallback
chain) since these fire multiple times per duel and must not block the
timer loop. If Groq is slow/unavailable we just skip the line — commentary
is flavor, not core to judging, so it fails silently rather than degrading
the duel itself.
"""
import httpx

from app.config import settings
from app.problem_gen import GROQ_URL

SYSTEM_PROMPT = (
    "You are a hype esports-style commentator for a 1v1 coding duel. "
    "React to the given event in ONE short punchy sentence (under 20 words). "
    "No markdown, just the sentence."
)


async def generate_commentary(event: str) -> str | None:
    payload = {
        "model": settings.GROQ_MODEL_SECONDARY,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": event},
        ],
        "temperature": 0.9,
        "max_tokens": 40,
    }
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.post(GROQ_URL, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        return None
