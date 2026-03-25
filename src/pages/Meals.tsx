import { useState, useEffect } from "react";
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Icon, Icons, Donut } from "./globals";

/**
 * Meal log page — view today's macros, log meals via AI text analysis.
 *
 * Props:
 *   profile — UserProfile object
 */
export default function Meals({ profile }) {
  const [meals,     setMeals]     = useState([]);
  const [showAdd,   setShowAdd]   = useState(false);
  const [inputText, setInputText] = useState("");
  const [image,     setImage]     = useState(null);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "meals"),
      where("userId",    "==", profile.uid),
      orderBy("timestamp", "desc")
    );
    return onSnapshot(q, snap =>
      setMeals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [profile.uid]);

  // ── AI analysis (calls your backend, not AI SDK directly) ──
  const handleAnalyze = async () => {
    if (!inputText.trim() && !image) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/analyze-meal", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: inputText, image }),
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
    } catch (err) {
      console.error(err);
      alert("Failed to analyze meal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Derived totals ──
  const totalCal  = meals.reduce((s, m) => s + m.calories, 0);
  const totalProt = meals.reduce((s, m) => s + m.protein,  0);
  const totalCarb = meals.reduce((s, m) => s + m.carbs,    0);
  const totalFat  = meals.reduce((s, m) => s + m.fat,      0);

  const calPct  = Math.min((totalCal  / profile.dailyCaloriesTarget) * 100, 100);
  const protPct = Math.min((totalProt / profile.dailyProteinTarget)  * 100, 100);

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p className="label" style={{ marginBottom: 4 }}>Nutrition</p>
          <h1>Meal Log</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Icon d={Icons.plus} size={16} /> Log Meal
        </button>
      </div>

      {/* ── Daily macro summary ── */}
      <div className="card" style={{ display: "flex", gap: 0 }}>
        {[
          { val: totalCal,  unit: "kcal", label: "Calories", color: "var(--accent2)" },
          { val: totalProt, unit: "g",    label: "Protein",  color: "var(--green)"  },
          { val: totalCarb, unit: "g",    label: "Carbs",    color: "var(--blue)"   },
          { val: totalFat,  unit: "g",    label: "Fat",      color: "var(--amber)"  },
        ].map((m, i, arr) => (
          <div key={m.label} style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, color: m.color }}>{m.val}{m.unit}</p>
            <p className="label" style={{ marginTop: 4 }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* ── Progress bars ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          { label: "Calories", val: totalCal,  target: profile.dailyCaloriesTarget, color: "var(--accent2)", unit: "kcal" },
          { label: "Protein",  val: totalProt, target: profile.dailyProteinTarget,  color: "var(--green)",  unit: "g"    },
        ].map(m => (
          <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 500, width: 70, flexShrink: 0 }}>{m.label}</span>
            <div className="progress-track" style={{ flex: 1, height: 8 }}>
              <div className="progress-fill" style={{ width: `${Math.min((m.val / m.target) * 100, 100)}%`, background: m.color }} />
            </div>
            <span style={{ fontSize: 13, color: "var(--text2)", width: 100, textAlign: "right", flexShrink: 0 }}>
              {m.val}{m.unit} / {m.target}{m.unit}
            </span>
          </div>
        ))}
      </div>

      {/* ── Meal list ── */}
      <div>
        <p className="label" style={{ marginBottom: 12 }}>Today's Meals</p>
        {meals.length === 0 ? (
          <p className="dimmer" style={{ fontStyle: "italic", padding: "24px 0" }}>No meals logged yet. Tap "Log Meal" to get started.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {meals.map((m, i) => (
              <div key={m.id} className="card card-sm"
                style={{ display: "flex", alignItems: "flex-start", gap: 16, animation: i === 0 ? "fadeIn 0.4s ease" : "none" }}>

                {m.imageUrl && (
                  <img src={m.imageUrl} alt="meal" style={{ width: 60, height: 60, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
                )}

                {!m.imageUrl && (
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon d={Icons.meals} size={20} style={{ color: "var(--accent2)" }} />
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, marginBottom: 2 }}>{m.description}</p>
                  <p className="dimmer" style={{ fontSize: 12 }}>
                    {m.timestamp?.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                    <span className="macro-pill" style={{ color: "var(--accent2)" }}><b>{m.calories}</b> kcal</span>
                    <span className="macro-pill" style={{ color: "var(--green)" }}><b>{m.protein}g</b> protein</span>
                    <span className="macro-pill">C: {m.carbs}g</span>
                    <span className="macro-pill">F: {m.fat}g</span>
                    <span className="macro-pill">Na: {m.sodium}mg</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add meal modal ── */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => !loading && setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2>Log a Meal</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAdd(false)}>
                <Icon d={Icons.x} size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Image upload */}
              <label style={{ cursor: "pointer" }}>
                <div style={{ aspectRatio: "16/9", background: "var(--surface)", border: "2px dashed var(--border2)", borderRadius: "var(--r2)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border2)"}>
                  {image ? (
                    <img src={image} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <>
                      <Icon d={Icons.camera} size={32} style={{ color: "var(--text3)", marginBottom: 8 }} />
                      <p className="dimmer" style={{ fontSize: 13 }}>Tap to add a photo (optional)</p>
                    </>
                  )}
                </div>
                <input type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => setImage(reader.result);
                    reader.readAsDataURL(file);
                  }}
                />
              </label>

              {/* Text description */}
              <div>
                <p className="label" style={{ marginBottom: 8 }}>Describe your meal</p>
                <textarea
                  placeholder="e.g. Grilled salmon with quinoa and broccoli, medium portion..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  style={{ minHeight: 100, resize: "vertical" }}
                />
              </div>

              {/* AI hint */}
              <div style={{ background: "var(--surface)", borderRadius: "var(--r)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <Icon d={Icons.sparkle} size={16} style={{ color: "var(--accent2)", flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: "var(--text2)" }}>AI will analyze your description and estimate macros automatically.</p>
              </div>

              <button className="btn btn-primary" onClick={handleAnalyze}
                disabled={loading || (!inputText.trim() && !image)}
                style={{ width: "100%", justifyContent: "center" }}>
                {loading ? (
                  <><span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Analyzing...</>
                ) : (
                  <><Icon d={Icons.sparkle} size={16} /> Analyze Meal</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}