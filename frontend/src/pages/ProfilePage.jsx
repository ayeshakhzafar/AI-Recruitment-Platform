"use client";

import { Link } from "react-router-dom";

/** Module 2.2.11 — candidate self-service lives on the dedicated portal. */
export default function ProfilePage() {
  return (
    <div style={{ padding: "40px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 12px", color: "#0f172a" }}>User profile (2.2.11)</h1>
      <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.6, marginBottom: 24 }}>
        Employee and candidate dashboards — personal data, application progress, and account updates — are on the{" "}
        <strong>candidate portal</strong>. Create an account, apply to HR job postings, and track your status there.
      </p>
      <Link
        to="/candidate"
        style={{
          display: "inline-block",
          padding: "12px 22px",
          borderRadius: 12,
          background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
          color: "#fff",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Go to candidate portal
      </Link>
      <p style={{ marginTop: 20, fontSize: 14 }}>
        <Link to="/" style={{ color: "#6366f1" }}>
          ← Home
        </Link>
      </p>
    </div>
  );
}
