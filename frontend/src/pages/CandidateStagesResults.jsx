import { useState, useEffect, useCallback } from "react";
import { HR_THEME } from "../theme/hrProfessionalTheme";
import "../styles/hr-professional.css";
import { API_BASE } from "../config/apiBase";

function fmtScore(v) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return `${Number(v).toFixed(1)}%`;
}

export default function CandidateStagesResults() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: "", message: "" });

  const openEmailModal = (candidate) => {
    setSelectedCandidate(candidate);
    setEmailForm({
      subject: "Update on Your Job Application",
      message: `<p>Dear ${candidate.name},</p>\n<p>Congratulations! You have been selected for this role and your onboarding will start from next week.</p>\n<p>Please let us know if you have any questions.</p>\n<br>\n<p>Best regards,<br>The HR Team</p>`
    });
    setShowEmailModal(true);
  };

  const handleSendEmail = async () => {
    if (!selectedCandidate || !emailForm.subject || !emailForm.message) {
      alert("Please fill in all fields.");
      return;
    }
    setSendingEmail(true);
    try {
      const res = await fetch(`${API_BASE}/api/hr/send-status-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedCandidate.email,
          subject: emailForm.subject,
          message_html: emailForm.message
        })
      });
      const data = await res.json();
      if (!res.ok) {
        const d = data.detail;
        const msg =
          typeof d === "string"
            ? d
            : Array.isArray(d)
              ? d.map((x) => (typeof x === "string" ? x : x.msg || JSON.stringify(x))).join(" ")
              : data.error || "Failed to send email";
        throw new Error(msg);
      }
      alert("Email sent successfully!");
      setShowEmailModal(false);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Error sending email.");
    } finally {
      setSendingEmail(false);
    }
  };

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/hr/candidate-stages`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Failed to load");
        setCandidates([]);
        return;
      }
      setCandidates(data.candidates || []);
    } catch (e) {
      console.error(e);
      setError("Could not reach server");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const th = HR_THEME;
  return (
    <div className="hr-professional-page" style={{ maxWidth: 1200, margin: "0 auto", fontFamily: th.fontFamily }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800, color: th.textHeading, letterSpacing: "-0.02em" }}>
            Candidate results — all stages
          </h2>
          <p style={{ margin: 0, fontSize: 15, color: th.textMuted, maxWidth: 720, lineHeight: 1.55 }}>
            Rows are keyed by <strong>email</strong>. Candidates must use the same email for the technical
            assessment, coding challenge, and AI interview so scores align. AI interview emails are collected on the
            interview start screen.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          style={{
            padding: "10px 18px",
            background: loading ? "#94a3b8" : "#4f46e5",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 14,
          }}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            color: "#b91c1c",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {loading && candidates.length === 0 ? (
        <p style={{ color: "#64748b" }}>Loading candidate data…</p>
      ) : candidates.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 40,
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <p style={{ color: "#64748b", margin: 0 }}>
            No assessment, coding, or interview records found yet. Data appears here once candidates complete at least
            one stage.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ textAlign: "left", padding: "12px 14px", color: "#64748b", fontWeight: 600 }}>Candidate</th>
                <th style={{ textAlign: "left", padding: "12px 14px", color: "#64748b", fontWeight: 600 }}>Email</th>
                <th style={{ textAlign: "left", padding: "12px 14px", color: "#64748b", fontWeight: 600 }}>Assessment</th>
                <th style={{ textAlign: "left", padding: "12px 14px", color: "#64748b", fontWeight: 600 }}>Coding</th>
                <th style={{ textAlign: "left", padding: "12px 14px", color: "#64748b", fontWeight: 600 }}>AI interview</th>
                <th style={{ textAlign: "right", padding: "12px 14px", color: "#64748b", fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const a = c.assessment;
                const g = c.coding;
                const i = c.interview;
                return (
                  <tr key={c.email} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: "#0f172a" }}>{c.name}</td>
                    <td style={{ padding: "12px 14px", color: "#475569", wordBreak: "break-all" }}>{c.email}</td>
                    <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                      {a ? (
                        <div>
                          <div style={{ fontWeight: 700, color: "#4f46e5" }}>{fmtScore(a.score_percentage)}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{a.grade || "—"} · {a.role || "—"}</div>
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                      {g ? (
                        <div>
                          <div style={{ fontWeight: 700, color: "#059669" }}>{fmtScore(g.score)}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            {g.challenge_title || "Challenge"}
                            {g.violations ? ` · ${g.violations} violations` : ""}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                      {i ? (
                        <div>
                          <div style={{ fontWeight: 700, color: "#d97706" }}>{fmtScore(i.overall_score)}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            {i.status || "—"}
                            {i.job_role ? ` · ${i.job_role}` : ""}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px", verticalAlign: "top", textAlign: "right" }}>
                      <button
                        onClick={() => openEmailModal(c)}
                        style={{
                          background: "#0f172a",
                          color: "#fff",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6
                        }}
                      >
                        ✉️ Send Email
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showEmailModal && selectedCandidate && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: 24, borderRadius: 12, width: 500, maxWidth: "90%", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Decision Email</h3>
              <button onClick={() => setShowEmailModal(false)} style={{ background: "transparent", border: "none", fontSize: 16, cursor: "pointer" }}>✖</button>
            </div>
            
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>
              To: <strong>{selectedCandidate.name} ({selectedCandidate.email})</strong>
            </p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Subject</label>
              <input 
                type="text" 
                value={emailForm.subject}
                onChange={e => setEmailForm({...emailForm, subject: e.target.value})}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontFamily: "inherit" }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Message (HTML supported)</label>
              <textarea 
                rows={8}
                value={emailForm.message}
                onChange={e => setEmailForm({...emailForm, message: e.target.value})}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontFamily: "inherit", resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setShowEmailModal(false)} style={{ padding: "8px 16px", border: "1px solid #cbd5e1", background: "white", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSendEmail} disabled={sendingEmail} style={{ padding: "8px 16px", border: "none", background: sendingEmail ? "#94a3b8" : "#4f46e5", color: "white", borderRadius: 6, cursor: sendingEmail ? "not-allowed" : "pointer" }}>
                {sendingEmail ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
