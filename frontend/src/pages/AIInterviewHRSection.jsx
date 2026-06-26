import { useState, useEffect, useCallback } from "react";
import InterviewReportModal, { normalizeDbRowToSession } from "../components/InterviewReportModal";
import { HR_THEME } from "../theme/hrProfessionalTheme";
import "../styles/hr-professional.css";

const API_BASE = "http://localhost:8000";

/**
 * HR overview of all AI interview sessions (table + preview / full report modals).
 * Shown under the dedicated "Interviews" module in HR Dashboard.
 */
export default function AIInterviewHRSection({ refreshKey = 0 }) {
  const [interviewSessions, setInterviewSessions] = useState([]);
  const [interviewReportPreview, setInterviewReportPreview] = useState(null);
  const [interviewFullReportSession, setInterviewFullReportSession] = useState(null);

  const fetchInterviewSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/hr/interview-sessions-overview`);
      if (res.ok) {
        const data = await res.json();
        setInterviewSessions(data.sessions || []);
      }
    } catch (err) {
      console.error("Failed to fetch interview sessions:", err);
    }
  }, []);

  useEffect(() => {
    fetchInterviewSessions();
  }, [fetchInterviewSessions, refreshKey]);

  const openInterviewReportPreview = async (sessionId) => {
    setInterviewReportPreview(null);
    try {
      const res = await fetch(`${API_BASE}/api/interview/report/${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || "Could not load report");
        return;
      }
      setInterviewReportPreview({ sessionId, ...data });
    } catch (err) {
      console.error(err);
      alert("Failed to load interview report");
    }
  };

  const openInterviewFullReport = async (sessionId) => {
    try {
      const res = await fetch(`${API_BASE}/api/interview/session/${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (!res.ok || !data.success || !data.session) {
        alert(data.detail || data.error || "Could not load interview session");
        return;
      }
      setInterviewFullReportSession(normalizeDbRowToSession(data.session));
    } catch (err) {
      console.error(err);
      alert("Failed to load interview report");
    }
  };

  const th = HR_THEME;
  return (
    <>
      <div
        className="hr-professional-page"
        style={{
          background: th.bgCard,
          borderRadius: th.radiusLg,
          boxShadow: th.shadowCard,
          border: th.borderSubtle,
          padding: 16,
          marginTop: 0,
          fontFamily: th.fontFamily,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <h3 style={{ fontSize: 19, fontWeight: 800, color: th.textHeading, margin: 0, letterSpacing: "-0.02em" }}>
            AI interview — HR overview
          </h3>
          <button
            type="button"
            onClick={fetchInterviewSessions}
            style={{
              padding: "10px 18px",
              ...th.buttonPrimary,
              borderRadius: th.radiusPill,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Refresh
          </button>
        </div>
        <p style={{ fontSize: 14, color: th.textMuted, marginTop: 0, marginBottom: 16, lineHeight: 1.55 }}>
          Every interview session (in progress or completed). Overall score and HR report appear after the candidate
          completes the interview.
        </p>
        {interviewSessions.length === 0 ? (
          <p style={{ color: th.textMuted, fontSize: 14 }}>No interview sessions yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: th.bgMuted, borderBottom: th.divider }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: th.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Candidate
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                    Role
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                    Status
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                    Score
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                    Report
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                    Started
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                    Ended
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {interviewSessions.map((row) => (
                  <tr key={row.session_id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>
                      <div style={{ fontWeight: 600, color: "#111" }}>{row.candidate_email}</div>
                      {row.candidate_name && (
                        <div style={{ fontSize: 12, color: "#64748b" }}>{row.candidate_name}</div>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#475569" }}>{row.job_role || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          background:
                            row.status === "completed"
                              ? "#dcfce7"
                              : row.status === "initiated" || row.status === "in_progress"
                                ? "#fef9c3"
                                : "#f1f5f9",
                          color:
                            row.status === "completed"
                              ? "#166534"
                              : row.status === "initiated" || row.status === "in_progress"
                                ? "#854d0e"
                                : "#475569",
                        }}
                      >
                        {row.status || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 800, color: row.overall_score >= 70 ? "#059669" : row.overall_score >= 40 ? "#d97706" : "#dc2626" }}>
                      {row.overall_score != null ? `${Number(row.overall_score).toFixed(1)}` : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>
                      {row.has_hr_report ? (
                        <span style={{ color: "#10b981", fontWeight: 600 }}>✓ Ready</span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#64748b" }}>
                      {row.start_time ? new Date(row.start_time).toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#64748b" }}>
                      {row.end_time ? new Date(row.end_time).toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, verticalAlign: "top" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
                        <button
                          type="button"
                          disabled={!row.has_hr_report}
                          title={
                            row.has_hr_report
                              ? "Preview saved HR report in a modal"
                              : "Report is available after the candidate completes the interview"
                          }
                          onClick={() => openInterviewReportPreview(row.session_id)}
                          style={{
                            padding: "6px 12px",
                            background: row.has_hr_report ? "#10b981" : "#e2e8f0",
                            color: row.has_hr_report ? "#fff" : "#94a3b8",
                            border: "none",
                            borderRadius: 6,
                            cursor: row.has_hr_report ? "pointer" : "not-allowed",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          Preview report
                        </button>
                        <button
                          type="button"
                          title={
                            row.has_hr_report
                              ? "Open full HR report (summary, scores, Q&A) here"
                              : "Full report appears when the candidate finishes and the report is generated"
                          }
                          onClick={() => openInterviewFullReport(row.session_id)}
                          style={{
                            padding: "6px 12px",
                            background: "#3b82f6",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          View report
                        </button>
                        <button
                          type="button"
                          title="Open raw session row from API (JSON)"
                          onClick={() =>
                            window.open(
                              `${API_BASE}/api/interview/session/${encodeURIComponent(row.session_id)}`,
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                          style={{
                            padding: "6px 12px",
                            background: "#fff",
                            color: "#475569",
                            border: "1px solid #cbd5e1",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          Raw JSON
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {interviewReportPreview && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setInterviewReportPreview(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 560,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              padding: 24,
              boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
              }}
            >
              <h4 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Interview report preview</h4>
              <button
                type="button"
                onClick={() => setInterviewReportPreview(null)}
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  borderRadius: 8,
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Close
              </button>
            </div>
            {(() => {
              const r = interviewReportPreview.report || {};
              const overall =
                interviewReportPreview.overall_score != null
                  ? Number(interviewReportPreview.overall_score)
                  : r.overall_score != null
                    ? Number(r.overall_score)
                    : null;
              return (
                <>
                  <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>
                    Session <code style={{ fontSize: 12 }}>{interviewReportPreview.sessionId}</code>
                    {r.candidate_name != null && r.candidate_name !== "" ? ` · ${r.candidate_name}` : ""}
                    {r.job_role != null && r.job_role !== "" ? ` · ${r.job_role}` : ""}
                  </p>
                  {overall != null && !Number.isNaN(overall) && (
                    <p style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 800, color: "#4f46e5" }}>
                      Overall score: {overall.toFixed(1)}
                    </p>
                  )}
                  {r.recommendation != null && r.recommendation !== "" && (
                    <p style={{ margin: "0 0 12px", fontSize: 14, color: "#0f172a" }}>
                      <strong>Recommendation:</strong> {r.recommendation}
                    </p>
                  )}
                  {r.behavioral_summary != null && r.behavioral_summary !== "" && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Summary</div>
                      <p style={{ margin: 0, fontSize: 14, color: "#334155", lineHeight: 1.5 }}>{r.behavioral_summary}</p>
                    </div>
                  )}
                  {Array.isArray(r.strengths) && r.strengths.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#065f46", marginBottom: 4 }}>Strengths</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "#334155" }}>
                        {r.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(r.weaknesses) && r.weaknesses.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#9a3412", marginBottom: 4 }}>Weaknesses</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "#334155" }}>
                        {r.weaknesses.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {r.hiring_decision_notes != null && r.hiring_decision_notes !== "" && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Notes</div>
                      <p style={{ margin: 0, fontSize: 14, color: "#334155", lineHeight: 1.5 }}>{r.hiring_decision_notes}</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {interviewFullReportSession && (
        <InterviewReportModal
          session={interviewFullReportSession}
          onClose={() => setInterviewFullReportSession(null)}
          showStartNewInterviewButton={false}
        />
      )}
    </>
  );
}
