"""Curriculum & Problem Bank Catalog + AI Resource Recommendation Engine.

Provides a structured LeetCode-style problem bank across core CS categories,
plus an AI Learning Coach that analyzes player weak areas and generates
targeted resource recommendations (topics, tutorials, patterns, articles).
"""
import json
import httpx
from app.config import settings
from app.problem_gen import GROQ_URL

# Curated LeetCode-style Problem Bank Catalog
PROBLEM_BANK = [
    {
        "id": "two-sum",
        "title": "Two Sum",
        "category": "arrays",
        "difficulty": "easy",
        "type": "code",
        "prompt": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\nExample:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]",
        "function_signature": "def solve(nums: list[int], target: int) -> list[int]:",
        "test_cases": [
            {"input": [[2, 7, 11, 15], 9], "expected": [0, 1]},
            {"input": [[3, 2, 4], 6], "expected": [1, 2]},
            {"input": [[3, 3], 6], "expected": [0, 1]},
        ],
    },
    {
        "id": "valid-anagram",
        "title": "Valid Anagram",
        "category": "strings",
        "difficulty": "easy",
        "type": "code",
        "prompt": "Given two strings `s` and `t`, return `True` if `t` is an anagram of `s`, and `False` otherwise.",
        "function_signature": "def solve(s: str, t: str) -> bool:",
        "test_cases": [
            {"input": ["anagram", "nagaram"], "expected": True},
            {"input": ["rat", "car"], "expected": False},
            {"input": ["listen", "silent"], "expected": True},
        ],
    },
    {
        "id": "maximum-subarray",
        "title": "Maximum Subarray (Kadane's Algo)",
        "category": "dp",
        "difficulty": "medium",
        "type": "code",
        "prompt": "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\nExample: nums = [-2,1,-3,4,-1,2,1,-5,4] -> 6 ([4,-1,2,1])",
        "function_signature": "def solve(nums: list[int]) -> int:",
        "test_cases": [
            {"input": [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], "expected": 6},
            {"input": [[1]], "expected": 1},
            {"input": [[5, 4, -1, 7, 8]], "expected": 23},
        ],
    },
    {
        "id": "reverse-linked-list",
        "title": "Reverse a Linked List (Array Rep)",
        "category": "linked_lists",
        "difficulty": "easy",
        "type": "code",
        "prompt": "Given an array representation of a linked list `head`, return the array reversed.\nExample: [1,2,3,4,5] -> [5,4,3,2,1]",
        "function_signature": "def solve(head: list[int]) -> list[int]:",
        "test_cases": [
            {"input": [[1, 2, 3, 4, 5]], "expected": [5, 4, 3, 2, 1]},
            {"input": [[1, 2]], "expected": [2, 1]},
            {"input": [[]], "expected": []},
        ],
    },
    {
        "id": "coin-change",
        "title": "Coin Change",
        "category": "dp",
        "difficulty": "medium",
        "type": "code",
        "prompt": "Given an array of coin denominations `coins` and total `amount`, return fewest coins needed. Return -1 if impossible.",
        "function_signature": "def solve(coins: list[int], amount: int) -> int:",
        "test_cases": [
            {"input": [[1, 2, 5], 11], "expected": 3},
            {"input": [[2], 3], "expected": -1},
            {"input": [[1], 0], "expected": 0},
        ],
    },
    {
        "id": "valid-parentheses",
        "title": "Valid Parentheses",
        "category": "strings",
        "difficulty": "easy",
        "type": "code",
        "prompt": "Given string `s` containing '()[]{}', determine if the input string is valid.",
        "function_signature": "def solve(s: str) -> bool:",
        "test_cases": [
            {"input": ["()[]{}"], "expected": True},
            {"input": ["(]"], "expected": False},
            {"input": ["([])"], "expected": True},
        ],
    },
    {
        "id": "binary-search",
        "title": "Binary Search",
        "category": "arrays",
        "difficulty": "easy",
        "type": "code",
        "prompt": "Given sorted array `nums` of n integers and a `target`, return index of target, or -1 if not present.",
        "function_signature": "def solve(nums: list[int], target: int) -> int:",
        "test_cases": [
            {"input": [[-1, 0, 3, 5, 9, 12], 9], "expected": 4},
            {"input": [[-1, 0, 3, 5, 9, 12], 2], "expected": -1},
        ],
    },
    {
        "id": "climbing-stairs",
        "title": "Climbing Stairs",
        "category": "dp",
        "difficulty": "easy",
        "type": "code",
        "prompt": "You are climbing a staircase with `n` steps. Each time you can climb 1 or 2 steps. How many distinct ways to reach top?",
        "function_signature": "def solve(n: int) -> int:",
        "test_cases": [
            {"input": [2], "expected": 2},
            {"input": [3], "expected": 3},
            {"input": [5], "expected": 8},
        ],
    },
    {
        "id": "java-sum-array",
        "title": "Java: Sum of Array Elements",
        "category": "arrays",
        "difficulty": "easy",
        "type": "code_java",
        "language": "java",
        "prompt": "Read integer N, followed by N space-separated integers from stdin. Output their sum.",
        "test_cases": [
            {"stdin": "4\n1 2 3 4", "expected": "10"},
            {"stdin": "3\n10 20 30", "expected": "60"},
            {"stdin": "1\n5", "expected": "5"},
        ],
    },
    {
        "id": "java-palindrome-check",
        "title": "Java: Palindrome String Check",
        "category": "strings",
        "difficulty": "easy",
        "type": "code_java",
        "language": "java",
        "prompt": "Read a single word from stdin. Print 'true' if it is a palindrome, else 'false'.",
        "test_cases": [
            {"stdin": "racecar", "expected": "true"},
            {"stdin": "hello", "expected": "false"},
            {"stdin": "madam", "expected": "true"},
        ],
    },
]


SYSTEM_PROMPT = """You are an expert AI CS Learning Coach.
Analyze the user's category weakness scores (0.0=strong, 1.0=weak) and generate personalized learning recommendations.
Return ONLY valid JSON matching this schema:
{
  "focus_areas": ["<top weak category 1>", "<top weak category 2>"],
  "custom_summary": "<2-sentence encouraging summary of current skill strengths and growth targets>",
  "recommendations": [
    {
      "category": "<category_name>",
      "topic": "<Core algorithm pattern to learn, e.g. Sliding Window / Two Pointers>",
      "resource_title": "<Recommended LeetCode/NeetCode tutorial or article title>",
      "resource_url": "<URL or search term>",
      "action_step": "<Specific practice problem advice>"
    }
  ]
}"""


async def generate_learning_recommendations(weak_areas: dict) -> dict:
    # Sort categories by highest score (weakest first)
    sorted_weak = sorted(weak_areas.items(), key=lambda x: x[1], reverse=True)
    top_weak = [cat for cat, score in sorted_weak[:3]] if sorted_weak else ["dp", "graphs", "arrays"]

    payload = {
        "model": settings.GROQ_MODEL_PRIMARY,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Weakness scores: {json.dumps(weak_areas)}\nTop weak categories: {top_weak}"},
        ],
        "temperature": 0.6,
        "response_format": {"type": "json_object"},
        "max_tokens": 400,
    }
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(GROQ_URL, json=payload, headers=headers)
            resp.raise_for_status()
            return json.loads(resp.json()["choices"][0]["message"]["content"].strip())
    except Exception:
        return {
            "focus_areas": top_weak,
            "custom_summary": "Focus on mastering core pattern recognition in dynamic programming and array algorithms to boost your win rate.",
            "recommendations": [
                {
                    "category": top_weak[0] if top_weak else "dp",
                    "topic": "Dynamic Programming: Memoization & Tabulation",
                    "resource_title": "NeetCode 150 — Dynamic Programming Roadmap",
                    "resource_url": "https://neetcode.io/roadmap",
                    "action_step": "Practice 1D DP problems like Climbing Stairs and Coin Change.",
                },
                {
                    "category": top_weak[1] if len(top_weak) > 1 else "graphs",
                    "topic": "Graph Traversals: BFS & DFS Patterns",
                    "resource_title": "LeetCode Curated Graph Patterns Guide",
                    "resource_url": "https://leetcode.com/discuss/general-discussion/655708/graph-for-beginners",
                    "action_step": "Master matrix traversal using BFS queues.",
                },
            ],
        }
