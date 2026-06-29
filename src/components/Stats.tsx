import { useState, useEffect } from "react";
import { getItem, STORAGE, today } from "../lib/store";
import { getLevelInfo, ACHIEVEMENTS } from "../lib/xp";

/* ── Weekly Bar Chart ── */
function WeeklyChart() {
  const stats = getItem<Record<string, number>>(STORAGE.stats, {});
  const days = Array.from({ length: 7 }, (_, i) => {
    const d    = new Date(Date.now() - (6 - i) * 86400000);
    const key  = d.toISOString().slice(0, 10);
    const label = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"][d.getDay()];
    const mins  = stats[key] || 0;
    const sess  = Math.round(mins / 25) || 0;
    return { key, label, mins, sess };
  });
  const maxSess = Math.max(...days.map(d => d.sess), 1);
  const todayKey = today();

  return (
    <div className="weekly-chart-section">
      <p className="stats-section-title">📊 Aktivitas 7 Hari</p>
      <div className="weekly-chart">
        {days.map(d => (
          <div key={d.key} className={`week-col ${d.key === todayKey ? "week-col--today" : ""}`}>
            <span className="week-col-val">{d.sess > 0 ? d.sess : ""}</span>
            <div className="week-bar-wrap">
              <div className="week-bar"
                style={{ height: `${(d.sess / maxSess) * 100}%`, minHeight: d.sess > 0 ? 8 : 0 }}
              />
            </div>
            <span className="week-col-label">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Focus Score ── */
function FocusScore({ sessions }: { sessions: number }) {
  const todayData = getItem<Record<string, number>>(STORAGE.stats, {});
  const todayMins = todayData[today()] || 0;
  const todaySess = Math.round(todayMins / 25);
  const tasksDone = getItem<number>(`ssw_daily_tasks_${today()}`, 0);
  const score = Math.min(100, todaySess * 12 + tasksDone * 4);
  const grade = score >= 90 ? "S" : score >= 75 ? "A" : score >= 55 ? "B" : score >= 35 ? "C" : "D";
  const gradeColor = score >= 90 ? "#10d9a0" : score >= 75 ? "#7c6aff" : score >= 55 ? "#f59e0b" : score >= 35 ? "#fb923c" : "#ff4d6d";

  return (
    <div className="focus-score-section">
      <p className="stats-section-title">⚡ Skor Fokus Hari Ini</p>
      <div className="focus-score-row">
        <div className="focus-score-ring">
          <svg viewBox="0 0 80 80" className="score-svg">
            <circle cx="40" cy="40" r="32" fill="none" stroke="var(--track)" strokeWidth="7" />
            <circle cx="40" cy="40" r="32" fill="none"
              stroke={gradeColor} strokeWidth="7" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 32}`}
              strokeDashoffset={`${2 * Math.PI * 32 * (1 - score / 100)}`}
              style={{ transform: "rotate(-90deg)", transformOrigin: "40px 40px", transition: "stroke-dashoffset 1s ease" }}
            />
            <text x="40" y="36" textAnchor="middle" className="score-grade" fill={gradeColor} fontSize="18" fontWeight="900">{grade}</text>
            <text x="40" y="52" textAnchor="middle" className="score-num" fill="var(--text-dim)" fontSize="9" fontWeight="700">{score}pts</text>
          </svg>
        </div>
        <div className="focus-score-details">
          <div className="score-detail-row">
            <span className="score-detail-icon">🎯</span>
            <span className="score-detail-label">Sesi hari ini</span>
            <span className="score-detail-val">{todaySess}</span>
          </div>
          <div className="score-detail-row">
            <span className="score-detail-icon">✅</span>
            <span className="score-detail-label">Tugas selesai</span>
            <span className="score-detail-val">{tasksDone}</span>
          </div>
          <div className="score-detail-row">
            <span className="score-detail-icon">📚</span>
            <span className="score-detail-label">Total menit</span>
            <span className="score-detail-val">{todayMins}m</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Heatmap ── */
function Heatmap() {
  const stats = getItem<Record<string, number>>(STORAGE.stats, {});
  const days  = Array.from({ length: 28 }, (_, i) => {
    const d   = new Date(Date.now() - (27 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    return { key, min: stats[key] || 0 };
  });
  const maxMin = Math.max(...days.map(d => d.min), 1);
  return (
    <div className="heatmap-section">
      <p className="stats-section-title">📅 Aktivitas 4 Minggu</p>
      <div className="heatmap-week-labels">
        {["M","S","S","R","K","J","S"].map((l, i) => <span key={i} className="week-label">{l}</span>)}
      </div>
      <div className="heatmap-grid">
        {days.map(d => (
          <div key={d.key} className="heat-cell" title={`${d.key}: ${d.min} mnt`}
            style={{ "--intensity": d.min > 0 ? 0.25 + (d.min / maxMin) * 0.75 : 0.05 } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="heatmap-legend">
        <span className="legend-label">Kurang</span>
        {[0.1, 0.35, 0.6, 0.85, 1].map(v => (
          <div key={v} className="legend-cell" style={{ "--intensity": v } as React.CSSProperties} />
        ))}
        <span className="legend-label">Banyak</span>
      </div>
    </div>
  );
}

/* ── XP Panel ── */
function XPPanel({ xp }: { xp: number }) {
  const info = getLevelInfo(xp);
  return (
    <div className="xp-section">
      <div className="level-row">
        <span className="level-emoji">{info.current.emoji}</span>
        <div className="level-info">
          <p className="level-name">{info.current.name}</p>
          <p className="xp-count">{xp.toLocaleString("id-ID")} XP</p>
        </div>
        {info.next && (
          <div className="level-next">
            <span className="level-next-label">Selanjutnya</span>
            <span className="level-next-name">{info.next.emoji} {info.next.name}</span>
          </div>
        )}
      </div>
      <div className="xp-bar-wrap">
        <div className="xp-bar-fill" style={{ width: `${info.progress}%` }} />
      </div>
      <p className="xp-bar-label">
        {info.next ? `${info.next.min - xp} XP lagi ke ${info.next.name}` : "Level maksimal! 🎉"}
      </p>
    </div>
  );
}

/* ── Achievements ── */
function Achievements({ unlocked }: { unlocked: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? ACHIEVEMENTS : ACHIEVEMENTS.filter(a => unlocked.includes(a.id));
  return (
    <div className="achievements-section">
      <div className="achievements-header">
        <p className="stats-section-title">🏅 Pencapaian ({unlocked.length}/{ACHIEVEMENTS.length})</p>
        <button className="achiev-toggle" onClick={() => setExpanded(e => !e)}>
          {expanded ? "Sembunyikan" : `Lihat semua`}
        </button>
      </div>
      <div className="badges-grid">
        {visible.map(a => {
          const isUnlocked = unlocked.includes(a.id);
          return (
            <div key={a.id} className={`badge ${isUnlocked ? "badge--unlocked" : "badge--locked"}`} title={a.desc}>
              <span className="badge-emoji">{a.emoji}</span>
              <span className="badge-name">{a.name}</span>
              {!isUnlocked && <span className="badge-lock">🔒</span>}
            </div>
          );
        })}
        {visible.length === 0 && <p className="no-badges">Selesaikan sesi untuk membuka pencapaian!</p>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   STATS ROOT
══════════════════════════════════════════════════════ */
interface StatsProps {
  xp: number;
  sessions: number;
  unlocked: string[];
  newBadge: string | null;
}

export default function Stats({ xp, sessions, unlocked, newBadge }: StatsProps) {
  const [todayMin, setTodayMin] = useState(() => {
    const data = getItem<Record<string, number>>(STORAGE.stats, {});
    return data[today()] || 0;
  });

  useEffect(() => {
    const data = getItem<Record<string, number>>(STORAGE.stats, {});
    setTodayMin(data[today()] || 0);
  }, [sessions]);

  const hrs  = Math.floor(todayMin / 60);
  const mins = todayMin % 60;

  return (
    <div className="stats-root">
      {/* Stat cards */}
      <div className="stat-cards-row">
        <div className="stat-card glass-card">
          <span className="stat-icon">⏱</span>
          <div>
            <p className="stat-value">{hrs > 0 ? `${hrs}j ${mins}m` : `${mins}m`}</p>
            <p className="stat-label">Fokus hari ini</p>
          </div>
        </div>
        <div className="stat-card glass-card">
          <span className="stat-icon">🎯</span>
          <div>
            <p className="stat-value">{sessions}</p>
            <p className="stat-label">Total sesi</p>
          </div>
        </div>
        <div className="stat-card glass-card">
          <span className="stat-icon">⚡</span>
          <div>
            <p className="stat-value">{xp.toLocaleString("id-ID")} XP</p>
            <p className="stat-label">Total XP</p>
          </div>
        </div>
      </div>

      {/* Badge banner */}
      {newBadge && (() => {
        const a = ACHIEVEMENTS.find(x => x.id === newBadge);
        return a ? (
          <div className="newbadge-banner glass-card">
            {a.emoji} Pencapaian baru: <strong>{a.name}</strong>!
          </div>
        ) : null;
      })()}

      {/* Detail glass card */}
      <div className="stats-detail glass-card">
        <XPPanel xp={xp} />
        <div className="stats-divider" />
        <FocusScore sessions={sessions} />
        <div className="stats-divider" />
        <WeeklyChart />
        <div className="stats-divider" />
        <Heatmap />
        <div className="stats-divider" />
        <Achievements unlocked={unlocked} />
      </div>
    </div>
  );
}
