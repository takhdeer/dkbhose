import { useState } from "react";

export default function App() {
  // State (Form Inputs)
  const [name, setName] = useState("");
  const [crn, setCrn] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  
  // Cookies
  const [JSESSIONIDCookie, setJSESSIONIDCookie] = useState("");
  const [MRUB9SSBPRODREGHACookie, setMRUB9SSBPRODREGHACookie] = useState("");

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
      const response = await fetch("http://localhost:3001/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          name, 
          crn, 
          email, 
          JSESSIONIDCookie, 
          MRUB9SSBPRODREGHACookie 
        }),
      });
      const data = await response.json();
      setTimeout(() => {
        clearInterval(interval);
        setLoading(false);
        setMessage(
          data.success 
            ? `Submitted!\nName: ${name}\nCRN: ${crn}\nEmail: ${email}\n\nCourse getter is running and writing to classInfo.json` 
            : `Error: ${data.message}`
        );
      }, 1500);
    } catch (err) {
      clearInterval(interval);
      setLoading(false);
      setMessage(`Error: ${err.message}\n\nMake sure the server is running on http://localhost:3001`);
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

  // Styles (Inline)
  const containerStyle = {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
    fontFamily: "Sans-Serif",
    padding: "16px",
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

  // Derived Values
  const canSubmit = name.trim() && crn.trim() && email.trim() && JSESSIONIDCookie.trim() && MRUB9SSBPRODREGHACookie.trim();

  return (
    <div style={containerStyle}>
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
              />
            </div>

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
    </div>
  );
}