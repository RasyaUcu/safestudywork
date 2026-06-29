import { useState, useEffect, useRef, useCallback, useContext } from "react";
import { getItem, setItem, STORAGE, clamp, today } from "../lib/store";
import { audioEngine } from "../lib/audio";
import type { SessionEntry } from "../lib/store";
import { AppCtx } from "../App";
import Lockdown from "./Lockdown";
import BreakHelper from "./BreakHelper";

/* ── Flip Digit ── */
function FlipDigit({ digit }: { digit: string }) {
  const [show, setShow]   = useState(digit);
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");
  const pendingRef        = useRef(digit);

  useEffect(() => {
    if (digit === pendingRef.current) return;
    pendingRef.current = digit;
    setPhase("out");
    const t = setTimeout(() => {
      setShow(digit); setPhase("in");
      setTimeout(() => setPhase("idle"), 160);
    }, 160);
    return () => clearTimeout(t);
  }, [digit]);

  return (
    <div className="flip-digit">
      <span className={`flip-num flip-num--${phase}`}>{show}</span>
    </div>
  );
}

function FlipDisplay({ seconds, overtime }: { seconds: number; overtime: number }) {
  if (overtime > 0) {
    const om = Math.floor(overtime / 60);
    const os = overtime % 60;
    return (
      <div className="flip-display overtime-display">
        <span className="overtime-plus">+</span>
        <FlipDigit digit={String(Math.floor(om / 10))} />
        <FlipDigit digit={String(om % 10)} />
        <span className="flip-colon">:</span>
        <FlipDigit digit={String(Math.floor(os / 10))} />
        <FlipDigit digit={String(os % 10)} />
      </div>
    );
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const d = [String(Math.floor(m / 10)), String(m % 10), String(Math.floor(s / 10)), String(s % 10)];
  return (
    <div className="flip-display">
      <FlipDigit digit={d[0]} /><FlipDigit digit={d[1]} />
      <span className="flip-colon">:</span>
      <FlipDigit digit={d[2]} /><FlipDigit digit={d[3]} />
    </div>
  );
}

/* ── Particle Burst ── */
function ParticleBurst({ trigger, color }: { trigger: number; color: string }) {
  const [alive, setAlive] = useState(false);
  useEffect(() => {
    if (trigger === 0) return;
    setAlive(true);
    const t = setTimeout(() => setAlive(false), 900);
    return () => clearTimeout(t);
  }, [trigger]);
  if (!alive) return null;
  return (
    <div className="particle-burst" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <div key={i} className="pb-dot" style={{
          "--angle": `${(i / 14) * 360}deg`,
          "--color": color,
          "--delay": `${(i % 3) * 0.05}s`,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

/* ── Liquid Tabs ── */
function LiquidTabs({ options, active, onChange }: {
  options: { value: string; label: string }[];
  active: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const idx = options.findIndex(o => o.value === active);
    const btn = ref.current.children[idx + 1] as HTMLElement;
    if (btn) setPos({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [active, options]);

  return (
    <div className="liquid-tabs" ref={ref}>
      <div className="liquid-indicator" style={{ left: pos.left, width: pos.width }} />
      {options.map(o => (
        <button key={o.value}
          className={`liquid-tab ${active === o.value ? "liquid-tab--active" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Session Dots ── */
function SessionDots({ filled }: { filled: number }) {
  return (
    <div className="session-dots" title="Progress sesi sebelum istirahat panjang">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className={`session-dot ${i < filled ? "session-dot--done" : ""}`} />
      ))}
    </div>
  );
}

/* ── Presets ── */
const PRESETS = [
  { label: "25/5",  focus: 25, brk: 5  },
  { label: "50/10", focus: 50, brk: 10 },
  { label: "90/20", focus: 90, brk: 20 },
];

/* ══════════════════════════════════════════════════════
   MAIN TIMER
══════════════════════════════════════════════════════ */
interface TimerProps {
  onModeChange: (m: "focus" | "break") => void;
  onSessionComplete: (minutes: number, mode: "focus" | "break") => void;
  focusTarget: number;
  todaySessions: number;
}

export default function Timer({ onModeChange, onSessionComplete, focusTarget, todaySessions }: TimerProps) {
  const { lockdown, setLockdown, showToast } = useContext(AppCtx);

  /* ── Settings ── */
  const [focusMin,  setFocusMin]  = useState(() => getItem<number>(STORAGE.focusMin, 25));
  const [breakMin,  setBreakMin]  = useState(() => getItem<number>(STORAGE.breakMin, 5));
  const [autoStart, setAutoStart] = useState(() => getItem<boolean>(STORAGE.autoStart, false));
  const [chimeOn,   setChimeOn]   = useState(() => getItem<boolean>(STORAGE.chimeEnabled, true));
  const [overtimeOn,setOvertimeOn]= useState(() => getItem<boolean>(STORAGE.overtime, false));
  const [draftF,    setDraftF]    = useState(String(25));
  const [draftB,    setDraftB]    = useState(String(5));
  const [showSets,  setShowSets]  = useState(false);

  /* ── Timer state ── */
  const [mode,         setMode]         = useState<"focus" | "break">("focus");
  const [timeLeft,     setTimeLeft]     = useState(focusMin * 60);
  const [running,      setRunning]      = useState(false);
  const [sessions,     setSessions]     = useState(() => getItem<number>(STORAGE.sessions, 0));
  const [finished,     setFinished]     = useState(false);
  const [particleTrig, setParticleTrig] = useState(0);
  const [autoCountdown,setAutoCountdown]= useState<number | null>(null);
  const [overtimeSecs, setOvertimeSecs] = useState(0);
  const isOvertimeRef  = useRef(false);

  /* ── Session log ── */
  const [log,         setLog]        = useState<SessionEntry[]>(() => getItem<SessionEntry[]>(STORAGE.sessionLog, []));
  const [sessionName, setSessionName] = useState("");
  const [showLog,     setShowLog]    = useState(false);
  const sessionStartRef = useRef<number>(0);
  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const focusMinRef     = useRef(focusMin);
  useEffect(() => { focusMinRef.current = focusMin; }, [focusMin]);

  /* ── Keyboard: Space + L + R ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") { e.preventDefault(); setRunning(r => !r); }
      if (e.key === "l" || e.key === "L") setLockdown(true);
      if (e.key === "r" || e.key === "R") handleReset();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setLockdown]);

  /* ── Persist ── */
  useEffect(() => { setItem(STORAGE.sessions, sessions); }, [sessions]);
  useEffect(() => { setItem(STORAGE.focusMin, focusMin); }, [focusMin]);
  useEffect(() => { setItem(STORAGE.breakMin, breakMin); }, [breakMin]);
  useEffect(() => { setItem(STORAGE.autoStart, autoStart); }, [autoStart]);
  useEffect(() => { setItem(STORAGE.chimeEnabled, chimeOn); }, [chimeOn]);
  useEffect(() => { setItem(STORAGE.overtime, overtimeOn); }, [overtimeOn]);
  useEffect(() => { setItem(STORAGE.sessionLog, log); }, [log]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  /* ── Record session helper ── */
  const recordSession = useCallback((modeArg: "focus" | "break", mins: number) => {
    const endTime = Date.now();
    const entry: SessionEntry = {
      id: crypto.randomUUID(), mode: modeArg,
      name: sessionName || (modeArg === "focus" ? "Fokus" : "Istirahat"),
      startTime: sessionStartRef.current || endTime - mins * 60000, endTime, minutes: mins,
    };
    setLog(prev => [entry, ...prev].slice(0, 50));
    sessionStartRef.current = 0;
    if (modeArg === "focus") setSessions(s => s + 1);
    onSessionComplete(mins, modeArg);
  }, [sessionName, onSessionComplete]);

  /* ── Countdown tick ── */
  useEffect(() => {
    if (running) {
      if (sessionStartRef.current === 0) sessionStartRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            if (!isOvertimeRef.current) {
              // Fire session complete
              const mins = mode === "focus" ? focusMinRef.current : getItem<number>(STORAGE.breakMin, 5);
              if (chimeOn) audioEngine.playChime();
              setFinished(true);
              setTimeout(() => setFinished(false), 3500);
              setParticleTrig(p => p + 1);
              recordSession(mode, mins);
              if (overtimeOn) {
                isOvertimeRef.current = true;
                return 0; // stay at 0, overtime starts
              }
              clearTimer();
              setRunning(false);
              if (autoStart) {
                let c = 5; setAutoCountdown(c);
                const cd = setInterval(() => {
                  c--;
                  if (c <= 0) { clearInterval(cd); setAutoCountdown(null); setRunning(true); }
                  else setAutoCountdown(c);
                }, 1000);
              }
            } else {
              setOvertimeSecs(s => s + 1);
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [running, clearTimer, mode, chimeOn, autoStart, overtimeOn, recordSession]);

  /* ── Reset overtime when mode changes or running stops ── */
  useEffect(() => {
    if (!running) { isOvertimeRef.current = false; setOvertimeSecs(0); }
  }, [running]);

  /* ── Switch mode ── */
  const switchMode = (m: "focus" | "break") => {
    setRunning(false); clearTimer();
    setMode(m); onModeChange(m);
    sessionStartRef.current = 0;
    isOvertimeRef.current = false; setOvertimeSecs(0);
    const effectiveBreak = m === "break" && sessions > 0 && sessions % 4 === 0 ? 15 : breakMin;
    setTimeLeft(m === "focus" ? focusMin * 60 : effectiveBreak * 60);
    setParticleTrig(p => p + 1);
  };

  const handleReset = () => {
    setRunning(false); clearTimer();
    sessionStartRef.current = 0;
    isOvertimeRef.current = false; setOvertimeSecs(0);
    setTimeLeft(mode === "focus" ? focusMin * 60 : breakMin * 60);
    setAutoCountdown(null);
  };

  const applySettings = () => {
    const f = clamp(parseInt(draftF, 10) || 25, 1, 120);
    const b = clamp(parseInt(draftB, 10) || 5,  1,  60);
    setFocusMin(f); setBreakMin(b); setDraftF(String(f)); setDraftB(String(b));
    setRunning(false); clearTimer();
    setTimeLeft(mode === "focus" ? f * 60 : b * 60);
    setShowSets(false);
    showToast(`⚙️ Pengaturan diterapkan: Fokus ${f}m / Istirahat ${b}m`, "info");
  };

  const applyPreset = (p: typeof PRESETS[0]) => {
    setFocusMin(p.focus); setBreakMin(p.brk);
    setDraftF(String(p.focus)); setDraftB(String(p.brk));
    setItem(STORAGE.focusMin, p.focus); setItem(STORAGE.breakMin, p.brk);
    setRunning(false); clearTimer();
    setTimeLeft(mode === "focus" ? p.focus * 60 : p.brk * 60);
    showToast(`⚡ Preset ${p.label} diterapkan!`, "info");
  };

  /* ── Ring calculations ── */
  const total    = mode === "focus" ? focusMin * 60 : breakMin * 60;
  const progress = total > 0 ? ((total - timeLeft) / total) * 100 : 0;
  const circ     = 2 * Math.PI * 88;
  const dash     = circ - (progress / 100) * circ;
  const accentColor = mode === "focus" ? "#a78bfa" : "#fbbf24";

  /* Ring dot position */
  const dotAngle = (progress / 100) * 2 * Math.PI;
  const dotX = 100 + 88 * Math.cos(dotAngle);
  const dotY = 100 + 88 * Math.sin(dotAngle);

  const tabOptions = [
    { value: "focus", label: `🎯 Fokus (${focusMin}m)` },
    { value: "break", label: `🌿 Istirahat (${sessions > 0 && sessions % 4 === 0 ? 15 : breakMin}m)` },
  ];

  const fmt = (s: number) => {
    const h = new Date(s);
    return `${String(h.getHours()).padStart(2, "0")}:${String(h.getMinutes()).padStart(2, "0")}`;
  };

  const targetPct = Math.min(100, (todaySessions / focusTarget) * 100);

  return (
    <>
      {lockdown && (
        <Lockdown
          timeDisplay={`${String(Math.floor(timeLeft/60)).padStart(2,"0")}:${String(timeLeft%60).padStart(2,"0")}`}
          mode={mode} running={running}
          onToggle={() => setRunning(r => !r)}
          onExit={() => setLockdown(false)}
        />
      )}

      <section className="glass-card timer-card" data-mode={mode}>
        {/* Header */}
        <div className="section-title-row">
          <h2 className="section-title">
            <span className="icon-dot dot-mode" />
            Pomodoro Timer
            {sessions > 0 && <span className="session-badge">🔥 {sessions}</span>}
          </h2>
          <SessionDots filled={sessions % 4} />
          <div className="timer-header-actions">
            <button className="icon-btn" onClick={() => setLockdown(true)} title="Mode Penuh (L)">⛶</button>
            <button className="icon-btn" onClick={() => { setShowSets(s => !s); setDraftF(String(focusMin)); setDraftB(String(breakMin)); }}>⚙️</button>
          </div>
        </div>

        {/* Focus target progress */}
        <div className="target-prog-wrap" title={`Hari ini: ${todaySessions}/${focusTarget} sesi`}>
          <div className="target-prog-fill" style={{ width: `${targetPct}%` }} />
          <span className="target-prog-label">Hari ini: {todaySessions}/{focusTarget} sesi 🎯</span>
        </div>

        {/* Settings panel */}
        {showSets && (
          <div className="settings-panel glass-card">
            {/* Presets */}
            <div className="preset-chips">
              {PRESETS.map(p => (
                <button key={p.label} className={`preset-chip ${focusMin === p.focus && breakMin === p.brk ? "preset-chip--active" : ""}`}
                  onClick={() => applyPreset(p)}>
                  ⚡ {p.label}
                </button>
              ))}
            </div>
            <div className="settings-grid">
              <div className="settings-field">
                <label className="settings-label">Fokus (menit)</label>
                <input type="number" min={1} max={120} className="glass-input" value={draftF} onChange={e => setDraftF(e.target.value)} />
              </div>
              <div className="settings-field">
                <label className="settings-label">Istirahat (menit)</label>
                <input type="number" min={1} max={60} className="glass-input" value={draftB} onChange={e => setDraftB(e.target.value)} />
              </div>
            </div>
            <div className="settings-toggles">
              <label className="toggle-row">
                <input type="checkbox" checked={autoStart} onChange={e => setAutoStart(e.target.checked)} />
                <span>Auto-start sesi berikutnya</span>
              </label>
              <label className="toggle-row">
                <input type="checkbox" checked={chimeOn} onChange={e => setChimeOn(e.target.checked)} />
                <span>Suara bel saat selesai</span>
              </label>
              <label className="toggle-row">
                <input type="checkbox" checked={overtimeOn} onChange={e => setOvertimeOn(e.target.checked)} />
                <span>Overtime — lanjut menghitung setelah selesai</span>
              </label>
            </div>
            <button className="apply-btn" onClick={applySettings}>✓ Terapkan</button>
          </div>
        )}

        {/* Session name */}
        <input className="glass-input session-name-input"
          placeholder="Nama sesi (opsional)..."
          value={sessionName} onChange={e => setSessionName(e.target.value)} maxLength={40}
        />

        {/* Mode tabs */}
        <LiquidTabs options={tabOptions} active={mode} onChange={v => switchMode(v as "focus" | "break")} />

        {/* Timer ring */}
        <div className={`timer-ring-wrap ${running ? "ring--pulsing" : ""} ${finished ? "ring--celebrate" : ""}`}>
          <ParticleBurst trigger={particleTrig} color={accentColor} />
          <svg viewBox="0 0 200 200" className="timer-svg">
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={mode === "focus" ? "#a78bfa" : "#fbbf24"} />
                <stop offset="100%" stopColor={mode === "focus" ? "#7c6aff" : "#f59e0b"} />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="88" className="ring-track" />
            <circle cx="100" cy="100" r="88" className="ring-prog"
              strokeDasharray={circ} strokeDashoffset={dash}
              stroke="url(#ringGrad)" />
            {/* Moving dot at arc endpoint */}
            {progress > 0.5 && (
              <circle cx={dotX} cy={dotY} r="7" fill={accentColor} className="ring-endpoint-dot"
                style={{ filter: `drop-shadow(0 0 8px ${accentColor})` }} />
            )}
          </svg>
          <div className="timer-display">
            <FlipDisplay seconds={timeLeft} overtime={overtimeSecs} />
            <span className={`timer-label ${overtimeSecs > 0 ? "timer-label--overtime" : ""}`}>
              {overtimeSecs > 0 ? "OVERTIME" : mode === "focus" ? "FOKUS" : "ISTIRAHAT"}
            </span>
          </div>
        </div>

        {/* Banners */}
        {finished && (
          <div className="finish-banner">
            {mode === "focus" ? "🎉 Sesi selesai! Waktunya istirahat." : "💪 Istirahat selesai! Ayo fokus!"}
          </div>
        )}
        {autoCountdown !== null && (
          <div className="auto-banner">
            ⏱ Sesi berikutnya mulai dalam <strong>{autoCountdown}s</strong>…
            <button className="cancel-auto-btn" onClick={() => setAutoCountdown(null)}>Batal</button>
          </div>
        )}

        {/* Controls */}
        <div className="timer-controls">
          {!running
            ? <button className="btn btn-primary ripple-btn" onClick={() => { audioEngine.resume(); setRunning(true); }} disabled={timeLeft === 0 && !overtimeOn}>▶ Mulai</button>
            : <button className="btn btn-warn ripple-btn" onClick={() => setRunning(false)}>⏸ Jeda</button>
          }
          <button className="btn btn-ghost ripple-btn" onClick={handleReset}>↺ Reset</button>
        </div>

        {/* Progress bar */}
        <div className="prog-wrap"><div className="prog-bar" style={{ width: `${progress}%` }} /></div>

        {/* Keyboard hint */}
        <p className="kbd-hint"><kbd>Spasi</kbd> mulai/jeda · <kbd>R</kbd> reset · <kbd>L</kbd> fokus penuh · <kbd>?</kbd> shortcut</p>

        {/* Session log */}
        <div className="session-log-wrap">
          <button className="log-toggle-btn" onClick={() => setShowLog(s => !s)}>
            📋 Riwayat sesi ({log.length}) {showLog ? "▲" : "▼"}
          </button>
          {showLog && (
            <div className="session-log">
              {log.length === 0 && <p className="log-empty">Belum ada sesi tercatat.</p>}
              {log.map(e => (
                <div key={e.id} className={`log-entry log-entry--${e.mode}`}>
                  <span className="log-icon">{e.mode === "focus" ? "🎯" : "🌿"}</span>
                  <span className="log-name">{e.name}</span>
                  <span className="log-meta">{e.minutes}m · {fmt(e.startTime)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <BreakHelper visible={mode === "break" && running} />
    </>
  );
}
