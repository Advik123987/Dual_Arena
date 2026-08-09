import React, { useState, useEffect } from 'react';
import { fetchProblems } from '../api.js';

const CATEGORIES = ["all", "arrays", "strings", "dp", "linked_lists"];

export default function ProblemBank({ onSolveProblem }) {
  const [problems, setProblems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchProblems({
      category: category !== 'all' ? category : null,
      difficulty: difficulty !== 'all' ? difficulty : null,
      search: search.trim() || null,
    })
      .then(data => { setProblems(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, [category, difficulty, search]);

  return (
    <div className="problem-bank-container">
      <div className="problem-bank-header">
        <div>
          <h2>📚 LeetCode-Style Problem Bank</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
            Master core CS algorithms & data structures. Practice solo before entering the 1v1 Arena!
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
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="auth-spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading problem catalog...</p>
        </div>
      ) : problems.length === 0 ? (
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
            {problems.map((p, idx) => (
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
                    {p.category.replace('_', ' ')}
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
