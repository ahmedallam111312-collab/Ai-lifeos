import { useState, useEffect } from "react";
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { Icon, Icons } from "./globals";

const MUSCLE_COLORS = {
  Chest:     "var(--red)",
  Shoulders: "var(--amber)",
  Triceps:   "var(--accent2)",
  Back:      "var(--blue)",
  Biceps:    "var(--green)",
  Legs:      "var(--green)",
};

/**
 * Workouts page — display & interact with the current AI-generated workout plan.
 *
 * Props:
 *   profile — UserProfile object
 */
export default function Workouts({ profile }) {
  const [plan,    setPlan]    = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "workouts"), where("userId", "==", profile.uid));
    return onSnapshot(q, snap => {
      if (!snap.empty) setPlan({ id: snap.docs[0].id, ...snap.docs[0].data() });
    });
  }, [profile.uid]);

  // ── Generate plan (calls your secure backend) ──
  const generatePlan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/generate-workout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userData: profile }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();

      await addDoc(collection(db, "workouts"), {
        userId:    profile.uid,
        planName:  data.planName || "AI Custom Plan",
        exercises: data.exercises.map(ex => ({ ...ex, completed: false })),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
      alert("Failed to generate plan. Check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  const toggleExercise = async (index) => {
    if (!plan) return;
    const updated = [...plan.exercises];
    const isNowDone = !updated[index].completed;
    updated[index] = { ...updated[index], completed: isNowDone };
    
    // Update the workout document
    await updateDoc(doc(db, "workouts", plan.id), { exercises: updated });
    setPlan(prev => ({ ...prev, exercises: updated }));

    // Award XP and Level up if the exercise was just checked off
    if (isNowDone) {
      const currentXp = profile.xp || 0;
      const newXp = currentXp + 10;
      const newLevel = Math.floor(newXp / 100) + 1; // 1 level per 100 XP
      
      await updateDoc(doc(db, "users", profile.uid), {
        xp: newXp,
        level: newLevel
      });
    }
  };

  const doneCount = plan?.exercises.filter(e => e.completed).length ?? 0;
  const total     = plan?.exercises.length ?? 0;
  const pct       = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p className="label" style={{ marginBottom: 4 }}>Training</p>
          <h1>Gym Plan</h1>
        </div>
        {plan && (
          <button className="btn btn-secondary btn-sm" onClick={generatePlan} disabled={loading} style={{ gap: 8 }}>
            <Icon d={Icons.refresh} size={15} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            {loading ? "Generating..." : "New Plan"}
          </button>
        )}
      </div>

      {/* ── Empty state ── */}
      {!plan && (
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: 48, gap: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={Icons.dumbbell} size={36} style={{ color: "var(--accent2)" }} />
          </div>
          <div>
            <h2 style={{ marginBottom: 8 }}>No Active Plan</h2>
            <p className="muted" style={{ maxWidth: 300 }}>Let our AI generate a personalised workout plan based on your level and goals.</p>
          </div>
          <button className="btn btn-primary" onClick={generatePlan} disabled={loading} style={{ gap: 8 }}>
            {loading
              ? <><span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Generating...</>
              : <><Icon d={Icons.sparkle} size={16} /> Generate My Plan</>}
          </button>
        </div>
      )}

      {/* ── Plan hero ── */}
      {plan && (
        <>
          <div className="card glow-card" style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon d={Icons.dumbbell} size={32} style={{ color: "var(--accent2)" }} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ marginBottom: 4 }}>{plan.planName}</h2>
              <p className="muted" style={{ fontSize: 13 }}>Level: {profile.gymLevel} · {total} exercises</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                <div className="progress-track" style={{ flex: 1, height: 6 }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--accent), var(--accent2))" }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent2)" }}>{doneCount}/{total}</span>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 36, color: pct === 100 ? "var(--green)" : "var(--accent2)" }}>{pct}%</p>
              <p className="label">complete</p>
            </div>
          </div>

          {/* ── Exercise list ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {plan.exercises.map((ex, i) => {
              const mc = MUSCLE_COLORS[ex.muscle] ?? "var(--accent)";
              return (
                <div key={i} className={`ex-row ${ex.completed ? "done" : ""}`} onClick={() => toggleExercise(i)}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `${mc}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: mc }}>{ex.muscle?.slice(0, 3).toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, marginBottom: 2 }}>{ex.name}</p>
                    <p className="dimmer" style={{ fontSize: 12 }}>{ex.sets} sets × {ex.reps} reps</p>
                  </div>
                  <span className="badge" style={{ background: `${mc}22`, color: mc, fontSize: 11 }}>{ex.muscle}</span>
                  <div className={`ex-check ${ex.completed ? "done" : ""}`}>
                    {ex.completed && <Icon d={Icons.check} size={16} style={{ color: "white" }} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Completion celebration ── */}
          {doneCount === total && total > 0 && (
            <div className="card" style={{ textAlign: "center", padding: 32, background: "var(--green2)", borderColor: "rgba(62,207,142,0.25)" }}>
              <p style={{ fontSize: 36, marginBottom: 8 }}>🎉</p>
              <h2 style={{ color: "var(--green)", marginBottom: 8 }}>Workout Complete!</h2>
              <p className="muted">You crushed it. Rest up and come back stronger.</p>
            </div>
          )}

          {/* ── Muscle groups summary ── */}
          <div className="card">
            <h2 style={{ marginBottom: 16 }}>Muscle Groups Today</h2>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[...new Set(plan.exercises.map(e => e.muscle))].map(m => {
                const mc = MUSCLE_COLORS[m] ?? "var(--accent)";
                return (
                  <div key={m} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: "var(--r)", background: `${mc}15`, border: `1px solid ${mc}30` }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: mc }}>{m}</span>
                    <span className="dimmer" style={{ fontSize: 12 }}>× {plan.exercises.filter(e => e.muscle === m).length}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}