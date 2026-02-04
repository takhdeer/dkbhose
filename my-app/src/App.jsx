import { useState } from "react";

export default function App() {


  // State (Form Inputs)
  const [name, setName] = useState("");
  const [crn, setCrn] = useState("");
  const [email, setEmail] = useState("");
  // Second page
  const [fieldA, setFieldA] = useState("");
  const [fieldB, setFieldB] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Screens:
  // 1 = initial form
  // 2 = entered data + extra fields + buttons 
  const [step, setStep] = useState(1);

  // Links
  const LOGIN_URL =
    "https://auth.mtroyal.ca/authenticationendpoint/login.do?Name=PreLoginRequestProcessor&commonAuthCallerPath=%252Fcas%252Flogin&forceAuth=true&passiveAuth=false&service=https%3A%2F%2Fwww.mymru.ca%2F&tenantDomain=carbon.super&sessionDataKey=59e3d874-8766-4a02-8525-2e8a762e26c8&relyingParty=Luminis5-prod-www-mymru-CAS&type=cas&sp=Luminis5-prod-www-mymru-CAS&isSaaSApp=false&authenticators=BasicAuthenticator%3ALOCAL";

  const REG_URL =
    "https://ban9ssb-prod.mtroyal.ca/StudentRegistrationSsb/ssb/registration";

  
  // Handlers
  function handleEnter() {
    setProgress(0);
    setLoading(true);

    window.open(
      LOGIN_URL,
      "MRULogin",
      "width=520,height=720,noopener,noreferrer"
    );

    let p = 0;
    const interval = setInterval(() => {
      p += 2;
      if (p >= 100) p = 100;
      setProgress(p);
    }, 30);

    setTimeout(() => {
      clearInterval(interval);
      setLoading(false);
      setStep(2);
    }, 1600);
  }

  function resetAll() {
    setName("");
    setCrn("");
    setEmail("");
    setFieldA("");
    setFieldB("");
    setLoading(false);
    setProgress(0);
    setStep(1);
  }

  function openRegistrationPopup() {
    window.open(
      REG_URL,
      "MRURegistration",
      "width=1100,height=800,noopener,noreferrer"
    );
  }

  // Styles (Inline)

  const containerStyle = {
    height: "100vh",
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
    gap: "120px",
  };

  const labelStyle = {
    width: "110px",
    textAlign: "right",
    fontWeight: "700",
    color: "#cbd5f5",
  };

  const inputStyle = {
    flex: 1,
    padding: "10px",
    borderRadius: "12px",
    border: "1px solid #334155",
    backgroundColor: "#0f172a",
    color: "#e5e7eb",
    outline: "none",
  };

  const buttonStyle = {
    padding: "10px 18px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    marginTop: "10px",
  };

  const continueButtonStyle = { ...buttonStyle, backgroundColor: "#0ea5e9" };
  const newEntryButtonStyle = { ...buttonStyle, backgroundColor: "#16a34a" };
  const disabledButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#334155",
    cursor: "not-allowed",
  };

  // Derived Values
  const canSubmitStep1 = name.trim() && crn.trim() && email.trim();
  const canContinue = fieldA.trim() && fieldB.trim();

  const enteredDataPreview =
    `Entered Data:\n` +
    `Name: ${name}\n` +
    `CRN: ${crn}\n` +
    `Email: ${email}\n`;

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
          MRU Registration
        </div>

        {/* STEP 1: Form */}
        {!loading && step === 1 && (
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

            <button
              style={canSubmitStep1 ? buttonStyle : disabledButtonStyle}
              onClick={canSubmitStep1 ? handleEnter : undefined}
            >
              Enter
            </button>
          </>
        )}

        {/* LOADING Bar  */}
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

        {/* STEP 2 */}
        {!loading && step === 2 && (
          <>
            <div
              style={{
                marginBottom: "18px",
                whiteSpace: "pre-line",
                textAlign: "center",
                color: "#e5e7eb",
              }}
            >
              {enteredDataPreview}
            </div>

            <div style={rowStyle}>
              <div style={labelStyle}>JSESSIONID:</div>
              <input
                style={inputStyle}
                value={fieldA}
                onChange={(e) => setFieldA(e.target.value)}
              />
            </div>

            <div style={rowStyle}>
              <div style={labelStyle}>MRUB9SSBPRODREGHA:</div>
              <input
                style={inputStyle}
                value={fieldB}
                onChange={(e) => setFieldB(e.target.value)}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                style={canContinue ? continueButtonStyle : disabledButtonStyle}
                onClick={canContinue ? openRegistrationPopup : undefined}
              >
                Continue to Register (Popup)
              </button>

              <button style={newEntryButtonStyle} onClick={resetAll}>
                New Entry
              </button>
            </div>

            <div style={{ marginTop: "10px", fontSize: "12px", color: "#94a3b8" }}>
              Fill both fields to enable Continue.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
