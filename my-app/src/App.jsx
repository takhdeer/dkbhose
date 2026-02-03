import React, { useState } from "react";

export default function App() {
  const [name, setName] = useState("");
  const [crn, setCrn] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleEnter() {
    setMessage("");
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setMessage(`Submitted: Name = ${name}, CRN = ${crn}`);
    }, 1500);
  }

  const containerStyle = {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1e293b",
    fontFamily: "Arial",
  };

  const boxStyle = {
    backgroundColor: "#f1f5f9",
    padding: "30px",
    borderRadius: "12px",
    width: "300px",
    textAlign: "center",
    boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
  };

  const inputStyle = {
    width: "100%",
    padding: "8px",
    marginTop: "5px",
    marginBottom: "15px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  };

  const buttonStyle = {
    padding: "10px 20px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  };

  return (
    <div style={containerStyle}>
      <div style={boxStyle}>
        {!loading && message === "" && (
          <>
            <div>Name:</div>
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div>CRN:</div>
            <input
              style={inputStyle}
              value={crn}
              onChange={(e) => setCrn(e.target.value)}
            />

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
          </>
        )}

        {!loading && message !== "" && (
          <>
            <div style={{ marginBottom: "15px" }}>{message}</div>
            <button
              style={{ ...buttonStyle, backgroundColor: "#16a34a" }}
              onClick={() => {
                setName("");
                setCrn("");
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
