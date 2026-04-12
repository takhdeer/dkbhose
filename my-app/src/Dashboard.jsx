import { useState , useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import {db} from './firebase';

export default function Dashboard() {
    const navigate = useNavigate();
    const location = useLocation();
    const username = location.state?.username ?? "";
  
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      async function fetchCourses() {
        try {
          const q = query(
            collection(db, "tracked_courses"),
            where("username", "==", username)
          );
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setCourses(data);
        } catch (err) {
          console.error("Error fetching courses:", err);
        } finally {
          setLoading(false);
        }
      }
  
      if (username) fetchCourses();
      else setLoading(false);
    }, [username]);
  
    return (
      <div className="app">
        <div className="card" style={{ width: "min(600px, 100%)" }}>
  
          {/* Header */}
          <div className="eyebrow">MRU Course Tracker</div>
          <h1 style={{ marginBottom: 4 }}>Dashboard</h1>
          <p style={{ marginBottom: 24 }}>
            Welcome back, <strong style={{ color: "var(--cyan)" }}>{username}</strong>
          </p>
  
          {/* Tracked courses */}
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: 12
          }}>
            Tracked Courses
          </div>
  
          {loading && (
            <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading courses...</p>
          )}
  
          {!loading && courses.length === 0 && (
            <div style={{
              padding: "20px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
              color: "var(--muted)",
              fontSize: 14,
              textAlign: "center",
              marginBottom: 16
            }}>
              You are not tracking any courses yet.
            </div>
          )}
  
          {!loading && courses.map((course) => (
            <div key={course.id} style={{
              padding: "16px 18px",
              borderRadius: 14,
              border: "1px solid rgba(103,232,249,0.12)",
              background: "rgba(103,232,249,0.03)",
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <div style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: "var(--cyan)",
                  marginBottom: 4
                }}>
                  CRN {course.crn}
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>
                  {course.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {course.email}
                </div>
              </div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "5px 12px",
                borderRadius: 8,
                background: "rgba(103,232,249,0.08)",
                border: "1px solid rgba(103,232,249,0.2)",
                color: "var(--cyan)"
              }}>
                Monitoring
              </div>
            </div>
          ))}
  
          {/* Actions */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            <button
              className="btn-signin"
              type="button"
              onClick={() => navigate("/track", { state: { username } })}
            >
              + Add Course
            </button>
            <button
              className="btn-signup"
              type="button"
              onClick={() => navigate("/signin")}
            >
              Sign out
            </button>
          </div>
  
        </div>
      </div>
    );
  }