import React, { useState, useEffect, useRef } from 'react';
import ParticleBackground from './components/ParticleBackground';
import AuthScreen from './components/AuthScreen';
import Navigation from './components/Navigation';
import QueueCountdown from './components/QueueCountdown';
import DuelRoom from './components/DuelRoom';
import ActiveDuels from './components/ActiveDuels';
import OnlinePlayers from './components/OnlinePlayers';
import Leaderboard from './components/Leaderboard';
import ChallengeModal from './components/ChallengeModal';
import ProfileModal from './components/ProfileModal';
import PrivateRoomModal from './components/PrivateRoomModal';
import ProblemBank from './components/ProblemBank';
import LearningHub from './components/LearningHub';
import DailyChallengeCard from './components/DailyChallengeCard';
import TournamentModal from './components/TournamentModal';
import { joinQueue, leaveQueue, openDuelSocket, loadSession, clearSession, verifyToken } from './api.js';
import {
  playMatchFound, playTimerPulse, playCorrect, playWrong,
  playVictoryFanfare, playDefeat, toggleMute, getMuteState
} from './soundManager.js';

export default function App() {
  const [nickname, setNickname] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [muted, setMuted] = useState(getMuteState());

  // Tab Navigation state: 'arena' | 'problems' | 'learning' | 'leaderboard'
  const [activeTab, setActiveTab] = useState('arena');

  // Modals State
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [showTournamentModal, setShowTournamentModal] = useState(false);

  // Restore session on mount
  useEffect(() => {
    const session = loadSession();
    if (!session) { setAuthChecking(false); return; }
    verifyToken(session.token).then(data => {
      if (data) {
        const p = session.player;
        setNickname(p.nickname);
        setMyPlayerId(p.player_id);
        setMyRating(p.rating);
        setMyWinStreak(p.win_streak);
        setAuthed(true);
      } else {
        clearSession();
      }
    }).finally(() => setAuthChecking(false));
  }, []);

  const handleAuth = (data) => {
    setNickname(data.nickname);
    setMyPlayerId(data.player_id);
    setMyRating(data.rating);
    setMyWinStreak(data.win_streak);
    setAuthed(true);
  };

  const handleLogout = () => {
    clearSession();
    if (socketRef.current) socketRef.current.close();
    setAuthed(false);
    setStatus('idle');
    setDuel(null);
    setNickname('');
    setMyPlayerId('');
  };

  const handleToggleMute = () => {
    const state = toggleMute();
    setMuted(state);
  };

  // ── Game state ────────────────────────────────────────────────────────────
  const [status, setStatus] = useState('idle'); // idle | queueing | in_duel | spectating
  const [duel, setDuel] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState('');
  const [myRating, setMyRating] = useState(1000);
  const [myWinStreak, setMyWinStreak] = useState(0);

  const [difficulty, setDifficulty] = useState('medium');
  const [language, setLanguage] = useState('python');
  const [mode, setMode] = useState('full_battle');

  const socketRef = useRef(null);
  const duelRef = useRef(null);
  const [pendingChallenge, setPendingChallenge] = useState(null);

  useEffect(() => {
    duelRef.current = duel;
  }, [duel]);

  const handleStartQueue = async () => {
    if (!nickname.trim()) return;
    try {
      const data = await joinQueue(nickname, difficulty, language, mode);
      setMyPlayerId(data.player_id);
      setMyRating(data.rating);
      setMyWinStreak(data.win_streak);

      setStatus('queueing');

      socketRef.current = openDuelSocket(data.player_id, nickname, data.rating, data.win_streak, {
        duel_start: (msg) => {
          playMatchFound();
          setDuel({
            ...msg,
            you: msg.player_a_id === data.player_id ? msg.player_a : msg.player_b,
            opponent: msg.player_a_id === data.player_id ? msg.player_b : msg.player_a
          });
          setStatus('in_duel');
        },
        tick: (msg) => {
          if (duelRef.current && duelRef.current.onTick) duelRef.current.onTick(msg);
          if (msg.remaining === 30 || msg.remaining === 10) playTimerPulse(msg.remaining);
        },
        commentary: (msg) => {
          if (duelRef.current && duelRef.current.onCommentary) duelRef.current.onCommentary(msg);
        },
        opponent_progress: (msg) => {
          if (duelRef.current && duelRef.current.onOpponentProgress) duelRef.current.onOpponentProgress(msg);
        },
        submission_result: (msg) => {
          if (duelRef.current && duelRef.current.onSubmissionResult) duelRef.current.onSubmissionResult(msg);
          if (msg.correct) playCorrect(); else playWrong();
        },
        duel_end: (msg) => {
          if (duelRef.current && duelRef.current.onDuelEnd) duelRef.current.onDuelEnd(msg);
          if (msg.winner_id === data.player_id) playVictoryFanfare(); else playDefeat();
        },
        challenge_received: (msg) => {
          setPendingChallenge(msg);
        },
        challenge_declined: (msg) => {
          alert(`Challenge was declined by ${msg.declining_nickname}`);
        }
      });
    } catch (err) {
      console.error(err);
      alert('Failed to join queue. Server might be down.');
    }
  };

  const handleCancelQueue = async () => {
    if (myPlayerId) {
      try {
        await leaveQueue(myPlayerId);
      } catch (err) {}
    }
    if (socketRef.current) {
      socketRef.current.close();
    }
    setStatus('idle');
  };

  const handleEndDuel = () => {
    if (socketRef.current) socketRef.current.close();
    setDuel(null);
    setStatus('idle');
  };

  const handleSpectate = (activeDuel) => {
    setDuel({
      room_id: activeDuel.room_id,
      duration: activeDuel.remaining,
      you: activeDuel.player_a,
      opponent: activeDuel.player_b,
      difficulty: activeDuel.difficulty,
      language: activeDuel.language,
      mode: activeDuel.mode,
      solo: activeDuel.solo,
      problem: { category: activeDuel.category, prompt: "Spectating Live Duel...", type: "code" }
    });
    setStatus('spectating');
  };

  const handlePracticeProblem = (problem) => {
    setDuel({
      room_id: 'practice-' + (problem.id || 'prob'),
      duration: 1800,
      you: nickname,
      opponent: null,
      difficulty: problem.difficulty || 'medium',
      language: problem.language || 'python',
      mode: 'sprint',
      solo: true,
      problem: problem,
      isPractice: true,
    });
    setStatus('in_duel');
    setActiveTab('arena');
  };

  const handleLeaderboardChallenge = (entry) => {
    if (!nickname.trim()) {
      alert("Please enter a nickname first to challenge someone.");
      return;
    }
    if (status !== 'idle') {
      alert("You must be idle to issue a challenge.");
      return;
    }

    joinQueue(nickname, difficulty, language, mode).then(data => {
      setMyPlayerId(data.player_id);
      socketRef.current = openDuelSocket(data.player_id, nickname, data.rating, data.win_streak, {
        challenge_declined: (msg) => {
          alert(`${msg.declining_nickname} declined your challenge.`);
          socketRef.current.close();
          setStatus('idle');
        },
        duel_start: (msg) => {
          playMatchFound();
          setDuel({
            ...msg,
            you: msg.player_a_id === data.player_id ? msg.player_a : msg.player_b,
            opponent: msg.player_a_id === data.player_id ? msg.player_b : msg.player_a
          });
          setStatus('in_duel');
          setPendingChallenge(null);
        }
      });

      socketRef.current.onopen = () => {
        socketRef.current.send(JSON.stringify({
          action: "challenge",
          target_player_id: entry.player_id,
          from_nickname: nickname,
          difficulty,
          language,
          mode
        }));
      };

      setStatus('queueing');
    }).catch(err => console.error(err));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (authChecking) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <ParticleBackground />
        <div style={{ textAlign: 'center' }}>
          <div className="auth-spinner" style={{ width: 48, height: 48, margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading arena...</p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="app">
        <ParticleBackground />
        <AuthScreen onAuth={handleAuth} />
      </div>
    );
  }

  return (
    <div className="app">
      <ParticleBackground />

      <header className="app-header">
        <h1>DUAL ARENA</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', justifyContent: 'center', marginTop: '0.5rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            👤 <strong style={{ color: 'var(--accent-cyan)', cursor: 'pointer' }} onClick={() => setSelectedProfileId(myPlayerId)}>{nickname}</strong>
            &nbsp;·&nbsp; ⭐ {myRating}
            {myWinStreak >= 2 && <span style={{ color: 'var(--accent-orange)' }}> &nbsp;🔥{myWinStreak}</span>}
          </span>
          <button className="btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setSelectedProfileId(myPlayerId)}>
            My Profile
          </button>
          <button className="btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={handleToggleMute}>
            {muted ? '🔇 Muted' : '🔊 Sound On'}
          </button>
          <button className="btn-danger" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Top Tab Navigation */}
      {status === 'idle' && (
        <Navigation activeTab={activeTab} onSelectTab={setActiveTab} />
      )}

      {/* Arena Tab */}
      {status === 'idle' && activeTab === 'arena' && (
        <>
          {/* Daily Challenge Banner */}
          <DailyChallengeCard onSolveDaily={handlePracticeProblem} />

          <div className="lobby-container">
            <div className="lang-toggle">
              <button className={language === 'python' ? 'active' : ''} onClick={() => setLanguage('python')}>
                🐍 Python
              </button>
              <button className={language === 'java' ? 'active' : ''} onClick={() => setLanguage('java')}>
                ☕ Java
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <button className={`diff-btn easy ${difficulty === 'easy' ? 'active' : ''}`} onClick={() => setDifficulty('easy')}>
                ⚡ Easy
              </button>
              <button className={`diff-btn medium ${difficulty === 'medium' ? 'active' : ''}`} onClick={() => setDifficulty('medium')}>
                🔥 Medium
              </button>
              <button className={`diff-btn hard ${difficulty === 'hard' ? 'active' : ''}`} onClick={() => setDifficulty('hard')}>
                💀 Hard
              </button>
            </div>

            <div className="mode-grid">
              <div className={`mode-card ${mode === 'rapid_fire' ? 'active' : ''}`} onClick={() => setMode('rapid_fire')}>
                <h3>🚀 Rapid Fire</h3>
                <span className="duration">5 min</span>
              </div>
              <div className={`mode-card ${mode === 'sprint' ? 'active' : ''}`} onClick={() => setMode('sprint')}>
                <h3>🏃 Sprint</h3>
                <span className="duration">15 min</span>
              </div>
              <div className={`mode-card ${mode === 'full_battle' ? 'active' : ''}`} onClick={() => setMode('full_battle')}>
                <h3>⚔️ Full Battle</h3>
                <span className="duration">30 min</span>
              </div>
              <div className={`mode-card ${mode === 'marathon' ? 'active' : ''}`} onClick={() => setMode('marathon')}>
                <h3>🏔️ Marathon</h3>
                <span className="duration">60 min</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', maxWidth: '640px', margin: '0 auto' }}>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowPrivateModal(true)}
              >
                🔑 Private Room
              </button>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowTournamentModal(true)}
              >
                🏆 Tournament
              </button>
              <button
                className="btn-primary"
                style={{ flex: 2 }}
                onClick={handleStartQueue}
                disabled={!nickname.trim()}
              >
                ⚡ FIND MATCH
              </button>
            </div>
          </div>

          <div className="side-by-side">
            <ActiveDuels onSpectate={handleSpectate} />
            <OnlinePlayers
              myPlayerId={myPlayerId}
              difficulty={difficulty}
              language={language}
              mode={mode}
              socket={socketRef.current}
              myNickname={nickname}
            />
          </div>
        </>
      )}

      {/* Problem Bank Tab */}
      {status === 'idle' && activeTab === 'problems' && (
        <ProblemBank onSolveProblem={handlePracticeProblem} />
      )}

      {/* AI Learning Hub Tab */}
      {status === 'idle' && activeTab === 'learning' && (
        <LearningHub playerId={myPlayerId} />
      )}

      {/* Leaderboard Tab */}
      {status === 'idle' && activeTab === 'leaderboard' && (
        <Leaderboard
          onChallenge={handleLeaderboardChallenge}
          onSelectPlayer={(pid) => setSelectedProfileId(pid)}
        />
      )}

      {/* Queueing State */}
      {status === 'queueing' && (
        <QueueCountdown
          difficulty={difficulty}
          language={language}
          mode={mode}
          nickname={nickname}
          playerId={myPlayerId}
          onSolo={() => {}}
          onKeepWaiting={() => {}}
        />
      )}

      {/* In-Duel or Spectating State */}
      {(status === 'in_duel' || status === 'spectating') && duel && (
        <DuelRoom
          duel={duel}
          myPlayerId={myPlayerId}
          socket={socketRef.current}
          onEnd={handleEndDuel}
          isSpectator={status === 'spectating'}
        />
      )}

      {pendingChallenge && (
        <ChallengeModal
          challenge={pendingChallenge}
          myNickname={nickname}
          socket={socketRef.current}
          onAccept={(id) => setPendingChallenge(null)}
          onDecline={(id) => {
            setPendingChallenge(null);
            if (status === 'queueing') handleCancelQueue();
          }}
        />
      )}

      {selectedProfileId && (
        <ProfileModal
          playerId={selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
        />
      )}

      {showPrivateModal && (
        <PrivateRoomModal
          playerId={myPlayerId}
          nickname={nickname}
          difficulty={difficulty}
          language={language}
          mode={mode}
          onRoomJoined={(data) => setStatus('queueing')}
          onClose={() => setShowPrivateModal(false)}
        />
      )}

      {showTournamentModal && (
        <TournamentModal
          playerId={myPlayerId}
          nickname={nickname}
          difficulty={difficulty}
          language={language}
          onClose={() => setShowTournamentModal(false)}
        />
      )}

      {status === 'queueing' && !pendingChallenge && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button className="btn-danger" onClick={handleCancelQueue}>Cancel Queue</button>
        </div>
      )}
    </div>
  );
}
