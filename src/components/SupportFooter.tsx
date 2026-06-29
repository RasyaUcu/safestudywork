import { useState } from "react";

export default function SupportFooter() {
  const [open, setOpen] = useState(false);
  return (
    <footer className="support-footer">
      <div className="support-inner glass-card">
        <div className="support-header-row">
          <div>
            <h3 className="support-title">💛 Dukung Developer</h3>
            <p className="support-text">Bantu agar Safestudywork tetap gratis untuk semua pelajar!</p>
          </div>
          <button
            className={`support-btn ${open ? "support-btn--open" : ""}`}
            onClick={() => setOpen(o => !o)}
          >
            {open ? "✕ Tutup" : "❤️ Dukung"}
          </button>
        </div>
        <div className={`qr-panel ${open ? "qr-panel--open" : ""}`}>
          <div className="qr-inner">
            <div className="gopay-badge">
              <span className="gopay-icon">💚</span>
              <span className="gopay-label">GoPay</span>
              <span className="gopay-only-tag">Hanya GoPay</span>
            </div>
            <div className="qr-frame" style={{position:"relative"}}>
              <img
                src="/my-qr.png"
                alt="QR GoPay Donasi"
                className="qr-img"
                draggable={false}
                onContextMenu={e => e.preventDefault()}
                onError={e => {
                  (e.target as HTMLImageElement).style.display = "none";
                  const wrap = (e.target as HTMLImageElement).parentElement;
                  if (wrap && !wrap.querySelector(".qr-placeholder")) {
                    const ph = document.createElement("div");
                    ph.className = "qr-placeholder";
                    ph.innerHTML = `<span>📷</span><p>Tambahkan file QR GoPay kamu<br>dengan nama <code>my-qr.png</code><br>ke folder <code>public/</code></p>`;
                    wrap.appendChild(ph);
                  }
                }}
              />
              {/* transparent shield — blocks right-click save on the image */}
              <div
                style={{position:"absolute",inset:0,zIndex:1,cursor:"default"}}
                onContextMenu={e => e.preventDefault()}
              />
            </div>
            <p className="qr-text">Scan QR di atas untuk donasi via GoPay</p>
            <p className="qr-note">Terima kasih atas dukunganmu! 🙏</p>
          </div>
        </div>
      </div>
      <p className="footer-copy">© {new Date().getFullYear()} Safestudywork — Belajar Lebih Cerdas</p>
    </footer>
  );
}
