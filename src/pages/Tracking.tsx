import { useState, useEffect } from "react";
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, doc, limit, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { Icon, Icons, Sparkline } from "./globals";

/**
 * Progress tracking page — water intake, step count, weight log + sparkline.
 *
 * Props:
 * profile — UserProfile object
 */
export default function Tracking({ profile }) {
  const [logs,        setLogs]        = useState([]);
  const [todayLog,    setTodayLog]    = useState(null);
  const [weightInput, setWeightInput] = useState("");
  const [isSyncing,   setIsSyncing]   = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "tracking"),
      where("userId", "==", profile.uid),
      orderBy("date", "desc"),
      limit(30)
    );
    return onSnapshot(q, snap => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLogs(fetched);
      const today = new Date().toISOString().split("T")[0];
      const entry = fetched.find(l => l.date === today);
      if (entry) { setTodayLog(entry); setWeightInput(entry.weight?.toString() ?? ""); }
    });
  }, [profile.uid]);

  const today = new Date().toISOString().split("T")[0];

  const updateField = async (field, value) => {
    if (todayLog) {
      await updateDoc(doc(db, "tracking", todayLog.id), { [field]: value });
    } else {
      const created = await addDoc(collection(db, "tracking"), {
        userId: profile.uid, date: today,
        waterIntake: 0, steps: 0,
        [field]: value,
        createdAt: serverTimestamp(),
      });
      setTodayLog({ id: created.id, userId: profile.uid, date: today, waterIntake: 0, steps: 0, [field]: value });
    }
  };

  const updateWater = (delta) => {
    const current = todayLog?.waterIntake ?? 0;
    const next    = Math.max(0, current + delta);
    updateField("waterIntake", next);
    setTodayLog(prev => prev ? { ...prev, waterIntake: next } : { waterIntake: next });
  };

  const updateSteps = (delta) => {
    const current = todayLog?.steps ?? 0;
    const next    = Math.max(0, current + delta);
    updateField("steps", next);
    setTodayLog(prev => prev ? { ...prev, steps: next } : { steps: next });
  };

  const logWeight = () => {
    const w = parseFloat(weightInput);
    if (isNaN(w)) return;
    updateField("weight", w);
    setLogs(prev => {
      const idx = prev.findIndex(l => l.date === today);
      const date = today.slice(5).replace("-", "/");
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], weight: w }; return next; }
      return [{ date: today, weight: w }, ...prev];
    });
  };

  const syncWatchSteps = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/fit/sync-steps", { method: "POST" });
      const data = await res.json();
      
      if (data.steps !== undefined) {
        updateField("steps", data.steps);
        setTodayLog(prev => prev ? { ...prev, steps: data.steps } : { steps: data.steps });
      }
    } catch (err) {
      console.error("Sync failed", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const water = todayLog?.waterIntake ?? 0;
  const steps = todayLog?.steps       ?? 0;

  const waterPct = Math.min((water / 3000)  * 100, 100);
  const stepPct  = Math.min((steps / 10000) * 100, 100);

  // Build sparkline data from logs (most recent 10, reversed to oldest-first)
  const sparkData = [...logs]
    .filter(l => l.weight)
    .reverse()
    .slice(-10)
    .map(l => ({ date: l.date.slice(5).replace("-", "/"), weight: l.weight }));

  // Weekly averages (mock)
  const weekStats = [
    { label: "Avg Calories", value: "1,890", sub: "kcal/day",  color: "var(--accent2)" },
    { label: "Avg Protein",  value: "140g",  sub: "per day",   color: "var(--green)"  },
    { label: "Avg Steps",    value: "7,240", sub: "per day",   color: "var(--blue)"   },
  ];

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Header ── */}
      <div>
        <p className="label" style={{ marginBottom: 4 }}>Health</p>
        <h1>Progress Tracking</h1>
      </div>

      <div className="grid-2">

        {/* ── Water ── */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--blue2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon d={Icons.droplets} size={22} style={{ color: "var(--blue)" }} />
            </div>
            <div>
              <h3>Water Intake</h3>
              <p className="dimmer" style={{ fontSize: 13 }}>Daily goal: 3,000 ml</p>
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <span className="big-num" style={{ color: "var(--blue)" }}>{water}</span>
            <span className="muted" style={{ fontSize: 18, marginLeft: 4 }}>ml</span>
          </div>

          <div className="progress-track" style={{ height: 10 }}>
            <div className="progress-fill" style={{ width: `${waterPct}%`, background: "linear-gradient(90deg, var(--blue), #7dd4fc)" }} />
          </div>
          <p className="dimmer" style={{ fontSize: 12, textAlign: "center" }}>{Math.round(3000 - water)} ml remaining</p>

          <div style={{ display: "flex", gap: 12 }}>
            <button className="water-btn water-minus" onClick={() => updateWater(-250)}>−</button>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--text3)", fontWeight: 500 }}>+/− 250 ml per glass</div>
            <button className="water-btn water-plus"  onClick={() => updateWater(+250)}>+</button>
          </div>
        </div>

        {/* ── Steps ── */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* SYNCHRONIZATION HEADER */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--green2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon d={Icons.footsteps} size={22} style={{ color: "var(--green)" }} />
              </div>
              <div>
                <h3>Step Count</h3>
                <p className="dimmer" style={{ fontSize: 13 }}>Daily goal: 10,000</p>
              </div>
            </div>

            {/* SYNC BUTTON HERE */}
            <button className="btn btn-secondary btn-sm" onClick={syncWatchSteps} disabled={isSyncing}>
              <Icon d={Icons.refresh} size={14} style={{ animation: isSyncing ? "spin 1s linear infinite" : "none" }} />
              {isSyncing ? "Syncing..." : "Sync Watch"}
            </button>
          </div>

          <div style={{ textAlign: "center" }}>
            <span className="big-num" style={{ color: "var(--green)" }}>{steps.toLocaleString()}</span>
            <span className="muted" style={{ fontSize: 18, marginLeft: 4 }}>steps</span>
          </div>

          <div className="progress-track" style={{ height: 10 }}>
            <div className="progress-fill" style={{ width: `${stepPct}%`, background: "linear-gradient(90deg, var(--green), #64f5b0)" }} />
          </div>
          <p className="dimmer" style={{ fontSize: 12, textAlign: "center" }}>{Math.max(0, 10000 - steps).toLocaleString()} steps to goal</p>

          <div style={{ display: "flex", gap: 12 }}>
            <button className="water-btn water-minus" onClick={() => updateSteps(-500)}>−</button>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--text3)", fontWeight: 500 }}>+/− 500 steps</div>
            <button className="water-btn water-plus"  onClick={() => updateSteps(+500)}>+</button>
          </div>
        </div>
      </div>

      {/* ── Weight log + sparkline ── */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(168,151,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={Icons.scale} size={22} style={{ color: "var(--accent2)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3>Weight Log</h3>
            <p className="dimmer" style={{ fontSize: 13 }}>Starting: {profile.weight} kg · Today: {todayLog?.weight ?? "—"} kg</p>
          </div>
          {todayLog?.weight && (
            <div style={{ textAlign: "right" }}>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--green)" }}>
                {(profile.weight - todayLog.weight) >= 0
                  ? `-${(profile.weight - todayLog.weight).toFixed(1)}`
                  : `+${(todayLog.weight - profile.weight).toFixed(1)}`} kg
              </p>
              <p className="dimmer" style={{ fontSize: 12 }}>change</p>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <input type="number" step="0.1" value={weightInput}
            onChange={e => setWeightInput(e.target.value)}
            placeholder="Enter today's weight (kg)" style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={logWeight}>Log</button>
        </div>

        {sparkData.length >= 2 && (
          <div>
            <p className="label" style={{ marginBottom: 12 }}>Weight Trend</p>
            <Sparkline data={sparkData} color="var(--accent2)" height={80} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span className="dimmer" style={{ fontSize: 11 }}>{sparkData[0].date}</span>
              <span className="dimmer" style={{ fontSize: 11 }}>{sparkData[sparkData.length - 1].date}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Weekly summary ── */}
      <div className="card">
        <h2 style={{ marginBottom: 20 }}>Weekly Overview</h2>
        <div className="grid-3">
          {weekStats.map((s, i) => (
            <div key={i} className="glass" style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: s.color }}>{s.value}</p>
              <p className="label" style={{ marginTop: 4 }}>{s.label}</p>
              <p className="dimmer" style={{ fontSize: 12 }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}