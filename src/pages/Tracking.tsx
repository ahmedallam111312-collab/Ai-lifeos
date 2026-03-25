import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, limit, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Icon, Icons, Sparkline, Spinner, useToast } from "./globals";

export default function Tracking({ profile }: { profile: any }) {
  const toast = useToast();
  const [logs,         setLogs]         = useState<any[]>([]);
  const [todayLog,     setTodayLog]     = useState<any>(null);
  const [weightInput,  setWeightInput]  = useState("");
  const [isSyncing,    setIsSyncing]    = useState(false);
  const [loggingWeight, setLoggingWeight] = useState(false);

  const today = new Date().toISOString().split("T")[0];

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
      const entry = fetched.find((l: any) => l.date === today);
      if (entry) { setTodayLog(entry); setWeightInput(entry.weight?.toString() ?? ""); }
    });
  }, [profile.uid]);

  const upsertField = async (field: string, value: number) => {
    if (todayLog) {
      await updateDoc(doc(db, "tracking", todayLog.id), { [field]: value });
      setTodayLog((prev: any) => ({ ...prev, [field]: value }));
    } else {
      const base = { userId: profile.uid, date: today, waterIntake: 0, steps: 0, createdAt: serverTimestamp() };
      const ref  = await addDoc(collection(db, "tracking"), { ...base, [field]: value });
      setTodayLog({ id: ref.id, ...base, [field]: value });
    }
  };

  const updateWater = (delta: number) => {
    const next = Math.max(0, (todayLog?.waterIntake ?? 0) + delta);
    upsertField("waterIntake", next);
  };
  const updateSteps = (delta: number) => {
    const next = Math.max(0, (todayLog?.steps ?? 0) + delta);
    upsertField("steps", next);
  };
  const logWeight = async () => {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w <= 0) { toast("Enter a valid weight.", "error"); return; }
    setLoggingWeight(true);
    try {
      await upsertField("weight", w);
      toast(`Weight logged: ${w} kg`, "success");
    } finally {
      setLoggingWeight(false);
    }
  };

  const syncSteps = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/fit/sync-steps", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.steps !== undefined) {
        await upsertField("steps", data.steps);
        toast(`Synced ${data.steps.toLocaleString()} steps from Google Fit`, "success");
      }
    } catch {
      toast("Could not sync — make sure Google Fit is connected (/api/fit/auth).", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const water = todayLog?.waterIntake ?? 0;
  const steps = todayLog?.steps       ?? 0;
  const waterPct = Math.min((water / 3000)  * 100, 100);
  const stepPct  = Math.min((steps / 10000) * 100, 100);

  const weightLogs = [...logs].filter(l => l.weight).reverse().slice(-14);
  const sparkData  = weightLogs.map(l => ({ date: l.date.slice(5).replace("-", "/"), weight: l.weight }));

  // 7-day summary (real from logs)
  const last7 = logs.slice(0, 7);
  const avgSteps = last7.length ? Math.round(last7.reduce((s, l) => s + (l.steps ?? 0), 0) / last7.length) : 0;
  const avgWater = last7.length ? Math.round(last7.reduce((s, l) => s + (l.waterIntake ?? 0), 0) / last7.length) : 0;
  const currentWeight = todayLog?.weight ?? logs.find(l => l.weight)?.weight ?? profile.weight;
  const weightChange  = currentWeight - profile.weight;

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
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 40, color: "var(--blue)" }}>{water}</span>
            <span className="muted" style={{ fontSize: 18, marginLeft: 6 }}>ml</span>
          </div>
          <div className="progress-track" style={{ height: 10 }}>
            <div className="progress-fill" style={{ width: `${waterPct}%`, background: "linear-gradient(90deg, var(--blue), #7dd4fc)" }} />
          </div>
          <p className="dimmer" style={{ fontSize: 12, textAlign: "center" }}>
            {waterPct >= 100 ? "✅ Goal reached!" : `${Math.round(3000 - water)} ml remaining`}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="water-btn water-minus" onClick={() => updateWater(-250)}>−</button>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
              <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600 }}>±250 ml / glass</span>
              <div style={{ display: "flex", gap: 6 }}>
                {[250, 500, 1000].map(v => (
                  <button key={v} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => updateWater(v)}>+{v}</button>
                ))}
              </div>
            </div>
            <button className="water-btn water-plus" onClick={() => updateWater(+250)}>+</button>
          </div>
        </div>

        {/* ── Steps ── */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--green2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon d={Icons.footsteps} size={22} style={{ color: "var(--green)" }} />
              </div>
              <div>
                <h3>Step Count</h3>
                <p className="dimmer" style={{ fontSize: 13 }}>Daily goal: 10,000</p>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={syncSteps} disabled={isSyncing}>
              {isSyncing ? <><Spinner size={13} color="var(--green)" /> Syncing…</> : <><Icon d={Icons.refresh} size={14} /> Sync Watch</>}
            </button>
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 40, color: "var(--green)" }}>{steps.toLocaleString()}</span>
            <span className="muted" style={{ fontSize: 18, marginLeft: 6 }}>steps</span>
          </div>
          <div className="progress-track" style={{ height: 10 }}>
            <div className="progress-fill" style={{ width: `${stepPct}%`, background: "linear-gradient(90deg, var(--green), #64f5b0)" }} />
          </div>
          <p className="dimmer" style={{ fontSize: 12, textAlign: "center" }}>
            {stepPct >= 100 ? "✅ Goal reached!" : `${Math.max(0, 10000 - steps).toLocaleString()} steps to goal`}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="water-btn water-minus" onClick={() => updateSteps(-500)}>−</button>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
              <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600 }}>±500 steps</span>
              <div style={{ display: "flex", gap: 6 }}>
                {[1000, 2500, 5000].map(v => (
                  <button key={v} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => updateSteps(v)}>+{v}</button>
                ))}
              </div>
            </div>
            <button className="water-btn water-plus" onClick={() => updateSteps(+500)}>+</button>
          </div>
        </div>
      </div>

      {/* ── Weight log ── */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(168,151,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={Icons.scale} size={22} style={{ color: "var(--accent2)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3>Weight Log</h3>
            <p className="dimmer" style={{ fontSize: 13 }}>
              Starting: {profile.weight} kg · Current: {currentWeight ?? "—"} kg
            </p>
          </div>
          {weightChange !== 0 && currentWeight !== profile.weight && (
            <div style={{ textAlign: "right" }}>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: weightChange <= 0 ? "var(--green)" : "var(--red)" }}>
                {weightChange <= 0 ? "−" : "+"}{Math.abs(weightChange).toFixed(1)} kg
              </p>
              <p className="dimmer" style={{ fontSize: 12 }}>since start</p>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <input
            type="number" step="0.1" min="20" max="300"
            value={weightInput}
            onChange={e => setWeightInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && logWeight()}
            placeholder="Today's weight (kg)"
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={logWeight} disabled={loggingWeight || !weightInput}>
            {loggingWeight ? <Spinner size={16} /> : "Log"}
          </button>
        </div>

        {sparkData.length >= 2 ? (
          <>
            <p className="label" style={{ marginBottom: 12 }}>Weight Trend ({sparkData.length} days)</p>
            <Sparkline data={sparkData} color="var(--accent2)" height={80} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span className="dimmer" style={{ fontSize: 11 }}>{sparkData[0].date} · {sparkData[0].weight}kg</span>
              <span className="dimmer" style={{ fontSize: 11 }}>{sparkData[sparkData.length-1].date} · {sparkData[sparkData.length-1].weight}kg</span>
            </div>
          </>
        ) : (
          <p className="dimmer" style={{ fontSize: 13, textAlign: "center", padding: "20px 0", fontStyle: "italic" }}>
            Log your weight on 2+ days to see the trend chart.
          </p>
        )}
      </div>

      {/* ── 7-day summary ── */}
      <div className="card">
        <h2 style={{ marginBottom: 20 }}>7-Day Average</h2>
        <div className="grid-3">
          {[
            { label: "Avg Steps",     value: avgSteps.toLocaleString(), sub: "per day",  color: "var(--green)"  },
            { label: "Avg Water",     value: `${(avgWater/1000).toFixed(1)}L`,sub: "per day", color: "var(--blue)"   },
            { label: "Weigh-ins",     value: weightLogs.length.toString(),  sub: "logged", color: "var(--accent2)" },
          ].map((s, i) => (
            <div key={i} className="glass" style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: s.color }}>{s.value}</p>
              <p className="label" style={{ marginTop: 6 }}>{s.label}</p>
              <p className="dimmer" style={{ fontSize: 12 }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}