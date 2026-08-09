"""Judges a submitted answer against the problem and runs test-sandbox requests.

Supports: mcq, short_answer, code (Python), code_java (Java subprocess).
"""
import asyncio
import io
import sys
from typing import Any

from app.judge_java import judge_java_submission, run_java_tests

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


def _run_python_tests_detailed(source: str, test_cases: list[dict]) -> dict:
    namespace: dict[str, Any] = {"__builtins__": SAFE_BUILTINS}
    try:
        exec(source, namespace)  # noqa: S102
    except Exception as exc:
        return {"success": False, "error": f"Syntax / Execution Error: {exc}", "test_results": []}

    fn = namespace.get("solve")
    if fn is None:
        return {"success": False, "error": "Function 'solve' not defined.", "test_results": []}

    results = []
    all_passed = True
    for i, case in enumerate(test_cases):
        args = case["input"]
        expected = case["expected"]
        try:
            actual = fn(*args) if isinstance(args, list) else fn(args)
            passed = (actual == expected)
            if not passed:
                all_passed = False
            results.append({
                "test_case": i + 1,
                "input": str(args),
                "expected": str(expected),
                "actual": str(actual),
                "passed": passed,
            })
        except Exception as exc:
            all_passed = False
            results.append({
                "test_case": i + 1,
                "input": str(args),
                "expected": str(expected),
                "actual": f"Error: {exc}",
                "passed": False,
            })

    return {"success": all_passed, "error": None, "test_results": results}


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


async def run_problem_tests(problem: dict, answer: str) -> dict:
    """Run code against sample test cases and return detailed pass/fail feedback."""
    ptype = problem.get("type")

    if ptype == "code":
        test_cases = problem.get("test_cases", [])
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(_run_python_tests_detailed, answer, test_cases),
                timeout=8.0,
            )
        except asyncio.TimeoutError:
            return {"success": False, "error": "Execution Timed Out", "test_results": []}

    if ptype == "code_java":
        return await run_java_tests(problem, answer)

    # For MCQ / short_answer
    expected = str(problem.get("correct_answer", "")).strip().lower()
    passed = (str(answer).strip().lower() == expected)
    return {
        "success": passed,
        "error": None,
        "test_results": [{
            "test_case": 1,
            "input": "Answer match",
            "expected": expected,
            "actual": str(answer).strip().lower(),
            "passed": passed,
        }],
    }
