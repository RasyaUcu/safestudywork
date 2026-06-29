import { createContext, useState, useEffect, useCallback, useRef } from "react";
import { getItem, setItem, STORAGE, today, getDailyTasksDone, incDailyTasksDone } from "./lib/store";
import { checkAchievements, getLevelInfo, ACHIEVEMENTS } from "./lib/xp";
import Timer from "./components/Timer";
import TodoList from "./components/TodoList";
import Stats from "./components/Stats";
import Soundscape from "./components/Soundscape";
import SupportFooter from "./components/SupportFooter";

/* ══════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════ */
export interface Toast { id: number; msg: string; type: "success" | "info" | "warn"; }
let _toastId = 0;

function ToastContainer({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast--${t.type}`} onClick={() => remove(t.id)}>
          <span className="toast-icon">
            {t.type === "success" ? "✓" : t.type === "warn" ? "⚠" : "ℹ"}
          </span>
          <span className="toast-msg">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   KEYBOARD SHORTCUT OVERLAY
══════════════════════════════════════════════════════ */
const SHORTCUTS = [
  { key: "Spasi", desc: "Mulai / Jeda timer" },
  { key: "R", desc: "Reset timer" },
  { key: "L", desc: "Mode Lockdown penuh" },
  { key: "F", desc: "Mode Fokus (sembunyikan semua)" },
  { key: "T", desc: "Ganti tema terang/gelap" },
  { key: "?", desc: "Tampilkan shortcut ini" },
  { key: "Esc", desc: "Tutup overlay / keluar mode fokus" },
];

function ShortcutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="modal-box shortcut-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">⌨️ Shortcut Keyboard</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="shortcut-list">
          {SHORTCUTS.map(s => (
            <div key={s.key} className="shortcut-row">
              <kbd className="shortcut-key">{s.key}</kbd>
              <span className="shortcut-desc">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   ONBOARDING
══════════════════════════════════════════════════════ */
const SLIDES = [
  {
    emoji: "📚",
    title: "Selamat datang di Safestudywork!",
    text: "Aplikasi Pomodoro Timer & To-Do List yang dirancang khusus untuk pelajar Indonesia. Belajar lebih fokus, lebih produktif.",
  },
  {
    emoji: "⏱️",
    title: "Teknik Pomodoro",
    text: "Belajar 25 menit, istirahat 5 menit. Setiap 4 sesi, ambil istirahat panjang 15 menit. Terbukti meningkatkan konsentrasi!",
  },
  {
    emoji: "🏆",
    title: "Kumpulkan XP & Pencapaian",
    text: "Selesaikan sesi fokus untuk mendapatkan XP, naik level, dan membuka badge. Tekan ? kapan saja untuk melihat shortcut.",
  },
];

function OnboardingModal({ onDone }: { onDone: () => void }) {
  const [slide, setSlide] = useState(0);
  const s = SLIDES[slide];
  return (
    <div className="overlay-backdrop onboard-backdrop">
      <div className="modal-box onboard-modal">
        <div className="onboard-emoji">{s.emoji}</div>
        <h2 className="onboard-title">{s.title}</h2>
        <p className="onboard-text">{s.text}</p>
        <div className="onboard-dots">
          {SLIDES.map((_, i) => (
            <button key={i} className={`onboard-dot ${i === slide ? "onboard-dot--active" : ""}`} onClick={() => setSlide(i)} />
          ))}
        </div>
        <div className="onboard-actions">
          {slide < SLIDES.length - 1
            ? <button className="btn btn-primary" onClick={() => setSlide(s => s + 1)}>Lanjut →</button>
            : <button className="btn btn-primary" onClick={onDone}>🚀 Mulai Belajar!</button>
          }
          <button className="btn btn-ghost" onClick={onDone} style={{ flex: "0 0 auto" }}>Lewati</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   LEVEL-UP MODAL
══════════════════════════════════════════════════════ */
function LevelUpModal({ emoji, name, onClose }: { emoji: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="overlay-backdrop levelup-backdrop" onClick={onClose}>
      <div className="levelup-modal">
        <div className="levelup-emoji">{emoji}</div>
        <p className="levelup-sub">LEVEL UP!</p>
        <p className="levelup-name">{name}</p>
        <p className="levelup-hint">Terus semangat belajar! 🎉</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   CURSOR GLOW
══════════════════════════════════════════════════════ */
function CursorGlow({ theme }: { theme: "dark" | "light" }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (ref.current) {
        ref.current.style.left = `${e.clientX}px`;
        ref.current.style.top  = `${e.clientY}px`;
      }
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, []);
  if (theme === "light") return null;
  return <div ref={ref} className="cursor-glow" aria-hidden="true" />;
}

/* ══════════════════════════════════════════════════════
   APP CONTEXT
══════════════════════════════════════════════════════ */
export interface IAppCtx {
  mode: "focus" | "break";
  theme: "dark" | "light";
  toggleTheme: () => void;
  lockdown: boolean;
  setLockdown: (v: boolean) => void;
  showToast: (msg: string, type?: Toast["type"]) => void;
  focusModeOn: boolean;
}
export const AppCtx = createContext<IAppCtx>({
  mode: "focus", theme: "dark", toggleTheme: () => {},
  lockdown: false, setLockdown: () => {},
  showToast: () => {}, focusModeOn: false,
});

/* ══════════════════════════════════════════════════════
   HOOKS
══════════════════════════════════════════════════════ */
function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => getItem<"dark" | "light">(STORAGE.theme, "light"));
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    setItem(STORAGE.theme, theme);
  }, [theme]);
  return { theme, toggleTheme: () => setTheme(t => t === "dark" ? "light" : "dark") };
}

function useStreak() {
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    const data = getItem<{ lastDate: string; count: number }>(STORAGE.streak, { lastDate: "", count: 0 });
    const t = today();
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const count = data.lastDate === t ? data.count : data.lastDate === yest ? data.count + 1 : 1;
    setItem(STORAGE.streak, { lastDate: t, count });
    setStreak(count);
  }, []);
  return streak;
}

/* ── Background Orbs ── */
function BgOrbs({ mode }: { mode: "focus" | "break" }) {
  return (
    <div className="bg-orbs" aria-hidden="true" data-mode={mode}>
      <div className="orb orb-1" /><div className="orb orb-2" />
      <div className="orb orb-3" /><div className="orb orb-4" />
    </div>
  );
}

/* ── Daily quote ── */
const QUOTES = [
  { text: "Setiap menit yang kamu habiskan untuk belajar adalah investasi untuk masa depanmu.", author: "Anonim" },
  { text: "Belajar bukan tentang seberapa cepat, tapi seberapa dalam kamu memahami.", author: "Pepatah" },
  { text: "Sukses adalah hasil dari persiapan, kerja keras, dan belajar dari kegagalan.", author: "Colin Powell" },
  { text: "Orang yang berhenti belajar adalah orang yang sudah tua.", author: "Henry Ford" },
  { text: "Ilmu adalah cahaya, kebodohan adalah kegelapan.", author: "Pepatah Arab" },
  { text: "Jangan hitung hari-harimu, jadikan hari-harimu terhitung.", author: "Muhammad Ali" },
  { text: "Kegagalan adalah kesempatan untuk memulai lagi dengan lebih cerdas.", author: "Henry Ford" },
];

/* ── Quick Notes ── */
function QuickNotes() {
  const [notes, setNotes] = useState(() => getItem<string>(STORAGE.notes, ""));
  useEffect(() => { setItem(STORAGE.notes, notes); }, [notes]);
  return (
    <div className="notes-card glass-card">
      <p className="notes-title">📝 Catatan Cepat <span className="notes-hint">— tersimpan otomatis</span></p>
      <textarea className="notes-area" rows={3} placeholder="Tulis catatan, ide, atau hal penting di sini..."
        value={notes} onChange={e => setNotes(e.target.value)} />
    </div>
  );
}

/* ── Visitor Counter ── */
function VisitorCounter() {
  const [count, setCount] = useState(0);
  const [pop, setPop] = useState(false);
  useEffect(() => {
    const prev = getItem<number>(STORAGE.visits, 0);
    setItem(STORAGE.visits, prev + 1);
    setCount(prev + 1); setPop(true); setTimeout(() => setPop(false), 700);
  }, []);
  return (
    <div className="visitor-bar glass-card">
      <span>👁</span>
      <span>Halaman ini telah dikunjungi <strong className={pop ? "count-pop" : ""}>{count.toLocaleString("id-ID")}</strong> kali</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   APP ROOT
══════════════════════════════════════════════════════ */
export default function App() {
  const { theme, toggleTheme } = useTheme();
  const streak  = useStreak();
  const quote   = QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length];

  /* ── Core state ── */
  const [mode,       setMode]       = useState<"focus" | "break">("focus");
  const [lockdown,   setLockdown]   = useState(false);
  const [xp,         setXp]         = useState(() => getItem<number>(STORAGE.xp, 0));
  const [sessions,   setSessions]   = useState(() => getItem<number>(STORAGE.sessions, 0));
  const [unlocked,   setUnlocked]   = useState<string[]>(() => getItem<string[]>(STORAGE.achievements, []));
  const [newBadge,   setNewBadge]   = useState<string | null>(null);
  const [focusTarget,setFocusTarget]= useState(() => getItem<number>(STORAGE.focusTarget, 6));
  const prevLevelRef = useRef(getLevelInfo(xp).levelIdx);

  /* ── UI state ── */
  const [toasts,       setToasts]       = useState<Toast[]>([]);
  const [focusModeOn,  setFocusModeOn]  = useState(false);
  const [showShortcuts,setShowShortcuts]= useState(false);
  const [showOnboard,  setShowOnboard]  = useState(() => !getItem<boolean>(STORAGE.onboarded, false));
  const [levelUpData,  setLevelUpData]  = useState<{ emoji: string; name: string } | null>(null);

  /* ── Toast ── */
  const showToast = useCallback((msg: string, type: Toast["type"] = "info") => {
    const id = ++_toastId;
    setToasts(prev => [...prev.slice(-4), { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);
  const removeToast = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);

  /* ── Keyboard global ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "?" || e.key === "/") { e.preventDefault(); setShowShortcuts(s => !s); }
      if (e.key === "f" || e.key === "F") { e.preventDefault(); setFocusModeOn(s => !s); }
      if (e.key === "t" || e.key === "T") { e.preventDefault(); toggleTheme(); }
      if (e.key === "Escape") { setShowShortcuts(false); setFocusModeOn(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleTheme]);

  /* ── Onboarding done ── */
  const doneOnboarding = useCallback(() => {
    setShowOnboard(false);
    setItem(STORAGE.onboarded, true);
  }, []);

  /* ── Session complete ── */
  const onSessionComplete = (minutes: number, completedMode: "focus" | "break") => {
    if (completedMode !== "focus") { showToast("Istirahat selesai! Ayo fokus kembali 💪", "info"); return; }
    const gain    = minutes * 2;
    const newXp   = xp + gain;
    const newSess = sessions + 1;
    setXp(newXp);   setItem(STORAGE.xp, newXp);
    setSessions(newSess); setItem(STORAGE.sessions, newSess);

    const data = getItem<Record<string, number>>(STORAGE.stats, {});
    data[today()] = (data[today()] || 0) + minutes;
    setItem(STORAGE.stats, data);

    // Level-up check
    const newLevelInfo = getLevelInfo(newXp);
    if (newLevelInfo.levelIdx > prevLevelRef.current) {
      prevLevelRef.current = newLevelInfo.levelIdx;
      setLevelUpData({ emoji: newLevelInfo.current.emoji, name: newLevelInfo.current.name });
    }

    // Badges
    const streakData = getItem<{ lastDate: string; count: number }>(STORAGE.streak, { lastDate: "", count: 0 });
    const totalTasksDone = getItem<number>("ssw_total_tasks_done", 0);
    const dailySessions  = getItem<number>(`ssw_dsess_${today()}`, 0) + 1;
    setItem(`ssw_dsess_${today()}`, dailySessions);
    const newly = checkAchievements({
      sessions: newSess, streak: streakData.count,
      totalTasksDone, dailySessionsDone: dailySessions,
      dailyTasksDone: getDailyTasksDone(),
      hour: new Date().getHours(), xp: newXp,
    }, unlocked);
    if (newly.length > 0) {
      const all = [...unlocked, ...newly];
      setUnlocked(all); setItem(STORAGE.achievements, all);
      const a = ACHIEVEMENTS.find(x => x.id === newly[0]);
      if (a) { setNewBadge(newly[0]); showToast(`${a.emoji} Pencapaian baru: ${a.name}!`, "success"); setTimeout(() => setNewBadge(null), 4000); }
    }

    const msg = newSess % 4 === 0
      ? "🌿 4 sesi! Ambil istirahat panjang sekarang."
      : `🎯 Sesi ${newSess} selesai! +${gain} XP`;
    showToast(msg, "success");
  };

  const onTaskDone = useCallback(() => {
    incDailyTasksDone();
    const total = getItem<number>("ssw_total_tasks_done", 0) + 1;
    setItem("ssw_total_tasks_done", total);
    const newXp = xp + 10; setXp(newXp); setItem(STORAGE.xp, newXp);
    showToast("Tugas selesai! +10 XP ⚡", "success");

    // check speedrun badge
    if (getDailyTasksDone() >= 5 && !unlocked.includes("speedrun")) {
      const all = [...unlocked, "speedrun"];
      setUnlocked(all); setItem(STORAGE.achievements, all);
      showToast("⚡ Pencapaian baru: Speedrun!", "success");
    }
  }, [xp, unlocked, showToast]);

  /* ── Today's sessions count ── */
  const todaySessions = getItem<number>(`ssw_dsess_${today()}`, 0);

  return (
    <AppCtx.Provider value={{ mode, theme, toggleTheme, lockdown, setLockdown, showToast, focusModeOn }}>
      <div className={`app-root${focusModeOn ? " app-root--focus" : ""}`} data-theme={theme} data-mode={mode}>
        <BgOrbs mode={mode} />
        <CursorGlow theme={theme} />
        <ToastContainer toasts={toasts} remove={removeToast} />

        {showOnboard && <OnboardingModal onDone={doneOnboarding} />}
        {showShortcuts && <ShortcutModal onClose={() => setShowShortcuts(false)} />}
        {levelUpData && <LevelUpModal emoji={levelUpData.emoji} name={levelUpData.name} onClose={() => setLevelUpData(null)} />}

        {/* Header */}
        <header className="app-header glass-card focus-hide">
          <div className="app-logo">
            <span className="logo-icon">📚</span>
            <div>
              <h1 className="app-title">Safestudywork</h1>
              <p className="app-subtitle">Pomodoro Timer &amp; To-Do List untuk Pelajar Indonesia</p>
            </div>
          </div>
          <div className="header-right">
            {/* Focus target */}
            <div className="focus-target-badge" title="Target sesi harian">
              <span className="ft-icon">🎯</span>
              <span className="ft-text">{todaySessions}/{focusTarget}</span>
              <button className="ft-adj" onClick={() => { const n = Math.max(1, focusTarget - 1); setFocusTarget(n); setItem(STORAGE.focusTarget, n); }}>−</button>
              <button className="ft-adj" onClick={() => { const n = Math.min(20, focusTarget + 1); setFocusTarget(n); setItem(STORAGE.focusTarget, n); }}>+</button>
            </div>
            {streak > 0 && (
              <div className="streak-badge" title={`${streak} hari berturut-turut!`}>
                <span>{streak >= 7 ? "🔥" : streak >= 3 ? "⚡" : "✨"}</span>
                <strong>{streak}</strong>
                <span className="streak-label">hari</span>
              </div>
            )}
            <button className="icon-btn" onClick={() => setShowShortcuts(true)} title="Shortcut (?)">⌨️</button>
            <button className="theme-toggle" onClick={toggleTheme}>
              <span className="theme-track"><span className="theme-thumb" /></span>
              <span>{theme === "dark" ? "🌙" : "☀️"}</span>
            </button>
          </div>
        </header>

        {/* Quote */}
        <div className="quote-banner glass-card focus-hide">
          <span className="quote-icon">💬</span>
          <div>
            <p className="quote-text">"{quote.text}"</p>
            <p className="quote-author">— {quote.author}</p>
          </div>
        </div>

        {/* Focus mode hint */}
        {focusModeOn && (
          <div className="focus-mode-hint">
            Tekan <kbd>F</kbd> atau <kbd>Esc</kbd> untuk keluar mode fokus
          </div>
        )}

        {/* Main grid */}
        <main className="app-main">
          <div className="timer-col">
            <Timer
              onModeChange={setMode}
              onSessionComplete={onSessionComplete}
              focusTarget={focusTarget}
              todaySessions={todaySessions}
            />
          </div>
          <div className="todo-col focus-hide">
            <TodoList onTaskDone={onTaskDone} />
          </div>
        </main>

        <Soundscape />
        <Stats xp={xp} sessions={sessions} unlocked={unlocked} newBadge={newBadge} />
        <QuickNotes />
        <VisitorCounter />
        <SupportFooter />
      </div>
    </AppCtx.Provider>
  );
}
