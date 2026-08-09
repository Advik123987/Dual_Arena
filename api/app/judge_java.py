"""Java code judge: compiles and runs via javac/java subprocess.

The player submits a COMPLETE Java class named Solution with a main method
that reads from stdin and prints to stdout. The judge writes it to a temp
file, compiles with javac, runs with each test case's stdin, compares stdout.

SCOPE NOTE: javac must be installed in the container (zerops.yaml prepareCommands).
If javac is not found, the judge returns False (safe fail, not a 500).
"""
import asyncio
import logging
import os
import shutil
import subprocess
import tempfile

logger = logging.getLogger(__name__)

# Default boilerplate inserted if player doesn't write a full class
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
    # Wrap bare code in minimal class
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

        # Compile
        compile_proc = subprocess.run(
            ["javac", java_file],
            capture_output=True, text=True, timeout=15, cwd=tmp_dir,
        )
        if compile_proc.returncode != 0:
            logger.debug("Java compile error: %s", compile_proc.stderr[:500])
            return False

        # Run each test case
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
                    logger.debug("Java test case FAIL: expected=%r got=%r", expected, actual)
                    return False
            except subprocess.TimeoutExpired:
                logger.debug("Java test case TIMEOUT")
                return False

        return True

    except FileNotFoundError:
        logger.warning("javac not found in PATH — Java judge unavailable")
        return False
    except subprocess.TimeoutExpired:
        return False
    except Exception as exc:
        logger.error("Java judge unexpected error: %s", exc)
        return False
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
            timeout=60.0,  # outer budget: compile + all tests
        )
    except asyncio.TimeoutError:
        return False
