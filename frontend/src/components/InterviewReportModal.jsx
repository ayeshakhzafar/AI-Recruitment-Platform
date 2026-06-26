/**
 * Full HR interview report (summary, scores, Q&A). Shared by InterviewsPage and HRDashboard.
 */

function safeParseJson(val, fallback) {
  if (val == null || val === "") return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export function normalizeDbRowToSession(raw) {
  const hr = safeParseJson(raw.hr_report_json, {});
  const questions = safeParseJson(raw.questions_json, []);
  const responses = safeParseJson(raw.responses_json, []);
  const score = raw.overall_score != null ? Number(raw.overall_score) : 0;
  return {
    session_id: raw.session_id,
    candidate_email: raw.candidate_email,
    candidate_name: raw.candidate_name || "N/A",
    job_role: raw.job_role,
    status: raw.status,
    overall_score: Number.isFinite(score) ? score : 0,
    end_time: raw.end_time,
    created_at: raw.created_at,
    hr_report: hr && typeof hr === "object" && !Array.isArray(hr) ? hr : {},
    questions: Array.isArray(questions) ? questions : [],
    responses: Array.isArray(responses) ? responses : [],
  };
}

function formatQuestionText(q, idx) {
  if (q == null) return `Question ${idx + 1}`;
  if (typeof q === "string") return q;
  if (typeof q === "object" && q.question_text != null) return String(q.question_text);
  try {
    return JSON.stringify(q);
  } catch {
    return `Question ${idx + 1}`;
  }
}

function formatAnswerText(r) {
  if (r == null) return "";
  if (typeof r === "string") return r;
  if (typeof r === "object") {
    if (r.candidate_transcript != null) return String(r.candidate_transcript);
    if (r.transcript != null) return String(r.transcript);
    if (r.answer != null) return String(r.answer);
  }
  try {
    return JSON.stringify(r);
  } catch {
    return "";
  }
}

function getScoreColor(score) {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function getScoreLabel(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Satisfactory";
  return "Needs Improvement";
}

export default function InterviewReportModal({
  session: selectedSession,
  onClose,
  showStartNewInterviewButton = true,
}) {
  if (!selectedSession) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "32px",
          width: "100%",
          maxWidth: "900px",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            paddingBottom: "16px",
            borderBottom: "2px solid #e5e7eb",
          }}
        >
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "700", margin: "0 0 8px 0", color: "#111" }}>
              📊 Interview Report
            </h2>
            <p style={{ color: "#6b7280", margin: 0 }}>
              {selectedSession.candidate_name} - {selectedSession.candidate_email}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "36px",
                fontWeight: "800",
                color: getScoreColor(Number(selectedSession.overall_score) || 0),
              }}
            >
              {(Number(selectedSession.overall_score) || 0).toFixed(0)}%
            </div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>
              {getScoreLabel(Number(selectedSession.overall_score) || 0)}
            </div>
          </div>
        </div>

        {selectedSession.hr_report && Object.keys(selectedSession.hr_report).length > 0 ? (
          <div>
            <div
              style={{
                background: "#f9fafb",
                padding: "20px",
                borderRadius: "12px",
                marginBottom: "24px",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>📝 Summary</h3>
              <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#374151" }}>
                {selectedSession.hr_report.summary ||
                  selectedSession.hr_report.overall_summary ||
                  selectedSession.hr_report.behavioral_summary ||
                  "No summary available"}
              </p>
            </div>

            {selectedSession.hr_report.scores &&
            typeof selectedSession.hr_report.scores === "object" &&
            !Array.isArray(selectedSession.hr_report.scores) ? (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>
                  📈 Score Breakdown
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {Object.entries(selectedSession.hr_report.scores).map(([key, value]) => {
                    const num = Number(value);
                    const safe = Number.isFinite(num) ? num : 0;
                    return (
                      <div
                        key={key}
                        style={{
                          background: "#fff",
                          padding: "16px",
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "24px",
                            fontWeight: "700",
                            color: getScoreColor(safe),
                          }}
                        >
                          {safe.toFixed(0)}%
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            textTransform: "capitalize",
                          }}
                        >
                          {key.replace(/_/g, " ")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              ["technical_score", "communication_score", "behavioral_score", "video_integrity_score"].some(
                (k) => selectedSession.hr_report[k] != null
              ) && (
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>
                    📈 Score Breakdown
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    {[
                      ["Technical", "technical_score"],
                      ["Communication", "communication_score"],
                      ["Behavioral", "behavioral_score"],
                      ["Video integrity", "video_integrity_score"],
                    ].map(([label, key]) =>
                      selectedSession.hr_report[key] != null ? (
                        <div
                          key={key}
                          style={{
                            background: "#fff",
                            padding: "16px",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "24px",
                              fontWeight: "700",
                              color: getScoreColor(Number(selectedSession.hr_report[key]) || 0),
                            }}
                          >
                            {(Number(selectedSession.hr_report[key]) || 0).toFixed(0)}
                          </div>
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>{label}</div>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )
            )}

            {selectedSession.hr_report.strengths && selectedSession.hr_report.strengths.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    marginBottom: "12px",
                    color: "#10b981",
                  }}
                >
                  💪 Strengths
                </h3>
                <ul style={{ paddingLeft: "20px", color: "#374151" }}>
                  {selectedSession.hr_report.strengths.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: "8px", fontSize: "14px" }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(() => {
              const items = selectedSession.hr_report.areas_for_improvement?.length
                ? selectedSession.hr_report.areas_for_improvement
                : selectedSession.hr_report.weaknesses || [];
              if (!items.length) return null;
              return (
                <div style={{ marginBottom: "24px" }}>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      marginBottom: "12px",
                      color: "#f59e0b",
                    }}
                  >
                    📚 Areas for Improvement
                  </h3>
                  <ul style={{ paddingLeft: "20px", color: "#374151" }}>
                    {items.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: "8px", fontSize: "14px" }}>
                        {typeof item === "string" ? item : String(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {selectedSession.hr_report.recommendation && (
              <div
                style={{
                  background: (Number(selectedSession.overall_score) || 0) >= 60 ? "#ecfdf5" : "#fef3c7",
                  padding: "20px",
                  borderRadius: "12px",
                  marginBottom: "24px",
                }}
              >
                <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>🎯 Recommendation</h3>
                <p style={{ fontSize: "14px", color: "#374151", margin: 0 }}>
                  {selectedSession.hr_report.recommendation}
                </p>
              </div>
            )}

            {selectedSession.hr_report.suspicious_frames && selectedSession.hr_report.suspicious_frames.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "#ef4444" }}>
                  📸 Suspicious Behavior Snapshots
                </h3>
                <div style={{ display: 'flex', overflowX: 'auto', gap: '16px', paddingBottom: '8px' }}>
                  {selectedSession.hr_report.suspicious_frames.map((frameObj, idx) => (
                    <div key={idx} style={{ flex: '0 0 auto', width: '220px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '8px' }}>
                      <img 
                        src={`data:image/jpeg;base64,${frameObj.frame}`} 
                        alt="Suspicious frame" 
                        style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px' }} 
                      />
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#991b1b', marginBottom: '4px', textTransform: 'capitalize' }}>
                        {frameObj.reason.replace(/_/g, ' ')}
                      </div>
                      {frameObj.warning && (
                        <div style={{ fontSize: '11px', color: '#b91c1c', marginBottom: '4px' }}>
                          {frameObj.warning}
                        </div>
                      )}
                      <div style={{ fontSize: '10px', color: '#dc2626' }}>
                        {new Date(frameObj.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedSession.questions && selectedSession.questions.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>❓ Q&A Details</h3>
                {selectedSession.questions.map((q, idx) => {
                  const qIdx =
                    typeof q === "object" && q != null && q.question_index != null ? q.question_index : idx;
                  const matchingResponse =
                    selectedSession.responses?.find(
                      (r) => r && typeof r === "object" && r.question_index === qIdx
                    ) ?? selectedSession.responses?.[idx];
                  const answer = formatAnswerText(matchingResponse);
                  return (
                    <div
                      key={idx}
                      style={{
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "16px",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={{ fontWeight: "600", marginBottom: "8px", color: "#111" }}>
                        Q{idx + 1}: {formatQuestionText(q, idx)}
                      </div>
                      {answer ? (
                        <div
                          style={{
                            color: "#6b7280",
                            fontSize: "14px",
                            paddingLeft: "16px",
                            borderLeft: "3px solid #e5e7eb",
                          }}
                        >
                          A: {answer}
                        </div>
                      ) : (
                        <div style={{ color: "#9ca3af", fontSize: "13px", fontStyle: "italic" }}>
                          No answer recorded
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
            <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>Report Data Unavailable</h3>
            <p style={{ color: "#6b7280" }}>The detailed HR report is not available for this session.</p>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "2px solid #e5e7eb",
          }}
        >
          {showStartNewInterviewButton && (
            <button
              type="button"
              onClick={() => {
                window.location.href = "/ai-interview";
              }}
              style={{
                padding: "12px 24px",
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              🎤 Start New Interview
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "12px 24px",
              background: "#e5e7eb",
              color: "#374151",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
