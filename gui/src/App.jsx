import React, { useState, useEffect, useRef } from 'react';
import ParticleBackground from './components/ParticleBackground';
import AuthScreen from './components/AuthScreen';
import QueueCountdown from './components/QueueCountdown';
import DuelRoom from './components/DuelRoom';
import ActiveDuels from './components/ActiveDuels';
import OnlinePlayers from './components/OnlinePlayers';
import Leaderboard from './components/Leaderboard';
import ChallengeModal from './components/ChallengeModal';
import { joinQueue, leaveQueue, openDuelSocket, loadSession, clearSession, verifyToken } from './api.js';

function playBeep(freq = 800, duration = 0.1) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(); osc.stop(ctx.currentTime + duration);
  } catch(e) {}
}

function playWinSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const freqs = [523, 659, 784, 1047];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.3);
    });
  } catch(e) {}
}

export default function App() {
  const [nickname, setNickname] = useState('');
  // ── Auth state ────────────────────────────────────────────────────────────
  const [authed, setAuthed] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

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

  // ── Game state ────────────────────────────────────────────────────────────
  const [status, setStatus] = useState('idle'); // idle | queueing | in_duel | ended
  
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

  // Sync duelRef with duel state for WebSocket handlers
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
          setDuel({
            ...msg,
            you: msg.player_a_id === data.player_id ? msg.player_a : msg.player_b,
            opponent: msg.player_a_id === data.player_id ? msg.player_b : msg.player_a
          });
          setStatus('in_duel');
        },
        tick: (msg) => {
          if (duelRef.current && duelRef.current.onTick) duelRef.current.onTick(msg);
          if (msg.remaining === 30) playBeep(600, 0.2);
          if (msg.remaining <= 10 && msg.remaining > 0) playBeep(880, 0.1);
        },
        commentary: (msg) => {
          if (duelRef.current && duelRef.current.onCommentary) duelRef.current.onCommentary(msg);
        },
        opponent_progress: (msg) => {
          if (duelRef.current && duelRef.current.onOpponentProgress) duelRef.current.onOpponentProgress(msg);
        },
        submission_result: (msg) => {
          if (duelRef.current && duelRef.current.onSubmissionResult) duelRef.current.onSubmissionResult(msg);
        },
        duel_end: (msg) => {
          if (duelRef.current && duelRef.current.onDuelEnd) duelRef.current.onDuelEnd(msg);
          if (msg.winner_id === data.player_id) playWinSound();
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

  const handleSoloStarted = () => {
    // startSolo API called inside QueueCountdown, just wait for WS duel_start
  };

  const handleEndDuel = () => {
    if (socketRef.current) socketRef.current.close();
    setDuel(null);
    setStatus('idle');
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
    
    // Quick auto-join to get a socket, then send challenge
    joinQueue(nickname, difficulty, language, mode).then(data => {
      setMyPlayerId(data.player_id);
      socketRef.current = openDuelSocket(data.player_id, nickname, data.rating, data.win_streak, {
         challenge_declined: (msg) => {
           alert(`${msg.declining_nickname} declined your challenge.`);
           socketRef.current.close();
           setStatus('idle');
         },
         duel_start: (msg) => {
           setDuel({
             ...msg,
             you: msg.player_a_id === data.player_id ? msg.player_a : msg.player_b,
             opponent: msg.player_a_id === data.player_id ? msg.player_b : msg.player_a
           });
           setStatus('in_duel');
           setPendingChallenge(null);
         }
      });
      
      // Wait for socket to open then send challenge
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
      
      setStatus('queueing'); // Waiting for their response
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center', marginTop: '0.5rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            👤 <strong style={{ color: 'var(--accent-cyan)' }}>{nickname}</strong>
            &nbsp;·&nbsp; ⭐ {myRating}
            {myWinStreak >= 2 && <span style={{ color: 'var(--accent-orange)' }}> &nbsp;🔥{myWinStreak}</span>}
          </span>
          <button className="btn-danger" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {status === 'idle' && (
        <>
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

            <div style={{ display: 'flex', gap: '1rem', maxWidth: '600px', margin: '0 auto' }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Enter your Competitor Nickname"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                maxLength={20}
              />
              <button 
                className="btn-primary" 
                onClick={handleStartQueue}
                disabled={!nickname.trim()}
              >
                FIND MATCH
              </button>
            </div>
          </div>

          <div className="side-by-side">
            <ActiveDuels />
            <OnlinePlayers 
              myPlayerId={myPlayerId} 
              difficulty={difficulty}
              language={language}
              mode={mode}
              socket={socketRef.current}
              myNickname={nickname}
            />
          </div>

          <Leaderboard onChallenge={handleLeaderboardChallenge} />
        </>
      )}

      {status === 'queueing' && (
        <QueueCountdown 
          difficulty={difficulty}
          language={language}
          mode={mode}
          nickname={nickname}
          playerId={myPlayerId}
          onSolo={handleSoloStarted}
          onKeepWaiting={() => {}}
        />
      )}

      {status === 'in_duel' && duel && (
        <DuelRoom 
          duel={duel} 
          myPlayerId={myPlayerId} 
          socket={socketRef.current}
          onEnd={handleEndDuel}
        />
      )}

      {pendingChallenge && (
        <ChallengeModal 
          challenge={pendingChallenge}
          myNickname={nickname}
          socket={socketRef.current}
          onAccept={(id) => {
            setPendingChallenge(null);
            // WS handles duel_start transition automatically
          }}
          onDecline={(id) => {
            setPendingChallenge(null);
            if (status === 'queueing') handleCancelQueue();
          }}
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
