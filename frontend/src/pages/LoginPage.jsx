"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { API_BASE } from "../config/apiBase";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || "Login failed");
        return;
      }
      if (data.access_token) {
        localStorage.setItem("recruto_token", data.access_token);
        localStorage.setItem("recruto_user", JSON.stringify(data.user || {}));
      }
      const role = String(data.user?.role || "").toLowerCase();
      if (role === "candidate") {
        navigate("/candidate/dashboard", { replace: true });
      } else {
        navigate("/hr/dashboard", { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError(
        "Could not reach the API. Start the backend (e.g. uvicorn in the backend folder) and use npm run dev so /api is proxied."
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
        background:
          "linear-gradient(145deg, #0f172a 0%, #1e1b4b 35%, #312e81 65%, #0f172a 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        style={{
          width: "100%",
          maxWidth: 400,
          padding: "32px 28px",
          borderRadius: 18,
          background: "rgba(15, 23, 42, 0.75)",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              fontSize: 13,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#a5b4fc",
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            RECRUTO
          </div>
          <h1 style={{ margin: 0, fontSize: 22, color: "#f1f5f9", fontWeight: 700 }}>Sign in</h1>
          <p style={{ margin: "10px 0 0", fontSize: 14, color: "#94a3b8", lineHeight: 1.5 }}>
            One login for everyone. After you sign in: <strong style={{ color: "#e2e8f0" }}>HR</strong> goes to the
            recruitment dashboard; <strong style={{ color: "#e2e8f0" }}>candidates</strong> go to the candidate portal.
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 12px",
              borderRadius: 8,
              background: "rgba(127, 29, 29, 0.35)",
              color: "#fecaca",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Email</label>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              marginBottom: 16,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(148, 163, 184, 0.25)",
              background: "rgba(15, 23, 42, 0.6)",
              color: "#f8fafc",
              fontSize: 15,
              boxSizing: "border-box",
            }}
          />
          <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              marginBottom: 22,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(148, 163, 184, 0.25)",
              background: "rgba(15, 23, 42, 0.6)",
              color: "#f8fafc",
              fontSize: 15,
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
              fontWeight: 600,
              fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer",
              background: loading ? "#475569" : "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "#fff",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(148,163,184,0.2)" }}>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "#94a3b8", textAlign: "center" }}>New here?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Link
              to="/hr/signup"
              style={{
                display: "block",
                textAlign: "center",
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(236, 72, 153, 0.15)",
                border: "1px solid rgba(236, 72, 153, 0.35)",
                color: "#f9a8d4",
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Create HR / recruiter account
            </Link>
            <Link
              to="/candidate/signup"
              style={{
                display: "block",
                textAlign: "center",
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(56, 189, 248, 0.1)",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                color: "#7dd3fc",
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Create candidate account
            </Link>
          </div>
        </div>
        <p style={{ textAlign: "center", marginTop: 18, fontSize: 14 }}>
          <Link to="/" style={{ color: "#a5b4fc", textDecoration: "none", fontWeight: 500 }}>
            ← Back to landing
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
