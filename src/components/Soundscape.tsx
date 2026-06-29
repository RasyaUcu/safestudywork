import { useState, useEffect } from "react";
import { audioEngine, type AmbientType } from "../lib/audio";
import { getItem, setItem, STORAGE } from "../lib/store";

const SOUNDS: { type: AmbientType; label: string; icon: string }[] = [
  { type: "rain",  label: "Hujan",  icon: "🌧" },
  { type: "ocean", label: "Ombak",  icon: "🌊" },
  { type: "cafe",  label: "Kafe",   icon: "☕" },
];

export default function Soundscape() {
  const [active, setActive] = useState<AmbientType | null>(() =>
    getItem<AmbientType | null>(STORAGE.soundType, null)
  );
  const [vol, setVol] = useState(() => getItem<number>(STORAGE.soundVol, 0.3));
  const [enabled, setEnabled] = useState(() => getItem<boolean>(STORAGE.soundEnabled, false));

  useEffect(() => {
    setItem(STORAGE.soundVol, vol);
    if (active && enabled) audioEngine.setVolume(vol);
  }, [vol, active, enabled]);

  useEffect(() => {
    setItem(STORAGE.soundEnabled, enabled);
    setItem(STORAGE.soundType, active);
    if (enabled && active) {
      audioEngine.startAmbient(active, vol);
    } else {
      audioEngine.stopAmbient();
    }
  }, [enabled, active, vol]);

  const toggle = async (type: AmbientType) => {
    await audioEngine.resume();
    if (active === type && enabled) {
      setEnabled(false);
      setActive(null);
    } else {
      setActive(type);
      setEnabled(true);
    }
  };

  return (
    <div className="soundscape glass-card">
      <div className="soundscape-header">
        <p className="soundscape-title">🎵 Suara Fokus</p>
        {enabled && <span className="sound-playing-badge">● Memutar</span>}
      </div>
      <div className="sound-btns">
        {SOUNDS.map(s => (
          <button
            key={s.type}
            className={`sound-btn ${active === s.type && enabled ? "sound-btn--active" : ""}`}
            onClick={() => toggle(s.type)}
          >
            <span className="sound-icon">{s.icon}</span>
            <span className="sound-label">{s.label}</span>
          </button>
        ))}
      </div>
      <div className="sound-vol-row">
        <span className="sound-vol-icon">🔈</span>
        <input
          type="range" min={0} max={1} step={0.05}
          className="sound-vol-slider"
          value={vol}
          onChange={e => setVol(Number(e.target.value))}
        />
        <span className="sound-vol-icon">🔊</span>
      </div>
    </div>
  );
}
