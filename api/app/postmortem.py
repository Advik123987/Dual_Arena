"""AI Post-Match Solution Analysis via Groq.

Generates optimal solution advice, Big-O complexity, and key tips after a match.
"""
import json
import httpx
from app.config import settings
from app.problem_gen import GROQ_URL

SYSTEM_PROMPT = """You are a senior algorithms instructor.
Given a coding problem, return a JSON object with this schema:
{
  "optimal_complexity": "Time: O(...), Space: O(...)",
  "key_insight": "<1 short sentence on the optimal approach/algorithm>",
  "pro_tip": "<1 sentence tip on common pitfalls or clean code pattern>"
}
Keep it concise, punchy, and clear."""


async def generate_post_mortem(problem: dict) -> dict:
    prompt_text = problem.get("prompt", "")
    category = problem.get("category", "")
    payload = {
        "model": settings.GROQ_MODEL_SECONDARY,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Category: {category}\nProblem: {prompt_text[:300]}"},
        ],
        "temperature": 0.5,
        "response_format": {"type": "json_object"},
        "max_tokens": 150,
    }
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.post(GROQ_URL, json=payload, headers=headers)
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"].strip()
            return json.loads(content)
    except Exception:
        return {
            "optimal_complexity": "Time: O(N), Space: O(1)",
            "key_insight": f"Focus on optimal data structure selection for {category} problems.",
            "pro_tip": "Always test edge cases with small or empty inputs.",
        }
