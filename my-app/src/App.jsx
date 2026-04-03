
import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
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

  .label-header label {
    margin-bottom: 0;
  }

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

  .forgot-link:hover {
    color: #fff;
  }

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

  .password-wrap {
    position: relative;
  }

  .password-wrap input {
    padding-right: 48px;
  }

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

  .message {
    margin-top: 16px;
    padding: 14px 15px;
    border-radius: 14px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    color: #cbd5e1;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-line;
  }

  .hint {
    margin-top: 12px;
    color: var(--muted);
    font-size: 12px;
  }

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

  .notify-subtext a {
    color: #60a5fa;
  }

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

  @media (max-width: 480px) {
    .card { padding: 22px; border-radius: 20px; }
    .actions { grid-template-columns: 1fr; }
  }
`;

export default function App() {
  const [page, setPage] = useState("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [notificationPassword, setNotificationPassword] = useState("");
  const [notifyConfigResult, setNotifyConfigResult] = useState(null);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showNotifyBanner, setShowNotifyBanner] = useState(true);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Enter your username and password to continue.");

  const canSubmit = username.trim().length > 0 && password.trim().length > 0;

  function goToSignUpPage() {
    setPage("signup");
    setPassword("");
    setConfirmPassword("");
    setShowAuthPassword(false);
    setAuthError("");
    setMessage("Create your account using username, password, and confirm password.");
  }

  function goToNotificationPage(statusMessage) {
    setPage("notify");
    setPassword("");
    setConfirmPassword("");
    setShowAuthPassword(false);
    setShowNotifyBanner(true);
    setNotifyConfigResult(null);
    setAuthError("");
    setMessage(statusMessage ?? "Set your email and email password to enable notifications.");
  }

  function goToResetPage() {
    setPage("reset");
    setPassword("");
    setConfirmPassword("");
    setShowAuthPassword(false);
    setAuthError("");
    setMessage("Reset your password with username, new password, and confirm password.");
  }

  function goToSignInPage() {
    setPage("signin");
    setPassword("");
    setConfirmPassword("");
    setShowAuthPassword(false);
    setAuthError("");
    setMessage("Enter your username and password to continue.");
  }

  async function handleCreateAccount() {
    setAuthError("");

    if (!username.trim()) {
      setMessage("Please enter a username.");
      return;
    }

    if (!password.trim() || !confirmPassword.trim()) {
      setMessage("Please enter password and confirm password.");
      return;
    }

    if (password !== confirmPassword) {
      setAuthError("Password and confirm password not matched");
      return;
    }

    goToNotificationPage(`Account created for ${username.trim()}.\nNow add your notification email settings.`);

    setLoading(true);
    try {
      await addDoc(collection(db, "users"), {
        username: username.trim(),
        createdAt: serverTimestamp(),
      });
    } catch {
      // Do not block navigation if Firestore write fails.
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveNotificationSettings() {
    const trimmedEmail = notificationEmail.trim();
    const normalizedAppPassword = notificationPassword.replace(/\s+/g, "").trim();

    if (!notificationEmail.trim() || !notificationPassword.trim()) {
      setMessage("Please enter notification email and password.");
      setNotifyConfigResult({ type: "error", text: "Email not configured" });
      return;
    }

    setLoading(true);
    setMessage("");
    setNotifyConfigResult(null);

    try {
      const configResponse = await fetch("http://localhost:3001/api/configure-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          password: normalizedAppPassword,
        }),
      });

      const configData = await configResponse.json();
      if (!configResponse.ok || !configData.success) {
        setNotifyConfigResult({ type: "error", text: "Email not configured" });
        setMessage(`Email not configured`);
        return;
      }

      await addDoc(collection(db, "notification_settings"), {
        username: username.trim(),
        email: trimmedEmail,
        createdAt: serverTimestamp(),
      });
      setNotifyConfigResult({ type: "success", text: "Email configured successfully" });
      setMessage("Notification settings saved. Email password was not stored.");
    } catch (error) {
      setNotifyConfigResult({ type: "error", text: "Email not configured" });
      setMessage(`Email not configured`);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    setAuthError("");

    if (!username.trim()) {
      setMessage("Please enter a username.");
      return;
    }

    if (!password.trim() || !confirmPassword.trim()) {
      setMessage("Please enter new password and confirm password.");
      return;
    }

    if (password !== confirmPassword) {
      setAuthError("Password and confirm password not matched");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await addDoc(collection(db, "password_resets"), {
        username: username.trim(),
        requestedAt: serverTimestamp(),
      });
      setMessage(`Password reset request saved for ${username.trim()}.\nPassword was not stored.`);
      setPage("signin");
      setPassword("");
      setConfirmPassword("");
      setShowAuthPassword(false);
    } catch (error) {
      setMessage(`Could not save reset request: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleSignIn() {
    if (!canSubmit) return;
    goToNotificationPage(`Signed in as ${username.trim()}.\nNow add your notification email settings.`);
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="card">
          <div className="eyebrow">MRU Course Tracker</div>
          {page !== "notify" && (
            <>
              <h1>
                {page === "signin"
                  ? "Sign in"
                  : page === "signup"
                    ? "Sign up"
                    : "Forgot password"}
              </h1>
              <p>
                {page === "signin"
                  ? "Enter your username and password, or click Sign up to open the registration page."
                  : page === "signup"
                    ? "Create your account with username, password, and confirm password."
                    : "Reset page: enter username, new password, and confirm password."}
              </p>
            </>
          )}

          {page !== "notify" && (
            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>
          )}

          {page !== "notify" && (
            <div className="field">
              {page === "signin" ? (
                <div className="label-header">
                  <label htmlFor="password">Password</label>
                  <button type="button" className="forgot-link" onClick={goToResetPage} disabled={loading}>
                    Forgot password?
                  </button>
                </div>
              ) : (
                <label htmlFor="password">Password</label>
              )}
              {page !== "signin" ? (
                <div className="password-wrap">
                  <input
                    id="password"
                    type={showAuthPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={page === "signup" ? "Enter your password" : "Enter your new password"}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowAuthPassword((prev) => !prev)}
                    aria-label={showAuthPassword ? "Hide password" : "Show password"}
                  >
                    {showAuthPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              ) : (
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              )}
            </div>
          )}

          {page !== "signin" && page !== "notify" && (
            <div className="field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-wrap">
                <input
                  id="confirmPassword"
                  type={showAuthPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowAuthPassword((prev) => !prev)}
                  aria-label={showAuthPassword ? "Hide password" : "Show password"}
                >
                  {showAuthPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {page === "notify" && (
            <>
              {showNotifyBanner && (
                <div className="notify-banner">
                  <span>⚠ Email notifications not configured</span>
                  <button className="notify-hide" type="button" onClick={() => setShowNotifyBanner(false)}>
                    Hide
                  </button>
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
                    onChange={(event) => setNotificationEmail(event.target.value)}
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
                    onChange={(event) => setNotificationPassword(event.target.value)}
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
              </div>
            </>
          )}

          {page === "signin" ? (
            <div className="actions">
              <button className="btn-signin" type="button" onClick={handleSignIn} disabled={!canSubmit || loading}>
                <LogIn size={16} />
                Sign in
              </button>
              <button className="btn-signup" type="button" onClick={goToSignUpPage} disabled={loading}>
                <UserPlus size={16} />
                Sign up
              </button>
            </div>
          ) : page === "signup" ? (
            <div className="actions actions-single">
              <button className="btn-signin btn-full" type="button" onClick={handleCreateAccount} disabled={loading}>
                <UserPlus size={16} />
                Create account
              </button>
            </div>
          ) : page === "reset" ? (
            <div className="actions">
              <button className="btn-signin" type="button" onClick={handleResetPassword} disabled={loading}>
                <UserPlus size={16} />
                Reset password
              </button>
              <button className="btn-signup" type="button" onClick={goToSignInPage} disabled={loading}>
                <LogIn size={16} />
                Back to sign in
              </button>
            </div>
          ) : null}

          {page === "signin" && (
            <div style={{ display: "none" }}>
              <button className="btn-signup" type="button" onClick={goToResetPage} disabled={loading} style={{ width: "100%" }}>
                Forgot password ?
              </button>
            </div>
          )}

          {page !== "notify" && authError && <div className="auth-error">{authError}</div>}

        </div>
      </div>
    </>
  );
}