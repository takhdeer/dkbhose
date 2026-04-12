import { useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { Eye, EyeOff, LogIn, UserPlus, BookOpen, Search } from "lucide-react";
import Dashboard from "./Dgashboard";
import { db } from "./firebase";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; }
  * { margin: 0; }

  :root {
    --bg: #050816;
    --panel: rgba(10, 16, 30, 0.9);
    --border: rgba(255, 255, 255, 0.08);
    --text: #f8fafc;
    --muted: #94a3b8;
    --cyan: #67e8f9;
  }

  html, body, #root { min-height: 100%; }

  body {
    background:
      radial-gradient(circle at top left, rgba(103,232,249,0.14), transparent 28%),
      radial-gradient(circle at bottom right, rgba(96,165,250,0.12), transparent 30%),
      var(--bg);
    color: var(--text);
    font-family: 'Space Grotesk', sans-serif;
  }

  .app {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
  }

  .card {
    width: min(460px, 100%);
    padding: 30px;
    border-radius: 24px;
    background: var(--panel);
    border: 1px solid var(--border);
    box-shadow: 0 24px 80px rgba(1, 8, 24, 0.38);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
  }

  .eyebrow {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--cyan);
    margin-bottom: 14px;
    width: 100%;
  }

  h1 {
    font-size: clamp(30px, 5vw, 40px);
    line-height: 1.06;
    letter-spacing: -0.03em;
    margin-bottom: 10px;
    text-align: center;
  }

  p {
    color: var(--muted);
    line-height: 1.7;
    font-size: 14px;
    margin-bottom: 22px;
    text-align: center;
  }

  .field { margin-bottom: 14px; }

  label {
    display: block;
    margin-bottom: 8px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .label-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .label-header label { margin-bottom: 0; }

  .forgot-link {
    background: none;
    border: none;
    color: var(--cyan);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
    transition: color 0.18s ease;
  }

  .forgot-link:hover { color: #fff; }

  input {
    width: 100%;
    padding: 14px 15px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.09);
    background: rgba(255,255,255,0.03);
    color: var(--text);
    outline: none;
    transition: 0.18s ease;
  }

  input:focus {
    border-color: rgba(103,232,249,0.38);
    box-shadow: 0 0 0 3px rgba(103,232,249,0.08);
  }

  .password-wrap { position: relative; }
  .password-wrap input { padding-right: 48px; }

  .toggle-visibility {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 34px;
    height: 34px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.04);
    color: var(--muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .toggle-visibility:hover:not(:disabled) {
    color: var(--text);
    border-color: rgba(103,232,249,0.35);
    transform: translateY(-50%);
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 8px;
  }

  .actions-single {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  button {
    border: 0;
    border-radius: 14px;
    padding: 14px 16px;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    transition: transform 0.16s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  }

  .btn-signin {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #fff;
    background: linear-gradient(135deg, #0891b2 0%, #3b82f6 100%);
    box-shadow: 0 12px 28px rgba(59,130,246,0.28);
  }

  .btn-signup {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--text);
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
  }

  button:hover:not(:disabled) { transform: translateY(-1px); }
  button:disabled { opacity: 0.55; cursor: not-allowed; }

  .auth-error {
    margin-top: 12px;
    color: #f87171;
    font-size: 13px;
    font-weight: 700;
    text-align: center;
  }

  .notify-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid rgba(251,191,36,0.2);
    background: rgba(251,191,36,0.06);
    color: #fbbf24;
    font-size: 13px;
    font-weight: 600;
  }

  .notify-hide {
    padding: 7px 14px;
    border-radius: 10px;
    border: 1px solid rgba(56,189,248,0.26);
    background: rgba(56,189,248,0.08);
    color: var(--cyan);
    font-size: 12px;
    font-weight: 700;
  }

  .notify-config {
    border-radius: 16px;
    border: 1px solid rgba(56,189,248,0.14);
    background: rgba(6, 20, 42, 0.52);
    padding: 20px;
  }

  .notify-title {
    color: #38bdf8;
    font-size: 25px;
    font-weight: 700;
    margin-bottom: 2px;
  }

  .notify-subtext {
    color: var(--muted);
    font-size: 13px;
    margin-bottom: 16px;
  }

  .notify-subtext a { color: #60a5fa; }

  .btn-config {
    width: 100%;
    margin-top: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    background: linear-gradient(135deg, #0891b2 0%, #3b82f6 100%);
    box-shadow: 0 12px 28px rgba(59,130,246,0.28);
  }

  .btn-full {
    width: fit-content;
    min-width: 220px;
  }

  .notify-status {
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
  }

  .notify-status.success {
    color: #22c55e;
    background: rgba(34,197,94,0.09);
    border: 1px solid rgba(34,197,94,0.24);
  }

  .notify-status.error {
    color: #f87171;
    background: rgba(248,113,113,0.09);
    border: 1px solid rgba(248,113,113,0.26);
  }

  .track-config {
    border-radius: 16px;
    border: 1px solid rgba(56,189,248,0.14);
    background: rgba(6, 20, 42, 0.52);
    padding: 20px;
  }

  .track-title {
    color: #38bdf8;
    font-size: 25px;
    font-weight: 700;
    margin-bottom: 2px;
  }

  .track-subtext {
    color: var(--muted);
    font-size: 13px;
    margin-bottom: 16px;
  }

  .track-status {
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
  }

  .track-status.success {
    color: #22c55e;
    background: rgba(34,197,94,0.09);
    border: 1px solid rgba(34,197,94,0.24);
  }

  .track-status.error {
    color: #f87171;
    background: rgba(248,113,113,0.09);
    border: 1px solid rgba(248,113,113,0.26);
  }

  @media (max-width: 480px) {
    .card { padding: 22px; border-radius: 20px; }
    .actions { grid-template-columns: 1fr; }
  }
`;

// ─── Shared card shell ────────────────────────────────────────────────────────
function Card({ children }) {
  return (
    <div className="app">
      <div className="card">
        <div className="eyebrow">MRU Course Tracker</div>
        {children}
      </div>
    </div>
  );
}

// ─── /signin ──────────────────────────────────────────────────────────────────
function SignInPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = username.trim().length > 0 && password.trim().length > 0;

  async function handleSignIn() {
    if (!canSubmit) return;
    setLoading(true);
    setAuthError("");
    try {
      const q = query(collection(db, "users"), where("username", "==", username.trim()));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setAuthError("No account found with that username.");
        return;
      }
      navigate("/dashboard", { state: { username: username.trim() } });
    } catch {
      setAuthError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h1>Sign in</h1>
      <p>Enter your username and password, or click Sign up to register.</p>

      <div className="field">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          autoComplete="username"
        />
      </div>

      <div className="field">
        <div className="label-header">
          <label htmlFor="password">Password</label>
          <button type="button" className="forgot-link" onClick={() => navigate("/reset")} disabled={loading}>
            Forgot password?
          </button>
        </div>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
        />
      </div>

      <div className="actions">
        <button className="btn-signin" type="button" onClick={handleSignIn} disabled={!canSubmit || loading}>
          <LogIn size={16} /> Sign in
        </button>
        <button className="btn-signup" type="button" onClick={() => navigate("/signup")} disabled={loading}>
          <UserPlus size={16} /> Sign up
        </button>
      </div>

      {authError && <div className="auth-error">{authError}</div>}
    </Card>
  );
}

// ─── /signup ──────────────────────────────────────────────────────────────────
function SignUpPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreateAccount() {
    setAuthError("");
    if (!username.trim()) { setAuthError("Please enter a username."); return; }
    if (!password.trim() || !confirmPassword.trim()) { setAuthError("Please enter password and confirm password."); return; }
    if (password !== confirmPassword) { setAuthError("Password and confirm password do not match."); return; }

    setLoading(true);
    try {
      await addDoc(collection(db, "users"), {
        username: username.trim(),
        createdAt: serverTimestamp(),
      });
      navigate("/notify", { state: { username: username.trim(), newAccount: true } });
    } catch {
      setAuthError("Could not create account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h1>Sign up</h1>
      <p>Create your account with a username, password, and confirmation.</p>

      <div className="field">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          autoComplete="username"
        />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <div className="password-wrap">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="new-password"
          />
          <button type="button" className="toggle-visibility" onClick={() => setShowPassword((p) => !p)}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <div className="password-wrap">
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            autoComplete="new-password"
          />
          <button type="button" className="toggle-visibility" onClick={() => setShowPassword((p) => !p)}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div className="actions actions-single">
        <button className="btn-signin btn-full" type="button" onClick={handleCreateAccount} disabled={loading}>
          <UserPlus size={16} /> Create account
        </button>
      </div>

      {authError && <div className="auth-error">{authError}</div>}
    </Card>
  );
}

// ─── /reset ───────────────────────────────────────────────────────────────────
function ResetPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleResetPassword() {
    setAuthError("");
    if (!username.trim()) { setAuthError("Please enter a username."); return; }
    if (!password.trim() || !confirmPassword.trim()) { setAuthError("Please enter new password and confirm password."); return; }
    if (password !== confirmPassword) { setAuthError("Password and confirm password do not match."); return; }

    setLoading(true);
    try {
      await addDoc(collection(db, "password_resets"), {
        username: username.trim(),
        requestedAt: serverTimestamp(),
      });
      navigate("/signin");
    } catch (error) {
      setAuthError(`Could not save reset request: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h1>Forgot password</h1>
      <p>Enter your username, new password, and confirm to reset.</p>

      <div className="field">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          autoComplete="username"
        />
      </div>

      <div className="field">
        <label htmlFor="password">New Password</label>
        <div className="password-wrap">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your new password"
            autoComplete="new-password"
          />
          <button type="button" className="toggle-visibility" onClick={() => setShowPassword((p) => !p)}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <div className="password-wrap">
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            autoComplete="new-password"
          />
          <button type="button" className="toggle-visibility" onClick={() => setShowPassword((p) => !p)}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div className="actions">
        <button className="btn-signin" type="button" onClick={handleResetPassword} disabled={loading}>
          <UserPlus size={16} /> Reset password
        </button>
        <button className="btn-signup" type="button" onClick={() => navigate("/signin")} disabled={loading}>
          <LogIn size={16} /> Back to sign in
        </button>
      </div>

      {authError && <div className="auth-error">{authError}</div>}
    </Card>
  );
}

// ─── /notify ──────────────────────────────────────────────────────────────────
function NotifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state?.username ?? "";

  const [notificationEmail, setNotificationEmail] = useState("");
  const [notificationPassword, setNotificationPassword] = useState("");
  const [notifyConfigResult, setNotifyConfigResult] = useState(null);
  const [showBanner, setShowBanner] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleSaveNotificationSettings() {
    const trimmedEmail = notificationEmail.trim();
    const normalizedPassword = notificationPassword.replace(/\s+/g, "").trim();

    if (!trimmedEmail || !normalizedPassword) {
      setNotifyConfigResult({ type: "error", text: "Email not configured" });
      return;
    }

    setLoading(true);
    setNotifyConfigResult(null);

    try {
      const configResponse = await fetch("http://localhost:3001/api/configure-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password: normalizedPassword }),
      });

      const configData = await configResponse.json();
      if (!configResponse.ok || !configData.success) {
        setNotifyConfigResult({ type: "error", text: "Email not configured" });
        return;
      }

      await addDoc(collection(db, "notification_settings"), {
        username,
        email: trimmedEmail,
        createdAt: serverTimestamp(),
      });

      setNotifyConfigResult({ type: "success", text: "Email configured successfully" });

      // Navigate to track page after short delay
      setTimeout(() => {
        navigate("/track", { state: { username, email: trimmedEmail } });
      }, 1000);

    } catch {
      setNotifyConfigResult({ type: "error", text: "Email not configured" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      {showBanner && (
        <div className="notify-banner">
          <span>⚠ Email notifications not configured</span>
          <button className="notify-hide" type="button" onClick={() => setShowBanner(false)}>Hide</button>
        </div>
      )}

      <div className="notify-config">
        <div className="notify-title">Email Configuration</div>
        <div className="notify-subtext">
          Use Gmail with an <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noreferrer">App Password</a>
        </div>

        <div className="field">
          <label htmlFor="notificationEmail">Gmail Address</label>
          <input
            id="notificationEmail"
            type="email"
            value={notificationEmail}
            onChange={(e) => setNotificationEmail(e.target.value)}
            placeholder="your@gmail.com"
            autoComplete="email"
          />
        </div>

        <div className="field">
          <label htmlFor="notificationPassword">App Password</label>
          <input
            id="notificationPassword"
            type="password"
            value={notificationPassword}
            onChange={(e) => setNotificationPassword(e.target.value)}
            placeholder="Enter your app password"
            autoComplete="new-password"
          />
        </div>

        <button className="btn-config" type="button" onClick={handleSaveNotificationSettings} disabled={loading}>
          Save Configuration
        </button>

        {notifyConfigResult && (
          <div className={`notify-status ${notifyConfigResult.type}`}>
            {notifyConfigResult.text}
          </div>
        )}

        <div style={{ marginTop: "16px" }}>
          <button className="btn-signup" style={{ width: "100%" }} type="button" onClick={() => navigate("/track", { state: { username } })}>
            Skip for now →
          </button>
        </div>
      </div>
    </Card>
  );
}

// ─── /track ───────────────────────────────────────────────────────────────────
function TrackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state?.username ?? "";
  const email = location.state?.email ?? "";

  const [name, setName] = useState("");
  const [crn, setCrn] = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = name.trim().length > 0 && crn.trim().length > 0;

  async function handleStartTracking() {
    if (!canSubmit) return;
    setLoading(true);
    setTrackResult(null);
  
    try {
      await addDoc(collection(db, "tracked_courses"), {
        username,
        name: name.trim(),
        crn: crn.trim(),
        email,
        createdAt: serverTimestamp(),
      });
  
      setTrackResult({ type: "success", text: "Course saved! You will be notified when a seat opens." });
      setName("");
      setCrn("");
      setTimeout(() => {
        navigate("/dashboard", {state: { username } });
      }, 1500);
    } catch (err) {
      setTrackResult({ type: "error", text: "Could not save course." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="track-config">
        <div className="track-title">Track a Course</div>
        <div className="track-subtext">
          Enter your name and the CRN of the course you want to monitor.
        </div>

        <div className="field">
          <label htmlFor="name">Your Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            autoComplete="name"
          />
        </div>

        <div className="field">
          <label htmlFor="crn">Course CRN</label>
          <input
            id="crn"
            type="text"
            value={crn}
            onChange={(e) => setCrn(e.target.value)}
            placeholder="e.g. 12345"
          />
        </div>

        <button
          className="btn-config"
          type="button"
          onClick={handleStartTracking}
          disabled={!canSubmit || loading}
        >
          <Search size={16} style={{ marginRight: 8 }} />
          {loading ? "Starting..." : "Start Tracking"}
        </button>

        {trackResult && (
          <div className={`track-status ${trackResult.type}`}>
            {trackResult.text}
          </div>
        )}

        <div style={{ marginTop: "16px" }}>
          <button
            className="btn-signup"
            style={{ width: "100%" }}
            type="button"
            onClick={() => navigate("/signin")}
          >
            <LogIn size={16} /> Sign out
          </button>
        </div>
      </div>
    </Card>
  );
}

// ─── Root with router ─────────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      <style>{styles}</style>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SignInPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/reset" element={<ResetPage />} />
          <Route path="/notify" element={<NotifyPage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path ="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}