"""Judges a submitted answer against the problem.

SCOPE DECISION (flagged for judges): the `code` path runs in-process with a
locked-down builtins dict and a hard wall-clock timeout — not a real
container/subprocess sandbox. That's an acceptable risk for a 48h hackathon
demo with constrained, generated problems, but it is NOT safe for untrusted
production input. A real deployment would shell out to a throwaway
subprocess (or Docker-in-Docker / firecracker) per submission instead.
"""
import asyncio
from typing import Any


SAFE_BUILTINS = {
    "range": range, "len": len, "sum": sum, "min": min, "max": max,
    "sorted": sorted, "abs": abs, "enumerate": enumerate, "zip": zip,
    "list": list, "dict": dict, "set": set, "tuple": tuple, "str": str,
    "int": int, "float": float, "bool": bool, "print": print,
}


def _run_user_function(source: str, test_cases: list[dict]) -> bool:
    namespace: dict[str, Any] = {"__builtins__": SAFE_BUILTINS}
    exec(source, namespace)  # noqa: S102 — constrained builtins above
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
            # Hard 3s wall-clock budget so one bad submission can't hang a
            # WebSocket worker for the whole duel room.
            return await asyncio.wait_for(
                asyncio.to_thread(_run_user_function, answer, test_cases),
                timeout=3.0,
            )
        except asyncio.TimeoutError:
            return False
        except Exception:
            return False

    return False
