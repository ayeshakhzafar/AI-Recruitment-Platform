"use client";

import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function CandidateWelcomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("recruto_token");
    let u = null;
    try {
      u = JSON.parse(localStorage.getItem("recruto_user") || "null");
    } catch {
      u = null;
    }
    if (token && u && String(u.role || "").toLowerCase() === "candidate") {
      navigate("/candidate/dashboard", { replace: true });
    }
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0c4a6e 0%, #0f172a 45%, #1e1b4b 100%)",
        color: "#f8fafc",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <p style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7dd3fc", fontWeight: 700 }}>
          Module 2.2.11 · Candidate portal
        </p>
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: "12px 0 16px", letterSpacing: "-0.03em" }}>
          Your applications, in one place
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.65, color: "#cbd5e1", marginBottom: 32 }}>
          Create an account to apply to roles published by HR, track where each application stands, and update your name or
          password anytime.
        </p>
        <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 20 }}>
          Already have an account? Use <strong style={{ color: "#e2e8f0" }}>Sign in</strong> — candidates are sent to this
          portal; HR users are sent to the recruitment dashboard automatically.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          <Link
            to="/candidate/signup"
            style={{
              padding: "14px 26px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
              color: "#fff",
              fontWeight: 700,
              textDecoration: "none",
              fontSize: 15,
            }}
          >
            Create account
          </Link>
          <Link
            to="/login"
            style={{
              padding: "14px 26px",
              borderRadius: 12,
              border: "1px solid rgba(248, 250, 252, 0.35)",
              color: "#f8fafc",
              fontWeight: 600,
              textDecoration: "none",
              fontSize: 15,
            }}
          >
            Sign in
          </Link>
          <Link to="/" style={{ alignSelf: "center", color: "#94a3b8", fontSize: 14 }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
