import { useState, useEffect, useRef } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cyan: #38bdf8;
    --blue: #3b82f6;
    --indigo: #6366f1;
    --border: rgba(255,255,255,0.07);
    --border-focus: rgba(56,189,248,0.4);
    --surface: rgba(13,20,38,0.9);
    --surface2: rgba(255,255,255,0.03);
    --text-primary: #e2e8f0;
    --text-muted: #475569;
    --text-dim: #1e293b;
  }

  html, body { height: 100%; }

  body {
    background: #060d1a;
    font-family: 'Space Grotesk', sans-serif;
    min-height: 100vh;
    overflow-x: hidden;
  }

  #particle-canvas {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  .orb {
    position: fixed;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
  }

  .orb-tl {
    width: 700px; height: 700px;
    top: -300px; left: -200px;
    background: radial-gradient(circle, rgba(34,211,238,0.09) 0%, transparent 65%);
    animation: floatA 20s ease-in-out infinite alternate;
  }

  .orb-br {
    width: 600px; height: 600px;
    bottom: -250px; right: -150px;
    background: radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%);
    animation: floatB 25s ease-in-out infinite alternate;
  }

  @keyframes floatA { to { transform: translate(40px, 60px); } }
  @keyframes floatB { to { transform: translate(-40px, -50px); } }

  .page {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 16px;
  }

  /* ── Header ── */
  .header {
    text-align: center;
    margin-bottom: 36px;
    animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both;
  }

  .eyebrow {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--cyan);
    margin-bottom: 14px;
    opacity: 0.85;
  }

  .main-title {
    font-size: clamp(40px, 6vw, 68px);
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.05;
    letter-spacing: -0.025em;
    margin-bottom: 10px;
  }

  .main-title .accent {
    color: var(--cyan);
    text-shadow: 0 0 40px rgba(56,189,248,0.4);
  }

  .subtitle {
    font-size: 14px;
    color: var(--text-muted);
    font-weight: 300;
    letter-spacing: 0.01em;
  }

  /* ── Card ── */
  .card {
    width: 480px;
    max-width: 95vw;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 32px 36px;
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
    animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both;
    margin-bottom: 14px;
    position: relative;
    overflow: hidden;
  }

  .card::before {
    content: '';
    position: absolute;
    top: 0; left: 10%; right: 10%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(56,189,248,0.35), transparent);
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Banner ── */
  .banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: rgba(251,191,36,0.06);
    border: 1px solid rgba(251,191,36,0.18);
    border-radius: 10px;
    padding: 11px 14px;
    margin-bottom: 26px;
    font-size: 13px;
    color: #fbbf24;
  }

  .btn-banner {
    padding: 5px 14px;
    background: rgba(56,189,248,0.1);
    color: var(--cyan);
    border: 1px solid rgba(56,189,248,0.25);
    border-radius: 7px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.18s;
    white-space: nowrap;
  }

  .btn-banner:hover {
    background: rgba(56,189,248,0.18);
    border-color: rgba(56,189,248,0.45);
  }

  /* ── Section label ── */
  .section-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  /* ── Fields ── */
  .field { margin-bottom: 14px; }

  .field label {
    display: block;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 7px;
  }

  .field input {
    width: 100%;
    padding: 12px 15px;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    color: var(--text-primary);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 14px;
    outline: none;
    transition: all 0.18s;
    caret-color: var(--cyan);
  }

  .field input:hover:not(:disabled) {
    border-color: rgba(255,255,255,0.13);
    background: rgba(255,255,255,0.035);
  }

  .field input:focus {
    border-color: var(--border-focus);
    background: rgba(56,189,248,0.04);
    box-shadow: 0 0 0 3px rgba(56,189,248,0.07);
  }

  .field input::placeholder { color: #1e3347; }
  .field input:disabled { opacity: 0.35; cursor: not-allowed; }

  /* ── Submit button ── */
  .btn-primary {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #0891b2 0%, #3b82f6 50%, #6366f1 100%);
    background-size: 200% 200%;
    color: white;
    border: none;
    border-radius: 12px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.2s;
    margin-top: 6px;
    box-shadow: 0 4px 28px rgba(59,130,246,0.22), inset 0 1px 0 rgba(255,255,255,0.12);
    animation: gradAnim 5s ease infinite;
  }

  @keyframes gradAnim {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 36px rgba(59,130,246,0.32), inset 0 1px 0 rgba(255,255,255,0.12);
  }

  .btn-primary:active:not(:disabled) { transform: translateY(0); }

  .btn-primary:disabled {
    background: rgba(255,255,255,0.05);
    color: #1e3347;
    box-shadow: none;
    cursor: not-allowed;
    animation: none;
  }

  .btn-ghost {
    width: 100%;
    padding: 12px;
    background: transparent;
    color: var(--text-muted);
    border: 1px solid var(--border);
    border-radius: 11px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.18s;
    margin-top: 8px;
  }

  .btn-ghost:hover {
    color: #94a3b8;
    border-color: rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.03);
  }

  /* ── Email setup box ── */
  .setup-box {
    background: rgba(56,189,248,0.03);
    border: 1px solid rgba(56,189,248,0.1);
    border-radius: 14px;
    padding: 22px;
    margin-bottom: 26px;
  }

  .setup-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--cyan);
    margin-bottom: 5px;
  }

  .setup-hint {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 16px;
    line-height: 1.5;
  }

  .setup-hint a { color: #60a5fa; text-decoration: none; }
  .setup-hint a:hover { text-decoration: underline; }

  /* ── Loading ── */
  .loading-wrap { text-align: center; padding: 12px 0; }

  .spinner {
    width: 36px; height: 36px;
    border: 2px solid rgba(56,189,248,0.1);
    border-top-color: var(--cyan);
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
    margin: 0 auto 18px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .loading-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 5px;
    letter-spacing: -0.01em;
  }

  .loading-sub { font-size: 13px; color: var(--text-muted); margin-bottom: 22px; }

  .prog-track {
    height: 2px;
    background: rgba(255,255,255,0.05);
    border-radius: 999px;
    overflow: hidden;
  }

  .prog-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--cyan), var(--indigo));
    border-radius: 999px;
    transition: width 0.03s linear;
    box-shadow: 0 0 8px rgba(56,189,248,0.5);
  }

  .prog-pct {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
    text-align: right;
    margin-top: 7px;
  }

  /* ── Message ── */
  .msg-box {
    background: rgba(56,189,248,0.03);
    border: 1px solid rgba(56,189,248,0.1);
    border-radius: 12px;
    padding: 20px;
    white-space: pre-line;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    line-height: 1.9;
    color: #64748b;
    margin-bottom: 18px;
  }

  /* ── Monitor rows ── */
  .monitor-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 13px 15px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 11px;
    margin-bottom: 8px;
  }

  .monitor-crn {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: var(--cyan);
    margin-bottom: 3px;
  }

  .monitor-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
  .monitor-email { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
  .monitor-sent { font-size: 11px; color: #34d399; margin-top: 3px; }

  .btn-stop {
    padding: 5px 12px;
    background: rgba(239,68,68,0.07);
    color: #f87171;
    border: 1px solid rgba(239,68,68,0.2);
    border-radius: 7px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.18s;
    white-space: nowrap;
  }

  .btn-stop:hover { background: rgba(239,68,68,0.14); }

  /* ── Course cards ── */
  .course-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 8px;
    transition: border-color 0.2s;
  }

  .course-card.open { border-color: rgba(52,211,153,0.22); }

  .course-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 12px;
  }

  .course-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
  }

  .meta-tile {
    background: rgba(255,255,255,0.02);
    border-radius: 8px;
    padding: 9px 12px;
  }

  .meta-key {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 4px;
  }

  .meta-val {
    font-family: 'Space Mono', monospace;
    font-size: 17px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .meta-val.open  { color: #34d399; }
  .meta-val.closed { color: #f87171; }

  .course-foot {
    font-size: 10px;
    color: var(--text-dim);
    font-family: 'Space Mono', monospace;
    margin-top: 10px;
    border-top: 1px solid var(--border);
    padding-top: 8px;
  }

  .divider { height: 1px; background: var(--border); margin: 20px 0; }
`;

function ParticleCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let raf;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1 + 0.3,
      a: Math.random() * 0.35 + 0.08,
    }));
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56,189,248,${p.a})`;
        ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if (d < 110) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(56,189,248,${0.07 * (1 - d/110)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} id="particle-canvas" />;
}

export default function App() {
  const [name, setName] = useState("");
  const [crn, setCrn] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [showEmailSetup, setShowEmailSetup] = useState(false);
  const [monitors, setMonitors] = useState([]);
  const [courseInfo, setCourseInfo] = useState([]);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    checkServerHealth();
    loadDashboardData();
    const iv = setInterval(loadDashboardData, 30000);
    return () => clearInterval(iv);
  }, []);

  async function checkServerHealth() {
    try { const r = await fetch("http://localhost:3001/api/health"); const d = await r.json(); setEmailConfigured(d.emailConfigured); } catch {}
  }

  async function loadDashboardData() {
    try {
      const mr = await fetch("http://localhost:3001/api/monitors");
      const md = await mr.json();
      if (md.success) { setMonitors(md.monitors); setShowDashboard(md.monitors.length > 0); }
      const cr = await fetch("http://localhost:3001/api/course-info");
      setCourseInfo(await cr.json());
    } catch {}
  }

  async function configureEmail() {
    if (!email || !emailPassword) return;
    setLoading(true);
    try {
      const r = await fetch("http://localhost:3001/api/configure-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: emailPassword }) });
      const d = await r.json();
      if (d.success) { setEmailConfigured(true); setShowEmailSetup(false); setMessage("✅ Email configured!"); setTimeout(() => setMessage(""), 3000); }
      else setMessage(`❌ ${d.message}`);
    } catch (e) { setMessage(`❌ ${e.message}`); }
    finally { setLoading(false); }
  }

  async function handleSubmit() {
    setMessage(""); setProgress(0); setLoading(true);
    let p = 0;
    const iv = setInterval(() => { p += 2; if (p >= 100) p = 100; setProgress(p); }, 30);
    try {
      await addDoc(collection(db, "tracked_courses"), { name, crn, email, createdAt: new Date() });
      setTimeout(() => { clearInterval(iv); setLoading(false); setMessage(`✅ Tracking started!\n\nName: ${name}\nCRN: ${crn}\nEmail: ${email}\n\nYou'll be notified the moment a seat opens.`); }, 1500);
    } catch (err) { clearInterval(iv); setLoading(false); setMessage(`❌ Error: ${err.message}`); }
  }

  async function stopMonitor(id) {
    try { const r = await fetch(`http://localhost:3001/api/stop-monitor/${id}`, { method: "POST" }); const d = await r.json(); if (d.success) loadDashboardData(); } catch {}
  }

  function handleReset() { setName(""); setCrn(""); setEmail(""); setMessage(""); setProgress(0); }

  const canSubmit = name.trim() && crn.trim() && email.trim();

  return (
    <>
      <style>{styles}</style>
      <ParticleCanvas />
      <div className="orb orb-tl" />
      <div className="orb orb-br" />

      <div className="page">
        {/* Header */}
        <div className="header">
          <div className="eyebrow">Mount Royal University</div>
          <h1 className="main-title">Course <span className="accent">Seat</span> Tracker</h1>
          <p className="subtitle">Get notified the instant a seat opens in your course</p>
        </div>

        {/* Main card */}
        <div className="card">

          {!emailConfigured && (
            <div className="banner">
              <span>⚠ Email notifications not configured</span>
              <button className="btn-banner" onClick={() => setShowEmailSetup(!showEmailSetup)}>
                {showEmailSetup ? "Hide" : "Set up"}
              </button>
            </div>
          )}

          {showEmailSetup && (
            <div className="setup-box">
              <div className="setup-title">Email Configuration</div>
              <div className="setup-hint">
                Use Gmail with an <a href="https://support.google.com/accounts/answer/185833" target="_blank">App Password</a>
              </div>
              <div className="field">
                <label>Gmail address</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@gmail.com" type="email" />
              </div>
              <div className="field">
                <label>App password</label>
                <input value={emailPassword} onChange={e => setEmailPassword(e.target.value)} placeholder="xxxx xxxx xxxx xxxx" type="password" />
              </div>
              <button className="btn-primary" onClick={configureEmail} disabled={!email || !emailPassword || loading}>
                Save Configuration
              </button>
              <div className="divider" />
            </div>
          )}

          {!loading && !message && (
            <>
              <div className="section-label">Track a course</div>

              <div className="field">
                <label>Your Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" />
              </div>

              <div className="field">
                <label>Course CRN</label>
                <input value={crn} onChange={e => setCrn(e.target.value)} placeholder="e.g. 10234" />
              </div>

              <div className="field">
                <label>Notification Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email" disabled={emailConfigured} />
              </div>

              {!emailConfigured && (
                <div className="field">
                  <label>Gmail App Password</label>
                  <input value={emailPassword} onChange={e => setEmailPassword(e.target.value)} placeholder="xxxx xxxx xxxx xxxx" type="password" />
                </div>
              )}

              <button className="btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
                Start Tracking →
              </button>

              {showDashboard && (
                <button className="btn-ghost" onClick={() => setShowDashboard(!showDashboard)}>
                  {showDashboard ? "Hide" : "Show"} Dashboard
                </button>
              )}
            </>
          )}

          {loading && (
            <div className="loading-wrap">
              <div className="spinner" />
              <div className="loading-title">Saving...</div>
              <div className="loading-sub">Writing to Firestore database</div>
              <div className="prog-track">
                <div className="prog-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="prog-pct">{progress}%</div>
            </div>
          )}

          {!loading && message && (
            <>
              <div className="msg-box">{message}</div>
              <button className="btn-primary" onClick={handleReset}>Track Another Course →</button>
            </>
          )}
        </div>

        {/* Dashboard */}
        {showDashboard && monitors.length > 0 && (
          <div className="card">
            <div className="section-label">Active Monitors ({monitors.length})</div>
            {monitors.map(m => (
              <div className="monitor-row" key={m.id}>
                <div>
                  <div className="monitor-crn">CRN {m.crn}</div>
                  <div className="monitor-name">{m.name}</div>
                  <div className="monitor-email">{m.email}</div>
                  {m.notificationSent && <div className="monitor-sent">✓ Notification sent</div>}
                </div>
                {m.active && <button className="btn-stop" onClick={() => stopMonitor(m.id)}>Stop</button>}
              </div>
            ))}
          </div>
        )}

        {showDashboard && courseInfo.length > 0 && (
          <div className="card">
            <div className="section-label">Course Availability</div>
            {courseInfo.map((c, i) => (
              <div className={`course-card ${c.seatsAvailable > 0 ? "open" : ""}`} key={i}>
                <div className="course-name">{c.courseTitle}</div>
                <div className="course-grid">
                  <div className="meta-tile"><div className="meta-key">CRN</div><div className="meta-val">{c.crn}</div></div>
                  <div className="meta-tile"><div className="meta-key">Available</div><div className={`meta-val ${c.seatsAvailable > 0 ? "open" : "closed"}`}>{c.seatsAvailable}</div></div>
                  <div className="meta-tile"><div className="meta-key">Capacity</div><div className="meta-val">{c.capacity}</div></div>
                  <div className="meta-tile"><div className="meta-key">Enrolled</div><div className="meta-val">{c.enrollment}</div></div>
                </div>
                <div className="course-foot">Last checked: {c.lastChecked}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}