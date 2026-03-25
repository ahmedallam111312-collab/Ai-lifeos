import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { Icon, Icons } from "./globals";

/**
 * Auth page — sign in or sign up with email + password.
 * Props: none (reads/writes via Firebase auth)
 */
export default function Auth() {
  const [isLogin, setIsLogin]   = useState(true);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, animation: "fadeIn 0.4s ease" }}>

        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 48 }}>
          <div style={{ width: 64, height: 64, background: "var(--accent)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 16px 40px rgba(124,111,239,0.45)" }}>
            <Icon d={Icons.flame} size={32} style={{ color: "white" }} />
          </div>
          <h1 style={{ fontSize: 32, marginBottom: 6 }}>AI LifeOS</h1>
          <p className="muted" style={{ fontSize: 14 }}>Your intelligent companion for a better life</p>
        </div>

        {/* Card */}
        <div className="card" style={{ borderRadius: "var(--r3)" }}>
          <h2 style={{ marginBottom: 24 }}>{isLogin ? "Welcome back" : "Create account"}</h2>

          {error && (
            <div style={{ padding: "12px 16px", background: "var(--red2)", border: "1px solid rgba(255,94,94,0.2)", borderRadius: "var(--r)", color: "var(--red)", fontSize: 13, marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <p className="label" style={{ marginBottom: 8 }}>Email address</p>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <p className="label" style={{ marginBottom: 8 }}>Password</p>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", marginTop: 8, height: 48 }}
            >
              {loading ? (
                <span style={{ display: "inline-block", width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              ) : (
                isLogin ? "Sign In" : "Sign Up"
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="btn btn-ghost"
            style={{ width: "100%", justifyContent: "center", marginTop: 12, fontSize: 13 }}
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}