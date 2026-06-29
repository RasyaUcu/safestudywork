export interface LevelDef { name: string; min: number; emoji: string; }

export const LEVELS: LevelDef[] = [
  { name: "Pemula",    min: 0,    emoji: "🌱" },
  { name: "Pelajar",  min: 100,  emoji: "📖" },
  { name: "Cendekia", min: 300,  emoji: "🎓" },
  { name: "Ahli",     min: 600,  emoji: "⚡" },
  { name: "Master",   min: 1000, emoji: "🏆" },
  { name: "Guru",     min: 1500, emoji: "🌟" },
  { name: "Legenda",  min: 2200, emoji: "💎" },
  { name: "Elite",    min: 3000, emoji: "🔥" },
];

export interface LevelInfo {
  levelIdx: number;
  current: LevelDef;
  next: LevelDef | null;
  progress: number;
  prevLevelIdx: number;
}

export function getLevelInfo(xp: number): LevelInfo {
  let levelIdx = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].min) { levelIdx = i; break; }
  }
  const current = LEVELS[levelIdx];
  const next = LEVELS[levelIdx + 1] ?? null;
  const progress = next
    ? Math.min(100, ((xp - current.min) / (next.min - current.min)) * 100)
    : 100;
  return { levelIdx, current, next, progress, prevLevelIdx: levelIdx };
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  emoji: string;
}

export interface AchievementCheckData {
  sessions: number;
  streak: number;
  totalTasksDone: number;
  dailySessionsDone: number;
  dailyTasksDone: number;
  hour: number;
  xp: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first",     name: "Langkah Pertama",  desc: "Selesaikan sesi pertama",         emoji: "🌱" },
  { id: "streak3",   name: "Konsisten",         desc: "3 hari berturut-turut",            emoji: "⚡" },
  { id: "streak7",   name: "Tekun",             desc: "7 hari berturut-turut",            emoji: "🔥" },
  { id: "streak14",  name: "Disiplin",          desc: "14 hari berturut-turut",           emoji: "💫" },
  { id: "tasks10",   name: "Rajin",             desc: "Selesaikan 10 tugas",              emoji: "✅" },
  { id: "tasks25",   name: "Super Rajin",       desc: "Selesaikan 25 tugas",              emoji: "🌟" },
  { id: "tasks50",   name: "Produktif Banget",  desc: "Selesaikan 50 tugas",              emoji: "💪" },
  { id: "4day",      name: "Produktif",         desc: "4 sesi dalam sehari",              emoji: "🎯" },
  { id: "8day",      name: "Marathon",          desc: "8 sesi dalam sehari",              emoji: "🏃" },
  { id: "speedrun",  name: "Speedrun",          desc: "5 tugas selesai dalam sehari",     emoji: "⚡" },
  { id: "sessions25",name: "Veteran",           desc: "25 sesi total",                    emoji: "🎖️" },
  { id: "sessions50",name: "Elite",             desc: "50 sesi total",                    emoji: "🏅" },
  { id: "early",     name: "Early Bird",        desc: "Belajar sebelum jam 7 pagi",       emoji: "🌅" },
  { id: "night",     name: "Night Owl",         desc: "Belajar setelah jam 10 malam",     emoji: "🦉" },
  { id: "xp500",     name: "Cendekia XP",       desc: "Kumpulkan 500 XP",                 emoji: "🎓" },
  { id: "xp1000",    name: "Master XP",         desc: "Kumpulkan 1000 XP",                emoji: "🏆" },
  { id: "xp2000",    name: "Legenda XP",        desc: "Kumpulkan 2000 XP",                emoji: "💎" },
];

export function checkAchievements(
  data: AchievementCheckData,
  unlocked: string[],
): string[] {
  const newlyUnlocked: string[] = [];
  const checks: Record<string, boolean> = {
    first:      data.sessions >= 1,
    streak3:    data.streak >= 3,
    streak7:    data.streak >= 7,
    streak14:   data.streak >= 14,
    tasks10:    data.totalTasksDone >= 10,
    tasks25:    data.totalTasksDone >= 25,
    tasks50:    data.totalTasksDone >= 50,
    "4day":     data.dailySessionsDone >= 4,
    "8day":     data.dailySessionsDone >= 8,
    speedrun:   data.dailyTasksDone >= 5,
    sessions25: data.sessions >= 25,
    sessions50: data.sessions >= 50,
    early:      data.hour < 7 && data.sessions >= 1,
    night:      data.hour >= 22 && data.sessions >= 1,
    xp500:      data.xp >= 500,
    xp1000:     data.xp >= 1000,
    xp2000:     data.xp >= 2000,
  };
  for (const [id, met] of Object.entries(checks)) {
    if (met && !unlocked.includes(id)) newlyUnlocked.push(id);
  }
  return newlyUnlocked;
}
