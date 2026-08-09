"""Judges a submitted answer against the problem.

Supports: mcq, short_answer, code (Python), code_java (Java subprocess).
"""
import asyncio
from typing import Any

from app.judge_java import judge_java_submission

SAFE_BUILTINS = {
    "range": range, "len": len, "sum": sum, "min": min, "max": max,
    "sorted": sorted, "abs": abs, "enumerate": enumerate, "zip": zip,
    "list": list, "dict": dict, "set": set, "tuple": tuple, "str": str,
    "int": int, "float": float, "bool": bool, "print": print,
    "isinstance": isinstance, "type": type,
}


def _run_user_function(source: str, test_cases: list[dict]) -> bool:
    namespace: dict[str, Any] = {"__builtins__": SAFE_BUILTINS}
    exec(source, namespace)  # noqa: S102
    fn = namespace.get("solve")
    if fn is None:
        return False
    for case in test_cases:
        args = case["input"]
        expected = case["expected"]
        try:
            actual = fn(*args) if isinstance(args, list) else fn(args)
        except Exception:
            return False
        if actual != expected:
            return False
    return True


async def judge_submission(problem: dict, answer: str) -> bool:
    ptype = problem.get("type")

    if ptype in ("mcq", "short_answer"):
        expected = str(problem.get("correct_answer", "")).strip().lower()
        return str(answer).strip().lower() == expected

    if ptype == "code":
        test_cases = problem.get("test_cases", [])
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(_run_user_function, answer, test_cases),
                timeout=5.0,
            )
        except (asyncio.TimeoutError, Exception):
            return False

    if ptype == "code_java":
        return await judge_java_submission(problem, answer)

    return False
