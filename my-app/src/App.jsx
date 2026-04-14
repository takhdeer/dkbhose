import { useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword
} from "firebase/auth";
import { Eye, EyeOff, LogIn, Search, UserPlus } from "lucide-react";
import Dashboard from "./Dashboard";
import { auth, db } from "./firebase";

const termOptions = [
  { value: "Fall 2026", label: "Fall 2026", code: "202604" },
  { value: "Winter 2027", label: "Winter 2027", code: "202701" }
];

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
    --danger: #f87171;
    --success: #22c55e;
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
  }

  input, select {
    width: 100%;
    padding: 14px 15px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.09);
    background: rgba(255,255,255,0.03);
    color: var(--text);
    outline: none;
    transition: 0.18s ease;
  }

  input:focus, select:focus {
    border-color: rgba(103,232,249,0.38);
    box-shadow: 0 0 0 3px rgba(103,232,249,0.08);
  }

  option {
    color: #050816;
    background: rgba(103,232,249,0.38);
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

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 8px;
  }

  .actions-single {
    grid-template-columns: 1fr;
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

  button:hover:not(:disabled) { transform: translateY(-1px); }
  button:disabled { opacity: 0.55; cursor: not-allowed; }

  .btn-signin,
  .btn-config {
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

  .btn-full {
    width: 100%;
  }

  .auth-error, .track-status.error, .notify-status.error {
    margin-top: 12px;
    color: var(--danger);
    font-size: 13px;
    font-weight: 700;
    text-align: center;
  }

  .track-status.success, .notify-status.success {
    margin-top: 12px;
    color: var(--success);
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

  .notify-config,
  .track-config {
    border-radius: 16px;
    border: 1px solid rgba(56,189,248,0.14);
    background: rgba(6, 20, 42, 0.52);
    padding: 20px;
  }

  .notify-title,
  .track-title {
    color: #38bdf8;
    font-size: 25px;
    font-weight: 700;
    margin-bottom: 2px;
  }

  .notify-subtext,
  .track-subtext {
    color: var(--muted);
    font-size: 13px;
    margin-bottom: 16px;
  }

  .notify-subtext a { color: #60a5fa; }

  @media (max-width: 480px) {
    .card { padding: 22px; border-radius: 20px; }
    .actions { grid-template-columns: 1fr; }
  }
`;

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function normalizePassword(value) {
  return value.replace(/\s+/g, "").trim();
}

function getTermCode(termLabel) {
  const match = termOptions.find((term) => term.value === termLabel);
  return match ? match.code : "";
}

function getFirebaseErrorMessage(error) {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "That email is already registered.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/user-not-found":
      return "No account found with that email.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
}

async function getSingleDocByField(collectionName, fieldName, value) {
  const q = query(collection(db, collectionName), where(fieldName, "==", value));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const firstDoc = snapshot.docs[0];
  return {
    id: firstDoc.id,
    ...firstDoc.data()
  };
}

async function getUserDocByEmail(email) {
  return getSingleDocByField("users", "email", normalizeEmail(email));
}

async function getUserDocByUsername(username) {
  return getSingleDocByField("users", "username", username.trim());
}

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

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete = "current-password"
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-wrap">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="toggle-visibility"
          onClick={() => setShowPassword((prev) => !prev)}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function StatusMessage({ status }) {
  if (!status) return null;
  return <div className={status.type === "success" ? `${status.scope} success` : `${status.scope} error`}>{status.text}</div>;
}

function SignInPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return form.email.trim() && form.password.trim();
  }, [form]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSignIn() {
    if (!canSubmit) {
      setStatus({ type: "error", text: "Please enter email and password.", scope: "auth-error" });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const normalizedEmail = normalizeEmail(form.email);
      await signInWithEmailAndPassword(auth, normalizedEmail, form.password);

      const userDoc = await getUserDocByEmail(normalizedEmail);

      navigate("/dashboard", {
        state: {
          username: userDoc?.username || normalizedEmail
        }
      });
    } catch (error) {
      setStatus({
        type: "error",
        text: getFirebaseErrorMessage(error),
        scope: "auth-error"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h1>Sign in</h1>
      <p>Enter your email and password, or create a new account.</p>

      <div className="field">
        <label htmlFor="signinEmail">Email</label>
        <input
          id="signinEmail"
          type="email"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          placeholder="Enter your email"
          autoComplete="email"
        />
      </div>

      <div className="field">
        <div className="label-header">
          <label htmlFor="signinPassword">Password</label>
          <button
            type="button"
            className="forgot-link"
            onClick={() => navigate("/reset")}
            disabled={loading}
          >
            Forgot password?
          </button>
        </div>

        <PasswordField
          id="signinPassword"
          label=""
          value={form.password}
          onChange={(e) => updateField("password", e.target.value)}
          placeholder="Enter your password"
        />
      </div>

      <div className="actions">
        <button
          className="btn-signin"
          type="button"
          onClick={handleSignIn}
          disabled={!canSubmit || loading}
        >
          <LogIn size={16} /> {loading ? "Signing in..." : "Sign in"}
        </button>

        <button
          className="btn-signup"
          type="button"
          onClick={() => navigate("/signup")}
          disabled={loading}
        >
          <UserPlus size={16} /> Sign up
        </button>
      </div>

      <StatusMessage status={status} />
    </Card>
  );
}

function SignUpPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validateForm() {
    if (!form.username.trim()) return "Please enter a username.";
    if (!form.name.trim()) return "Please enter your name.";
    if (!form.email.trim()) return "Please enter an email.";
    if (!form.password.trim()) return "Please enter a password.";
    if (!form.confirmPassword.trim()) return "Please confirm your password.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    return "";
  }

  async function handleCreateAccount() {
    const validationError = validateForm();

    if (validationError) {
      setStatus({ type: "error", text: validationError, scope: "auth-error" });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const normalizedEmail = normalizeEmail(form.email);

      const existingUsernameDoc = await getUserDocByUsername(form.username);
      if (existingUsernameDoc) {
        setStatus({
          type: "error",
          text: "That username is already taken.",
          scope: "auth-error"
        });
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        form.password
      );

      await addDoc(collection(db, "users"), {
        uid: userCredential.user.uid,
        username: form.username.trim(),
        name: form.name.trim(),
        email: normalizedEmail,
        app_password: "",
        createdAt: serverTimestamp()
      });

      navigate("/notify", {
        state: {
          username: form.username.trim(),
          email: normalizedEmail,
          newAccount: true
        }
      });
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        const existingUserDoc = await getUserDocByEmail(form.email);

        if (!existingUserDoc) {
          setStatus({
            type: "error",
            text: "This email already exists .",
            scope: "auth-error"
          });
        } else {
          setStatus({
            type: "error",
            text: "That email is already in use.",
            scope: "auth-error"
          });
        }
      } else {
        setStatus({
          type: "error",
          text: getFirebaseErrorMessage(error),
          scope: "auth-error"
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h1>Sign up</h1>
      <p>Create an account to track courses and receive notifications.</p>

      <div className="field">
        <label htmlFor="signupUsername">Username</label>
        <input
          id="signupUsername"
          type="text"
          value={form.username}
          onChange={(e) => updateField("username", e.target.value)}
          placeholder="Enter your username"
          autoComplete="username"
        />
      </div>

      <div className="field">
        <label htmlFor="signupName">Name</label>
        <input
          id="signupName"
          type="text"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Enter your name"
          autoComplete="name"
        />
      </div>

      <div className="field">
        <label htmlFor="signupEmail">Email</label>
        <input
          id="signupEmail"
          type="email"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          placeholder="Enter your email"
          autoComplete="email"
        />
      </div>

      <PasswordField
        id="signupPassword"
        label="Password"
        value={form.password}
        onChange={(e) => updateField("password", e.target.value)}
        placeholder="Enter your password"
        autoComplete="new-password"
      />

      <PasswordField
        id="confirmPassword"
        label="Confirm Password"
        value={form.confirmPassword}
        onChange={(e) => updateField("confirmPassword", e.target.value)}
        placeholder="Confirm your password"
        autoComplete="new-password"
      />

      <div className="actions actions-single">
        <button
          className="btn-signin btn-full"
          type="button"
          onClick={handleCreateAccount}
          disabled={loading}
        >
          <UserPlus size={16} /> {loading ? "Creating..." : "Create account"}
        </button>
      </div>

      <StatusMessage status={status} />
    </Card>
  );
}

function ResetPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleResetPassword() {
    setStatus(null);

    if (!email.trim()) {
      setStatus({
        type: "error",
        text: "Please enter your email.",
        scope: "auth-error"
      });
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, normalizeEmail(email));
      setStatus({
        type: "success",
        text: "Password reset email sent.",
        scope: "notify-status"
      });
    } catch (error) {
      setStatus({
        type: "error",
        text: getFirebaseErrorMessage(error),
        scope: "auth-error"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h1>Forgot password</h1>
      <p>Enter your email to receive a password reset link.</p>

      <div className="field">
        <label htmlFor="resetEmail">Email</label>
        <input
          id="resetEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          autoComplete="email"
        />
      </div>

      <div className="actions">
        <button
          className="btn-signin"
          type="button"
          onClick={handleResetPassword}
          disabled={loading}
        >
          <UserPlus size={16} /> {loading ? "Sending..." : "Reset password"}
        </button>

        <button
          className="btn-signup"
          type="button"
          onClick={() => navigate("/signin")}
          disabled={loading}
        >
          <LogIn size={16} /> Back to sign in
        </button>
      </div>

      <StatusMessage status={status} />
    </Card>
  );
}

function NotifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state?.username ?? "";
  const email = location.state?.email ?? "";

  const [notificationEmail, setNotificationEmail] = useState(email);
  const [notificationPassword, setNotificationPassword] = useState("");
  const [showBanner, setShowBanner] = useState(true);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSaveNotificationSettings() {
    const trimmedEmail = normalizeEmail(notificationEmail);
    const cleanedPassword = normalizePassword(notificationPassword);

    if (!trimmedEmail || !cleanedPassword) {
      setStatus({
        type: "error",
        text: "Please enter Gmail address and app password.",
        scope: "notify-status"
      });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("http://localhost:3001/api/configure-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          password: cleanedPassword
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setStatus({
          type: "error",
          text: "Email not configured.",
          scope: "notify-status"
        });
        setLoading(false);
        return;
      }

      const userDoc = await getUserDocByUsername(username);

      if (userDoc) {
        await updateDoc(doc(db, "users", userDoc.id), {
          app_password: cleanedPassword
        });
      }

      setStatus({
        type: "success",
        text: "Email configured successfully.",
        scope: "notify-status"
      });

      setTimeout(() => {
        navigate("/track", {
          state: {
            username,
            email: trimmedEmail
          }
        });
      }, 1000);
    } catch {
      setStatus({
        type: "error",
        text: "Email not configured.",
        scope: "notify-status"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      {showBanner && (
        <div className="notify-banner">
          <span>⚠ Email notifications not configured</span>
          <button
            className="notify-hide"
            type="button"
            onClick={() => setShowBanner(false)}
          >
            Hide
          </button>
        </div>
      )}

      <div className="notify-config">
        <div className="notify-title">Email Configuration</div>
        <div className="notify-subtext">
          Use Gmail with an{" "}
          <a
            href="https://support.google.com/accounts/answer/185833"
            target="_blank"
            rel="noreferrer"
          >
            App Password
          </a>
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

        <PasswordField
          id="notificationPassword"
          label="App Password"
          value={notificationPassword}
          onChange={(e) => setNotificationPassword(e.target.value)}
          placeholder="Enter your app password"
          autoComplete="new-password"
        />

        <button
          className="btn-config btn-full"
          type="button"
          onClick={handleSaveNotificationSettings}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Configuration"}
        </button>

        <StatusMessage status={status} />
      </div>
    </Card>
  );
}

function TrackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state?.username ?? "";
  const email = location.state?.email ?? "";

  const [form, setForm] = useState({
    name: "",
    crn: "",
    term: "Fall 2026"
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return form.name.trim() && form.crn.trim() && form.term.trim();
  }, [form]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleStartTracking() {
    console.log("email: ", email);
    const trimmedName = form.name.trim();
    const trimmedCrn = form.crn.trim();
    const termCode = getTermCode(form.term);

    if (!trimmedName || !trimmedCrn || !termCode) {
      setStatus({
        type: "error",
        text: "Please fill all fields.",
        scope: "track-status"
      });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const userDoc = await getUserDocByUsername(username);
      const appPassword = userDoc?.app_password || "";
      const accountEmail = userDoc?.email || email || "";

      const existingQuery = query(
        collection(db, "tracked_courses"),
        where("username", "==", username),
        where("term", "==", termCode),
        where("crn", "==", trimmedCrn)
      );

      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        setStatus({
          type: "error",
          text: "You are already tracking this course.",
          scope: "track-status"
        });
        setLoading(false);
        return;
      }

      await addDoc(collection(db, "tracked_courses"), {
        username,
        name: trimmedName,
        crn: trimmedCrn,
        term: termCode,
        email: accountEmail,
        app_password: appPassword,
        createdAt: serverTimestamp()
      });

      await fetch("http://localhost:3001/api/send-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: accountEmail,
          name: trimmedName,
          crn: trimmedCrn,
        }),
      });
      setStatus({
        type: "success",
        text: "Course saved. You will be notified when a seat opens.",
        scope: "track-status"
      });

      setForm({
        name: "",
        crn: "",
        term: "Fall 2026"
      });

      setTimeout(() => {
        navigate("/dashboard", {
          state: {
            username,
            term: termCode
          }
        });
      }, 1200);
    } catch {
      setStatus({
        type: "error",
        text: "Could not save course.",
        scope: "track-status"
      });
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
          <label htmlFor="trackName">Your Name</label>
          <input
            id="trackName"
            type="text"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Enter your name"
            autoComplete="name"
          />
        </div>

        <div className="field">
          <label htmlFor="trackCrn">Course CRN</label>
          <input
            id="trackCrn"
            type="text"
            value={form.crn}
            onChange={(e) => updateField("crn", e.target.value)}
            placeholder="e.g. 12345"
          />
        </div>

        <div className="field">
          <label htmlFor="trackTerm">Term</label>
          <select
            id="trackTerm"
            value={form.term}
            onChange={(e) => updateField("term", e.target.value)}
          >
            {termOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn-config btn-full"
          type="button"
          onClick={handleStartTracking}
          disabled={!canSubmit || loading}
        >
          <Search size={16} />
          {loading ? "Starting..." : "Start Tracking"}
        </button>

        <StatusMessage status={status} />

        <div style={{ marginTop: "16px" }}>
          <button
            className="btn-signup btn-full"
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
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}