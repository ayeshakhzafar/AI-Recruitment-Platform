"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HR_THEME } from "../theme/hrProfessionalTheme";
import "../styles/hr-professional.css";

const API_BASE = "http://localhost:8000";

export default function HRSignupPage() {
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
      const res = await fetch(`${API_BASE}/api/auth/register-hr`, {
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
      navigate("/hr/dashboard", { replace: true });
    } catch {
      setError("Could not reach server. Is the API running?");
    } finally {
      setLoading(false);
    }
  };

  const th = HR_THEME;
  return (
    <div
      className="hr-professional-page"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "linear-gradient(155deg, #052e1f 0%, #0f3d26 38%, #14532d 72%, #166534 100%)",
        fontFamily: th.fontFamily,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "34px 30px",
          borderRadius: th.radiusXl,
          background: "rgba(255, 255, 255, 0.96)",
          border: "1px solid rgba(167, 243, 208, 0.45)",
          boxShadow: "0 28px 64px rgba(5, 46, 31, 0.45)",
          backdropFilter: "blur(12px)",
        }}
      >
        <h1 style={{ margin: "0 0 8px", fontSize: 24, color: th.textHeading, fontWeight: 800, letterSpacing: "-0.02em" }}>HR / recruiter sign up</h1>
        <p style={{ margin: "0 0 20px", fontSize: 15, color: th.textMuted, lineHeight: 1.55 }}>
          Creates an <strong style={{ color: th.primaryStrong }}>HR</strong> account. After registering you go straight to the HR
          dashboard. Sign in later from the same page as candidates — we send you to the right place by role.
        </p>
        {error && (
          <div
            style={{
              marginBottom: 14,
              padding: "10px 12px",
              borderRadius: th.radiusSm,
              background: "rgba(254, 226, 226, 0.95)",
              color: "#991b1b",
              fontSize: 13,
              border: "1px solid rgba(248, 113, 113, 0.45)",
            }}
          >
            {error}
          </div>
        )}
        <form onSubmit={onSubmit}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: th.textSecondary, marginBottom: 6 }}>Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={{
              width: "100%",
              marginBottom: 14,
              padding: "12px 14px",
              borderRadius: th.radiusSm,
              border: th.search.border,
              background: th.bgMuted,
              color: th.textHeading,
              boxSizing: "border-box",
            }}
          />
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: th.textSecondary, marginBottom: 6 }}>Work email</label>
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
              borderRadius: th.radiusSm,
              border: th.search.border,
              background: th.bgMuted,
              color: th.textHeading,
              boxSizing: "border-box",
            }}
          />
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: th.textSecondary, marginBottom: 6 }}>Password (min 8)</label>
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
              borderRadius: th.radiusSm,
              border: th.search.border,
              background: th.bgMuted,
              color: th.textHeading,
              boxSizing: "border-box",
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: th.radiusMd,
              border: "none",
              fontWeight: 700,
              fontSize: 15,
              cursor: loading ? "wait" : "pointer",
              ...(loading ? { background: th.textMuted, color: "#fff" } : th.buttonPrimary),
            }}
          >
            {loading ? "Creating account…" : "Create HR account"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: th.textMuted }}>
          <Link to="/login" style={{ color: th.primaryStrong, fontWeight: 600 }}>
            Sign in
          </Link>
          {" · "}
          <Link to="/candidate/signup" style={{ color: th.primary, fontWeight: 600 }}>
            Candidate sign up
          </Link>
          {" · "}
          <Link to="/" style={{ color: th.textMuted }}>
            Home
          </Link>
        </p>
      </div>
    </div>
  );
}
