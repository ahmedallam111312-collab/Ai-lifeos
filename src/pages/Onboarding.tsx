import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Icon, Icons } from "./globals";

/**
 * Multi-step onboarding flow.
 * Props:
 *   user       — Firebase auth user object
 *   setProfile — callback to store the completed UserProfile in parent state
 */
export default function Onboarding({ user, setProfile }) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    age:      25,
    weight:   70,
    height:   175,
    goal:     "maintain",
    activity: "moderate",
    gymLevel: "beginner",
  });

  const steps = [
    { title: "Let's get to know you",  description: "Your age helps us calculate your metabolic rate." },
    { title: "Physical stats",         description: "Weight and height are key for tracking progress." },
    { title: "What's your goal?",      description: "We'll tailor your nutrition and workouts." },
    { title: "Activity level",         description: "How active are you on a daily basis?" },
    { title: "Gym experience",         description: "Your level helps us generate the right plan." },
  ];

  const handleComplete = async () => {
    // Mifflin-St Jeor (male approximation)
    const bmr = 10 * formData.weight + 6.25 * formData.height - 5 * formData.age + 5;
    const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    let cal = bmr * (multipliers[formData.activity] ?? 1.55);
    if (formData.goal === "lose") cal -= 500;
    if (formData.goal === "gain") cal += 500;

    const profile = {
      uid:   user.uid,
      email: user.email,
      ...formData,
      xp: 0, level: 1, streak: 0,
      dailyCaloriesTarget: Math.round(cal),
      dailyProteinTarget:  Math.round(formData.weight * 2),
      onboarded: true,
    };

    await setDoc(doc(db, "users", user.uid), profile);
    setProfile(profile);
  };

  const update = (key, val) => setFormData(f => ({ ...f, [key]: val }));

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: 24, maxWidth: 520, margin: "0 auto" }}>

      {/* Step dots */}
      <div style={{ display: "flex", gap: 8, marginBottom: 48, marginTop: 24 }}>
        {steps.map((_, i) => (
          <div key={i} className={`step-dot ${i <= step ? "active" : ""}`} />
        ))}
      </div>

      {/* Step content */}
      <div style={{ flex: 1, animation: "fadeIn 0.3s ease" }} key={step}>
        <h1 style={{ marginBottom: 8 }}>{steps[step].title}</h1>
        <p className="muted" style={{ marginBottom: 40 }}>{steps[step].description}</p>

        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <input
              type="number" value={formData.age}
              onChange={e => update("age", parseInt(e.target.value))}
              style={{ textAlign: "center", fontSize: 48, fontFamily: "var(--font-display)", fontWeight: 700, padding: "24px", height: "auto" }}
            />
            <p className="label">Years old</p>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <p className="label" style={{ marginBottom: 8 }}>Weight (kg)</p>
              <input type="number" value={formData.weight}
                onChange={e => update("weight", parseInt(e.target.value))}
                style={{ textAlign: "center", fontSize: 28, fontFamily: "var(--font-display)", fontWeight: 700 }}
              />
            </div>
            <div>
              <p className="label" style={{ marginBottom: 8 }}>Height (cm)</p>
              <input type="number" value={formData.height}
                onChange={e => update("height", parseInt(e.target.value))}
                style={{ textAlign: "center", fontSize: 28, fontFamily: "var(--font-display)", fontWeight: 700 }}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { val: "lose",     label: "Lose Weight",     desc: "Calorie deficit to shed fat" },
              { val: "maintain", label: "Maintain Weight", desc: "Stay at current weight" },
              { val: "gain",     label: "Gain Muscle",     desc: "Calorie surplus to build" },
            ].map(({ val, label, desc }) => (
              <button key={val} onClick={() => update("goal", val)}
                style={{ padding: "20px 24px", borderRadius: "var(--r2)", border: `1px solid ${formData.goal === val ? "var(--accent)" : "var(--border)"}`, background: formData.goal === val ? "var(--accent-glow)" : "var(--surface)", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: formData.goal === val ? "var(--accent2)" : "var(--text)", marginBottom: 4 }}>{label}</p>
                <p className="dimmer" style={{ fontSize: 13 }}>{desc}</p>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { val: "sedentary",  label: "Sedentary",   desc: "Desk job, no exercise" },
              { val: "light",      label: "Light",        desc: "1–3 days/week" },
              { val: "moderate",   label: "Moderate",     desc: "3–5 days/week" },
              { val: "active",     label: "Active",       desc: "6–7 days/week" },
              { val: "very_active",label: "Very Active",  desc: "Physical job + exercise" },
            ].map(({ val, label, desc }) => (
              <button key={val} onClick={() => update("activity", val)}
                style={{ padding: "16px 20px", borderRadius: "var(--r)", border: `1px solid ${formData.activity === val ? "var(--accent)" : "var(--border)"}`, background: formData.activity === val ? "var(--accent-glow)" : "var(--surface)", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.2s" }}>
                <span style={{ fontWeight: 500, color: formData.activity === val ? "var(--accent2)" : "var(--text)" }}>{label}</span>
                <span className="dimmer" style={{ fontSize: 13 }}>{desc}</span>
              </button>
            ))}
          </div>
        )}

        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { val: "beginner",     label: "Beginner",     desc: "Under 1 year training" },
              { val: "intermediate", label: "Intermediate", desc: "1–3 years training" },
              { val: "advanced",     label: "Advanced",     desc: "3+ years training" },
            ].map(({ val, label, desc }) => (
              <button key={val} onClick={() => update("gymLevel", val)}
                style={{ padding: "20px 24px", borderRadius: "var(--r2)", border: `1px solid ${formData.gymLevel === val ? "var(--accent)" : "var(--border)"}`, background: formData.gymLevel === val ? "var(--accent-glow)" : "var(--surface)", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: formData.gymLevel === val ? "var(--accent2)" : "var(--text)", marginBottom: 4 }}>{label}</p>
                <p className="dimmer" style={{ fontSize: 13 }}>{desc}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", gap: 12, marginTop: 40 }}>
        {step > 0 && (
          <button className="btn btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setStep(s => s - 1)}>
            <Icon d={Icons.back} size={16} /> Back
          </button>
        )}
        <button
          className="btn btn-primary"
          style={{ flex: 2, justifyContent: "center" }}
          onClick={() => step === steps.length - 1 ? handleComplete() : setStep(s => s + 1)}
        >
          {step === steps.length - 1 ? "Get Started" : "Continue"}
          <Icon d={Icons.chevRight} size={16} />
        </button>
      </div>
    </div>
  );
}