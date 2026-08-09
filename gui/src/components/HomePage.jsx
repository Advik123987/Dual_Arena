import React from 'react';

export default function HomePage({ authed, onNavigate, onOpenAuth }) {
  return (
    <div className="home-page-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">🔥 THE NEXT-GEN 1V1 COMPETITIVE CODING ARENA</div>
        <h1 className="hero-title">
          Master Code. Crush Rivals.<br />
          <span className="hero-gradient-text">Conquer the Leaderboard.</span>
        </h1>
        <p className="hero-subtitle">
          Real-time timed coding duels powered by AI. Battle global competitors in Python &amp; Java,
          climb ELO rank divisions, and receive instant AI solution post-mortems.
        </p>

        <div className="hero-cta-group">
          {authed ? (
            <button className="btn-primary hero-btn" onClick={() => onNavigate('arena')}>
              ⚔️ ENTER BATTLE ARENA
            </button>
          ) : (
            <button className="btn-primary hero-btn" onClick={onOpenAuth}>
              🚀 CREATE ACCOUNT / LOGIN
            </button>
          )}
          <button className="btn-secondary hero-btn" onClick={() => onNavigate('problems')}>
            📚 BROWSE PROBLEM BANK
          </button>
          <button className="btn-secondary hero-btn" onClick={() => onNavigate('leaderboard')}>
            🏆 GLOBAL RANKINGS
          </button>
        </div>
      </section>

      {/* Platform Stats Bar */}
      <section className="stats-bar">
        <div className="stat-item">
          <span className="stat-number">⚡ 4</span>
          <span className="stat-label">Battle Modes (5m to 60m)</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">☕ 2</span>
          <span className="stat-label">Core Languages (Python &amp; Java)</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">🏆 6</span>
          <span className="stat-label">ELO Rank Divisions</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">🤖 AI</span>
          <span className="stat-label">Post-Mortem Solution Analysis</span>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="home-section">
        <h2 className="section-heading">🔥 Everything You Need to Dominate</h2>
        <div className="feature-grid">
          <div className="feature-card" onClick={() => onNavigate('arena')}>
            <span className="feature-icon">⚔️</span>
            <h3>1v1 Real-Time Duels</h3>
            <p>Match with competitors in Rapid Fire, Sprint, Full Battle, or Marathon modes. Race to solve algorithmic problems first.</p>
            <span className="feature-link">Launch Arena ➔</span>
          </div>

          <div className="feature-card" onClick={() => onNavigate('problems')}>
            <span className="feature-icon">📚</span>
            <h3>LeetCode Problem Catalog</h3>
            <p>Practice 50+ curated algorithms across Arrays, Strings, DP, and Linked Lists with built-in test-runner sandbox.</p>
            <span className="feature-link">Explore Problems ➔</span>
          </div>

          <div className="feature-card" onClick={() => onNavigate('learning')}>
            <span className="feature-icon">💡</span>
            <h3>AI Learning Coach</h3>
            <p>Personalized weakness evaluation that analyzes your battle data to recommend tailored tutorials, roadmaps, and action steps.</p>

            <span className="feature-link">View AI Coach ➔</span>
          </div>

          <div className="feature-card" onClick={() => onNavigate('arena')}>
            <span className="feature-icon">🏆</span>
            <h3>Knockout Tournaments</h3>
            <p>Single-elimination 4-player &amp; 8-player bracket tournaments. Advance from Quarterfinals to Finals to claim the Championship Cup.</p>
            <span className="feature-link">Join Tournaments ➔</span>
          </div>

          <div className="feature-card" onClick={() => onNavigate('leaderboard')}>
            <span className="feature-icon">👑</span>
            <h3>Rank Divisions &amp; Badges</h3>
            <p>Progress from Bronze to Grandmaster ELO ranks. Unlock achievements like First Blood, Polyglot, and Streak Master.</p>
            <span className="feature-link">View Leaderboard ➔</span>
          </div>

          <div className="feature-card" onClick={() => onNavigate('arena')}>
            <span className="feature-icon">🔊</span>
            <h3>Esports Sound &amp; Voice Engine</h3>
            <p>Immersive Web Audio FX and Web Speech voice announcements for match alerts, time warnings, and victory fanfares.</p>
            <span className="feature-link">Experience Arena ➔</span>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="home-section how-it-works-section">
        <h2 className="section-heading">⚙️ How Dual Arena Works</h2>
        <div className="steps-container">
          <div className="step-box">
            <span className="step-number">1</span>
            <h4>Create Callsign</h4>
            <p>Register your unique competitor username with password security and reserved session ranking.</p>
          </div>
          <div className="step-box">
            <span className="step-number">2</span>
            <h4>Pick Mode &amp; Language</h4>
            <p>Select Easy, Medium, or Hard difficulty in Python or Java across 4 battle durations.</p>
          </div>
          <div className="step-box">
            <span className="step-number">3</span>
            <h4>1v1 Battle Rival</h4>
            <p>Write solution code in real-time, run sample test cases in sandbox, and submit to win.</p>
          </div>
          <div className="step-box">
            <span className="step-number">4</span>
            <h4>Claim ELO &amp; Badges</h4>
            <p>Earn +15 ELO per victory, unlock achievement badges, and get AI post-mortem solution tips.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
