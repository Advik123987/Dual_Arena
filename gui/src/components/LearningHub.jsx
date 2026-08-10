import React, { useState, useEffect } from 'react';
import { fetchRecommendations } from '../api.js';

const DEFAULT_DATA = {
  focus_areas: ["dp", "graphs", "two_pointers", "arrays"],
  custom_summary: "Welcome to your AI Learning Coach! Based on competitive coding patterns, mastering Dynamic Programming memoization, Graph BFS traversals, and Two-Pointer array techniques will yield your highest ELO rank gains.",
  recommendations: [
    {
      category: "dp",
      topic: "Dynamic Programming: Memoization & Tabulation Patterns",
      resource_title: "NeetCode 150 — Dynamic Programming Study Roadmap",
      resource_url: "https://neetcode.io/roadmap",
      action_step: "Practice 1D DP problems like Climbing Stairs and Coin Change in the Problem Bank catalog."
    },
    {
      category: "graphs",
      topic: "Graph Traversals: BFS & DFS Matrix Algorithms",
      resource_title: "LeetCode Curated Graph Patterns Guide for Beginners",
      resource_url: "https://leetcode.com/discuss/general-discussion/655708/graph-for-beginners",
      action_step: "Master 2D grid matrix traversals using Queue-based BFS and Recursive DFS."
    },
    {
      category: "two_pointers",
      topic: "Two Pointers & Sliding Window Technique",
      resource_title: "Grokking the Coding Interview: Two Pointers Pattern",
      resource_url: "https://leetcode.com/discuss/study-guide/1688903/Solvable-problems-using-Two-Pointers",
      action_step: "Apply opposite-end pointers on sorted arrays to solve Two Sum and 3Sum in O(N) time."
    },
    {
      category: "arrays",
      topic: "Kadane's Algorithm & Prefix Sum Optimizations",
      resource_title: "CP-Algorithms: Maximum Subarray & Prefix Sums",
      resource_url: "https://cp-algorithms.com/",
      action_step: "Solve Maximum Subarray (Kadane's) to achieve linear time complexity without extra space."
    }
  ]
};

export default function LearningHub({ playerId }) {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!playerId) {
      setData(DEFAULT_DATA);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchRecommendations(playerId)
      .then(res => {
        if (res && res.recommendations && res.recommendations.length > 0) {
          setData(res);
        } else {
          setData(DEFAULT_DATA);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Using default learning coach recommendations:", err);
        setData(DEFAULT_DATA);
        setLoading(false);
      });
  }, [playerId]);

  const coachData = data || DEFAULT_DATA;

  return (
    <div className="learning-hub-container">
      <div className="learning-hub-header">
        <div>
          <h2>💡 AI Learning Coach &amp; Resource Engine</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
            Personalized study plans &amp; curated algorithm tutorials based on competitive coding patterns and battle data.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="auth-spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Analyzing performance data &amp; crafting AI recommendations...</p>
        </div>
      ) : (
        <div className="learning-grid">
          {/* Summary Box */}
          <div className="learning-card summary-card">
            <h3>🤖 AI Skill Evaluation</h3>
            <p style={{ fontSize: '1rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
              {coachData.custom_summary}
            </p>
            <div style={{ marginTop: '1rem' }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Target Priority Focus Areas:</strong>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {coachData.focus_areas?.map(cat => (
                  <span key={cat} className="category-tag" style={{ textTransform: 'capitalize' }}>
                    🎯 {cat.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendations Cards */}
          <div className="recommendations-list">
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.2rem' }}>📖 Recommended Resources &amp; Action Steps</h3>
            {coachData.recommendations?.map((item, idx) => (
              <div key={idx} className="learning-card rec-item-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span className="category-tag" style={{ textTransform: 'capitalize' }}>{item.category}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 600 }}>Recommended</span>
                </div>
                <h4 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', color: 'var(--accent-cyan)' }}>{item.topic}</h4>
                <p style={{ margin: '0 0 0.8rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <strong>Action Step:</strong> {item.action_step}
                </p>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.6rem 0.8rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.resource_title}</span>
                  {item.resource_url && (
                    <a
                      href={item.resource_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', textDecoration: 'none' }}
                    >
                      🔗 Open Tutorial
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
