import { useEffect } from "react";

interface Props {
  timeDisplay: string;
  mode: "focus" | "break";
  running: boolean;
  onToggle: () => void;
  onExit: () => void;
}

export default function Lockdown({ timeDisplay, mode, running, onToggle, onExit }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      if (e.code === "Space") { e.preventDefault(); onToggle(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onExit, onToggle]);

  return (
    <div className="lockdown-overlay" data-mode={mode}>
      <div className="lockdown-bg" />
      <div className="lockdown-content">
        <p className="lockdown-mode">{mode === "focus" ? "🎯 FOKUS" : "🌿 ISTIRAHAT"}</p>
        <div className="lockdown-digits">{timeDisplay}</div>
        <div className="lockdown-controls">
          <button className="lockdown-btn lockdown-btn--primary" onClick={onToggle}>
            {running ? "⏸ Jeda" : "▶ Mulai"}
          </button>
          <button className="lockdown-btn lockdown-btn--ghost" onClick={onExit}>
            Esc — Keluar
          </button>
        </div>
      </div>
    </div>
  );
}
