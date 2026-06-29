import { useState, useEffect } from "react";

const ACTIVITIES = [
  "🧘 Tarik napas dalam 3x, rilekskan bahu",
  "💧 Minum segelas air putih sekarang",
  "👀 Lihat ke luar jendela 20 detik",
  "🤸 Angkat tangan, regangkan punggung",
  "😊 Tutup mata, istirahatkan pandangan",
  "🚶 Berdiri & jalan kaki sebentar",
  "🍎 Makan camilan sehat",
  "📵 Jauhkan HP dari meja belajar",
  "🎵 Dengarkan 1 lagu favorit",
  "💆 Pijat ringan pelipis & leher",
];

function BreathingGuide() {
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [secs, setSecs] = useState(4);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecs(s => {
        if (s <= 1) {
          setPhase(p => (p === "inhale" ? "hold" : p === "hold" ? "exhale" : "inhale"));
          return 4;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const labels: Record<string, string> = {
    inhale: "Tarik napas",
    hold:   "Tahan",
    exhale: "Hembuskan",
  };

  return (
    <div className="breathing-wrap">
      <div className={`breath-orb breath-orb--${phase}`} />
      <div className="breath-info">
        <p className="breath-label">{labels[phase]}</p>
        <p className="breath-secs">{secs}s</p>
      </div>
    </div>
  );
}

export default function BreakHelper({ visible }: { visible: boolean }) {
  const [activity, setActivity] = useState(ACTIVITIES[0]);
  const [aKey, setAKey] = useState(0);

  useEffect(() => {
    if (visible) {
      setActivity(ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)]);
      setAKey(k => k + 1);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="break-helper glass-card">
      <div className="break-helper-body">
        <div className="break-activity-side">
          <p className="break-helper-title">🌿 Waktu Istirahat</p>
          <p className="break-activity" key={aKey}>{activity}</p>
          <button className="spin-btn" onClick={() => {
            setActivity(ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)]);
            setAKey(k => k + 1);
          }}>
            🎲 Aktivitas lain
          </button>
        </div>
        <div className="break-breath-side">
          <p className="break-helper-title">💨 Pernapasan 4-4-4</p>
          <BreathingGuide />
        </div>
      </div>
    </div>
  );
}
