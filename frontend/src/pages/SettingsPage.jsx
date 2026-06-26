"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

const API_BASE = "http://localhost:8000";
const SETTINGS_KEY = "recruto_system_settings_v1";

const ROLES = [
  { id: "admin", label: "Admin", description: "Full system access and user management." },
  { id: "recruiter", label: "Recruiter", description: "Pipeline, candidates, and assessments." },
  { id: "user", label: "User", description: "Candidate-facing or limited self-service." },
  { id: "manager", label: "Manager", description: "Approvals, reporting, and team oversight." },
];

const defaultSettings = {
  uiRole: "recruiter",
  workflowInterviewApproval: true,
  workflowOfferApproval: true,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

export default function SettingsPage() {
  const { colors, theme, setTheme, isDark } = useTheme();
  const [settings, setSettings] = useState(loadSettings);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwStatus, setPwStatus] = useState({ ok: false, message: "" });
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const token = typeof window !== "undefined" ? localStorage.getItem("recruto_token") : null;

  const onChangePassword = async (e) => {
    e.preventDefault();
    setPwStatus({ ok: false, message: "" });
    if (newPassword.length < 8) {
      setPwStatus({ ok: false, message: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwStatus({ ok: false, message: "New password and confirmation do not match." });
      return;
    }
    if (!token) {
      setPwStatus({ ok: false, message: "Sign in from Login to change your password." });
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwStatus({ ok: false, message: data.detail || "Could not update password." });
        return;
      }
      setPwStatus({ ok: true, message: data.message || "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPwStatus({ ok: false, message: "Could not reach API. Is the server running?" });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, transition: "background 0.2s" }}>
      <div
        style={{
          borderBottom: `1px solid ${colors.border}`,
          background: colors.card,
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Link to="/" style={{ color: colors.accent, textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
          ← Home
        </Link>
        <Link to="/hr/dashboard" style={{ color: colors.muted, textDecoration: "none", fontSize: 14 }}>
          HR Dashboard
        </Link>
        <span style={{ marginLeft: "auto", fontSize: 12, color: colors.muted }}>Module 2.2.13 · System Settings</span>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 48px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          System Settings
        </h1>
        <p style={{ margin: "0 0 28px", color: colors.muted, fontSize: 15, lineHeight: 1.55 }}>
          Personalize workflows, appearance, and security. Access roles align with Admin, Recruiter, User, and Manager;
          production systems enforce roles from your account (JWT); the selector below is for UI defaults and demos.
        </p>

        <section
          style={{
            borderRadius: 16,
            border: `1px solid ${colors.border}`,
            background: colors.card,
            padding: 22,
            marginBottom: 18,
          }}
        >
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.muted, margin: "0 0 14px" }}>
            Access roles
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ROLES.map((r) => (
              <label
                key={r.id}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: `1px solid ${settings.uiRole === r.id ? colors.accent : colors.border}`,
                  background: settings.uiRole === r.id ? colors.accentSoft : "transparent",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="uiRole"
                  checked={settings.uiRole === r.id}
                  onChange={() => setSettings((s) => ({ ...s, uiRole: r.id }))}
                  style={{ marginTop: 3, accentColor: colors.accent }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.label}</div>
                  <div style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>{r.description}</div>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section
          style={{
            borderRadius: 16,
            border: `1px solid ${colors.border}`,
            background: colors.card,
            padding: 22,
            marginBottom: 18,
          }}
        >
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.muted, margin: "0 0 14px" }}>
            Configurable workflows
          </h2>
          <label style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.workflowInterviewApproval}
              onChange={(e) => setSettings((s) => ({ ...s, workflowInterviewApproval: e.target.checked }))}
              style={{ width: 18, height: 18, accentColor: colors.accent }}
            />
            <span style={{ fontSize: 15 }}>
              Require manager approval before interviews are confirmed with candidates
            </span>
          </label>
          <label style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.workflowOfferApproval}
              onChange={(e) => setSettings((s) => ({ ...s, workflowOfferApproval: e.target.checked }))}
              style={{ width: 18, height: 18, accentColor: colors.accent }}
            />
            <span style={{ fontSize: 15 }}>Require approval step before offers are sent</span>
          </label>
        </section>

        <section
          style={{
            borderRadius: 16,
            border: `1px solid ${colors.border}`,
            background: colors.card,
            padding: 22,
            marginBottom: 18,
          }}
        >
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.muted, margin: "0 0 14px" }}>
            Appearance
          </h2>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Dark theme</div>
              <div style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
                Applies across Recruto (global background and these screens).
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              style={{
                padding: "10px 20px",
                borderRadius: 999,
                border: `1px solid ${colors.border}`,
                background: colors.accentSoft,
                color: colors.text,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {theme === "dark" ? "Switch to light" : "Switch to dark"}
            </button>
          </div>
        </section>

        <section
          style={{
            borderRadius: 16,
            border: `1px solid ${colors.border}`,
            background: colors.card,
            padding: 22,
          }}
        >
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.muted, margin: "0 0 14px" }}>
            Password
          </h2>
          <p style={{ fontSize: 14, color: colors.muted, margin: "0 0 16px", lineHeight: 1.5 }}>
            Change the password for your logged-in HR account. You must be signed in (token in browser).
          </p>
          <form onSubmit={onChangePassword} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                background: colors.bg,
                color: colors.text,
                fontSize: 15,
              }}
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="New password (min. 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                background: colors.bg,
                color: colors.text,
                fontSize: 15,
              }}
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                background: colors.bg,
                color: colors.text,
                fontSize: 15,
              }}
            />
            <button
              type="submit"
              disabled={pwLoading}
              style={{
                padding: "12px 18px",
                borderRadius: 10,
                border: "none",
                background: `linear-gradient(135deg, ${colors.accent}, #a855f7)`,
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: pwLoading ? "wait" : "pointer",
                opacity: pwLoading ? 0.75 : 1,
              }}
            >
              {pwLoading ? "Updating…" : "Change password"}
            </button>
            {pwStatus.message && (
              <p style={{ margin: 0, fontSize: 14, color: pwStatus.ok ? "#16a34a" : "#dc2626" }}>{pwStatus.message}</p>
            )}
            {!token && (
              <p style={{ margin: 0, fontSize: 13, color: colors.muted }}>
                <Link to="/login" style={{ color: colors.accent }}>
                  Log in
                </Link>{" "}
                first to use password change.
              </p>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}
