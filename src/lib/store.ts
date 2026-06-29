export interface SubTask {
  id: string;
  text: string;
  done: boolean;
}

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  priority: "high" | "mid" | "low";
  tag: "school" | "task" | "personal" | null;
  dueDate: string | null;
  createdAt: number;
  subtasks: SubTask[];
  notes: string;
  estimate: number | null;
}

export interface SessionEntry {
  id: string;
  mode: "focus" | "break";
  name: string;
  startTime: number;
  endTime: number;
  minutes: number;
}

export const STORAGE = {
  todos:          "ssw_todos",
  visits:         "ssw_visits",
  theme:          "ssw_theme",
  sessions:       "ssw_sessions",
  focusMin:       "ssw_focus_min",
  breakMin:       "ssw_break_min",
  streak:         "ssw_streak",
  stats:          "ssw_stats",
  notes:          "ssw_notes",
  xp:             "ssw_xp",
  achievements:   "ssw_achievements",
  sessionLog:     "ssw_session_log",
  soundEnabled:   "ssw_sound_enabled",
  soundType:      "ssw_sound_type",
  soundVol:       "ssw_sound_vol",
  autoStart:      "ssw_auto_start",
  chimeEnabled:   "ssw_chime",
  focusTarget:    "ssw_focus_target",
  onboarded:      "ssw_onboarded",
  overtime:       "ssw_overtime",
} as const;

export function getItem<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export function setItem(key: string, val: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* noop */ }
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function fmtTime(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getDailyTasksDone(): number {
  return getItem<number>(`ssw_daily_tasks_${today()}`, 0);
}
export function incDailyTasksDone(): void {
  const k = `ssw_daily_tasks_${today()}`;
  setItem(k, getItem<number>(k, 0) + 1);
}
