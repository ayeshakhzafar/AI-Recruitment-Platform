"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

const PREFS_KEY = "recruto_notif_prefs";
const FEED_KEY = "recruto_notif_feed";

const defaultPrefs = {
  email: true,
  sms: true,
  inApp: true,
  interviewReminders: true,
  resultUpdates: true,
};

function seedFeed() {
  const now = Date.now();
  return [
    {
      id: "n1",
      type: "interview",
      title: "Interview reminder",
      body: "Technical interview with Alex Chen tomorrow at 10:00 AM (GMT+1).",
      at: now - 3600000,
      read: false,
    },
    {
      id: "n2",
      type: "result",
      title: "Assessment results published",
      body: "MCQ results for candidate j.doe@example.com are ready for review.",
      at: now - 86400000,
      read: true,
    },
    {
      id: "n3",
      type: "system",
      title: "Pipeline sync",
      body: "3 new candidates moved to the Interview stage.",
      at: now - 172800000,
      read: true,
    },
  ];
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...defaultPrefs };
    return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch {
    return { ...defaultPrefs };
  }
}

function loadFeed() {
  try {
    const raw = localStorage.getItem(FEED_KEY);
    if (!raw) {
      const s = seedFeed();
      localStorage.setItem(FEED_KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw);
  } catch {
    return seedFeed();
  }
}

function Toggle({ label, description, checked, onChange, colors }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "16px 18px",
        borderRadius: 14,
        border: `1px solid ${colors.border}`,
        background: colors.card,
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 3, width: 18, height: 18, accentColor: colors.accent }}
      />
      <div>
        <div style={{ fontWeight: 600, color: colors.text, fontSize: 15 }}>{label}</div>
        {description && (
          <div style={{ fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 1.45 }}>{description}</div>
        )}
      </div>
    </label>
  );
}

export default function NotificationsPage() {
  const { colors, isDark } = useTheme();
  const [prefs, setPrefs] = useState(loadPrefs);
  const [feed, setFeed] = useState(loadFeed);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  useEffect(() => {
    localStorage.setItem(FEED_KEY, JSON.stringify(feed));
  }, [feed]);

  const updatePref = useCallback((key, value) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  }, []);

  const markRead = useCallback((id) => {
    setFeed((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const addDemo = useCallback(
    (type) => {
      const id = `demo-${Date.now()}`;
      const row =
        type === "interview"
          ? {
              id,
              type: "interview",
              title: "Interview reminder (demo)",
              body: "A reminder would be sent via your enabled channels.",
              at: Date.now(),
              read: false,
            }
          : {
              id,
              type: "result",
              title: "Result update (demo)",
              body: "New results are available for your pipeline.",
              at: Date.now(),
              read: false,
            };
      setFeed((list) => [row, ...list]);
    },
    []
  );

  const unread = useMemo(() => feed.filter((n) => !n.read).length, [feed]);

  const typeStyle = (t) => {
    if (t === "interview") return { bg: isDark ? "rgba(52, 211, 153, 0.15)" : "#d1fae5", fg: isDark ? "#6ee7b7" : "#047857" };
    if (t === "result") return { bg: isDark ? "rgba(96, 165, 250, 0.15)" : "#dbeafe", fg: isDark ? "#93c5fd" : "#1d4ed8" };
    return { bg: isDark ? "rgba(167, 139, 250, 0.15)" : "#ede9fe", fg: isDark ? "#c4b5fd" : "#5b21b6" };
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
        <span style={{ marginLeft: "auto", fontSize: 12, color: colors.muted }}>Module 2.2.12 · Notifications</span>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 48px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Notifications
          </h1>
          <p style={{ margin: 0, color: colors.muted, fontSize: 15, maxWidth: 720, lineHeight: 1.55 }}>
            Timely communication for candidates and HR: automated alerts and reminders across email, SMS, and in-app.
            Interview reminders and result updates respect the switches below.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)",
            gap: 22,
            alignItems: "start",
          }}
          className="notifications-grid"
        >
          <style>{`
            @media (max-width: 900px) {
              .notifications-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.muted, margin: 0 }}>
              Delivery channels
            </h2>
            <Toggle
              colors={colors}
              label="Email"
              description="Real-time alerts and digests to the address on your account."
              checked={prefs.email}
              onChange={(v) => updatePref("email", v)}
            />
            <Toggle
              colors={colors}
              label="SMS"
              description="Short codes for urgent interview and result events (carrier rates may apply)."
              checked={prefs.sms}
              onChange={(v) => updatePref("sms", v)}
            />
            <Toggle
              colors={colors}
              label="In-app"
              description="Live feed below; works with your session on Recruto."
              checked={prefs.inApp}
              onChange={(v) => updatePref("inApp", v)}
            />

            <h2
              style={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: colors.muted,
                margin: "8px 0 0",
              }}
            >
              Alert types
            </h2>
            <Toggle
              colors={colors}
              label="Interview reminders"
              description="Upcoming slots, reschedule notices, and calendar sync."
              checked={prefs.interviewReminders}
              onChange={(v) => updatePref("interviewReminders", v)}
            />
            <Toggle
              colors={colors}
              label="Result updates"
              description="When assessments, coding, or interview outcomes are ready."
              checked={prefs.resultUpdates}
              onChange={(v) => updatePref("resultUpdates", v)}
            />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
              <button
                type="button"
                onClick={() => addDemo("interview")}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  background: colors.accentSoft,
                  color: colors.text,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Simulate interview alert
              </button>
              <button
                type="button"
                onClick={() => addDemo("result")}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  background: colors.card,
                  color: colors.text,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Simulate result update
              </button>
            </div>
          </div>

          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${colors.border}`,
              background: colors.card,
              overflow: "hidden",
              minHeight: 420,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "16px 18px",
                borderBottom: `1px solid ${colors.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 16 }}>In-app feed</span>
              <span style={{ fontSize: 12, color: colors.muted }}>
                {unread > 0 ? `${unread} unread` : "All caught up"}
              </span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", maxHeight: 520 }}>
              {!prefs.inApp && (
                <div style={{ padding: 20, color: colors.muted, fontSize: 14 }}>
                  In-app notifications are turned off. Enable “In-app” above to use this feed.
                </div>
              )}
              {prefs.inApp &&
                feed.map((n) => {
                  const ts = typeStyle(n.type);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => !n.read && markRead(n.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "14px 18px",
                        border: "none",
                        borderBottom: `1px solid ${colors.border}`,
                        background: n.read ? "transparent" : colors.accentSoft,
                        cursor: n.read ? "default" : "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: ts.bg,
                            color: ts.fg,
                          }}
                        >
                          {n.type === "interview" ? "Interview" : n.type === "result" ? "Results" : "System"}
                        </span>
                        <span style={{ fontSize: 12, color: colors.muted }}>
                          {new Date(n.at).toLocaleString()}
                        </span>
                        {!n.read && (
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: colors.accent,
                              marginLeft: "auto",
                            }}
                          />
                        )}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{n.title}</div>
                      <div style={{ fontSize: 14, color: colors.muted, lineHeight: 1.45 }}>{n.body}</div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        <p style={{ marginTop: 28, fontSize: 12, color: colors.muted, lineHeight: 1.5 }}>
          Production deployments connect these preferences to your messaging provider (SMTP, SMS gateway) and WebSocket or
          SSE for real-time in-app delivery. Preferences are stored in this browser for demonstration.
        </p>
      </div>
    </div>
  );
}
