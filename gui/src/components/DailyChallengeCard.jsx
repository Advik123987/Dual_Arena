import React, { useState, useEffect } from 'react';
import { fetchDailyChallenge } from '../api.js';

export default function DailyChallengeCard({ onSolveDaily }) {
  const [daily, setDaily] = useState(null);

  useEffect(() => {
    fetchDailyChallenge()
      .then(data => setDaily(data))
      .catch(err => console.error(err));
  }, []);

  if (!daily || !daily.problem) return null;

  return (
    <div className="daily-challenge-card">
      <div className="daily-challenge-content">
        <div className="daily-tag-row">
          <span className="daily-badge">📅 DAILY CHALLENGE</span>
          <span className="daily-bonus">+30 ELO BONUS</span>
          <span className="daily-date">{daily.date}</span>
        </div>
        <h3 className="daily-title">{daily.problem.title}</h3>
        <p className="daily-prompt">
          {daily.problem.prompt.length > 120 ? daily.problem.prompt.substring(0, 120) + '...' : daily.problem.prompt}
        </p>
      </div>

      <button
        className="btn-primary daily-btn"
        onClick={() => onSolveDaily(daily.problem)}
      >
        ⚡ Solve Daily Challenge
      </button>
    </div>
  );
}
