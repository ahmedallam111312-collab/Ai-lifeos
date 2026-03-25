import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { db } from "../firebase";
import { Icon, Icons, Donut, statusBadge, statusLabel } from "./globals";

/**
 * Dashboard — overview of today's calories, protein, water, steps, streak,
 * recent meals, and active projects.
 *
 * Props:
 * profile — UserProfile object from Firestore / onboarding
 */
export default function Dashboard({ profile }) {
  const [meals,    setMeals]    = useState([]);
  const [tasks,    setTasks]    = useState([]);
  const [tracking, setTracking] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    // 1. Get string for tracking (keeps compatibility with your Tracking.tsx)
    const todayStr = new Date().toISOString().split("T")[0];

    // 2. Get YOUR local midnight (Fixes the 12:00 AM - 3:00 AM missing meals bug)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Today's meals (using local midnight)
    const mealsQ = query(
      collection(db, "meals"),
      where("userId", "==", profile.uid),
      where("timestamp", ">=", startOfDay)
    );
    const unsubMeals = onSnapshot(mealsQ, snap =>
      setMeals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // Pending tasks
    const tasksQ = query(
      collection(db, "tasks"),
      where("userId", "==", profile.uid),
      where("status", "!=", "done")
    );
    const unsubTasks = onSnapshot(tasksQ, snap =>
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // Today's tracking log
    const trackQ = query(
      collection(db, "tracking"),
      where("userId", "==", profile.uid),
      where("date", "==", todayStr),
      limit(1)
    );
    const unsubTrack = onSnapshot(trackQ, snap => {
      if (!snap.empty) setTracking({ id: snap.docs[0].id, ...snap.docs[0].data() });
    });

    return () => { unsubMeals(); unsubTasks(); unsubTrack(); };
  }, [profile.uid]);

  // Calculations must happen BEFORE generateInsight so it can use them!
  const totalCal  = meals.reduce((s, m) => s + m.calories, 0);
  const totalProt = meals.reduce((s, m) => s + m.protein,  0);
  const calPct    = Math.min((totalCal  / profile.dailyCaloriesTarget) * 100, 100);
  const protPct   = Math.min((totalProt / profile.dailyProteinTarget)  * 100, 100);
  const waterPct  = Math.min(((tracking?.waterIntake ?? 0) / 3000)     * 100, 100);
  const stepPct   = Math.min(((tracking?.steps ?? 0) / 10000)          * 100, 100);

  // Moved OUTSIDE of the useEffect hook!
  const generateInsight = async () => {
    setReportLoading(true);
    try {
      const res = await fetch("/api/ai/daily-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userData: profile,
          dailyStats: { 
            calories: totalCal, 
            protein: totalProt, 
            water: tracking?.waterIntake ?? 0, 
            steps: tracking?.steps ?? 0 
          }
        })
      });
      const data = await res.json();
      setAiReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setReportLoading(false);
    }
  };

  const quickStats = [
    { label: "Water",  value: `${((tracking?.waterIntake ?? 0) / 1000).toFixed(1)}L`, pct: waterPct,                     color: "var(--blue)",  sub: "/ 3L goal" },
    { label: "Steps",  value: (tracking?.steps ?? 0).toLocaleString(),                  pct: stepPct,                      color: "var(--green)", sub: "/ 10k goal" },
    { label: "Streak", value: `${profile.streak}d`,                                     pct: (profile.streak / 30) * 100, color: "var(--amber)", sub: "on fire 🔥" },
  ];

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p className="label" style={{ marginBottom: 4 }}>Good morning</p>
          <h1 style={{ marginBottom: 4 }}>Hey, {profile.email.split("@")[0]} 👋</h1>
          <p className="muted" style={{ fontSize: 14 }}>Let's make today count.</p>
        </div>

        {/* XP badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "10px 16px" }}>
          <Icon d={Icons.trophy} size={18} style={{ color: "var(--amber)" }} />
          <div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>Lv {profile.level}</span>
            <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <div className="progress-track" style={{ width: 56, height: 4 }}>
                <div className="progress-fill" style={{ width: `${profile.xp}%`, background: "var(--amber)" }} />
              </div>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>{profile.xp}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Daily AI Insight ── */}
      <div className="card glow-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon d={Icons.sparkle} size={20} style={{ color: "var(--accent2)" }} />
            <h2>Daily AI Insight</h2>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={generateInsight} disabled={reportLoading}>
            {reportLoading ? "Analyzing..." : "Get Insight"}
          </button>
        </div>
        
        {aiReport ? (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <p style={{ marginBottom: 12 }}>{aiReport.feedback}</p>
            
            {aiReport.warnings?.length > 0 && (
              <div style={{ background: "var(--red2)", color: "var(--red)", padding: "10px 14px", borderRadius: "var(--r)", marginBottom: 12, fontSize: 13 }}>
                <p style={{ fontWeight: "bold", marginBottom: 4 }}>Warnings:</p>
                <ul style={{ marginLeft: 20 }}>{aiReport.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
            )}
            
            {aiReport.suggestions?.length > 0 && (
              <div style={{ background: "var(--green2)", color: "var(--green)", padding: "10px 14px", borderRadius: "var(--r)", fontSize: 13 }}>
                <p style={{ fontWeight: "bold", marginBottom: 4 }}>Suggestions:</p>
                <ul style={{ marginLeft: 20 }}>{aiReport.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 14 }}>Tap 'Get Insight' to have the AI analyze your daily progress.</p>
        )}
      </div>

      {/* ── Calorie + Protein hero ── */}
      <div className="grid-2">
        <div className="card glow-card" style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <Donut pct={calPct} color="var(--accent2)" size={84} strokeW={7} />
          <div style={{ flex: 1 }}>
            <p className="label" style={{ marginBottom: 6 }}>Calories today</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span className="big-num" style={{ fontSize: 34 }}>{totalCal}</span>
              <span className="dimmer" style={{ fontSize: 14 }}>/ {profile.dailyCaloriesTarget}</span>
            </div>
            <div className="progress-track" style={{ height: 4, marginTop: 12 }}>
              <div className="progress-fill" style={{ width: `${calPct}%`, background: "linear-gradient(90deg, var(--accent), var(--accent2))" }} />
            </div>
            <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 6 }}>
              {Math.round(profile.dailyCaloriesTarget - totalCal)} kcal remaining
            </p>
          </div>
        </div>

        <div className="card" style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <Donut pct={protPct} color="var(--green)" size={84} strokeW={7} />
          <div style={{ flex: 1 }}>
            <p className="label" style={{ marginBottom: 6 }}>Protein</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span className="big-num" style={{ fontSize: 34 }}>{totalProt}<span style={{ fontSize: 18 }}>g</span></span>
              <span className="dimmer" style={{ fontSize: 14 }}>/ {profile.dailyProteinTarget}g</span>
            </div>
            <div className="progress-track" style={{ height: 4, marginTop: 12 }}>
              <div className="progress-fill" style={{ width: `${protPct}%`, background: "linear-gradient(90deg, var(--green), #64f5b0)" }} />
            </div>
            <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 6 }}>
              {Math.round(profile.dailyProteinTarget - totalProt)}g to go
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick stats ── */}
      <div className="grid-3">
        {quickStats.map((s, i) => (
          <div key={i} className="card card-sm" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Donut pct={s.pct} color={s.color} size={52} strokeW={5} />
            <div>
              <p className="label" style={{ marginBottom: 2 }}>{s.label}</p>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20 }}>{s.value}</p>
              <p className="dimmer" style={{ fontSize: 12 }}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent meals ── */}
      <div>
        <div className="sec-header">
          <h2>Today's Meals</h2>
          <span className="muted" style={{ fontSize: 13 }}>{totalCal} kcal logged</span>
        </div>
        {meals.length === 0 ? (
          <p className="dimmer" style={{ fontStyle: "italic", padding: "24px 0" }}>No meals logged yet today.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {meals.map(m => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, fontSize: 14 }}>{m.description}</p>
                  <p className="dimmer" style={{ fontSize: 12 }}>{m.timestamp?.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                  <span style={{ color: "var(--accent2)", fontWeight: 600 }}>{m.calories} kcal</span>
                  <span style={{ color: "var(--green)",  fontWeight: 600 }}>{m.protein}g P</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Active projects ── */}
      <div>
        <div className="sec-header">
          <h2>Active Projects</h2>
          <span className="badge badge-accent">{tasks.filter(t => t.status === "in_progress").length} in progress</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tasks.slice(0, 3).map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)" }}>
              <div className={`priority-dot priority-${t.priority}`} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 500, fontSize: 14 }}>{t.title}</p>
                <div className="progress-track" style={{ height: 3, marginTop: 6, width: 120 }}>
                  <div className="progress-fill" style={{ width: `${t.progress ?? 0}%`, background: "var(--accent)" }} />
                </div>
              </div>
              <span className={`badge ${statusBadge[t.status]}`}>{statusLabel[t.status]}</span>
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="dimmer" style={{ fontStyle: "italic", padding: "24px 0" }}>No pending tasks. Enjoy your day!</p>
          )}
        </div>
      </div>

    </div>
  );
}