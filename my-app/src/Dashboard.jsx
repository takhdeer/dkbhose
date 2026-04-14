import { useState , useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import {db} from './firebase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function Dashboard() {
    const navigate = useNavigate();
    const location = useLocation();
    const username = location.state?.username ?? "";
  
    const [courses, setCourses] = useState([]);
    const [courseData, setCourseData] = useState([]);
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

          // fetch course_data for charts
          const courseSnap = await getDocs(collection(db, "course_data"));
          const courseInfo = courseSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setCourseData(courseInfo);

        } catch (err) {
          console.error("Error fetching courses:", err);
        } finally {
          setLoading(false);
        }
      }
  
      if (username) fetchCourses();
      else setLoading(false);
    }, [username]);
  
    async function handleStopTracking(courseId) {
      try {
        await deleteDoc(doc (db, "tracked_courses", courseId));
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
      } catch (err) {
        console.error("Error stop tracking:", err);
      }
    }

    // build chart data — capacity vs enrollment per course
    const trackedCRNs = new Set(courses.map((c) => c.crn));

    const chartData = courseData
    .filter((c) => trackedCRNs.has(c.crn))
    .map((c) => ({
      name: c.courseTitle?.length > 18 ? c.courseTitle.substring(0, 18) + "…" : c.courseTitle,
      capacity: c.capacity ?? 0,
      enrolled: c.enrollment ?? 0,
      available: (c.capacity ?? 0) - (c.enrollment ?? 0),
      crn: c.crn,
    }));

    return (
      <div style={{
        minHeight: "100vh",
        background: `
          radial-gradient(circle at top left, rgba(103,232,249,0.14), transparent 28%),
          radial-gradient(circle at bottom right, rgba(96,165,250,0.12), transparent 30%),
          #050816
        `,
        color: "#f8fafc",
        fontFamily: "'Space Grotesk', sans-serif",
        padding: "32px 24px",
      }}>
  
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#67e8f9", marginBottom: 4 }}>
              MRU Course Tracker
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>
              Welcome back, <span style={{ color: "#67e8f9" }}>{username}</span>
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate("/signin")}
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              color: "#94a3b8",
              fontFamily: "inherit",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
  
        {/* Main layout — left form, right charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
  
          {/* LEFT — tracked courses + add button */}
          <div style={{
            background: "rgba(10,16,30,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 24,
            padding: 28,
            backdropFilter: "blur(24px)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 16 }}>
              Tracked Courses
            </div>
  
            {loading && <p style={{ color: "#94a3b8", fontSize: 14 }}>Loading...</p>}
  
            {!loading && courses.length === 0 && (
              <div style={{
                padding: 20,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
                color: "#94a3b8",
                fontSize: 14,
                textAlign: "center",
                marginBottom: 16,
              }}>
                You are not tracking any courses yet.
              </div>
            )}
  
            {!loading && courses.map((course) => (
              <div key={course.id} style={{
                padding: "14px 16px",
                borderRadius: 14,
                border: "1px solid rgba(103,232,249,0.12)",
                background: "rgba(103,232,249,0.03)",
                marginBottom: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "#67e8f9", marginBottom: 4 }}>
                    CRN {course.crn}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#f8fafc" }}>
                    {course.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    {course.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleStopTracking(course.id)}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "5px 12px",
                    borderRadius: 8,
                    background: "rgba(239,68,68,0.07)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "#f87171",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Stop
                </button>
              </div>
            ))}
  
            <button
              type="button"
              onClick={() => navigate("/track", { state: { username } })}
              style={{
                width: "100%",
                marginTop: 8,
                padding: "13px 16px",
                borderRadius: 14,
                border: 0,
                background: "linear-gradient(135deg, #0891b2 0%, #3b82f6 100%)",
                color: "#fff",
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              + Add Course
            </button>
          </div>
  
          {/* RIGHT — charts */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
  
            {/* Capacity vs Enrollment bar chart */}
            <div style={{
              background: "rgba(10,16,30,0.9)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 24,
              padding: 28,
              backdropFilter: "blur(24px)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 20 }}>
                Capacity vs Enrollment
              </div>
              {courseData.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: 13 }}>No course data available.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} barGap={4}>
                    <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#475569", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: "#0a101e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#f8fafc" }}
                      labelStyle={{ color: "#67e8f9", fontWeight: 700 }}
                    />
                    <Bar dataKey="capacity" name="Capacity" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="enrolled" name="Enrolled" fill="#67e8f9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
  
            {/* Available seats bar chart */}
            <div style={{
              background: "rgba(10,16,30,0.9)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 24,
              padding: 28,
              backdropFilter: "blur(24px)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 20 }}>
                Available Seats
              </div>
              {courseData.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: 13 }}>No course data available.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#475569", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: "#0a101e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#f8fafc" }}
                      labelStyle={{ color: "#67e8f9", fontWeight: 700 }}
                    />
                    <Bar dataKey="available" name="Available Seats" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.available > 0 ? "#22c55e" : "#f87171"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
  
          </div>
        </div>
      </div>
    );
  }