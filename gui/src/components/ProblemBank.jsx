import React, { useState, useEffect } from 'react';
import { fetchProblems } from '../api.js';

const CATEGORIES = ["all", "arrays", "strings", "dp", "linked_lists"];

const DEFAULT_PROBLEMS = [
  {
    id: "two-sum",
    title: "Two Sum",
    category: "arrays",
    difficulty: "easy",
    type: "code",
    language: "python",
    prompt: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\nExample:\nInput: nums = [2,7,11,15], target = 9 -> Output: [0,1]",
    function_signature: "def solve(nums: list[int], target: int) -> list[int]:",
    test_cases: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { input: [[3, 2, 4], 6], expected: [1, 2] },
      { input: [[3, 3], 6], expected: [0, 1] }
    ]
  },
  {
    id: "valid-anagram",
    title: "Valid Anagram",
    category: "strings",
    difficulty: "easy",
    type: "code",
    language: "python",
    prompt: "Given two strings `s` and `t`, return `True` if `t` is an anagram of `s`, and `False` otherwise.",
    function_signature: "def solve(s: str, t: str) -> bool:",
    test_cases: [
      { input: ["anagram", "nagaram"], expected: true },
      { input: ["rat", "car"], expected: false },
      { input: ["listen", "silent"], expected: true }
    ]
  },
  {
    id: "maximum-subarray",
    title: "Maximum Subarray (Kadane's Algo)",
    category: "dp",
    difficulty: "medium",
    type: "code",
    language: "python",
    prompt: "Given an integer array `nums`, find the contiguous subarray with the largest sum, and return its sum.",
    function_signature: "def solve(nums: list[int]) -> int:",
    test_cases: [
      { input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { input: [[1]], expected: 1 },
      { input: [[5, 4, -1, 7, 8]], expected: 23 }
    ]
  },
  {
    id: "reverse-linked-list",
    title: "Reverse a Linked List",
    category: "linked_lists",
    difficulty: "easy",
    type: "code",
    language: "python",
    prompt: "Given an array representation of a linked list `head`, return the array reversed.",
    function_signature: "def solve(head: list[int]) -> list[int]:",
    test_cases: [
      { input: [[1, 2, 3, 4, 5]], expected: [5, 4, 3, 2, 1] },
      { input: [[1, 2]], expected: [2, 1] }
    ]
  },
  {
    id: "coin-change",
    title: "Coin Change",
    category: "dp",
    difficulty: "medium",
    type: "code",
    language: "python",
    prompt: "Given coin denominations `coins` and total `amount`, return fewest coins needed. Return -1 if impossible.",
    function_signature: "def solve(coins: list[int], amount: int) -> int:",
    test_cases: [
      { input: [[1, 2, 5], 11], expected: 3 },
      { input: [[2], 3], expected: -1 }
    ]
  },
  {
    id: "valid-parentheses",
    title: "Valid Parentheses",
    category: "strings",
    difficulty: "easy",
    type: "code",
    language: "python",
    prompt: "Given string `s` containing '()[]{}', determine if the input string is valid.",
    function_signature: "def solve(s: str) -> bool:",
    test_cases: [
      { input: ["()[]{}"], expected: true },
      { input: ["(]"], expected: false }
    ]
  },
  {
    id: "binary-search",
    title: "Binary Search",
    category: "arrays",
    difficulty: "easy",
    type: "code",
    language: "python",
    prompt: "Given sorted array `nums` and `target`, return index of target, or -1 if not present.",
    function_signature: "def solve(nums: list[int], target: int) -> int:",
    test_cases: [
      { input: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
      { input: [[-1, 0, 3, 5, 9, 12], 2], expected: -1 }
    ]
  },
  {
    id: "climbing-stairs",
    title: "Climbing Stairs",
    category: "dp",
    difficulty: "easy",
    type: "code",
    language: "python",
    prompt: "You are climbing a staircase with `n` steps. Each time you can climb 1 or 2 steps. How many distinct ways to reach top?",
    function_signature: "def solve(n: int) -> int:",
    test_cases: [
      { input: [2], expected: 2 },
      { input: [3], expected: 3 },
      { input: [5], expected: 8 }
    ]
  },
  {
    id: "java-sum-array",
    title: "Java: Sum of Array Elements",
    category: "arrays",
    difficulty: "easy",
    type: "code_java",
    language: "java",
    prompt: "Read integer N, followed by N space-separated integers from stdin. Output their sum.",
    test_cases: [
      { stdin: "4\n1 2 3 4", expected: "10" },
      { stdin: "3\n10 20 30", expected: "60" }
    ]
  },
  {
    id: "java-palindrome-check",
    title: "Java: Palindrome String Check",
    category: "strings",
    difficulty: "easy",
    type: "code_java",
    language: "java",
    prompt: "Read a single word from stdin. Print 'true' if it is a palindrome, else 'false'.",
    test_cases: [
      { stdin: "racecar", expected: "true" },
      { stdin: "hello", expected: "false" }
    ]
  },
  {
    id: "fibonacci-number",
    title: "Fibonacci Number",
    category: "dp",
    difficulty: "easy",
    type: "code",
    language: "python",
    prompt: "Given integer `n`, return the nth Fibonacci number where F(0)=0, F(1)=1, and F(n)=F(n-1)+F(n-2).",
    function_signature: "def solve(n: int) -> int:",
    test_cases: [
      { input: [2], expected: 1 },
      { input: [4], expected: 3 },
      { input: [10], expected: 55 }
    ]
  },
  {
    id: "product-except-self",
    title: "Product of Array Except Self",
    category: "arrays",
    difficulty: "medium",
    type: "code",
    language: "python",
    prompt: "Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all elements of `nums` except `nums[i]`.",
    function_signature: "def solve(nums: list[int]) -> list[int]:",
    test_cases: [
      { input: [[1, 2, 3, 4]], expected: [24, 12, 8, 6] },
      { input: [[-1, 1, 0, -3, 3]], expected: [0, 0, 9, 0, 0] }
    ]
  }
];

export default function ProblemBank({ onSolveProblem }) {
  const [problems, setProblems] = useState(DEFAULT_PROBLEMS);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProblems({
      category: category !== 'all' ? category : null,
      difficulty: difficulty !== 'all' ? difficulty : null,
      search: search.trim() || null,
    })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setProblems(data);
        }
      })
      .catch(err => {
        console.error("Using fallback problem bank:", err);
      });
  }, [category, difficulty, search]);

  const filteredProblems = problems.filter(p => {
    if (category !== 'all' && p.category !== category) return false;
    if (difficulty !== 'all' && p.difficulty !== difficulty) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      const matchTitle = p.title?.toLowerCase().includes(s);
      const matchPrompt = p.prompt?.toLowerCase().includes(s);
      if (!matchTitle && !matchPrompt) return false;
    }
    return true;
  });

  return (
    <div className="problem-bank-container">
      <div className="problem-bank-header">
        <div>
          <h2>📚 LeetCode-Style Problem Bank Catalog</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
            Master core CS algorithms &amp; data structures. Practice solo before entering the 1v1 Arena!
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="problem-bank-filters">
        <input
          type="text"
          className="input-field"
          placeholder="🔍 Search problems by title or keyword..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '320px', padding: '0.6rem 1rem', fontSize: '0.95rem' }}
        />

        <div className="filter-group">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`filter-pill ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat === 'all' ? 'All Categories' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="filter-group">
          {['all', 'easy', 'medium', 'hard'].map(diff => (
            <button
              key={diff}
              className={`filter-pill ${difficulty === diff ? 'active' : ''}`}
              onClick={() => setDifficulty(diff)}
            >
              {diff === 'all' ? 'All Difficulties' : diff}
            </button>
          ))}
        </div>
      </div>

      {/* Problem Table */}
      {filteredProblems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No problems found matching your filters.
        </div>
      ) : (
        <table className="leaderboard-table problem-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Title</th>
              <th>Category</th>
              <th>Difficulty</th>
              <th>Language</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProblems.map((p, idx) => (
              <tr key={p.id || idx}>
                <td><span style={{ fontSize: '1.1rem' }}>📝</span></td>
                <td>
                  <strong
                    style={{ cursor: 'pointer', color: 'var(--text-main)' }}
                    onClick={() => onSolveProblem(p)}
                  >
                    {p.title}
                  </strong>
                </td>
                <td>
                  <span className="category-tag" style={{ margin: 0, fontSize: '0.75rem', textTransform: 'capitalize' }}>
                    {(p.category || 'arrays').replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <span className={`diff-pill ${p.difficulty}`}>
                    {p.difficulty}
                  </span>
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                    {p.language === 'java' ? '☕ Java' : '🐍 Python'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn-primary"
                    style={{ padding: '0.35rem 0.9rem', fontSize: '0.82rem' }}
                    onClick={() => onSolveProblem(p)}
                  >
                    ⚡ Practice
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
