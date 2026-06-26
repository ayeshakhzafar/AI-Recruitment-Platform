"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE } from "../config/apiBase";

export default function CandidateSignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register-candidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: fullName.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.detail === "string" ? data.detail : "Registration failed");
        return;
      }
      if (data.access_token) {
        localStorage.setItem("recruto_token", data.access_token);
        localStorage.setItem("recruto_user", JSON.stringify(data.user || {}));
      }
      navigate("/candidate/dashboard", { replace: true });
    } catch {
      setError(
        "Could not reach the API. Start the backend (uvicorn) and open the app via npm run dev so requests use the /api proxy."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "linear-gradient(160deg, #0c4a6e 0%, #0f172a 50%, #312e81 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "32px 28px",
          borderRadius: 18,
          background: "rgba(15, 23, 42, 0.85)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
        }}
      >
        <h1 style={{ margin: "0 0 8px", fontSize: 22, color: "#f8fafc", fontWeight: 800 }}>Candidate sign up</h1>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "#94a3b8" }}>
          Use the same sign-in page later with this email. HR accounts use a different role.
        </p>
        {error && (
          <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(127,29,29,0.35)", color: "#fecaca", fontSize: 13 }}>
            {error}
          </div>
        )}
        <form onSubmit={onSubmit}>
          <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={{
              width: "100%",
              marginBottom: 14,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(148,163,184,0.25)",
              background: "rgba(15,23,42,0.6)",
              color: "#f8fafc",
              boxSizing: "border-box",
            }}
          />
          <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              marginBottom: 14,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(148,163,184,0.25)",
              background: "rgba(15,23,42,0.6)",
              color: "#f8fafc",
              boxSizing: "border-box",
            }}
          />
          <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Password (min 8)</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            style={{
              width: "100%",
              marginBottom: 22,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(148,163,184,0.25)",
              background: "rgba(15,23,42,0.6)",
              color: "#f8fafc",
              boxSizing: "border-box",
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: 10,
              border: "none",
              fontWeight: 700,
              fontSize: 15,
              cursor: loading ? "wait" : "pointer",
              background: loading ? "#475569" : "linear-gradient(135deg, #0ea5e9, #6366f1)",
              color: "#fff",
            }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14 }}>
          <Link to="/candidate" style={{ color: "#7dd3fc" }}>
            ← Candidate home
          </Link>
          {" · "}
          <Link to="/login" style={{ color: "#94a3b8" }}>
            Already have an account?
          </Link>
        </p>
      </div>
    </div>
  );
}
