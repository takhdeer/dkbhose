import { useState, useEffect } from "react";

export default function App() {
  // Form State
  const [name, setName] = useState("");
  const [crn, setCrn] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  
  // Cookies
  const [JSESSIONIDCookie, setJSESSIONIDCookie] = useState("");
  const [MRUB9SSBPRODREGHACookie, setMRUB9SSBPRODREGHACookie] = useState("");
  
  // Email configuration
  const [emailPassword, setEmailPassword] = useState("");
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [showEmailSetup, setShowEmailSetup] = useState(false);
  
  // Dashboard data
  const [monitors, setMonitors] = useState([]);
  const [courseInfo, setCourseInfo] = useState([]);
  const [showDashboard, setShowDashboard] = useState(false);

  // Check server health and email config on mount
  useEffect(() => {
    checkServerHealth();
    loadDashboardData();
    
    // Refresh dashboard every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function checkServerHealth() {
    try {
      const response = await fetch("http://localhost:5000/api/health");
      const data = await response.json();
      setEmailConfigured(data.emailConfigured);
    } catch (error) {
      console.error("Server health check failed:", error);
    }
  }

  async function loadDashboardData() {
    try {
      // Load monitors
      const monitorsRes = await fetch("http://localhost:5000/api/monitors");
      const monitorsData = await monitorsRes.json();
      if (monitorsData.success) {
        setMonitors(monitorsData.monitors);
        setShowDashboard(monitorsData.monitors.length > 0);
      }
      
      // Load course info
      const courseRes = await fetch("http://localhost:5000/api/course-info");
      const courseData = await courseRes.json();
      setCourseInfo(courseData);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  }

  async function configureEmail() {
    if (!email || !emailPassword) {
      setMessage("Please enter both email and app password");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/configure-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: emailPassword }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEmailConfigured(true);
        setShowEmailSetup(false);
        setMessage("Email configured successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(` ${data.message}`);
      }
    } catch (error) {
      setMessage(` Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setMessage("");
    setProgress(0);
    setLoading(true);

    let p = 0;
    const interval = setInterval(() => {
      p += 2;
      if (p >= 100) p = 100;
      setProgress(p);
    }, 30);

    try {
      const response = await fetch("http://localhost:5000/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          crn, 
          email, 
          JSESSIONIDCookie, 
          MRUB9SSBPRODREGHACookie,
          emailPassword: !emailConfigured ? emailPassword : undefined
        }),
      });
      
      const data = await response.json();
      
      setTimeout(() => {
        clearInterval(interval);
        setLoading(false);
        setMessage(
          data.success 
            ? `Submitted!\nName: ${name}\nCRN: ${crn}\nEmail: ${email}\n\nCourse monitoring is now active!\nYou'll receive an email when seats become available.` 
            : `Error: ${data.message}`
        );
        
        if (data.success) {
          loadDashboardData();
        }
      }, 1500);
    } catch (err) {
      clearInterval(interval);
      setLoading(false);
      setMessage(`Error: ${err.message}\n\nMake sure the server is running on http://localhost:5000`);
    }
  }

  async function stopMonitor(monitorId) {
    try {
      const response = await fetch(`http://localhost:5000/api/stop-monitor/${monitorId}`, {
        method: "POST",
      });
      
      const data = await response.json();
      if (data.success) {
        loadDashboardData();
      }
    } catch (error) {
      console.error("Failed to stop monitor:", error);
    }
  }

  function handleReset() {
    setName("");
    setCrn("");
    setEmail("");
    setJSESSIONIDCookie("");
    setMRUB9SSBPRODREGHACookie("");
    setMessage("");
    setProgress(0);
  }

  // Styles (keeping your original styling)
  const containerStyle = {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    backgroundColor: "#0f172a",
    fontFamily: "Sans-Serif",
    padding: "16px",
    paddingTop: "40px",
  };

  const boxStyle = {
    backgroundColor: "#1e293b",
    padding: "30px",
    borderRadius: "16px",
    width: "620px",
    maxWidth: "95vw",
    textAlign: "center",
    boxShadow: "0 25px 25px rgba(0,0,0,0.6)",
    color: "#e5e7eb",
    marginBottom: "20px",
  };

  const rowStyle = {
    display: "flex",
    alignItems: "center",
    marginBottom: "18px",
    gap: "20px",
  };

  const labelStyle = {
    width: "180px",
    textAlign: "right",
    fontWeight: "700",
    color: "#cbd5f5",
    fontSize: "14px",
  };

  const inputStyle = {
    flex: 1,
    padding: "10px",
    borderRadius: "12px",
    border: "1px solid #334155",
    backgroundColor: "#0f172a",
    color: "#e5e7eb",
    outline: "none",
    fontSize: "14px",
  };

  const buttonStyle = {
    padding: "12px 24px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    marginTop: "10px",
    fontSize: "16px",
    fontWeight: "600",
    marginRight: "10px",
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#334155",
    cursor: "not-allowed",
  };

  const smallButtonStyle = {
    ...buttonStyle,
    padding: "6px 12px",
    fontSize: "12px",
    marginTop: "0",
    marginRight: "5px",
  };

  const canSubmit = name.trim() && crn.trim() && email.trim() && 
                    JSESSIONIDCookie.trim() && MRUB9SSBPRODREGHACookie.trim() &&
                    (emailConfigured || emailPassword.trim());

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: "1200px", width: "100%" }}>
        <div style={boxStyle}>
          <div
            style={{
              fontSize: "28px",
              fontWeight: "800",
              marginBottom: "18px",
              color: "#38bdf8",
            }}
          >
            MRU Course Registration
          </div>

          {/* Email Configuration Banner */}
          {!emailConfigured && (
            <div style={{
              backgroundColor: "#1e3a8a",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "14px",
            }}>
              ⚠️ Email not configured.{" "}
              <button 
                onClick={() => setShowEmailSetup(!showEmailSetup)}
                style={{
                  ...smallButtonStyle,
                  backgroundColor: "#3b82f6",
                }}
              >
                {showEmailSetup ? "Hide" : "Setup Email"}
              </button>
            </div>
          )}

          {/* Email Setup */}
          {showEmailSetup && (
            <div style={{
              backgroundColor: "#0f172a",
              padding: "20px",
              borderRadius: "10px",
              marginBottom: "20px",
              border: "1px solid #334155",
              textAlign: "left",
            }}>
              <div style={{ fontSize: "16px", fontWeight: "700", marginBottom: "10px", color: "#38bdf8" }}>
                Email Configuration
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "15px" }}>
                Use Gmail with an <a href="https://support.google.com/accounts/answer/185833" target="_blank" style={{color: "#60a5fa"}}>App Password</a>
              </div>
              <div style={rowStyle}>
                <div style={labelStyle}>Email:</div>
                <input
                  style={inputStyle}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@gmail.com"
                  type="email"
                />
              </div>
              <div style={rowStyle}>
                <div style={labelStyle}>App Password:</div>
                <input
                  style={inputStyle}
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="16-character app password"
                  type="password"
                />
              </div>
              <div style={{ textAlign: "center" }}>
                <button 
                  style={email && emailPassword ? buttonStyle : disabledButtonStyle}
                  onClick={configureEmail}
                  disabled={!email || !emailPassword || loading}
                >
                  Configure Email
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          {!loading && !message && (
            <>
              <div style={rowStyle}>
                <div style={labelStyle}>Name:</div>
                <input
                  style={inputStyle}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              <div style={rowStyle}>
                <div style={labelStyle}>CRN:</div>
                <input
                  style={inputStyle}
                  value={crn}
                  onChange={(e) => setCrn(e.target.value)}
                  placeholder="Enter course CRN"
                />
              </div>

              <div style={rowStyle}>
                <div style={labelStyle}>Email:</div>
                <input
                  style={inputStyle}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  type="email"
                  disabled={emailConfigured}
                />
              </div>

              {!emailConfigured && (
                <div style={rowStyle}>
                  <div style={labelStyle}>Email Password:</div>
                  <input
                    style={inputStyle}
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    placeholder="Gmail app password"
                    type="password"
                  />
                </div>
              )}

              <div style={rowStyle}>
                <div style={labelStyle}>JSESSIONID:</div>
                <input
                  style={inputStyle}
                  value={JSESSIONIDCookie}
                  onChange={(e) => setJSESSIONIDCookie(e.target.value)}
                  placeholder="Enter JSESSIONID cookie"
                />
              </div>

              <div style={rowStyle}>
                <div style={labelStyle}>MRUB9SSBPRODREGHA:</div>
                <input
                  style={inputStyle}
                  value={MRUB9SSBPRODREGHACookie}
                  onChange={(e) => setMRUB9SSBPRODREGHACookie(e.target.value)}
                  placeholder="Enter MRUB9SSBPRODREGHA cookie"
                />
              </div>

              <button 
                style={canSubmit ? buttonStyle : disabledButtonStyle} 
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                Submit
              </button>
              
              {showDashboard && (
                <button 
                  style={{...buttonStyle, backgroundColor: "#16a34a"}}
                  onClick={() => setShowDashboard(!showDashboard)}
                >
                  {showDashboard ? "Hide" : "Show"} Dashboard
                </button>
              )}
            </>
          )}

          {/* LOADING Bar */}
          {loading && (
            <>
              <div style={{ fontSize: "20px", marginBottom: "10px" }}>
                Loading...
              </div>
              <div>Please wait while we process your request.</div>

              <div style={{ marginTop: "20px", width: "100%" }}>
                <div
                  style={{
                    height: "10px",
                    backgroundColor: "#334155",
                    borderRadius: "999px",
                  }}
                >
                  <div
                    style={{
                      height: "10px",
                      width: `${progress}%`,
                      backgroundColor: "#38bdf8",
                      borderRadius: "999px",
                      transition: "width 0.03s linear",
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "12px",
                    color: "#cbd5f5",
                  }}
                >
                  {progress}%
                </div>
              </div>
            </>
          )}

          {/* Success/Error Message */}
          {!loading && message && (
            <>
              <div
                style={{
                  marginBottom: "18px",
                  whiteSpace: "pre-line",
                  textAlign: "center",
                  color: "#e5e7eb",
                  padding: "20px",
                  backgroundColor: "#0f172a",
                  borderRadius: "10px",
                }}
              >
                {message}
              </div>

              <button
                style={{ ...buttonStyle, backgroundColor: "#16a34a" }}
                onClick={handleReset}
              >
                New Entry
              </button>
            </>
          )}
        </div>

        {/* Dashboard */}
        {showDashboard && monitors.length > 0 && (
          <div style={boxStyle}>
            <div style={{ fontSize: "22px", fontWeight: "700", marginBottom: "15px", color: "#38bdf8" }}>
              Active Monitors ({monitors.length})
            </div>
            {monitors.map((monitor) => (
              <div
                key={monitor.id}
                style={{
                  backgroundColor: "#0f172a",
                  padding: "15px",
                  borderRadius: "8px",
                  marginBottom: "10px",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: "700" }}>{monitor.name} - CRN: {monitor.crn}</div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                      {monitor.email}
                    </div>
                    {monitor.notificationSent && (
                      <div style={{ fontSize: "12px", color: "#22c55e", marginTop: "4px" }}>
                         Notification sent
                      </div>
                    )}
                  </div>
                  {monitor.active && (
                    <button
                      onClick={() => stopMonitor(monitor.id)}
                      style={{...smallButtonStyle, backgroundColor: "#ef4444"}}
                    >
                      Stop
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Course Info */}
        {showDashboard && courseInfo.length > 0 && (
          <div style={boxStyle}>
            <div style={{ fontSize: "22px", fontWeight: "700", marginBottom: "15px", color: "#38bdf8" }}>
              Course Information
            </div>
            {courseInfo.map((course, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: "#0f172a",
                  padding: "15px",
                  borderRadius: "8px",
                  marginBottom: "10px",
                  textAlign: "left",
                  border: course.seatsAvailable > 0 ? "2px solid #22c55e" : "1px solid #334155",
                }}
              >
                <div style={{ fontWeight: "700", marginBottom: "8px" }}>
                  {course.courseTitle}
                </div>
                <div style={{ fontSize: "13px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                  <div><span style={{color: "#94a3b8"}}>CRN:</span> {course.crn}</div>
                  <div>
                    <span style={{color: "#94a3b8"}}>Seats:</span>{" "}
                    <span style={{ color: course.seatsAvailable > 0 ? "#22c55e" : "#ef4444", fontWeight: "700" }}>
                      {course.seatsAvailable}
                    </span>
                  </div>
                  <div><span style={{color: "#94a3b8"}}>Capacity:</span> {course.capacity}</div>
                  <div><span style={{color: "#94a3b8"}}>Enrolled:</span> {course.enrollment}</div>
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "8px" }}>
                  Last checked: {course.lastChecked}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
