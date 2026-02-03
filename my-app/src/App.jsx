import React, { useState } from "react";

export default function App() {
  const [name, setName] = useState("");
  const [crn, setCrn] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleEnter() {
    setMessage("");
    setLoading(true);

    // Simulated loading action (replace with real request later)
    setTimeout(() => {
      setLoading(false);
      setMessage(`Submitted: Name = ${name}, CRN = ${crn}`);
    }, 1500);
  }

  return (
    <div>
      {!loading && message === "" && (
        <div>
          <div>Name:</div>
          <input value={name} onChange={(e) => setName(e.target.value)} />

          <div>CRN:</div>
          <input value={crn} onChange={(e) => setCrn(e.target.value)} />

          <div>
            <button onClick={handleEnter}>Enter</button>
          </div>
        </div>
      )}

      {loading && (
        <div>
          <div>Loading...</div>
          <div>Please wait while we process your request.</div>
        </div>
      )}

      {!loading && message !== "" && (
        <div>
          <div>{message}</div>
          <button
            onClick={() => {
              setName("");
              setCrn("");
              setMessage("");
            }}
          >
            New Entry
          </button>
        </div>
      )}
    </div>
  );
}
