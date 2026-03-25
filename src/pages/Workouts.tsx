import { useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Icon, Icons, Donut, Spinner, useToast } from "./globals";

const MUSCLE_COLORS: Record<string, string> = {
  Chest:     "var(--red)",
  Shoulders: "var(--amber)",
  Triceps:   "var(--accent2)",
  Back:      "var(--blue)",
  Biceps:    "var(--green)",
  Legs:      "var(--green)",
  Core:      "var(--amber)",
};

export default function Workouts({ profile, setProfile }: { profile: any; setProfile: (p: any) => void }) {
  const toast = useToast();
  const [plan,    setPlan]    = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Rest timer
  const [timer,     setTimer]    = useState(0);
  const [timerOn,   setTimerOn]  = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const q = query(collection(db, "workouts"), where("userId", "==", profile.uid));
    return onSnapshot(q, snap => {
      if (!snap.empty) setPlan({ id: snap.docs[0].id, ...snap.docs[0].data() });
    });
  }, [profile.uid]);

  useEffect(() => {
    if (timerOn) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current!);
    }
    return () => clearInterval(timerRef.current!);
  }, [timerOn]);

  const fmtTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const generatePlan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/generate-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userData: profile }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      if (!data.exercises?.length) throw new Error("No exercises returned");
      await addDoc(collection(db, "workouts"), {
        userId:    profile.uid,
        planName:  data.planName || "AI Custom Plan",
        exercises: (data.exercises as any[]).map(ex => ({ ...ex, completed: false })),
        createdAt: serverTimestamp(),
      });
      toast("Workout plan generated!", "success");
    } catch {
      toast("Failed to generate plan. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleExercise = async (index: number) => {
    if (!plan) return;
    const updated = plan.exercises.map((ex: any, i: number) =>
      i === index ? { ...ex, completed: !ex.completed } : ex
    );
    const isNowDone = updated[index].completed;
    await updateDoc(doc(db, "workouts", plan.id), { exercises: updated });
    setPlan((prev: any) => ({ ...prev, exercises: updated }));

    if (isNowDone) {
      const newXp    = (profile.xp ?? 0) + 10;
      const newLevel = Math.floor(newXp / 100) + 1;
      await updateDoc(doc(db, "users", profile.uid), { xp: newXp, level: newLevel });
      setProfile({ ...profile, xp: newXp, level: newLevel });
      toast(`+10 XP! ${newXp % 100}/100 to next level`, "success");
    }
  };

  const doneCount = plan?.exercises?.filter((e: any) => e.completed).length ?? 0;
  const total     = plan?.exercises?.length ?? 0;
  const pct       = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const muscles   = plan ? [...new Set<string>(plan.exercises.map((e: any) => e.muscle))] : [];

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p className="label" style={{ marginBottom: 4 }}>Training</p>
          <h1>Gym Plan</h1>
        </div>
        {plan && (
          <button className="btn btn-secondary btn-sm" onClick={generatePlan} disabled={loading}>
            <Icon d={Icons.refresh} size={15} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            {loading ? "Generating…" : "New Plan"}
          </button>
        )}
      </div>

      {/* ── Rest timer ── */}
      <div className="card card-sm" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon d={Icons.tracking} size={18} style={{ color: "var(--blue)" }} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: timerOn ? "var(--blue)" : "var(--text)" }}>
            {fmtTime(timer)}
          </span>
          <span className="dimmer" style={{ fontSize: 13 }}>rest timer</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setTimerOn(t => !t)}>
            {timerOn ? "Pause" : "Start"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setTimer(0); setTimerOn(false); }}>Reset</button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {!plan && (
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "56px 24px", gap: 20 }}>
          <div style={{ width: 88, height: 88, borderRadius: "50%", background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={Icons.dumbbell} size={40} style={{ color: "var(--accent2)" }} />
          </div>
          <div>
            <h2 style={{ marginBottom: 8 }}>No Active Plan</h2>
            <p className="muted" style={{ maxWidth: 320, lineHeight: 1.7 }}>
              Let our AI generate a personalised workout plan based on your fitness level (<strong style={{ color: "var(--text)" }}>{profile.gymLevel}</strong>) and goal (<strong style={{ color: "var(--text)" }}>{profile.goal}</strong>).
            </p>
          </div>
          <button className="btn btn-primary" onClick={generatePlan} disabled={loading} style={{ gap: 8 }}>
            {loading ? <><Spinner size={16} /> Generating…</> : <><Icon d={Icons.sparkle} size={16} /> Generate My Plan</>}
          </button>
        </div>
      )}

      {plan && (
        <>
          {/* ── Plan hero ── */}
          <div className="card glow-card" style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon d={Icons.dumbbell} size={32} style={{ color: "var(--accent2)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
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
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 40, color: pct === 100 ? "var(--green)" : "var(--accent2)", lineHeight: 1 }}>{pct}%</p>
              <p className="label" style={{ marginTop: 4 }}>complete</p>
            </div>
          </div>

          {/* ── Muscle group chips ── */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {muscles.map(m => {
              const mc = MUSCLE_COLORS[m] ?? "var(--accent)";
              const count = plan.exercises.filter((e: any) => e.muscle === m).length;
              return (
                <div key={m} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: "var(--r)", background: `color-mix(in srgb, ${mc} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${mc} 25%, transparent)` }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: mc }}>{m}</span>
                  <span className="dimmer" style={{ fontSize: 11 }}>×{count}</span>
                </div>
              );
            })}
          </div>

          {/* ── Exercise list ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {plan.exercises.map((ex: any, i: number) => {
              const mc = MUSCLE_COLORS[ex.muscle] ?? "var(--accent)";
              const isExpanded = expanded === i;
              return (
                <div key={i}>
                  <div
                    className={`ex-row ${ex.completed ? "done" : ""}`}
                    onClick={() => setExpanded(isExpanded ? null : i)}
                    style={{ background: isExpanded ? "var(--bg3)" : "var(--bg2)" }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb, ${mc} 15%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: mc }}>{ex.muscle?.slice(0, 3).toUpperCase()}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 500, marginBottom: 2 }}>{ex.name}</p>
                      <p className="dimmer" style={{ fontSize: 12 }}>{ex.sets} sets × {ex.reps} reps</p>
                    </div>
                    <Icon d={Icons.chevDown} size={16} style={{ color: "var(--text3)", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "none" }} />
                    <div
                      className={`ex-check ${ex.completed ? "done" : ""}`}
                      onClick={e => { e.stopPropagation(); toggleExercise(i); }}
                    >
                      {ex.completed && <Icon d={Icons.check} size={16} style={{ color: "white" }} />}
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 var(--r) var(--r)", padding: "14px 20px", animation: "fadeIn 0.2s ease" }}>
                      <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7 }}>{ex.description}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Completion celebration ── */}
          {doneCount === total && total > 0 && (
            <div className="card" style={{ textAlign: "center", padding: "40px 32px", background: "var(--green2)", borderColor: "rgba(62,207,142,0.25)", animation: "scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>
              <p style={{ fontSize: 44, marginBottom: 12 }}>🎉</p>
              <h2 style={{ color: "var(--green)", marginBottom: 8 }}>Workout Complete!</h2>
              <p className="muted">You crushed every set. Rest up and come back stronger tomorrow.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}