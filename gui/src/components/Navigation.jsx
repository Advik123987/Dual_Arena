import React from 'react';

export default function Navigation({ activeTab, onSelectTab }) {
  return (
    <nav className="nav-bar">
      <button
        className={`nav-tab ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => onSelectTab('home')}
      >
        🏠 Home
      </button>
      <button
        className={`nav-tab ${activeTab === 'arena' ? 'active' : ''}`}
        onClick={() => onSelectTab('arena')}
      >
        ⚔️ 1v1 Arena
      </button>
      <button
        className={`nav-tab ${activeTab === 'problems' ? 'active' : ''}`}
        onClick={() => onSelectTab('problems')}
      >
        📚 Problem Bank
      </button>
      <button
        className={`nav-tab ${activeTab === 'learning' ? 'active' : ''}`}
        onClick={() => onSelectTab('learning')}
      >
        💡 AI Learning Coach
      </button>
      <button
        className={`nav-tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
        onClick={() => onSelectTab('leaderboard')}
      >
        🏆 Rankings
      </button>
    </nav>
  );
}
