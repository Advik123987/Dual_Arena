"""Java code judge: compiles and runs via javac/java subprocess.

The player submits a COMPLETE Java class named Solution with a main method
that reads from stdin and prints to stdout. The judge writes it to a temp
file, compiles with javac, runs with each test case's stdin, compares stdout.
"""
import asyncio
import logging
import os
import shutil
import subprocess
import tempfile

logger = logging.getLogger(__name__)

JAVA_BOILERPLATE = """import java.util.*;
import java.util.stream.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // YOUR CODE HERE
    }
}
"""


def _normalize_java_code(user_code: str) -> str:
    """Ensure the submission is a complete class named Solution."""
    if "class Solution" in user_code:
        return user_code
    return f"""import java.util.*;
import java.util.stream.*;

public class Solution {{
    public static void main(String[] args) {{
        Scanner sc = new Scanner(System.in);
{user_code}
    }}
}}
"""


def _run_java_sync(java_source: str, test_cases: list[dict]) -> bool:
    tmp_dir = None
    try:
        tmp_dir = tempfile.mkdtemp(prefix="duel_java_")
        java_file = os.path.join(tmp_dir, "Solution.java")

        with open(java_file, "w", encoding="utf-8") as f:
            f.write(java_source)

        compile_proc = subprocess.run(
            ["javac", java_file],
            capture_output=True, text=True, timeout=15, cwd=tmp_dir,
        )
        if compile_proc.returncode != 0:
            logger.debug("Java compile error: %s", compile_proc.stderr[:500])
            return False

        for tc in test_cases:
            stdin_data = str(tc.get("stdin", "")).strip()
            expected = str(tc.get("expected", "")).strip()
            try:
                run_proc = subprocess.run(
                    ["java", "-cp", tmp_dir, "Solution"],
                    input=stdin_data,
                    capture_output=True, text=True,
                    timeout=5, cwd=tmp_dir,
                )
                actual = run_proc.stdout.strip()
                if actual != expected:
                    return False
            except subprocess.TimeoutExpired:
                return False

        return True

    except Exception as exc:
        logger.error("Java judge unexpected error: %s", exc)
        return False
    finally:
        if tmp_dir:
            shutil.rmtree(tmp_dir, ignore_errors=True)


def _run_java_detailed_sync(java_source: str, test_cases: list[dict]) -> dict:
    tmp_dir = None
    results = []
    try:
        tmp_dir = tempfile.mkdtemp(prefix="duel_java_run_")
        java_file = os.path.join(tmp_dir, "Solution.java")

        with open(java_file, "w", encoding="utf-8") as f:
            f.write(java_source)

        compile_proc = subprocess.run(
            ["javac", java_file],
            capture_output=True, text=True, timeout=15, cwd=tmp_dir,
        )
        if compile_proc.returncode != 0:
            return {
                "success": False,
                "error": f"Compilation Error:\n{compile_proc.stderr[:800]}",
                "test_results": [],
            }

        all_passed = True
        for i, tc in enumerate(test_cases):
            stdin_data = str(tc.get("stdin", "")).strip()
            expected = str(tc.get("expected", "")).strip()
            try:
                run_proc = subprocess.run(
                    ["java", "-cp", tmp_dir, "Solution"],
                    input=stdin_data,
                    capture_output=True, text=True,
                    timeout=4, cwd=tmp_dir,
                )
                actual = run_proc.stdout.strip()
                passed = (actual == expected)
                if not passed:
                    all_passed = False
                results.append({
                    "test_case": i + 1,
                    "input": stdin_data,
                    "expected": expected,
                    "actual": actual,
                    "passed": passed,
                    "stderr": run_proc.stderr.strip()[:300],
                })
            except subprocess.TimeoutExpired:
                all_passed = False
                results.append({
                    "test_case": i + 1,
                    "input": stdin_data,
                    "expected": expected,
                    "actual": "Time Limit Exceeded (>4s)",
                    "passed": False,
                })

        return {
            "success": all_passed,
            "error": None,
            "test_results": results,
        }
    except Exception as exc:
        return {"success": False, "error": str(exc), "test_results": []}
    finally:
        if tmp_dir:
            shutil.rmtree(tmp_dir, ignore_errors=True)


async def judge_java_submission(problem: dict, user_code: str) -> bool:
    test_cases = problem.get("test_cases", [])
    if not test_cases:
        return False
    java_source = _normalize_java_code(user_code)
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_run_java_sync, java_source, test_cases),
            timeout=60.0,
        )
    except asyncio.TimeoutError:
        return False


async def run_java_tests(problem: dict, user_code: str) -> dict:
    test_cases = problem.get("test_cases", [])
    java_source = _normalize_java_code(user_code)
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_run_java_detailed_sync, java_source, test_cases),
            timeout=25.0,
        )
    except asyncio.TimeoutError:
        return {"success": False, "error": "Execution Timed Out", "test_results": []}
