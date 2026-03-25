import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, limit, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Icon, Icons, Donut, statusBadge, statusLabel, Spinner, useToast } from "./globals";

export default function Dashboard({ profile, setProfile }: { profile: any; setProfile: (p: any) => void }) {
  const toast = useToast();
  const [meals,    setMeals]    = useState<any[]>([]);
  const [tasks,    setTasks]    = useState<any[]>([]);
  const [tracking, setTracking] = useState<any>(null);
  const [aiReport, setAiReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [mealsLoading,  setMealsLoading]  = useState(true);
  const [tasksLoading,  setTasksLoading]  = useState(true);

  useEffect(() => {
    const todayStr   = new Date().toISOString().split("T")[0];
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);

    // Check + auto-increment streak
    const lastLogin = localStorage.getItem(`streak_date_${profile.uid}`);
    const today     = new Date().toDateString();
    if (lastLogin !== today) {
      localStorage.setItem(`streak_date_${profile.uid}`, today);
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const wasYesterday = lastLogin === yesterday.toDateString();
      const newStreak = wasYesterday ? (profile.streak ?? 0) + 1 : 1;
      if (newStreak !== profile.streak) {
        updateDoc(doc(db, "users", profile.uid), { streak: newStreak });
        setProfile({ ...profile, streak: newStreak });
      }
    }

    const unsubMeals = onSnapshot(
      query(collection(db, "meals"), where("userId", "==", profile.uid), where("timestamp", ">=", startOfDay)),
      snap => { setMeals(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setMealsLoading(false); }
    );
    const unsubTasks = onSnapshot(
      query(collection(db, "tasks"), where("userId", "==", profile.uid), where("status", "!=", "done")),
      snap => { setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setTasksLoading(false); }
    );
    const unsubTrack = onSnapshot(
      query(collection(db, "tracking"), where("userId", "==", profile.uid), where("date", "==", todayStr), limit(1)),
      snap => { if (!snap.empty) setTracking({ id: snap.docs[0].id, ...snap.docs[0].data() }); }
    );
    return () => { unsubMeals(); unsubTasks(); unsubTrack(); };
  }, [profile.uid]);

  const totalCal  = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const totalProt = meals.reduce((s, m) => s + (m.protein  ?? 0), 0);
  const calPct    = Math.min((totalCal  / profile.dailyCaloriesTarget) * 100, 100);
  const protPct   = Math.min((totalProt / profile.dailyProteinTarget)  * 100, 100);
  const waterPct  = Math.min(((tracking?.waterIntake ?? 0) / 3000) * 100, 100);
  const stepPct   = Math.min(((tracking?.steps ?? 0) / 10000) * 100, 100);

  const generateInsight = async () => {
    setReportLoading(true);
    setAiReport(null);
    try {
      const res = await fetch("/api/ai/daily-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userData: profile,
          dailyStats: {
            calories: totalCal, protein: totalProt,
            water: tracking?.waterIntake ?? 0, steps: tracking?.steps ?? 0,
            calorieTarget: profile.dailyCaloriesTarget, proteinTarget: profile.dailyProteinTarget,
          },
        }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setAiReport(data);
      toast("AI insight generated!", "success");
    } catch {
      toast("Failed to generate insight. Try again.", "error");
    } finally {
      setReportLoading(false);
    }
  };

  const quickStats = [
    { label: "Water",  value: `${((tracking?.waterIntake ?? 0) / 1000).toFixed(1)}L`, pct: waterPct,                     color: "var(--blue)",  sub: "/ 3L goal" },
    { label: "Steps",  value: (tracking?.steps ?? 0).toLocaleString(),                 pct: stepPct,                      color: "var(--green)", sub: "/ 10k goal" },
    { label: "Streak", value: `${profile.streak ?? 0}d`,                               pct: ((profile.streak ?? 0) / 30) * 100, color: "var(--amber)", sub: "on fire 🔥" },
  ];

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name     = profile.email?.split("@")[0] ?? "friend";

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <p className="label" style={{ marginBottom: 4 }}>{greeting}</p>
          <h1 style={{ marginBottom: 4 }}>Hey, {name} 👋</h1>
          <p className="muted" style={{ fontSize: 14 }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* XP badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "10px 16px", flexShrink: 0 }}>
          <Icon d={Icons.trophy} size={18} style={{ color: "var(--amber)" }} />
          <div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>Level {profile.level ?? 1}</span>
            <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <div className="progress-track" style={{ width: 64, height: 4 }}>
                <div className="progress-fill" style={{ width: `${(profile.xp ?? 0) % 100}%`, background: "var(--amber)" }} />
              </div>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>{profile.xp ?? 0} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Insight card ── */}
      <div className="card glow-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: aiReport ? 16 : 0, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon d={Icons.sparkle} size={20} style={{ color: "var(--accent2)" }} />
            <h2>Daily AI Insight</h2>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={generateInsight} disabled={reportLoading}>
            {reportLoading ? <><Spinner size={14} color="var(--accent2)" /> Analyzing…</> : "Get Insight"}
          </button>
        </div>

        {reportLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
            {[80, 60, 70].map((w, i) => (
              <div key={i} className="skeleton" style={{ height: 14, width: `${w}%`, borderRadius: 6 }} />
            ))}
          </div>
        )}

        {!reportLoading && aiReport && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <p style={{ marginBottom: 14, lineHeight: 1.7 }}>{aiReport.feedback}</p>
            {aiReport.warnings?.length > 0 && (
              <div style={{ background: "var(--red2)", border: "1px solid rgba(255,94,94,0.15)", color: "var(--red)", padding: "12px 16px", borderRadius: "var(--r)", marginBottom: 12, fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, marginBottom: 6 }}>
                  <Icon d={Icons.warning} size={14} /> Warnings
                </div>
                <ul style={{ marginLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
                  {aiReport.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
            {aiReport.suggestions?.length > 0 && (
              <div style={{ background: "var(--green2)", border: "1px solid rgba(62,207,142,0.15)", color: "var(--green)", padding: "12px 16px", borderRadius: "var(--r)", fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, marginBottom: 6 }}>
                  <Icon d={Icons.bolt} size={14} /> Suggestions
                </div>
                <ul style={{ marginLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
                  {aiReport.suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {!reportLoading && !aiReport && (
          <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>
            Tap <strong style={{ color: "var(--text2)" }}>Get Insight</strong> — the AI will analyze your day and give you personalized feedback.
          </p>
        )}
      </div>

      {/* ── Calorie + Protein heroes ── */}
      <div className="grid-2">
        {[
          { label: "Calories today", value: totalCal,  unit: "kcal", target: profile.dailyCaloriesTarget, pct: calPct,  color: "var(--accent2)", gradient: "linear-gradient(90deg, var(--accent), var(--accent2))", suffix: "kcal remaining" },
          { label: "Protein",         value: totalProt, unit: "g",    target: profile.dailyProteinTarget,  pct: protPct, color: "var(--green)",   gradient: "linear-gradient(90deg, var(--green), #64f5b0)",          suffix: "g to go" },
        ].map((m, i) => (
          <div key={i} className={`card ${i === 0 ? "glow-card" : ""}`} style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <Donut pct={m.pct} color={m.color} size={84} strokeW={7} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="label" style={{ marginBottom: 6 }}>{m.label}</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                <span className="big-num" style={{ fontSize: 32 }}>{m.value}</span>
                <span className="dimmer" style={{ fontSize: 14 }}>/ {m.target}{m.unit}</span>
              </div>
              <div className="progress-track" style={{ height: 4, marginTop: 12 }}>
                <div className="progress-fill" style={{ width: `${m.pct}%`, background: m.gradient }} />
              </div>
              <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 6 }}>
                {Math.max(0, Math.round(m.target - m.value))} {m.suffix}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick stats ── */}
      <div className="grid-3">
        {quickStats.map((s, i) => (
          <div key={i} className="card card-sm hover-lift" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Donut pct={s.pct} color={s.color} size={52} strokeW={5} />
            <div>
              <p className="label" style={{ marginBottom: 2 }}>{s.label}</p>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20 }}>{s.value}</p>
              <p className="dimmer" style={{ fontSize: 12 }}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Today's Meals ── */}
      <div>
        <div className="sec-header">
          <h2>Today's Meals</h2>
          <span className="muted" style={{ fontSize: 13 }}>{totalCal} kcal logged</span>
        </div>
        {mealsLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 'var(--r)' }} />)}
          </div>
        ) : meals.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <p className="dimmer" style={{ fontStyle: "italic" }}>No meals logged yet today.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {meals.slice(0, 5).map((m, i) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)", animation: i === 0 ? "fadeIn 0.3s ease" : "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent2)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 500, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.description}</p>
                  <p className="dimmer" style={{ fontSize: 12 }}>
                    {m.timestamp?.toDate?.().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 14, fontSize: 13, flexShrink: 0 }}>
                  <span style={{ color: "var(--accent2)", fontWeight: 600 }}>{m.calories} kcal</span>
                  <span style={{ color: "var(--green)",  fontWeight: 600 }}>{m.protein}g P</span>
                </div>
              </div>
            ))}
            {meals.length > 5 && (
              <p className="dimmer" style={{ fontSize: 13, textAlign: "center", paddingTop: 4 }}>+{meals.length - 5} more meals today</p>
            )}
          </div>
        )}
      </div>

      {/* ── Active Projects ── */}
      <div>
        <div className="sec-header">
          <h2>Active Projects</h2>
          <span className="badge badge-accent">{tasks.filter(t => t.status === "in_progress").length} in progress</span>
        </div>
        {tasksLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 'var(--r)' }} />)}
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <p className="dimmer" style={{ fontStyle: "italic" }}>No pending tasks. Enjoy your day!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tasks.slice(0, 4).map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)" }}>
                <div className={`priority-dot priority-${t.priority}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 500, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                  <div className="progress-track" style={{ height: 3, marginTop: 6, width: 100 }}>
                    <div className="progress-fill" style={{ width: `${t.progress ?? 0}%`, background: "var(--accent)" }} />
                  </div>
                </div>
                <span className={`badge ${statusBadge[t.status as keyof typeof statusBadge]}`}>
                  {statusLabel[t.status as keyof typeof statusLabel]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}