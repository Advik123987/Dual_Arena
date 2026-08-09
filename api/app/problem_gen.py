"""AI problem generation via Groq — difficulty, language, and mode aware."""
import json
import random

import httpx

from app.config import settings, MODE_PROBLEM_TYPES

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

CATEGORIES = [
    "arrays", "strings", "hashing", "two_pointers", "dp", "graphs",
    "percentages", "ratios", "probability", "number_series", "logical_reasoning",
    "sorting", "recursion", "linked_lists", "trees", "bit_manipulation",
]

DIFFICULTY_HINTS = {
    "easy": "beginner-friendly, solvable in under 2 minutes by a freshman CS student. Use simple concepts.",
    "medium": "intermediate difficulty, solvable in 5-10 minutes by a mid-level developer.",
    "hard": "competitive programming level, requires solid algorithmic knowledge and optimization.",
}

PYTHON_SYSTEM_PROMPT = """You are a problem-setter for a 1v1 timed coding/aptitude duel.
Return ONLY valid JSON (no markdown fences, no commentary) matching this schema:

{{
  "category": "<one of the given categories>",
  "type": "mcq" | "short_answer" | "code",
  "prompt": "<the question text, completely self-contained>",
  "choices": ["A", "B", "C", "D"],
  "correct_answer": "<exact expected string answer>",
  "function_signature": "def solve(...):",
  "test_cases": [{{"input": [...], "expected": ...}}],
  "language": "python"
}}

Difficulty: {difficulty_hint}
Allowed problem types for this mode: {allowed_types}
Be precise — graded by exact match / test-case execution."""

JAVA_SYSTEM_PROMPT = """You are a problem-setter for a 1v1 timed Java coding duel.
Return ONLY valid JSON (no markdown fences) matching this schema:

{{
  "category": "<one of the given categories>",
  "type": "mcq" | "short_answer" | "code_java",
  "prompt": "<the question, self-contained. For code_java: explain the stdin format and expected stdout.>",
  "choices": ["A", "B", "C", "D"],
  "correct_answer": "<for mcq/short_answer only>",
  "language": "java",
  "test_cases": [{{"stdin": "<input lines as string>", "expected": "<expected stdout line>"}}]
}}

For code_java type:
- The player submits a COMPLETE Java class named Solution with a main method
- It reads from stdin using Scanner, prints result to stdout
- Provide 3-5 test cases as stdin/expected stdout pairs
- stdin is the exact string fed to System.in
- expected is the exact trimmed stdout line

Difficulty: {difficulty_hint}
Allowed problem types for this mode: {allowed_types}"""


def _pick_target_category(weak_areas_a: dict, weak_areas_b: dict) -> str:
    combined = {c: 0.1 for c in CATEGORIES}
    for src in (weak_areas_a, weak_areas_b):
        for cat, score in src.items():
            if cat in combined:
                combined[cat] += score
    cats, weights = zip(*combined.items())
    return random.choices(cats, weights=weights, k=1)[0]


async def _call_groq(model: str, system_prompt: str, category: str) -> dict:
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Category: {category}. Generate one duel problem now."},
        ],
        "temperature": 0.8,
        "response_format": {"type": "json_object"},
    }
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(GROQ_URL, json=payload, headers=headers)
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"].strip()
        if content.startswith("```"):
            lines = content.splitlines()
            lines = lines[1:] if lines[0].startswith("```") else lines
            lines = lines[:-1] if lines and lines[-1].startswith("```") else lines
            content = "\n".join(lines).strip()
        return json.loads(content)


async def generate_problem(
    weak_areas_a: dict, weak_areas_b: dict,
    difficulty: str = "medium", language: str = "python", mode: str = "full_battle"
) -> dict:
    category = _pick_target_category(weak_areas_a, weak_areas_b)
    difficulty_hint = DIFFICULTY_HINTS.get(difficulty, DIFFICULTY_HINTS["medium"])
    allowed_types = ", ".join(MODE_PROBLEM_TYPES.get(mode, ["code"]))

    if language == "java":
        system_prompt = JAVA_SYSTEM_PROMPT.format(
            difficulty_hint=difficulty_hint, allowed_types=allowed_types
        )
    else:
        system_prompt = PYTHON_SYSTEM_PROMPT.format(
            difficulty_hint=difficulty_hint, allowed_types=allowed_types
        )

    models = [settings.GROQ_MODEL_PRIMARY, settings.GROQ_MODEL_SECONDARY, settings.GROQ_MODEL_TERTIARY]
    last_err = None
    for model in models:
        try:
            problem = await _call_groq(model, system_prompt, category)
            problem.setdefault("category", category)
            problem.setdefault("language", language)
            return problem
        except Exception as e:
            last_err = e
            continue
    return _fallback_problem(category, language, last_err)


def _fallback_problem(category: str, language: str, err) -> dict:
    if language == "java":
        return {
            "category": category,
            "type": "code_java",
            "language": "java",
            "prompt": "Fallback problem: Read two integers a and b from stdin (space-separated) and print their sum.",
            "test_cases": [
                {"stdin": "1 2", "expected": "3"},
                {"stdin": "10 20", "expected": "30"},
                {"stdin": "-5 5", "expected": "0"},
                {"stdin": "100 200", "expected": "300"},
            ],
            "_generation_error": str(err) if err else None,
        }
    return {
        "category": category,
        "type": "short_answer",
        "language": "python",
        "prompt": "Fallback: What is the time complexity (Big-O) of binary search on a sorted array of size n?",
        "correct_answer": "O(log n)",
        "_generation_error": str(err) if err else None,
    }
