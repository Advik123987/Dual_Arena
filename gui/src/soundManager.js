/*
 * Esports Sound Manager & Voice Announcer Engine.
 * Combines Web Audio API synthesized sound FX with Web Speech API voice announcements.
 * Includes volume control & mute persistence in localStorage.
 */

let isMuted = localStorage.getItem("duel_arena_muted") === "true";

export function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem("duel_arena_muted", isMuted ? "true" : "false");
  return isMuted;
}

export function getMuteState() {
  return isMuted;
}

// ── Web Speech API Voice Announcer ───────────────────────────────────────────

export function speakAnnouncement(text) {
  if (isMuted) return;
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith("en") && v.name.includes("Natural")) ||
                           voices.find(v => v.lang.startsWith("en"));
    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error("SpeechSynthesis error:", e);
  }
}

// ── Web Audio API Sound Effects ──────────────────────────────────────────────

function getAudioContext() {
  try {
    return new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    return null;
  }
}

export function playMatchFound() {
  if (isMuted) return;
  speakAnnouncement("Match Found! Prepare to Battle!");
  const ctx = getAudioContext();
  if (!ctx) return;
  const freqs = [440, 554, 659, 880];
  freqs.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.2);
    osc.start(ctx.currentTime + idx * 0.08);
    osc.stop(ctx.currentTime + idx * 0.08 + 0.2);
  });
}

export function playTimerPulse(remaining) {
  if (isMuted) return;
  if (remaining === 30) {
    speakAnnouncement("30 Seconds Remaining!");
  } else if (remaining === 10) {
    speakAnnouncement("10 seconds! Final countdown!");
  }
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.frequency.value = remaining <= 10 ? 880 : 587;
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.start(); osc.stop(ctx.currentTime + 0.15);
}

export function playCorrect() {
  if (isMuted) return;
  speakAnnouncement("Submission Accepted!");
  const ctx = getAudioContext();
  if (!ctx) return;
  const freqs = [523, 659, 784];
  freqs.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.2);
    osc.start(ctx.currentTime + idx * 0.06);
    osc.stop(ctx.currentTime + idx * 0.06 + 0.2);
  });
}

export function playWrong() {
  if (isMuted) return;
  speakAnnouncement("Wrong Answer!");
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.connect(gain); gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.start(); osc.stop(ctx.currentTime + 0.3);
}

export function playVictoryFanfare() {
  if (isMuted) return;
  speakAnnouncement("Flawless Victory! You win!");
  const ctx = getAudioContext();
  if (!ctx) return;
  const freqs = [523, 659, 784, 1047, 1318];
  freqs.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.4, ctx.currentTime + idx * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.4);
    osc.start(ctx.currentTime + idx * 0.12);
    osc.stop(ctx.currentTime + idx * 0.12 + 0.4);
  });
}

export function playDefeat() {
  if (isMuted) return;
  speakAnnouncement("Defeat. Better luck next time!");
  const ctx = getAudioContext();
  if (!ctx) return;
  const freqs = [440, 392, 349, 330];
  freqs.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.2 + 0.4);
    osc.start(ctx.currentTime + idx * 0.2);
    osc.stop(ctx.currentTime + idx * 0.2 + 0.4);
  });
}
