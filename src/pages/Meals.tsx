import { useState, useEffect } from "react";
import { collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Icon, Icons, Donut, Spinner, useToast } from "./globals";

const SODIUM_WARN = 2300; // mg/day

export default function Meals({ profile }: { profile: any }) {
  const toast = useToast();
  const [meals,     setMeals]     = useState<any[]>([]);
  const [showAdd,   setShowAdd]   = useState(false);
  const [inputText, setInputText] = useState("");
  const [image,     setImage]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [deleting,  setDeleting]  = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "meals"),
      where("userId", "==", profile.uid),
      orderBy("timestamp", "desc")
    );
    return onSnapshot(q, snap => setMeals(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [profile.uid]);

  // Filter to only today's meals for daily totals
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayMeals = meals.filter(m => m.timestamp?.toDate?.() >= todayStart);

  const totalCal  = todayMeals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const totalProt = todayMeals.reduce((s, m) => s + (m.protein  ?? 0), 0);
  const totalCarb = todayMeals.reduce((s, m) => s + (m.carbs    ?? 0), 0);
  const totalFat  = todayMeals.reduce((s, m) => s + (m.fat      ?? 0), 0);
  const totalSod  = todayMeals.reduce((s, m) => s + (m.sodium   ?? 0), 0);
  const calPct    = Math.min((totalCal  / profile.dailyCaloriesTarget) * 100, 100);
  const protPct   = Math.min((totalProt / profile.dailyProteinTarget)  * 100, 100);
  const calRemain = Math.max(0, profile.dailyCaloriesTarget - totalCal);

  const handleAnalyze = async () => {
    if (!inputText.trim() && !image) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, image }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      await addDoc(collection(db, "meals"), {
        userId:      profile.uid,
        timestamp:   serverTimestamp(),
        description: data.description || inputText || "Analyzed Meal",
        calories:    data.calories  ?? 0,
        protein:     data.protein   ?? 0,
        carbs:       data.carbs     ?? 0,
        fat:         data.fat       ?? 0,
        sodium:      data.sodium    ?? 0,
        imageUrl:    image ?? null,
      });
      setInputText(""); setImage(null); setShowAdd(false);
      toast(`Meal logged: ${data.calories} kcal · ${data.protein}g protein`, "success");
    } catch {
      toast("Failed to analyze meal. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteDoc(doc(db, "meals", id));
      toast("Meal removed.", "info");
    } catch {
      toast("Failed to delete meal.", "error");
    } finally {
      setDeleting(null);
    }
  };

  // Group meals by date label
  const grouped: Record<string, any[]> = {};
  meals.forEach(m => {
    const d = m.timestamp?.toDate?.();
    if (!d) return;
    const key = d.toDateString() === new Date().toDateString()
      ? "Today"
      : d.toDateString() === new Date(Date.now() - 86400000).toDateString()
      ? "Yesterday"
      : d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p className="label" style={{ marginBottom: 4 }}>Nutrition</p>
          <h1>Meal Log</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Icon d={Icons.plus} size={16} /> Log Meal
        </button>
      </div>

      {/* ── Sodium warning ── */}
      {totalSod > SODIUM_WARN && (
        <div style={{ background: "var(--red2)", border: "1px solid rgba(255,94,94,0.2)", borderRadius: "var(--r)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, animation: "fadeIn 0.3s ease" }}>
          <Icon d={Icons.warning} size={16} style={{ color: "var(--red)", flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: "var(--red)" }}>
            <strong>High sodium alert:</strong> You've consumed {totalSod.toLocaleString()}mg today — above the 2,300mg daily recommendation.
          </p>
        </div>
      )}

      {/* ── Macro summary ── */}
      <div className="card">
        <div style={{ display: "flex", gap: 0, flexWrap: "wrap" }}>
          {[
            { val: totalCal,  unit: "kcal", label: "Calories", color: "var(--accent2)" },
            { val: totalProt, unit: "g",    label: "Protein",  color: "var(--green)"  },
            { val: totalCarb, unit: "g",    label: "Carbs",    color: "var(--blue)"   },
            { val: totalFat,  unit: "g",    label: "Fat",      color: "var(--amber)"  },
          ].map((m, i, arr) => (
            <div key={m.label} style={{ flex: 1, minWidth: 80, textAlign: "center", padding: "12px 8px", borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: m.color }}>{m.val}{m.unit}</p>
              <p className="label" style={{ marginTop: 4 }}>{m.label}</p>
            </div>
          ))}
        </div>
        {/* Progress rows */}
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "Calories", val: totalCal,  target: profile.dailyCaloriesTarget, color: "var(--accent2)", unit: "kcal" },
            { label: "Protein",  val: totalProt, target: profile.dailyProteinTarget,  color: "var(--green)",  unit: "g"    },
          ].map(m => (
            <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 500, width: 64, flexShrink: 0 }}>{m.label}</span>
              <div className="progress-track" style={{ flex: 1, height: 7 }}>
                <div className="progress-fill" style={{ width: `${Math.min((m.val/m.target)*100, 100)}%`, background: m.color }} />
              </div>
              <span style={{ fontSize: 12, color: "var(--text2)", width: 110, textAlign: "right", flexShrink: 0 }}>
                {m.val}{m.unit} / {m.target}{m.unit}
              </span>
            </div>
          ))}
        </div>
        {calRemain > 0 && (
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 12, textAlign: "center" }}>
            {calRemain} kcal remaining today
          </p>
        )}
      </div>

      {/* ── Grouped meal list ── */}
      {Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Icon d={Icons.meals} size={28} style={{ color: "var(--text3)" }} />
          </div>
          <p className="muted" style={{ marginBottom: 8 }}>No meals logged yet</p>
          <p className="dimmer" style={{ fontSize: 13 }}>Tap "Log Meal" to get started.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([dateLabel, dayMeals]) => (
          <div key={dateLabel}>
            <p className="label" style={{ marginBottom: 12 }}>{dateLabel}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {dayMeals.map((m, i) => (
                <div key={m.id} className="card card-sm"
                  style={{ display: "flex", alignItems: "flex-start", gap: 14, animation: i === 0 && dateLabel === "Today" ? "fadeIn 0.4s ease" : "none" }}>
                  {m.imageUrl
                    ? <img src={m.imageUrl} alt="meal" style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                    : <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon d={Icons.meals} size={18} style={{ color: "var(--accent2)" }} />
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.description}</p>
                    <p className="dimmer" style={{ fontSize: 12 }}>
                      {m.timestamp?.toDate?.().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                      <span className="macro-pill" style={{ color: "var(--accent2)" }}><strong>{m.calories}</strong> kcal</span>
                      <span className="macro-pill" style={{ color: "var(--green)"  }}><strong>{m.protein}g</strong> protein</span>
                      <span className="macro-pill">C: {m.carbs}g</span>
                      <span className="macro-pill">F: {m.fat}g</span>
                      {m.sodium > 0 && <span className="macro-pill" style={{ color: m.sodium > 800 ? "var(--amber)" : "inherit" }}>Na: {m.sodium}mg</span>}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    disabled={deleting === m.id}
                    onClick={() => handleDelete(m.id)}
                    style={{ color: "var(--text3)", flexShrink: 0 }}
                  >
                    {deleting === m.id ? <Spinner size={14} color="var(--red)" /> : <Icon d={Icons.trash} size={15} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* ── Add meal modal ── */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => !loading && setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h2>Log a Meal</h2>
                <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>Describe it or upload a photo</p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => { setShowAdd(false); setImage(null); setInputText(""); }}>
                <Icon d={Icons.x} size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Image upload */}
              <label style={{ cursor: "pointer" }}>
                <div style={{ aspectRatio: "16/9", background: "var(--surface)", border: `2px dashed ${image ? "var(--accent)" : "var(--border2)"}`, borderRadius: "var(--r2)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", transition: "border-color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = image ? "var(--accent)" : "var(--border2)")}>
                  {image
                    ? <img src={image} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <>
                        <Icon d={Icons.camera} size={32} style={{ color: "var(--text3)", marginBottom: 8 }} />
                        <p className="dimmer" style={{ fontSize: 13 }}>Tap to add a photo (optional)</p>
                      </>
                  }
                </div>
                <input type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5_000_000) { toast("Image must be under 5MB.", "error"); return; }
                    const reader = new FileReader();
                    reader.onloadend = () => setImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {image && (
                <button className="btn btn-ghost btn-sm" onClick={() => setImage(null)} style={{ alignSelf: "flex-start", color: "var(--red)", fontSize: 13 }}>
                  <Icon d={Icons.x} size={13} /> Remove photo
                </button>
              )}

              <div>
                <p className="label" style={{ marginBottom: 8 }}>Describe your meal</p>
                <textarea
                  placeholder="e.g. Grilled salmon with quinoa and broccoli, medium portion…"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  style={{ minHeight: 90, resize: "vertical" }}
                />
              </div>

              <div style={{ background: "var(--surface)", borderRadius: "var(--r)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <Icon d={Icons.sparkle} size={15} style={{ color: "var(--accent2)", flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: "var(--text2)" }}>
                  AI will auto-estimate calories, protein, carbs, fat, and sodium.
                </p>
              </div>

              <button className="btn btn-primary" onClick={handleAnalyze}
                disabled={loading || (!inputText.trim() && !image)}
                style={{ width: "100%", justifyContent: "center" }}>
                {loading ? <><Spinner size={16} /> Analyzing…</> : <><Icon d={Icons.sparkle} size={16} /> Analyze & Log Meal</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}