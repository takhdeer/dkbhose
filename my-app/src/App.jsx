import React, { useState } from "react";

export default function App() {
  const [name, setName] = useState("");
  const [crn, setCrn] = useState("");
  const [email, setEmail] = useState("");
  const [JSESSIONIDCookie, setJSESSIONIDCookie] = useState("");
  const [MRUB9SSBPRODREGHACookie, setMRUB9SSBPRODREGHACookie] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);

  async function handleEnter() {
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, crn, email, JSESSIONIDCookie, MRUB9SSBPRODREGHACookie }),
      });
      const data = await response.json();
      setTimeout(() => {
        clearInterval(interval);
        setLoading(false);
        setMessage(data.success ? `Submitted!\n Name:  ${name}\n CRN:  ${crn}\n Email:  ${email}\n` : `Error: ${data.message}`);
      }, 1500);
    } catch (err) {
      clearInterval(interval);
      setLoading(false);
      setMessage("Failed to submit. " + err.message);
    }
  }

  const containerStyle = {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a", 
    fontFamily: "Sans-Serif",
  };

  const boxStyle = {
    backgroundColor: "#1e293b",
    padding: "30px",
    borderRadius: "16px",
    width: "480px",
    textAlign: "center",
    boxShadow: "0 25px 25px rgba(0,0,0,0.6)",
    color: "#e5e7eb",
  };

  const rowStyle = {
    display: "flex",
    alignItems: "center",
    marginBottom: "21px",
  };

  const labelStyle = {
    width: "80px",
    textAlign: "center",
    fontWeight: "6000",
    color: "#cbd5f5",
  };

  const inputStyle = {
    flex: 1,
    padding: "10px",
    borderRadius: "16px",
    border: "1px solid #334155",
    backgroundColor: "#0f172a",
    color: "#e5e7eb",
  };

  const buttonStyle = {
    padding: "10px 20px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "10px",
  };

  return (
    <div style={containerStyle}>
      <div style={boxStyle}>
        {/* Title */}
        <div
          style={{
            fontSize: "28px",
            fontWeight: "700",
            marginBottom: "20px",
            color: "#38bdf8",
          }}
        >
          MRU Registration
        </div>

        {!loading && message === "" && (
          <>
            <div style={rowStyle}>
              <div style={labelStyle}>Name:</div>
              <input
                style={inputStyle}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div style={rowStyle}>
              <div style={labelStyle}>CRN:</div>
              <input
                style={inputStyle}
                value={crn}
                onChange={(e) => setCrn(e.target.value)}
              />
            </div>

            <div style={rowStyle}>
              <div style={labelStyle}>Email:</div>
              <input
                style={inputStyle}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div style={rowStyle}>
              <div style={labelStyle}>JSESSIONID Cookie:</div>
              <input
                style={inputStyle}
                value={JSESSIONIDCookie}
                onChange={(e) => setJSESSIONIDCookie(e.target.value)}
              />
            </div>
            <div style={rowStyle}>
              <div style={labelStyle}>MRUB9SSBPRODREGHA Cookie:</div>
              <input
                style={inputStyle}
                value={MRUB9SSBPRODREGHACookie}
                onChange={(e) => setMRUB9SSBPRODREGHACookie(e.target.value)}
              />
            </div>
            <button style={buttonStyle} onClick={handleEnter}>
              Enter
            </button>
          </>
        )}

        {loading && (
          <>
            <div style={{ fontSize: "20px", marginBottom: "10px" }}>
              Loading...
            </div>
            <div>Please wait while we process your request.</div>

            {/* Loading Bar */}
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

        {!loading && message !== "" && (
          <>
            <div style={{ marginBottom: "20px", whiteSpace: "pre-line" }}>
          {message}
          </div>

            <button
              style={{ ...buttonStyle, backgroundColor: "#2563eb" }}
              onClick={() => {
                setName("");
                setCrn("");
                setEmail("");
                setJSESSIONIDCookie("");
                setMRUB9SSBPRODREGHACookie("");
                setMessage("");
              }}
            >
              New Entry
            </button>
          </>
        )}
      </div>
    </div>
  );
}
